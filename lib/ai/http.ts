import { assertSameOriginMutation } from "../auth/same-origin";
import {
  MoodleCourseModulePathSchema,
} from "../moodle/queries/assignments";
import type { MoodleCourseModuleId } from "../moodle/identifiers";
import type { AiConfigurationError, AiRuntimeConfig } from "./config";
import {
  AiCompletionInputSchema,
  AiReviewInputSchema,
  type AiCompletionInput,
} from "./contracts";
import {
  AiAssignmentUnsupportedError,
  AiConsentError,
  AiDisabledError,
  AiInputError,
  AiProviderResponseError,
  AiProviderUnavailableError,
} from "./errors";
import {
  buildCompletionContext,
  createSafetyIdentifier,
  limitCompletionText,
  limitReviewResult,
  plainTextFromHtml,
} from "./context";
import type { AiWritingProvider } from "./provider";
import {
  type AiRateLimiter,
  type AiRequestKind,
} from "./rate-limit";
import {
  describeAiHttpError,
  ndjsonErrorResponse,
  ndjsonLine,
  parseAiJsonBody,
  privateJsonResponse,
} from "./http-support";

export type AiAssignmentAuthorization = Readonly<{
  descriptionHtml: string;
  onlineTextSupported: boolean;
  siteUrl: string;
  taskTitle: string;
  userId: number;
}>;

export type AiHttpDependencies = Readonly<{
  config: AiRuntimeConfig;
  configurationError: AiConfigurationError | null;
  limiter: AiRateLimiter;
  loadAssignment: (cmid: MoodleCourseModuleId) => Promise<AiAssignmentAuthorization>;
  now: () => number;
  provider: AiWritingProvider | null;
}>;

async function authorize(
  request: Request,
  cmidInput: string,
  dependencies: AiHttpDependencies,
): Promise<Readonly<{
  assignment: AiAssignmentAuthorization;
  provider: AiWritingProvider;
  safetyIdentifier: string;
}>> {
  assertSameOriginMutation(request);
  if (request.headers.get("x-ai-consent") !== "1") throw new AiConsentError();
  if (dependencies.configurationError !== null) throw dependencies.configurationError;
  if (!dependencies.config.enabled || dependencies.provider === null) {
    throw new AiDisabledError();
  }
  const cmid = MoodleCourseModulePathSchema.safeParse(cmidInput);
  if (!cmid.success) throw new AiInputError();
  const assignment = await dependencies.loadAssignment(cmid.data);
  if (!assignment.onlineTextSupported) throw new AiAssignmentUnsupportedError();
  return {
    assignment,
    provider: dependencies.provider,
    safetyIdentifier: createSafetyIdentifier({
      safetySecret: dependencies.config.safetySecret,
      siteUrl: assignment.siteUrl,
      userId: assignment.userId,
    }),
  };
}

function acquire(
  dependencies: AiHttpDependencies,
  kind: AiRequestKind,
  userKey: string,
): () => void {
  return dependencies.limiter.acquire({ kind, now: dependencies.now(), userKey });
}

function completionStream(input: Readonly<{
  authorization: Awaited<ReturnType<typeof authorize>>;
  body: AiCompletionInput;
  release: () => void;
}>): ReadableStream<Uint8Array> {
  const controller = new AbortController();
  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      let accepted = "";
      try {
        const context = buildCompletionContext(input.body);
        for await (const event of input.authorization.provider.streamCompletion({
          ...context,
          taskTitle: input.authorization.assignment.taskTitle,
          taskDescription: plainTextFromHtml(input.authorization.assignment.descriptionHtml),
          safetyIdentifier: input.authorization.safetyIdentifier,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
        })) {
          if (event.kind === "done") {
            streamController.enqueue(ndjsonLine({ type: "done" }));
            streamController.close();
            return;
          }
          const limited = limitCompletionText(`${accepted}${event.text}`);
          const delta = limited.startsWith(accepted) ? limited.slice(accepted.length) : "";
          accepted = limited;
          if (delta !== "") streamController.enqueue(ndjsonLine({ type: "delta", delta }));
        }
        throw new AiProviderResponseError();
      } catch (error) {
        const mapped = error instanceof Error ? error : new AiProviderUnavailableError();
        const descriptor = describeAiHttpError(mapped);
        streamController.enqueue(ndjsonLine({ type: "error", error: { code: descriptor.code } }));
        streamController.close();
      } finally {
        input.release();
      }
    },
    cancel() {
      controller.abort();
      input.release();
    },
  });
}

export async function handleAiCompletionRequest(
  request: Request,
  cmidInput: string,
  dependencies: AiHttpDependencies,
): Promise<Response> {
  try {
    const authorization = await authorize(request, cmidInput, dependencies);
    const parsed = AiCompletionInputSchema.safeParse(await parseAiJsonBody(request));
    if (!parsed.success) throw new AiInputError();
    const release = acquire(dependencies, "completion", authorization.safetyIdentifier);
    return new Response(completionStream({ authorization, body: parsed.data, release }), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof Error) return ndjsonErrorResponse(error);
    throw error;
  }
}

export async function handleAiReviewRequest(
  request: Request,
  cmidInput: string,
  dependencies: AiHttpDependencies,
): Promise<Response> {
  let release: (() => void) | null = null;
  try {
    const authorization = await authorize(request, cmidInput, dependencies);
    const parsed = AiReviewInputSchema.safeParse(await parseAiJsonBody(request));
    if (!parsed.success) throw new AiInputError();
    release = acquire(dependencies, "review", authorization.safetyIdentifier);
    const result = await authorization.provider.review({
      ...parsed.data,
      taskTitle: authorization.assignment.taskTitle,
      taskDescription: plainTextFromHtml(authorization.assignment.descriptionHtml),
      safetyIdentifier: authorization.safetyIdentifier,
      signal: AbortSignal.timeout(20_000),
    });
    return privateJsonResponse({ ok: true, result: limitReviewResult(result) }, 200);
  } catch (error) {
    if (error instanceof Error) {
      const descriptor = describeAiHttpError(error);
      return privateJsonResponse({ ok: false, error: { code: descriptor.code } }, descriptor.status);
    }
    throw error;
  } finally {
    release?.();
  }
}
