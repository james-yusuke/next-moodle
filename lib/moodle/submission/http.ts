import type { MoodleClient } from "../client";
import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleFunctionError,
  MoodleInputError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "../errors";
import type { MoodleSession } from "../site";
import { SameOriginError, assertSameOriginMutation } from "../../auth/same-origin";
import {
  AssignmentNotFoundError,
  MoodleCourseModulePathSchema,
} from "../queries/assignments";
import { fetchAssignmentDetail } from "../queries/assignments.query";
import {
  SubmissionInputError,
  assertSubmissionRequestEnvelope,
  parseSubmissionFormData,
  validateSubmissionFiles,
} from "./input";
import { executeAssignmentSubmission } from "./moodle";
import { restoreExistingFiles } from "./existing-files";
import { sanitizeMoodleHtml } from "../../security/html";

export type SubmissionRequestContext = Readonly<{
  client: MoodleClient;
  session: MoodleSession;
}>;

export type SubmissionRequestDependencies = Readonly<{
  loadContext: () => Promise<SubmissionRequestContext>;
  now: () => number;
}>;

class NativeSubmissionUnavailableError extends Error {
  override readonly name = "NativeSubmissionUnavailableError";
  readonly code = "native_submission_unavailable";

  constructor() {
    super("Native assignment submission is unavailable.");
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function errorResponse(code: string, status: number): Response {
  return jsonResponse({ ok: false, error: { code } }, status);
}

function submissionInputResponse(error: SubmissionInputError): Response {
  if (error.code === "request_too_large" || error.code === "file_too_large") {
    return errorResponse(error.code, 413);
  }
  if (
    error.code === "unsupported_file_type" ||
    error.code === "file_signature_mismatch" ||
    error.code === "moodle_file_type_rejected"
  ) {
    return errorResponse(error.code, 415);
  }
  return errorResponse(error.code, 400);
}

function submissionErrorResponse(error: Error): Response {
  if (error instanceof SameOriginError) {
    return errorResponse(error.code, 403);
  }
  if (error instanceof SubmissionInputError) {
    return submissionInputResponse(error);
  }
  if (error instanceof MoodleAuthError) {
    return errorResponse(error.code, 401);
  }
  if (error instanceof AssignmentNotFoundError) {
    return errorResponse(error.code, 404);
  }
  if (error instanceof MoodlePermissionError) {
    return errorResponse(error.code, 403);
  }
  if (error instanceof NativeSubmissionUnavailableError) {
    return errorResponse(error.code, 409);
  }
  if (error instanceof MoodleInputError) {
    return errorResponse(error.code, 400);
  }
  if (
    error instanceof MoodleConfigurationError ||
    error instanceof MoodleFunctionError ||
    error instanceof MoodleOutageError
  ) {
    return errorResponse(error.code, 503);
  }
  if (error instanceof MoodleResponseError) {
    return errorResponse(error.code, 502);
  }
  return errorResponse("internal_error", 500);
}

async function readFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new SubmissionInputError("invalid_multipart");
    }
    throw error;
  }
}

export async function handleAssignmentSubmissionRequest(
  request: Request,
  cmidInput: string,
  dependencies: SubmissionRequestDependencies,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    assertSubmissionRequestEnvelope(request);
    const cmid = MoodleCourseModulePathSchema.safeParse(cmidInput);
    if (!cmid.success) {
      throw new SubmissionInputError("invalid_submission");
    }
    const context = await dependencies.loadContext();
    if (!context.session.capabilities.assignments) {
      throw new NativeSubmissionUnavailableError();
    }
    const detail = await fetchAssignmentDetail(
      {
        client: context.client,
        now: dependencies.now(),
        session: context.session,
      },
      cmid.data,
    );
    if (detail.nativeSubmission.kind !== "enabled") {
      throw new NativeSubmissionUnavailableError();
    }
    const payload = await parseSubmissionFormData(
      await readFormData(request),
      detail.nativeSubmission,
    );
    const restored = await restoreExistingFiles({
      files: detail.existingFiles,
      keptKeys: payload.keptExistingFileKeys,
      policy: detail.nativeSubmission,
      session: context.session,
    });
    const files = [...restored, ...payload.newFiles];
    await validateSubmissionFiles(
      files,
      detail.nativeSubmission,
      new TextEncoder().encode(payload.onlineText).byteLength,
    );
    const safePayload = {
      ...payload,
      newFiles: files,
      onlineText: payload.onlineTextFormat === 1
        ? sanitizeMoodleHtml(payload.onlineText, { siteUrl: context.session.site.siteUrl })
        : payload.onlineText,
    };
    const result = await executeAssignmentSubmission({
      assignmentId: detail.assignment.id,
      client: context.client,
      payload: safePayload,
      session: context.session,
      submissionDrafts: detail.assignment.submissiondrafts,
    });
    return jsonResponse({ ok: true, result }, 200);
  } catch (error) {
    if (error instanceof Error) {
      return submissionErrorResponse(error);
    }
    throw error;
  }
}
