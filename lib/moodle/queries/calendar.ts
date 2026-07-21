import "server-only";

import { cache } from "react";
import { z } from "zod";

import {
  MOODLE_FUNCTIONS,
  MoodleCalendarMonthlyResponseSchema,
  MoodleCalendarUpcomingResponseSchema,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import {
  buildMonthGrid,
  groupAgendaEvents,
  monthInTimeZone,
  type AgendaGroup,
  type MonthCell,
  type MonthCursor,
} from "./calendar-model";
import {
  toMoodleReadFailure,
  type MoodleReadResult,
} from "./dashboard";

const CalendarQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  view: z.enum(["agenda", "month"]).optional(),
  year: z.coerce.number().int().min(1970).max(9999).optional(),
});

export type CalendarSelection =
  | { readonly view: "agenda"; readonly cursor: MonthCursor }
  | { readonly view: "month"; readonly cursor: MonthCursor };

export type CalendarPageData =
  | {
      readonly view: "agenda";
      readonly cursor: MonthCursor;
      readonly groups: readonly AgendaGroup[];
    }
  | {
      readonly view: "month";
      readonly cursor: MonthCursor;
      readonly cells: readonly MonthCell[];
    };

type SearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

function firstValue(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export function parseCalendarSelection(
  searchParams: SearchParams,
  nowSeconds: number,
  timeZone: string,
): CalendarSelection {
  const fallback = monthInTimeZone(nowSeconds, timeZone);
  const parsed = CalendarQuerySchema.safeParse({
    month: firstValue(searchParams["month"]),
    view: firstValue(searchParams["view"]),
    year: firstValue(searchParams["year"]),
  });
  if (!parsed.success || parsed.data.view !== "month") {
    return { view: "agenda", cursor: fallback };
  }
  return {
    view: "month",
    cursor: {
      month: parsed.data.month ?? fallback.month,
      year: parsed.data.year ?? fallback.year,
    },
  };
}

export const readCalendar = cache(
  async (
    userId: MoodleUserId,
    selection: CalendarSelection,
    nowSeconds: number,
    timeZone: string,
  ): Promise<MoodleReadResult<CalendarPageData>> => {
    try {
      const client = await createAuthenticatedMoodleClient();
      if (selection.view === "agenda") {
        const result = await client.call(
          MOODLE_FUNCTIONS.calendarUpcoming,
          { categoryid: 0, courseid: 0 },
          MoodleCalendarUpcomingResponseSchema,
        );
        return {
          kind: "ready",
          data: {
            cursor: selection.cursor,
            groups: groupAgendaEvents(result.data.events, nowSeconds, timeZone),
            view: "agenda",
          },
        };
      }
      const result = await client.call(
        MOODLE_FUNCTIONS.calendarMonthly,
        {
          categoryid: 0,
          courseid: 0,
          includenavigation: true,
          mini: false,
          month: selection.cursor.month,
          year: selection.cursor.year,
        },
        MoodleCalendarMonthlyResponseSchema,
      );
      return {
        kind: "ready",
        data: {
          cells: buildMonthGrid(selection.cursor, result.data.events, nowSeconds, timeZone),
          cursor: selection.cursor,
          view: "month",
        },
      };
    } catch (error) {
      return toMoodleReadFailure(error);
    }
  },
);
