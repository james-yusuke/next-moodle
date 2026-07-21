import { SameOriginError } from "../auth/same-origin";
import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "../moodle/errors";
import { AssignmentNotFoundError } from "../moodle/queries/assignments";
import { AiConfigurationError } from "./config";
import {
  AiAssignmentUnsupportedError,
  AiConsentError,
  AiDisabledError,
  AiInputError,
  AiProviderRateLimitError,
  AiProviderRefusalError,
  AiProviderResponseError,
  AiProviderTimeoutError,
  AiProviderUnavailableError,
} from "./errors";
import { AiConcurrentRequestError, AiRateLimitError } from "./rate-limit";

const MAX_AI_BODY_BYTES = 24_000;

export type AiErrorDescriptor = Readonly<{ code: string; status: number }>;

export function describeAiHttpError(error: Error): AiErrorDescriptor {
  if (error instanceof SameOriginError || error instanceof AiConsentError) {
    return { code: error.code, status: 403 };
  }
  if (error instanceof AiInputError) return { code: error.code, status: 400 };
  if (error instanceof MoodleAuthError) return { code: error.code, status: 401 };
  if (error instanceof AssignmentNotFoundError) return { code: error.code, status: 404 };
  if (error instanceof MoodlePermissionError) return { code: error.code, status: 403 };
  if (error instanceof AiAssignmentUnsupportedError) return { code: error.code, status: 409 };
  if (
    error instanceof AiRateLimitError ||
    error instanceof AiConcurrentRequestError ||
    error instanceof AiProviderRateLimitError
  ) return { code: error.code, status: 429 };
  if (error instanceof AiProviderRefusalError) return { code: error.code, status: 422 };
  if (error instanceof AiProviderTimeoutError) return { code: error.code, status: 504 };
  if (
    error instanceof AiDisabledError ||
    error instanceof AiConfigurationError ||
    error instanceof MoodleConfigurationError ||
    error instanceof MoodleOutageError ||
    error instanceof AiProviderUnavailableError
  ) return { code: error.code, status: 503 };
  if (error instanceof MoodleResponseError || error instanceof AiProviderResponseError) {
    return { code: error.code, status: 502 };
  }
  return { code: "internal_error", status: 500 };
}

export function privateJsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function ndjsonLine(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

export function ndjsonErrorResponse(error: Error): Response {
  const descriptor = describeAiHttpError(error);
  return new Response(`${JSON.stringify({ type: "error", error: { code: descriptor.code } })}\n`, {
    status: descriptor.status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

export async function parseAiJsonBody(request: Request): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) > MAX_AI_BODY_BYTES) throw new AiInputError();
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_AI_BODY_BYTES) {
    throw new AiInputError();
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) throw new AiInputError();
    throw error;
  }
}
