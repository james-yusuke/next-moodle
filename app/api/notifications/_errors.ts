import {
  MoodleAuthError,
  MoodleConfigurationError,
  MoodleFunctionError,
  MoodleInputError,
  MoodleOutageError,
  MoodlePermissionError,
  MoodleResponseError,
} from "@/lib/moodle/errors";
import { SameOriginError } from "@/lib/auth/same-origin";

export function notificationsJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
}

export function notificationsErrorResponse(error: Error): Response {
  if (error instanceof SameOriginError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      403,
    );
  }
  if (error instanceof MoodleInputError) {
    return notificationsJson(
      { ok: false, error: { code: "invalid_request" } },
      400,
    );
  }
  if (error instanceof MoodleAuthError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      401,
    );
  }
  if (error instanceof MoodlePermissionError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      403,
    );
  }
  if (error instanceof MoodleFunctionError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      503,
    );
  }
  if (error instanceof MoodleOutageError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      503,
    );
  }
  if (error instanceof MoodleConfigurationError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      503,
    );
  }
  if (error instanceof MoodleResponseError) {
    return notificationsJson(
      { ok: false, error: { code: error.code } },
      502,
    );
  }
  return notificationsJson(
    { ok: false, error: { code: "internal_error" } },
    500,
  );
}
