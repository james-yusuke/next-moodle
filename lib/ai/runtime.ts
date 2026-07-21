import "server-only";

import { createAuthenticatedMoodleClient, requireMoodleSession } from "../auth/server";
import type { MoodleCourseModuleId } from "../moodle/identifiers";
import { currentUnixSeconds } from "../moodle/now";
import { fetchAssignmentDetail } from "../moodle/queries/assignments.query";
import {
  AiConfigurationError,
  createAiRuntimeConfig,
  readAiRuntimeConfig,
  toAiAvailability,
  type AiAvailability,
} from "./config";
import { createAiConsentStorageKey } from "./context";
import type { AiAssignmentAuthorization, AiHttpDependencies } from "./http";
import { createOpenAiWritingProvider } from "./openai-transport";
import { AiRateLimiter } from "./rate-limit";

const limiter = new AiRateLimiter();

function readE2eProviderBaseUrl(): string | undefined {
  if (process.env.NEXT_MOODLE_E2E !== "1") return undefined;
  const input = process.env.NEXT_MOODLE_AI_TEST_BASE_URL;
  if (input === undefined) return undefined;
  const url = new URL(input);
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost")
  ) throw new AiConfigurationError();
  return url.toString();
}

async function loadAssignment(
  cmid: MoodleCourseModuleId,
): Promise<AiAssignmentAuthorization> {
  const session = await requireMoodleSession();
  const detail = await fetchAssignmentDetail({
    client: await createAuthenticatedMoodleClient(),
    now: currentUnixSeconds(),
    session,
  }, cmid);
  const policy = detail.nativeSubmission;
  const onlineTextSupported = policy.kind === "enabled" &&
    (policy.mode === "online_text" || policy.mode === "mixed");
  return {
    descriptionHtml: detail.description,
    onlineTextSupported,
    siteUrl: session.site.siteUrl,
    taskTitle: detail.name,
    userId: session.userId,
  };
}

export function createAiHttpDependencies(): AiHttpDependencies {
  let config;
  let configurationError: AiConfigurationError | null = null;
  let provider = null;
  try {
    config = readAiRuntimeConfig();
    const baseUrl = readE2eProviderBaseUrl();
    provider = createOpenAiWritingProvider(
      config,
      baseUrl === undefined ? {} : { baseUrl },
    );
  } catch (error) {
    if (!(error instanceof AiConfigurationError)) throw error;
    config = createAiRuntimeConfig({ enabled: "false" });
    configurationError = error;
  }
  return {
    config,
    configurationError,
    limiter,
    loadAssignment,
    now: Date.now,
    provider,
  };
}

export type AiUiContext = Readonly<{
  availability: AiAvailability;
  consentStorageKey: string;
}>;

export function createAiUiContext(input: Readonly<{
  siteUrl: string;
  userId: number;
}>): AiUiContext {
  let availability: AiAvailability;
  try {
    availability = toAiAvailability(readAiRuntimeConfig());
  } catch (error) {
    if (!(error instanceof AiConfigurationError)) throw error;
    availability = { enabled: false, provider: "OpenAI" };
  }
  return {
    availability,
    consentStorageKey: createAiConsentStorageKey(input),
  };
}
