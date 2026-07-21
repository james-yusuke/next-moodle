import { describe, expect, test } from "bun:test";

import { readTeacherRoleShortnames } from "@/lib/moodle/messages/teacher-config";

describe("teacher messaging configuration", () => {
  test("uses Moodle's standard teaching roles by default", () => {
    expect(readTeacherRoleShortnames({})).toEqual(["editingteacher", "teacher"]);
  });

  test("normalizes configured shortnames and rejects unsafe values", () => {
    expect(readTeacherRoleShortnames({ MOODLE_TEACHER_ROLE_SHORTNAMES: " Tutor, editingteacher,tutor " })).toEqual(["tutor", "editingteacher"]);
    expect(() => readTeacherRoleShortnames({ MOODLE_TEACHER_ROLE_SHORTNAMES: "teacher,<admin>" })).toThrow();
  });
});
