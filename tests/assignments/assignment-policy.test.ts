import { describe, expect, test } from "bun:test";

import {
  MoodleAssignmentCourseSchema,
  MoodleSubmissionStatusSchema,
} from "@/lib/moodle/queries/assignments.schemas";
import { projectAssignmentDetail } from "@/lib/moodle/queries/assignments";

const NOW = 1_800_000_000;
const SITE_URL = "https://moodle.example.edu";

function assignmentWith(input: Readonly<{
  configs?: readonly Readonly<Record<string, unknown>>[];
  locked?: boolean;
  graded?: boolean;
  requiresStatement?: boolean;
  status?: string;
  team?: boolean;
}>) {
  const course = MoodleAssignmentCourseSchema.parse({
    id: 101,
    fullname: "Marine Biology",
    assignments: [
      {
        id: 501,
        cmid: 9101,
        course: 101,
        name: "Field notes",
        intro: "<p>Observe carefully.</p>",
        allowsubmissionsfromdate: NOW - 1_000,
        duedate: NOW + 1_000,
        cutoffdate: NOW + 2_000,
        nosubmissions: 0,
        submissiondrafts: 1,
        requiresubmissionstatement: input.requiresStatement ? 1 : 0,
        teamsubmission: input.team ? 1 : 0,
        configs: input.configs ?? [
          {
            plugin: "onlinetext",
            subtype: "assignsubmission",
            name: "enabled",
            value: "1",
          },
        ],
      },
    ],
  });
  const submission = MoodleSubmissionStatusSchema.parse({
    lastattempt: {
      submission: {
        assignment: 501,
        status: input.status ?? "new",
        gradingstatus: input.graded ? "graded" : "notgraded",
        attemptnumber: 0,
        timemodified: 0,
        groupid: 0,
        plugins: [],
      },
      submissionsenabled: true,
      locked: input.locked ?? false,
      graded: input.graded ?? false,
      canedit: true,
      cansubmit: true,
      extensionduedate: 0,
      gradingstatus: input.graded ? "graded" : "notgraded",
    },
  });
  const assignment = course.assignments.at(0);
  if (assignment === undefined) {
    throw new Error("Expected a fixture assignment.");
  }
  return projectAssignmentDetail({
    course,
    assignment,
    submission,
    siteUrl: SITE_URL,
    now: NOW,
    fileUpload: true,
    availableFunctions: [
      "mod_assign_get_assignments",
      "mod_assign_get_submission_status",
      "mod_assign_save_submission",
      "mod_assign_submit_for_grading",
    ],
  });
}

describe("native assignment policy", () => {
  test.each([
    [["onlinetext"], "online_text"],
    [["file"], "files"],
    [["onlinetext", "file"], "mixed"],
  ] as const)("enables %s as %s for an editable individual assignment", (plugins, mode) => {
    // Given
    const configs = plugins.map((plugin) => ({
      plugin,
      subtype: "assignsubmission",
      name: "enabled",
      value: "1",
    }));

    // When
    const detail = assignmentWith({ configs });

    // Then
    expect(detail.nativeSubmission.kind).toBe("enabled");
    if (detail.nativeSubmission.kind === "enabled") {
      expect(detail.nativeSubmission.mode).toBe(mode);
    }
  });

  test.each([
    [{ team: true }, "group_submission"],
    [{ requiresStatement: true }, "submission_statement"],
    [{ locked: true }, "locked"],
    [{ graded: true }, "graded"],
    [{ status: "submitted" }, "final_state"],
    [
      {
        configs: [
          {
            plugin: "video",
            subtype: "assignsubmission",
            name: "enabled",
            value: "1",
          },
        ],
      },
      "unsupported_plugin",
    ],
  ] as const)("falls back to Moodle for %s", (input, reason) => {
    // Given / When
    const detail = assignmentWith(input);

    // Then
    expect(detail.nativeSubmission).toEqual({ kind: "fallback", reason });
    expect(detail.moodleUrl).toBe(`${SITE_URL}/mod/assign/view.php?id=9101`);
    expect(detail.moodleUrl).not.toContain("token");
  });
});
