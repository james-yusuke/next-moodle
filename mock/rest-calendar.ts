import { firstField, numberField } from "./params";
import type { RestContext } from "./rest-context";
import type { FixtureUser, MoodleFunction, MoodleMockState } from "./types";

const eventsFor = (user: FixtureUser, state: MoodleMockState) => [
  ...user.events,
  ...(state.createdEvents.get(user.key) ?? []),
].filter((event) => !state.deletedEvents.has(`${user.key}:${event.id}`));

const actionEvents = (context: RestContext): Record<string, unknown> => ({
  events: eventsFor(context.user, context.state),
  firstid: eventsFor(context.user, context.state)[0]?.id ?? 0,
  lastid: eventsFor(context.user, context.state).at(-1)?.id ?? 0,
  haslastevents: true,
  limit: 20,
});

const monthlyEvents = (context: RestContext): Record<string, unknown> => ({
  year: 2026,
  month: 1,
  day: 1,
  courseid: 0,
  categoryid: 0,
  events: eventsFor(context.user, context.state),
  courses: context.user.courses.map((course) => ({ id: course.id, fullname: course.fullname })),
  categories: [],
});

const upcomingEvents = (context: RestContext): Record<string, unknown> => ({
  events: eventsFor(context.user, context.state),
  firstid: eventsFor(context.user, context.state)[0]?.id ?? 0,
  lastid: eventsFor(context.user, context.state).at(-1)?.id ?? 0,
  limit: 6,
});

const createEvent = (context: RestContext): Record<string, unknown> => {
  const id = context.state.nextCalendarEventId;
  context.state.nextCalendarEventId += 1;
  const event = {
    id,
    name: firstField(context.input, "events[0][name]") ?? "Untitled event",
    description: firstField(context.input, "events[0][description]") ?? "",
    descriptionformat: numberField(context.input, "events[0][format]") ?? 2,
    timestart: numberField(context.input, "events[0][timestart]") ?? 1_790_000_000,
    timeduration: numberField(context.input, "events[0][timeduration]") ?? 0,
    courseid: 0,
    eventtype: "user",
    modname: "",
    instance: 0,
    activityname: "",
    action: "",
    url: `${context.siteUrl}/calendar/view.php?view=day&time=${id}`,
  };
  const previous = context.state.createdEvents.get(context.user.key) ?? [];
  context.state.createdEvents.set(context.user.key, [...previous, event]);
  return { events: [{ ...event, userid: context.user.userid }], warnings: [] };
};

const getEvents = (context: RestContext): Record<string, unknown> => {
  const requested = numberField(context.input, "events[eventids][0]");
  return {
    events: eventsFor(context.user, context.state)
      .filter((event) => requested === undefined || event.id === requested)
      .map((event) => ({ ...event, userid: event.eventtype === "user" ? context.user.userid : 0 })),
    warnings: [],
  };
};

export function calendarPayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  if (functionName === "core_calendar_get_action_events_by_timesort") return actionEvents(context);
  if (functionName === "core_calendar_get_calendar_monthly_view") return monthlyEvents(context);
  if (functionName === "core_calendar_get_calendar_upcoming_view") return upcomingEvents(context);
  if (functionName === "core_calendar_get_calendar_events") return getEvents(context);
  if (functionName === "core_calendar_create_calendar_events") return createEvent(context);
  if (functionName === "core_calendar_delete_calendar_events") {
    const eventId = numberField(context.input, "events[0][eventid]") ?? 0;
    context.state.deletedEvents.add(`${context.user.key}:${eventId}`);
    return { status: true, warnings: [] };
  }
  return undefined;
}
