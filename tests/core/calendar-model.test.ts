import { describe, expect, test } from "bun:test";

import { MoodleCalendarEventSchema } from "@/lib/moodle/model";
import {
  groupAgendaEvents,
  moveMonth,
} from "@/lib/moodle/queries/calendar-model";

describe("groupAgendaEvents", () => {
  test("Given an event crossing UTC midnight, When grouped, Then Tokyo owns the calendar day", () => {
    const event = MoodleCalendarEventSchema.parse({
      id: 301,
      name: "深夜の締切",
      eventtype: "due",
      timestart: Date.parse("2026-01-01T15:30:00Z") / 1_000,
      timeduration: 0,
    });

    const result = groupAgendaEvents(
      [event],
      Date.parse("2026-01-01T12:00:00Z") / 1_000,
      "Asia/Tokyo",
    );

    expect(result[0]?.dateKey).toBe("2026-01-02");
    expect(result[0]?.events[0]?.status).toBe("upcoming");
  });
});

describe("moveMonth", () => {
  test("Given January, When paging backward, Then it crosses the year boundary", () => {
    const result = moveMonth({ month: 1, year: 2026 }, -1);

    expect(result).toEqual({ month: 12, year: 2025 });
  });
});
