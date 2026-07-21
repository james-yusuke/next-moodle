import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleFunctionError,
  MoodleInputError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "../moodle/server";
import { AuthRequestError } from "./login-input";
import { SameOriginError } from "./same-origin";

export { readLoginCredentials } from "./login-input";

function errorResponse(code: string, status: number): Response {
  return Response.json(
    { ok: false, error: { code } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function authErrorResponse(error: Error): Response {
  if (error instanceof SameOriginError) {
    return errorResponse(error.code, 403);
  }
  if (error instanceof AuthRequestError || error instanceof MoodleInputError) {
    return errorResponse("invalid_request", 400);
  }
  if (error instanceof MoodleAuthError) {
    return errorResponse(error.code, 401);
  }
  if (error instanceof MoodlePermissionError) {
    return errorResponse(error.code, 403);
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

export function noStoreResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
