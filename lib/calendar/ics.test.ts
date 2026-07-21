import { expect, test } from "bun:test";

import { generateIcs } from "./ics";

test("calendar export contains display events without Moodle internals", () => {
  const output = generateIcs([{ id: 41, name: "レポート, 最終版", startsAt: 1_767_225_600 }]);
  expect(output).toContain("SUMMARY:レポート\\, 最終版");
  expect(output).toContain("DTSTART:20260101T000000Z");
  expect(output).not.toContain("token");
  expect(output).not.toContain("pluginfile");
});
