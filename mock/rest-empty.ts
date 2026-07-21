import type { MoodleFunction } from "./types"

export const assertNever = (value: never): never => {
  throw new Error(`unsupported Moodle function: ${String(value)}`)
}

export const emptyPayload = (functionName: MoodleFunction): unknown => {
  switch (functionName) {
    case "core_webservice_get_site_info":
      return {}
    case "core_course_get_enrolled_courses_by_timeline_classification":
    case "core_enrol_get_users_courses":
      return functionName === "core_enrol_get_users_courses" ? [] : { courses: [], nextoffset: 0 }
    case "core_course_get_contents":
      return []
    case "core_completion_get_activities_completion_status":
      return { statuses: [] }
    case "core_calendar_get_action_events_by_timesort":
    case "core_calendar_get_calendar_upcoming_view":
      return { events: [], firstid: 0, lastid: 0, haslastevents: false, limit: 0 }
    case "core_calendar_get_calendar_monthly_view":
      return { year: 2026, month: 1, day: 1, events: [], courses: [], categories: [] }
    case "mod_assign_get_assignments":
      return { courses: [] }
    case "mod_assign_get_submission_status":
      return { assignmentid: 0, status: "new", gradingstatus: "notgraded", plugins: [] }
    case "mod_assign_save_submission":
    case "mod_assign_submit_for_grading":
    case "core_message_mark_notification_read":
      return { status: true, warnings: [] }
    case "message_popup_get_popup_notifications":
      return { notifications: [], newestfirst: true }
    case "message_popup_get_unread_popup_notification_count":
      return 0
    default:
      return assertNever(functionName)
  }
}
