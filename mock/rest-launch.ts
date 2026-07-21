import type { RestContext } from "./rest-context";
import type { MoodleFunction } from "./types";

export function launchPayload(functionName: MoodleFunction, context: RestContext): unknown | undefined {
  const alice = context.user.key === "alice";
  if (functionName === "mod_scorm_get_scorms_by_courses") return { options: [], scorms: alice ? [{ course: 101, coursemodule: 9114, id: 514, name: "Shoreline simulation" }] : [], warnings: [] };
  if (functionName === "mod_scorm_get_scorm_attempt_count") return { attemptscount: 2, warnings: [] };
  if (functionName === "mod_h5pactivity_get_h5pactivities_by_courses") return { h5pactivities: alice ? [{ course: 101, coursemodule: 9115, id: 515, name: "Species identification" }] : [], h5pglobalsettings: { enablesavestate: false }, warnings: [] };
  if (functionName === "mod_h5pactivity_get_attempts") return { activityid: 515, usersattempts: alice ? [{ attempts: [{ id: 8701 }], userid: context.user.userid }] : [], warnings: [] };
  if (functionName === "mod_lti_get_ltis_by_courses") return { ltis: alice ? [{ course: 101, coursemodule: 9116, id: 516, name: "Virtual field notebook" }] : [], warnings: [] };
  if (functionName === "mod_lti_get_tool_launch_data") return { endpoint: "https://tool.synthetic.invalid/launch", parameters: [{ name: "resource_link_id", value: "fixture-resource" }, { name: "oauth_signature", value: "fixture-signature" }], warnings: [] };
  if (functionName === "mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses") return { bigbluebuttonbns: alice ? [{ course: 101, coursemodule: 9117, id: 517, meetingid: "fixture-room", name: "Field briefing room", timemodified: 1_790_000_000 }] : [], warnings: [] };
  if (functionName === "mod_bigbluebuttonbn_get_join_url") return { join_url: "https://meeting.synthetic.invalid/join/fixture", warnings: [] };
  return undefined;
}
