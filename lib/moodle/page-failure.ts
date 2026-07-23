import type { MoodleReadFailureReason } from "./queries/dashboard";

export type MoodlePageFailureDisposition =
  | "capability"
  | "error"
  | "forbidden"
  | "reauthenticate";

export function dispositionForMoodlePageFailure(
  reason: MoodleReadFailureReason,
): MoodlePageFailureDisposition {
  switch (reason) {
    case "auth_expired":
      return "reauthenticate";
    case "capability":
      return "capability";
    case "permission":
      return "forbidden";
    case "invalid_response":
    case "outage":
      return "error";
  }
}

export class MoodlePageReadError extends Error {
  override readonly name = "MoodlePageReadError";

  constructor(readonly reason: "invalid_response" | "outage") {
    super(`Moodle page read failed: ${reason}`);
  }
}
