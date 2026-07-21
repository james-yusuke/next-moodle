import { describe, expect, test } from "bun:test";

import {
  MoodleCalendarUpcomingResponseSchema,
  MoodleCalendarEventsResponseSchema,
  MoodleNotificationsResponseSchema,
  MoodleTimelineCoursesResponseSchema,
  MoodleUnreadNotificationCountSchema,
} from "@/lib/moodle/model";

describe("official Moodle wire compatibility", () => {
  test("normalizes boolean course visibility returned by current timeline APIs", () => {
    const result = MoodleTimelineCoursesResponseSchema.parse({
      courses: [
        {
          id: 101,
          fullname: "Webサービス設計",
          shortname: "WEB-101",
          visible: true,
        },
      ],
      nextoffset: 0,
    });

    expect(result.courses[0]?.visible).toBe(1);
  });

  test("normalizes the scalar unread notification count", () => {
    expect(MoodleUnreadNotificationCountSchema.parse(3)).toEqual({ count: 3 });
  });

  test("accepts upcoming calendar-view envelopes without action-event pagination", () => {
    const result = MoodleCalendarUpcomingResponseSchema.parse({
      events: [
        {
          id: 301,
          name: "レポート提出",
          description: "",
          timestart: 1_767_225_600,
          timeduration: 0,
          normalisedeventtype: "due",
        },
      ],
    });

    expect(result.events[0]).toMatchObject({
      eventtype: "due",
      id: 301,
    });
  });

  test("ignores action-event pagination metadata that the cockpit does not use", () => {
    const result = MoodleCalendarEventsResponseSchema.parse({
      events: [],
      firstid: 0,
      lastid: 0,
      limit: false,
    });

    expect(result.events).toEqual([]);
  });

  test("normalizes nullable popup notification fields", () => {
    const result = MoodleNotificationsResponseSchema.parse({
      notifications: [
        {
          id: 701,
          subject: "採点が公開されました",
          smallmessage: null,
          fullmessage: null,
          timecreated: 1_767_225_600,
          timeread: null,
          contexturl: null,
        },
      ],
      unreadcount: 1,
    });

    expect(result.notifications[0]).toMatchObject({
      smallmessage: "",
      timeread: 0,
    });
  });
});
