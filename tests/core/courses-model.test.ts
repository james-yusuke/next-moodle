import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  MoodleCourseModuleSchema,
  MoodleDashboardCourseSchema,
} from "@/lib/moodle/model";
import {
  activityDestination,
  classifyCourse,
} from "@/lib/moodle/queries/courses-model";

describe("classifyCourse", () => {
  test.each([
    ["active", { startdate: 100, enddate: 300 }],
    ["future", { startdate: 300, enddate: 400 }],
    ["past", { startdate: 50, enddate: 100 }],
  ] as const)(
    "Given course dates, When classified at the current time, Then it is %s",
    (expected, dates) => {
      const course = MoodleDashboardCourseSchema.parse({
        id: 101,
        fullname: "テストコース",
        shortname: "TEST",
        ...dates,
      });

      const result = classifyCourse(course, 200);

      expect(result).toBe(expected);
    },
  );
});

describe("activityDestination", () => {
  test("Given an assignment, When routed, Then it uses the internal assignment screen", () => {
    const courseModule = MoodleCourseModuleSchema.extend({ url: URL_SCHEMA.optional() }).parse({
      id: 9101,
      name: "フィールドノート",
      modname: "assign",
      url: "https://moodle.example/mod/assign/view.php?id=9101",
    });

    const result = activityDestination(courseModule, "https://moodle.example");

    expect(result).toEqual({ kind: "internal", href: "/assignments/9101" });
  });

  test("Given a non-assignment Moodle URL, When routed, Then it opens the safe external URL", () => {
    const courseModule = MoodleCourseModuleSchema.extend({ url: URL_SCHEMA.optional() }).parse({
      id: 9201,
      name: "講義資料",
      modname: "resource",
      url: "https://moodle.example/mod/resource/view.php?id=9201",
    });

    const result = activityDestination(courseModule, "https://moodle.example");

    expect(result).toEqual({
      kind: "external",
      href: "https://moodle.example/mod/resource/view.php?id=9201",
    });
  });

  test("Given no safe URL, When routed, Then the activity is disabled with a reason", () => {
    const courseModule = MoodleCourseModuleSchema.parse({
      id: 9301,
      name: "URLなし資料",
      modname: "resource",
    });

    const result = activityDestination(courseModule, "https://moodle.example");

    expect(result).toEqual({ kind: "disabled", reason: "url_unavailable" });
  });
});

const URL_SCHEMA = z.url();
