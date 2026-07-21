export const MOODLE_FUNCTIONS = [
  "core_webservice_get_site_info",
  "core_course_get_enrolled_courses_by_timeline_classification",
  "core_enrol_get_users_courses",
  "core_course_get_contents",
  "core_completion_get_activities_completion_status",
  "core_calendar_get_action_events_by_timesort",
  "core_calendar_get_calendar_monthly_view",
  "core_calendar_get_calendar_upcoming_view",
  "mod_assign_get_assignments",
  "mod_assign_get_submission_status",
  "mod_assign_save_submission",
  "mod_assign_submit_for_grading",
  "message_popup_get_popup_notifications",
  "message_popup_get_unread_popup_notification_count",
  "core_message_mark_notification_read",
] as const

export type MoodleFunction = (typeof MOODLE_FUNCTIONS)[number]

export const MOODLE_SCENARIOS = [
  "success",
  "invalid_credentials",
  "expired_token",
  "missing_capability",
  "empty_data",
  "warning",
  "moodle_exception",
  "transient_outage",
  "malformed_response",
  "protected_file",
  "upload_draft",
  "save_submission",
  "submit_for_grading",
  "notification_read",
] as const

export type MoodleScenario = (typeof MOODLE_SCENARIOS)[number]
export type FixtureUserKey = "alice" | "bob"

export type FixtureCourse = {
  readonly id: number
  readonly shortname: string
  readonly fullname: string
  readonly summary: string
  readonly summaryformat: number
  readonly startdate: number
  readonly enddate: number
  readonly progress: number
  readonly completed: boolean
  readonly visible: boolean
  readonly format: string
  readonly categoryid: number
  readonly viewurl: string
}

export type FixtureModule = {
  readonly id: number
  readonly cmid: number
  readonly name: string
  readonly modname: string
  readonly instance: number
  readonly url: string
  readonly visible: boolean
  readonly uservisible: boolean
  readonly completion: number
  readonly completiondata: Readonly<Record<string, string | number | boolean>>
}

export type FixtureSection = {
  readonly id: number
  readonly name: string
  readonly summary: string
  readonly summaryformat: number
  readonly hiddenbynumsections: boolean
  readonly section: number
  readonly modules: readonly FixtureModule[]
}

export type FixtureEvent = {
  readonly id: number
  readonly name: string
  readonly description: string
  readonly descriptionformat: number
  readonly timestart: number
  readonly timeduration: number
  readonly courseid: number
  readonly eventtype: string
  readonly modname: string
  readonly instance: number
  readonly activityname: string
  readonly action: string
  readonly url: string
}

export type FixtureAssignment = {
  readonly id: number
  readonly cmid: number
  readonly courseid: number
  readonly name: string
  readonly intro: string
  readonly introformat: number
  readonly duedate: number
  readonly allowsubmissionsfromdate: number
  readonly cutoffdate: number
  readonly gradingduedate: number
  readonly nosubmissions: boolean
  readonly submissiondrafts: boolean
  readonly requiresubmissionstatement: boolean
  readonly teamsubmission: boolean
  readonly submissionattachments: number
  readonly maxfilesubmissions: number
  readonly maxsubmissionsizebytes: number
}

export type FixtureSubmission = {
  readonly assignmentid: number
  readonly status: string
  readonly gradingstatus: string
  readonly attemptnumber: number
  readonly timestarted: number
  readonly timemodified: number
  readonly groupid: number
  readonly plugins: readonly Readonly<Record<string, unknown>>[]
}

export type FixtureNotification = {
  readonly id: number
  readonly useridfrom: number
  readonly subject: string
  readonly message: string
  readonly fullmessage: string
  readonly fullmessageformat: number
  readonly contexturl: string
  readonly timecreated: number
  readonly timeread: number
  readonly component: string
  readonly eventtype: string
}

export type FixtureUser = {
  readonly key: FixtureUserKey
  readonly userid: number
  readonly username: string
  readonly password: string
  readonly fullname: string
  readonly firstname: string
  readonly lastname: string
  readonly lang: string
  readonly courses: readonly FixtureCourse[]
  readonly sections: Readonly<Record<string, readonly FixtureSection[]>>
  readonly completion: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>
  readonly events: readonly FixtureEvent[]
  readonly assignments: readonly FixtureAssignment[]
  readonly submissions: readonly FixtureSubmission[]
  readonly notifications: readonly FixtureNotification[]
}

export type MockRequestFile = {
  readonly field: string
  readonly name: string
  readonly type: string
  readonly size: number
  readonly bytes: Uint8Array
}

export type MockRequestInput = {
  readonly fields: ReadonlyMap<string, readonly string[]>
  readonly files: readonly MockRequestFile[]
}

export type MoodleMockOptions = {
  readonly host?: string
  readonly port?: number
  readonly defaultScenario?: MoodleScenario
  readonly missingFunctions?: readonly MoodleFunction[]
}

export type MoodleMockState = {
  readonly tokens: Map<string, FixtureUserKey>
  readonly uploadItems: Map<number, MockUploadItem>
  readonly submissions: Map<string, MockSubmissionState>
  readonly readNotifications: Set<string>
  readonly outageAttempts: Map<string, number>
  nextDraftItemId: number
}

export type MockUploadItem = {
  readonly itemid: number
  readonly user: FixtureUserKey
  readonly filename: string
  readonly filepath: string
  readonly filesize: number
  readonly mimetype: string
}

export type MockSubmissionState = {
  readonly user: FixtureUserKey
  readonly assignmentid: number
  readonly plugindata: Readonly<Record<string, string>>
  readonly submitted: boolean
}

export type MoodleMockServer = {
  readonly url: string
  readonly host: string
  readonly port: number
  readonly tokenFor: (user: FixtureUserKey) => string
}

export type MoodleMock = {
  readonly start: () => Promise<MoodleMockServer>
  readonly stop: () => Promise<void>
  readonly state: MoodleMockState
}

export const DEFAULT_HOST = "127.0.0.1"
export const DEFAULT_PORT = 28765
export const PORT_SCAN_LIMIT = 20
