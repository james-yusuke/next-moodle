import { MOODLE_FUNCTIONS } from "./types"
import type { FixtureUser, MoodleMockOptions } from "./types"

const warning = {
  warningcode: "mock_warning",
  message: "Synthetic warning: fixture data is deterministic.",
  item: "mock",
} as const

export const withWarnings = (payload: unknown): unknown => {
  if (Array.isArray(payload)) return { data: payload, warnings: [warning] }
  if (typeof payload === "object" && payload !== null) return { ...payload, warnings: [warning] }
  return { data: payload, warnings: [warning] }
}

export const wireCourse = (course: FixtureUser["courses"][number]): Record<string, unknown> => ({
  ...course,
  visible: course.visible,
})

export const wireSection = (section: FixtureUser["sections"][string][number]): Record<string, unknown> => ({
  ...section,
  visible: section.hiddenbynumsections ? 0 : 1,
  modules: section.modules.map((module) => ({
    ...module,
    visible: module.visible ? 1 : 0,
  })),
})

export const wireAssignment = (assignment: FixtureUser["assignments"][number]): Record<string, unknown> => ({
  ...assignment,
  course: assignment.courseid,
  nosubmissions: assignment.nosubmissions ? 1 : 0,
  submissiondrafts: assignment.submissiondrafts ? 1 : 0,
  requiresubmissionstatement: assignment.requiresubmissionstatement ? 1 : 0,
  teamsubmission: assignment.teamsubmission ? 1 : 0,
})

export const wireNotification = (
  notification: FixtureUser["notifications"][number],
): Record<string, unknown> => ({
  id: notification.id,
  subject: notification.subject,
  smallmessage: notification.message,
  fullmessage: notification.fullmessage,
  timecreated: notification.timecreated,
  ...(notification.timeread > 0 ? { timeread: notification.timeread } : {}),
  contexturl: notification.contexturl,
})

export const siteInfo = (
  user: FixtureUser,
  options: MoodleMockOptions,
  siteUrl: string,
): Record<string, unknown> => ({
  sitename: "Synthetic Moodle",
  siteurl: siteUrl,
  username: user.username,
  firstname: user.firstname,
  lastname: user.lastname,
  fullname: user.fullname,
  lang: user.lang,
  userid: user.userid,
  userpictureurl: "https://moodle.synthetic.invalid/pluginfile.php/0/user/icon/f1",
  functions: MOODLE_FUNCTIONS
    .filter((functionName) => !options.missingFunctions?.includes(functionName))
    .map((name) => ({ name })),
  uploadfiles: true,
})
