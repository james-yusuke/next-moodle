import type {
  FixtureAssignment,
  FixtureCourse,
  FixtureEvent,
  FixtureNotification,
  FixtureSection,
  FixtureSubmission,
  FixtureUser,
} from "./types"

const siteOrigin = "https://moodle.synthetic.invalid"
const day = 86_400
const now = 1_790_000_000

const courses: readonly FixtureCourse[] = [
  {
    id: 101,
    shortname: "BIO-101",
    fullname: "Introduction to Marine Biology",
    summary: "Synthetic course for Alice's dashboard fixture.",
    summaryformat: 1,
    startdate: now - day * 90,
    enddate: now + day * 45,
    progress: 62,
    completed: false,
    visible: true,
    format: "topics",
    categoryid: 10,
    viewurl: `${siteOrigin}/course/view.php?id=101`,
  },
  {
    id: 102,
    shortname: "STAT-210",
    fullname: "Applied Statistics Lab",
    summary: "A separate synthetic course visible only to Alice.",
    summaryformat: 1,
    startdate: now - day * 30,
    enddate: now + day * 90,
    progress: 18,
    completed: false,
    visible: true,
    format: "weeks",
    categoryid: 11,
    viewurl: `${siteOrigin}/course/view.php?id=102`,
  },
]

const sections: readonly FixtureSection[] = [
  {
    id: 1101,
    name: "Week 1: Tide pools",
    summary: "Observe a shore ecosystem.",
    summaryformat: 1,
    hiddenbynumsections: false,
    section: 1,
    modules: [
      {
        id: 9101,
        cmid: 1101,
        name: "Tide pool field notes",
        modname: "assign",
        instance: 501,
        url: `${siteOrigin}/mod/assign/view.php?id=9101`,
        visible: true,
        uservisible: true,
        completion: 1,
        completiondata: { state: 0, timecompleted: 0, overrideby: 0 },
      },
    ],
  },
]

const events: readonly FixtureEvent[] = [
  {
    id: 301,
    name: "Tide pool field notes due",
    description: "Submit the observation notes.",
    descriptionformat: 1,
    timestart: now + day * 2,
    timeduration: 0,
    courseid: 101,
    eventtype: "due",
    modname: "assign",
    instance: 501,
    activityname: "Tide pool field notes",
    action: "submit",
    url: `${siteOrigin}/mod/assign/view.php?id=9101`,
  },
  {
    id: 302,
    name: "Statistics lab check-in",
    description: "Optional office hour.",
    descriptionformat: 1,
    timestart: now + day * 4,
    timeduration: 3_600,
    courseid: 102,
    eventtype: "course",
    modname: "",
    instance: 0,
    activityname: "",
    action: "",
    url: `${siteOrigin}/course/view.php?id=102`,
  },
]

const assignments: readonly FixtureAssignment[] = [
  {
    id: 501,
    cmid: 9101,
    courseid: 101,
    name: "Tide pool field notes",
    intro: "Describe two observations from the field visit.",
    introformat: 1,
    duedate: now + day * 2,
    allowsubmissionsfromdate: now - day * 80,
    cutoffdate: now + day * 5,
    gradingduedate: 0,
    nosubmissions: false,
    submissiondrafts: true,
    requiresubmissionstatement: false,
    teamsubmission: false,
    submissionattachments: 1,
    maxfilesubmissions: 2,
    maxsubmissionsizebytes: 2_000_000,
  },
]

const submission = (assignmentid: number): FixtureSubmission => ({
  assignmentid,
  status: "new",
  gradingstatus: "notgraded",
  attemptnumber: 0,
  timestarted: 0,
  timemodified: 0,
  groupid: 0,
  plugins: [],
})

const notifications: readonly FixtureNotification[] = [
  {
    id: 701,
    useridfrom: 9001,
    subject: "New feedback available",
    message: "Your synthetic field notes have feedback.",
    fullmessage: "Your synthetic field notes have feedback.",
    fullmessageformat: 1,
    contexturl: `${siteOrigin}/mod/assign/view.php?id=9101`,
    timecreated: now - 1_800,
    timeread: 0,
    component: "mod_assign",
    eventtype: "assign_feedback_available",
  },
]

export const ALICE_FIXTURE: FixtureUser = {
  key: "alice",
  userid: 101,
  username: "alice",
  password: "alice-password",
  fullname: "Aoi Tanaka",
  firstname: "Aoi",
  lastname: "Tanaka",
  lang: "en",
  courses,
  sections: { "101": sections, "102": [] },
  completion: { "101": [{ cmid: 1101, state: 0, timecompleted: 0 }] },
  events,
  assignments,
  submissions: [submission(501)],
  notifications,
}
