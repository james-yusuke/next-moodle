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
    id: 201,
    shortname: "HIST-330",
    fullname: "Archives and Public Memory",
    summary: "Synthetic course for Bob's dashboard fixture.",
    summaryformat: 1,
    startdate: now - day * 70,
    enddate: now + day * 20,
    progress: 84,
    completed: false,
    visible: true,
    format: "topics",
    categoryid: 20,
    viewurl: `${siteOrigin}/course/view.php?id=201`,
  },
]

const sections: readonly FixtureSection[] = [
  {
    id: 1201,
    name: "Unit 1: Community archives",
    summary: "Read a synthetic oral history.",
    summaryformat: 1,
    hiddenbynumsections: false,
    section: 1,
    modules: [
      {
        id: 9201,
        cmid: 1201,
        name: "Archive reflection",
        modname: "assign",
        instance: 601,
        url: `${siteOrigin}/mod/assign/view.php?id=9201`,
        visible: true,
        uservisible: true,
        completion: 1,
        completiondata: { state: 1, timecompleted: now - day * 2, overrideby: 0 },
      },
    ],
  },
]

const events: readonly FixtureEvent[] = [
  {
    id: 401,
    name: "Archive reflection due",
    description: "Upload a reflection on the archive visit.",
    descriptionformat: 1,
    timestart: now + day,
    timeduration: 0,
    courseid: 201,
    eventtype: "due",
    modname: "assign",
    instance: 601,
    activityname: "Archive reflection",
    action: "submit",
    url: `${siteOrigin}/mod/assign/view.php?id=9201`,
  },
]

const assignments: readonly FixtureAssignment[] = [
  {
    id: 601,
    cmid: 9201,
    courseid: 201,
    name: "Archive reflection",
    intro: "Connect the reading to one archive object.",
    introformat: 1,
    duedate: now + day,
    allowsubmissionsfromdate: now - day * 60,
    cutoffdate: now + day * 3,
    gradingduedate: 0,
    nosubmissions: false,
    submissiondrafts: true,
    requiresubmissionstatement: true,
    teamsubmission: false,
    submissionattachments: 1,
    maxfilesubmissions: 1,
    maxsubmissionsizebytes: 1_000_000,
  },
]

const submission: FixtureSubmission = {
  assignmentid: 601,
  status: "new",
  gradingstatus: "notgraded",
  attemptnumber: 0,
  timestarted: 0,
  timemodified: 0,
  groupid: 0,
  plugins: [],
}

const notifications: readonly FixtureNotification[] = [
  {
    id: 801,
    useridfrom: 9002,
    subject: "Course announcement",
    message: "A synthetic archive seminar room changed.",
    fullmessage: "A synthetic archive seminar room changed.",
    fullmessageformat: 1,
    contexturl: `${siteOrigin}/course/view.php?id=201`,
    timecreated: now - 3_600,
    timeread: 0,
    component: "moodle",
    eventtype: "course_announcement",
  },
]

export const BOB_FIXTURE: FixtureUser = {
  key: "bob",
  userid: 202,
  username: "bob",
  password: "bob-password",
  fullname: "Ren Suzuki",
  firstname: "Ren",
  lastname: "Suzuki",
  lang: "en",
  courses,
  sections: { "201": sections },
  completion: { "201": [{ cmid: 1201, state: 1, timecompleted: now - day * 2 }] },
  events,
  assignments,
  submissions: [submission],
  notifications,
}
