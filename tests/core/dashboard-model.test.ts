import { describe, expect, test } from "bun:test";

import {
  MoodleCalendarEventSchema,
  MoodleDashboardCourseSchema,
} from "@/lib/moodle/model";
import {
  projectDashboard,
} from "@/lib/moodle/queries/dashboard-model";
import { dateKeyInTimeZone } from "@/lib/date-time";

describe("projectDashboard", () => {
  test("Given mixed users' events, When projecting, Then it keeps only enrolled timeline courses", () => {
    const enrolled = [
      MoodleDashboardCourseSchema.parse({
        id: 101,
        fullname: "海洋生物学",
        shortname: "BIO-101",
      }),
      MoodleDashboardCourseSchema.parse({
        id: 999,
        fullname: "別ユーザーのコース",
        shortname: "PRIVATE",
      }),
    ];
    const timeline = [
      MoodleDashboardCourseSchema.parse({
        id: 101,
        fullname: "海洋生物学",
        shortname: "BIO-101",
      }),
    ];
    const events = [
      MoodleCalendarEventSchema.parse({
        id: 301,
        name: "フィールドノート",
        eventtype: "due",
        timestart: 1_767_225_600,
        timeduration: 0,
        courseid: 101,
      }),
      MoodleCalendarEventSchema.parse({
        id: 999,
        name: "表示してはいけない予定",
        eventtype: "due",
        timestart: 1_767_225_600,
        timeduration: 0,
        courseid: 999,
      }),
    ];

    const result = projectDashboard({
      enrolled,
      events,
      nowSeconds: 1_767_139_200,
      timeline,
      timeZone: "Asia/Tokyo",
      unreadCount: 2,
    });

    expect(result.recentCourses.map((course) => course.id)).toEqual([101]);
    expect(result.nextUp?.name).toBe("フィールドノート");
    expect(result.horizon.flatMap((day) => day.events).map((event) => event.id)).toEqual([301]);
  });
});

describe("dateKeyInTimeZone", () => {
  test("Given a UTC timestamp before local midnight, When formatted, Then it uses the configured date", () => {
    const timestampSeconds = Date.parse("2026-01-01T15:30:00Z") / 1_000;

    const result = dateKeyInTimeZone(timestampSeconds, "Asia/Tokyo");

    expect(result).toBe("2026-01-02");
  });
});
