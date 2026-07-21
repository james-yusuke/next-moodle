import { FIXTURE_TOKENS } from "./fixtures"
import { numberField } from "./params"
import { assertNever, emptyPayload } from "./rest-empty"
import {
  siteInfo,
  wireAssignment,
  wireCourse,
  wireNotification,
  wireSection,
  withWarnings,
} from "./wire"
import type {
  FixtureUser,
  MoodleFunction,
  MoodleMockOptions,
  MoodleMockState,
  MockRequestInput,
  MoodleScenario,
} from "./types"

type RestContext = {
  readonly input: MockRequestInput
  readonly state: MoodleMockState
  readonly user: FixtureUser
  readonly options: MoodleMockOptions
  readonly scenario: MoodleScenario
  readonly siteUrl: string
}

const coursePayload = (user: FixtureUser): Record<string, unknown> => ({
  courses: user.courses.map(wireCourse),
  nextoffset: 0,
})

const sectionsFor = (user: FixtureUser, input: MockRequestInput): readonly unknown[] => {
  const requested = numberField(input, "courseid", "courseids[0]")
  if (requested !== undefined) return (user.sections[String(requested)] ?? []).map(wireSection)
  return (user.sections[String(user.courses[0]?.id ?? 0)] ?? []).map(wireSection)
}

const completionFor = (user: FixtureUser, input: MockRequestInput): Record<string, unknown> => {
  const requested = numberField(input, "courseid", "courseids[0]")
  const courseId = requested ?? user.courses[0]?.id ?? 0
  return {
    statuses: (user.completion[String(courseId)] ?? []).map((status) => ({
      ...status,
      instance: status["cmid"] ?? 0,
      modname: "assign",
    })),
  }
}

const calendarPayload = (user: FixtureUser): Record<string, unknown> => ({
  events: user.events,
  firstid: user.events[0]?.id ?? 0,
  lastid: user.events.at(-1)?.id ?? 0,
  haslastevents: true,
  limit: 20,
})

const monthlyPayload = (user: FixtureUser): Record<string, unknown> => ({
  year: 2026,
  month: 1,
  day: 1,
  courseid: 0,
  categoryid: 0,
  events: user.events,
  courses: user.courses.map((course) => ({ id: course.id, fullname: course.fullname })),
  categories: [],
})

const upcomingPayload = (user: FixtureUser): Record<string, unknown> => ({
  events: user.events,
  firstid: user.events[0]?.id ?? 0,
  lastid: user.events.at(-1)?.id ?? 0,
  limit: 6,
})

const assignmentsPayload = (user: FixtureUser): Record<string, unknown> => ({
  courses: user.courses.map((course) => ({
    id: course.id,
    fullname: course.fullname,
    assignments: user.assignments
      .filter((assignment) => assignment.courseid === course.id)
      .map(wireAssignment),
  })),
})

const submissionPayload = (user: FixtureUser, input: MockRequestInput): Record<string, unknown> => {
  const assignmentid = numberField(input, "assignmentid") ?? user.assignments[0]?.id ?? 0
  const submission = user.submissions.find((candidate) => candidate.assignmentid === assignmentid) ?? {
    assignmentid,
    status: "new",
    gradingstatus: "notgraded",
    attemptnumber: 0,
    timestarted: 0,
    timemodified: 0,
    groupid: 0,
    plugins: [],
  }
  return {
    ...submission,
    lastattempt: {
      submission: submission,
      submissionsenabled: true,
      locked: false,
      graded: false,
      canedit: true,
      cansubmit: true,
      extensionduedate: 0,
      blindmarking: false,
      gradingstatus: submission.gradingstatus,
    },
    feedback: [],
    gradingsummary: { grade: null, gradeddate: 0 },
  }
}

const notificationsPayload = (user: FixtureUser, state: MoodleMockState): Record<string, unknown> => ({
  notifications: user.notifications
    .filter((notification) => !state.readNotifications.has(`${user.key}:${notification.id}`))
    .map(wireNotification),
  newestfirst: true,
})

const successPayload = (functionName: MoodleFunction, context: RestContext): unknown => {
  switch (functionName) {
    case "core_webservice_get_site_info":
      return siteInfo(context.user, context.options, context.siteUrl)
    case "core_course_get_enrolled_courses_by_timeline_classification":
      return coursePayload(context.user)
    case "core_enrol_get_users_courses":
      return context.user.courses.map(wireCourse)
    case "core_course_get_contents":
      return sectionsFor(context.user, context.input)
    case "core_completion_get_activities_completion_status":
      return completionFor(context.user, context.input)
    case "core_calendar_get_action_events_by_timesort":
      return calendarPayload(context.user)
    case "core_calendar_get_calendar_monthly_view":
      return monthlyPayload(context.user)
    case "core_calendar_get_calendar_upcoming_view":
      return upcomingPayload(context.user)
    case "mod_assign_get_assignments":
      return assignmentsPayload(context.user)
    case "mod_assign_get_submission_status":
      return submissionPayload(context.user, context.input)
    case "mod_assign_save_submission":
      return saveSubmission(context)
    case "mod_assign_submit_for_grading":
      return submitForGrading(context)
    case "message_popup_get_popup_notifications":
      return notificationsPayload(context.user, context.state)
    case "message_popup_get_unread_popup_notification_count":
      return context.user.notifications.filter(
        (notification) => !context.state.readNotifications.has(`${context.user.key}:${notification.id}`),
      ).length
    case "core_message_mark_notification_read":
      return markNotificationRead(context)
    default:
      return assertNever(functionName)
  }
}

const saveSubmission = (context: RestContext): Record<string, unknown> => {
  const assignmentid = numberField(context.input, "assignmentid") ?? context.user.assignments[0]?.id ?? 0
  const plugindata: Record<string, string> = {}
  for (const [key, values] of context.input.fields) {
    if (key.startsWith("plugindata") || key === "onlinetext") plugindata[key] = values[0] ?? ""
  }
  context.state.submissions.set(`${context.user.key}:${assignmentid}`, {
    user: context.user.key,
    assignmentid,
    plugindata,
    submitted: false,
  })
  return { status: true, warnings: [] }
}

const submitForGrading = (context: RestContext): Record<string, unknown> => {
  const assignmentid = numberField(context.input, "assignmentid") ?? context.user.assignments[0]?.id ?? 0
  const previous = context.state.submissions.get(`${context.user.key}:${assignmentid}`)
  context.state.submissions.set(`${context.user.key}:${assignmentid}`, {
    user: context.user.key,
    assignmentid,
    plugindata: previous?.plugindata ?? {},
    submitted: true,
  })
  return { status: true, warnings: [] }
}

const markNotificationRead = (context: RestContext): Record<string, unknown> => {
  const notificationid = numberField(context.input, "notificationid", "id") ?? 0
  context.state.readNotifications.add(`${context.user.key}:${notificationid}`)
  return { status: true, warnings: [] }
}

export const handleRestFunction = (
  functionName: MoodleFunction,
  context: RestContext,
): unknown => {
  const payload = context.scenario === "empty_data" ? emptyPayload(functionName) : successPayload(functionName, context)
  return context.scenario === "warning" ? withWarnings(payload) : payload
}

export const tokenForUser = (user: FixtureUser): string => FIXTURE_TOKENS[user.key]
