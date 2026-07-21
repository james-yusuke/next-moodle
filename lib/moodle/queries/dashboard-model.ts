import type {
  MoodleCalendarEvent,
  MoodleDashboardCourse,
} from "@/lib/moodle/server";
import { dateKeyInTimeZone } from "@/lib/date-time";

const HORIZON_DAY_COUNT = 7;

export type DashboardEvent = {
  readonly courseName: string;
  readonly id: number;
  readonly name: string;
  readonly startsAt: number;
  readonly status: "overdue" | "upcoming";
};

export type DashboardCourse = {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
};

export type HorizonDay = {
  readonly dateKey: string;
  readonly events: readonly DashboardEvent[];
};

export type DashboardProjection = {
  readonly horizon: readonly HorizonDay[];
  readonly nextUp: DashboardEvent | null;
  readonly recentCourses: readonly DashboardCourse[];
  readonly unreadCount: number;
};

type DashboardProjectionInput = {
  readonly enrolled: readonly MoodleDashboardCourse[];
  readonly events: readonly MoodleCalendarEvent[];
  readonly nowSeconds: number;
  readonly timeline: readonly MoodleDashboardCourse[];
  readonly timeZone: string;
  readonly unreadCount: number;
};

function moveDate(dateKey: string, days: number): string {
  const timestamp = Date.parse(`${dateKey}T00:00:00Z`);
  return new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10);
}

function compareDashboardEvents(
  left: DashboardEvent,
  right: DashboardEvent,
): number {
  if (left.status !== right.status) {
    return left.status === "overdue" ? -1 : 1;
  }
  return left.status === "overdue"
    ? right.startsAt - left.startsAt
    : left.startsAt - right.startsAt;
}

export function projectDashboard(
  input: DashboardProjectionInput,
): DashboardProjection {
  const enrolledIds = new Set(input.enrolled.map((course) => course.id));
  const courses = input.timeline.filter((course) => enrolledIds.has(course.id));
  const courseNames = new Map(courses.map((course) => [course.id, course.fullname]));
  const events = input.events
    .flatMap((event): readonly DashboardEvent[] => {
      if (event.courseid === undefined || event.courseid === 0) {
        return [];
      }
      const courseName = courseNames.get(event.courseid);
      if (courseName === undefined) {
        return [];
      }
      return [{
        courseName,
        id: event.id,
        name: event.name,
        startsAt: event.timestart,
        status: event.timestart < input.nowSeconds ? "overdue" : "upcoming",
      }];
    })
    .sort(compareDashboardEvents);
  const today = dateKeyInTimeZone(input.nowSeconds, input.timeZone);
  const horizon = Array.from({ length: HORIZON_DAY_COUNT }, (_, index) => {
    const dateKey = moveDate(today, index);
    return {
      dateKey,
      events: events.filter(
        (event) => dateKeyInTimeZone(event.startsAt, input.timeZone) === dateKey,
      ),
    };
  });
  const recentCourses = [...courses]
    .sort((left, right) => (right.startdate ?? 0) - (left.startdate ?? 0))
    .slice(0, 4)
    .map((course): DashboardCourse => ({
      id: course.id,
      name: course.fullname,
      shortName: course.shortname,
    }));

  return {
    horizon,
    nextUp: events[0] ?? null,
    recentCourses,
    unreadCount: input.unreadCount,
  };
}
