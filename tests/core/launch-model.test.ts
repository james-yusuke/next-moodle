import { describe, expect, test } from "bun:test";

import { assignmentDestinationFromTrustedMoodleUrl } from "@/lib/moodle/activities/launch-model";

describe("assignmentDestinationFromTrustedMoodleUrl", () => {
  test("routes a Moodle assignment URL to the native submission workspace", () => {
    expect(assignmentDestinationFromTrustedMoodleUrl(
      "https://moodle.example.edu/mod/assign/view.php?id=19860",
    )).toBe("/assignments/19860");
  });

  test.each([
    null,
    "https://moodle.example.edu/mod/resource/view.php?id=19860",
    "https://moodle.example.edu/mod/assign/view.php?id=0",
    "https://moodle.example.edu/mod/assign/view.php?id=19860&id=19861",
    "not a URL",
  ])("does not route an unrelated or malformed URL: %p", (sourceUrl) => {
    expect(assignmentDestinationFromTrustedMoodleUrl(sourceUrl)).toBeNull();
  });
});
