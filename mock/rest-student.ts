import { numberField } from "./params";
import type { RestContext } from "./rest-context";
import type { FixtureUser, MoodleFunction, MoodleMockState } from "./types";

const grades = (user: FixtureUser, courseId: number): Record<string, unknown> => {
  const course = user.courses.find((candidate) => candidate.id === courseId);
  return {
    usergrades: course === undefined ? [] : [{
      courseid: course.id,
      coursename: course.fullname,
      gradeitems: [{ id: course.id * 10, itemname: "Course total", gradeformatted: "82.0", percentageformatted: "82%" }],
    }],
  };
};

const conversation = (user: FixtureUser, state: MoodleMockState): Record<string, unknown> => {
  const conversationId = user.key === "alice" ? 1001 : 2001;
  const sent = state.sentMessages.get(`${user.key}:${conversationId}`) ?? [];
  return {
    id: conversationId,
    name: "Study group",
    type: 1,
    unreadcount: sent.length === 0 ? 1 : 0,
    members: [{ id: user.userid, fullname: user.fullname }, { id: user.userid + 10, fullname: "Aoi Mentor" }],
    messages: [
      { id: conversationId * 10, useridfrom: user.userid + 10, text: "<p>The next study session starts at 16:00.</p>", timecreated: 1_790_000_000, isread: false },
      ...sent,
    ],
  };
};

const sendDirectMessage = (context: RestContext): readonly Record<string, unknown>[] => {
  const recipientId = numberField(context.input, "messages[0][touserid]") ?? 0;
  if (recipientId !== context.user.userid + 10) return [{ errormessage: "Recipient is unavailable" }];
  const conversationId = context.user.key === "alice" ? 1001 : 2001;
  const text = context.input.fields.get("messages[0][text]")?.[0] ?? "";
  const key = `${context.user.key}:${conversationId}`;
  const previous = context.state.sentMessages.get(key) ?? [];
  const message = { id: conversationId * 10 + previous.length + 1, text, timecreated: 1_790_000_100 + previous.length, useridfrom: context.user.userid };
  context.state.sentMessages.set(key, [...previous, message]);
  return [{ msgid: message.id }];
};

const sendMessage = (context: RestContext): readonly Record<string, unknown>[] => {
  const conversationId = numberField(context.input, "conversationid") ?? 0;
  const text = context.input.fields.get("messages[0][text]")?.[0] ?? "";
  const key = `${context.user.key}:${conversationId}`;
  const previous = context.state.sentMessages.get(key) ?? [];
  const message = { id: conversationId * 10 + previous.length + 1, text, timecreated: 1_790_000_100 + previous.length, useridfrom: context.user.userid };
  context.state.sentMessages.set(key, [...previous, message]);
  return [{ msgid: message.id }];
};

export function studentPayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  if (functionName === "gradereport_user_get_grade_items") return grades(context.user, numberField(context.input, "courseid") ?? context.user.courses[0]?.id ?? 0);
  if (functionName === "core_enrol_get_enrolled_users") return [
    { id: context.user.userid, fullname: context.user.fullname, roles: [{ name: "Student", shortname: "student" }], lastaccess: 1_790_000_000 },
    { id: context.user.userid + 10, fullname: "Aoi Mentor", roles: [{ name: "Instructor", shortname: "editingteacher" }], lastaccess: 1_790_000_000, profileimageurlsmall: `${context.siteUrl}/webservice/pluginfile.php/${context.user.userid + 10}/user/icon/f1` },
  ];
  if (functionName === "core_user_get_users_by_field") return [{ id: context.user.userid, fullname: context.user.fullname, email: `${context.user.username}@example.invalid`, city: "Sample City", country: "JP" }];
  if (functionName === "core_user_get_private_files_info") return { filecount: 1, filesize: 1280, filesizeformatted: "1.3 KB", contextid: context.user.userid * 10 };
  if (functionName === "core_files_get_files") return { parents: [], files: [{ filename: "study-notes.txt", filesize: 1280, mimetype: "text/plain", timemodified: 1_790_000_000, url: `${context.siteUrl}/webservice/pluginfile.php/${context.user.userid}/user/private/study-notes.txt` }] };
  if (functionName === "core_badges_get_user_badges") return { badges: [{ id: context.user.userid * 10, name: "First milestone", description: "Synthetic badge", dateissued: 1_790_000_000, issuername: "Synthetic Moodle" }] };
  if (functionName === "core_competency_list_user_plans") return [{ id: context.user.userid * 10, name: "Semester learning plan", statusname: "Active", duedate: 1_795_000_000 }];
  if (functionName === "core_message_get_conversations") return { conversations: [conversation(context.user, context.state)] };
  if (functionName === "core_message_get_conversation") return conversation(context.user, context.state);
  if (functionName === "core_message_get_conversation_between_users") return conversation(context.user, context.state);
  if (functionName === "core_message_send_instant_messages") return sendDirectMessage(context);
  if (functionName === "core_message_send_messages_to_conversation") return sendMessage(context);
  return undefined;
}
