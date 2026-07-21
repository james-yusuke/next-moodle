import { describe, expect, test } from "bun:test";

import { assignmentStatusLabel } from "./status-label";

describe("assignment status labels", () => {
  test("Given Moodle wire states, When displayed, Then raw English values are normalized", () => {
    expect(assignmentStatusLabel("new")).toBe("未着手");
    expect(assignmentStatusLabel("draft")).toBe("下書き");
    expect(assignmentStatusLabel("submitted")).toBe("提出済み");
    expect(assignmentStatusLabel("graded")).toBe("採点済み");
    expect(assignmentStatusLabel("locked")).toBe("ロック中");
    expect(assignmentStatusLabel("other")).toBe("状態を確認してください");
  });
});
