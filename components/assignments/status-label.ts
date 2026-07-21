import type { AssignmentSubmissionState } from "@/lib/moodle/queries/assignments";

class UnknownAssignmentStatusError extends Error {
  override readonly name = "UnknownAssignmentStatusError";
}

function assertNever(value: never): never {
  throw new UnknownAssignmentStatusError(`Unknown assignment status: ${String(value)}`);
}

export function assignmentStatusLabel(status: AssignmentSubmissionState): string {
  switch (status) {
    case "new": return "未着手";
    case "draft": return "下書き";
    case "submitted": return "提出済み";
    case "graded": return "採点済み";
    case "locked": return "ロック中";
    case "other": return "状態を確認してください";
    default: return assertNever(status);
  }
}
