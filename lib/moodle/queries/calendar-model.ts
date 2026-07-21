import type { MoodleCalendarEvent } from "@/lib/moodle/server";
import { dateKeyInTimeZone } from "@/lib/date-time";

export type CalendarEventItem = {
  readonly editable: boolean;
  readonly id: number;
  readonly name: string;
  readonly startsAt: number;
  readonly status: "late" | "upcoming";
};

export type AgendaGroup = {
  readonly dateKey: string;
  readonly events: readonly CalendarEventItem[];
};

export type MonthCursor = {
  readonly month: number;
  readonly year: number;
};

export type MonthCell = {
  readonly dateKey: string | null;
  readonly day: number | null;
  readonly events: readonly CalendarEventItem[];
  readonly key: string;
};

function projectEvent(
  event: MoodleCalendarEvent,
  nowSeconds: number,
): CalendarEventItem {
  return {
    editable: event.eventtype === "user",
    id: event.id,
    name: event.name,
    startsAt: event.timestart,
    status: event.timestart < nowSeconds ? "late" : "upcoming",
  };
}

export function groupAgendaEvents(
  events: readonly MoodleCalendarEvent[],
  nowSeconds: number,
  timeZone: string,
): readonly AgendaGroup[] {
  const groups = new Map<string, CalendarEventItem[]>();
  for (const event of [...events].sort((left, right) => left.timestart - right.timestart)) {
    const dateKey = dateKeyInTimeZone(event.timestart, timeZone);
    const items = groups.get(dateKey) ?? [];
    items.push(projectEvent(event, nowSeconds));
    groups.set(dateKey, items);
  }
  return [...groups].map(([dateKey, groupedEvents]) => ({
    dateKey,
    events: groupedEvents,
  }));
}

export function moveMonth(cursor: MonthCursor, offset: number): MonthCursor {
  const date = new Date(Date.UTC(cursor.year, cursor.month - 1 + offset, 1));
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

export function monthInTimeZone(timestampSeconds: number, timeZone: string): MonthCursor {
  const dateKey = dateKeyInTimeZone(timestampSeconds, timeZone);
  const [yearText, monthText] = dateKey.split("-");
  return {
    month: Number(monthText),
    year: Number(yearText),
  };
}

export function buildMonthGrid(
  cursor: MonthCursor,
  events: readonly MoodleCalendarEvent[],
  nowSeconds: number,
  timeZone: string,
): readonly MonthCell[] {
  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const grouped = new Map(
    groupAgendaEvents(events, nowSeconds, timeZone).map((group) => [group.dateKey, group.events]),
  );
  const cells: MonthCell[] = Array.from({ length: firstWeekday }, (_, offset) => ({
    dateKey: null,
    day: null,
    events: [],
    key: `${cursor.year}-${cursor.month}-leading-${offset}`,
  }));
  for (let day = 1; day <= dayCount; day += 1) {
    const dateKey = `${cursor.year.toString().padStart(4, "0")}-${cursor.month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    cells.push({ dateKey, day, events: grouped.get(dateKey) ?? [], key: dateKey });
  }
  return cells;
}
