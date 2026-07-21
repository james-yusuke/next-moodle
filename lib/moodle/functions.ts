import { z } from "zod";

export const MOODLE_FUNCTIONS = {
  siteInfo: "core_webservice_get_site_info",
  timelineCourses: "core_course_get_enrolled_courses_by_timeline_classification",
  enrolledCourses: "core_enrol_get_users_courses",
  courseContents: "core_course_get_contents",
  activityCompletion: "core_completion_get_activities_completion_status",
  assignments: "mod_assign_get_assignments",
  assignmentStatus: "mod_assign_get_submission_status",
  saveAssignment: "mod_assign_save_submission",
  submitAssignment: "mod_assign_submit_for_grading",
  actionEvents: "core_calendar_get_action_events_by_timesort",
  calendarMonthly: "core_calendar_get_calendar_monthly_view",
  calendarUpcoming: "core_calendar_get_calendar_upcoming_view",
  notifications: "message_popup_get_popup_notifications",
  unreadNotificationCount: "message_popup_get_unread_popup_notification_count",
  markNotificationRead: "core_message_mark_notification_read",
} as const;

export const MOODLE_KNOWN_FUNCTION_NAMES = [
  MOODLE_FUNCTIONS.siteInfo,
  MOODLE_FUNCTIONS.timelineCourses,
  MOODLE_FUNCTIONS.enrolledCourses,
  MOODLE_FUNCTIONS.courseContents,
  MOODLE_FUNCTIONS.activityCompletion,
  MOODLE_FUNCTIONS.assignments,
  MOODLE_FUNCTIONS.assignmentStatus,
  MOODLE_FUNCTIONS.saveAssignment,
  MOODLE_FUNCTIONS.submitAssignment,
  MOODLE_FUNCTIONS.actionEvents,
  MOODLE_FUNCTIONS.calendarMonthly,
  MOODLE_FUNCTIONS.calendarUpcoming,
  MOODLE_FUNCTIONS.notifications,
  MOODLE_FUNCTIONS.unreadNotificationCount,
  MOODLE_FUNCTIONS.markNotificationRead,
] as const;

export const MoodleKnownFunctionNameSchema = z.enum(
  MOODLE_KNOWN_FUNCTION_NAMES,
);
export type MoodleKnownFunctionName = z.infer<
  typeof MoodleKnownFunctionNameSchema
>;

export const MoodleFunctionNameSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[a-z][a-z0-9_]+$/);
export type MoodleFunctionName = z.infer<typeof MoodleFunctionNameSchema>;

const READ_FUNCTIONS: ReadonlySet<string> = new Set([
  MOODLE_FUNCTIONS.siteInfo,
  MOODLE_FUNCTIONS.timelineCourses,
  MOODLE_FUNCTIONS.enrolledCourses,
  MOODLE_FUNCTIONS.courseContents,
  MOODLE_FUNCTIONS.activityCompletion,
  MOODLE_FUNCTIONS.assignments,
  MOODLE_FUNCTIONS.assignmentStatus,
  MOODLE_FUNCTIONS.actionEvents,
  MOODLE_FUNCTIONS.calendarMonthly,
  MOODLE_FUNCTIONS.calendarUpcoming,
  MOODLE_FUNCTIONS.notifications,
  MOODLE_FUNCTIONS.unreadNotificationCount,
]);

export function isReadFunction(functionName: string): boolean {
  return READ_FUNCTIONS.has(functionName);
}

export const MoodleCapabilitiesSchema = z.object({
  dashboard: z.boolean(),
  courses: z.boolean(),
  assignments: z.boolean(),
  calendar: z.boolean(),
  notifications: z.boolean(),
  fileUpload: z.boolean(),
});
export type MoodleCapabilities = Readonly<
  z.infer<typeof MoodleCapabilitiesSchema>
>;

export function deriveCapabilities(
  names: readonly MoodleKnownFunctionName[],
  uploadFiles: boolean,
): MoodleCapabilities {
  const available: ReadonlySet<string> = new Set(names);
  const has = (name: MoodleKnownFunctionName): boolean => available.has(name);

  return {
    dashboard:
      has(MOODLE_FUNCTIONS.timelineCourses) &&
      has(MOODLE_FUNCTIONS.actionEvents) &&
      has(MOODLE_FUNCTIONS.unreadNotificationCount),
    courses:
      has(MOODLE_FUNCTIONS.enrolledCourses) &&
      has(MOODLE_FUNCTIONS.courseContents),
    assignments:
      has(MOODLE_FUNCTIONS.assignments) &&
      has(MOODLE_FUNCTIONS.assignmentStatus),
    calendar:
      has(MOODLE_FUNCTIONS.calendarMonthly) &&
      has(MOODLE_FUNCTIONS.calendarUpcoming),
    notifications:
      has(MOODLE_FUNCTIONS.notifications) &&
      has(MOODLE_FUNCTIONS.unreadNotificationCount),
    fileUpload: uploadFiles && has(MOODLE_FUNCTIONS.saveAssignment),
  };
}
