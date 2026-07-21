import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId, MoodleUserId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import type { LaunchActivityData } from "./launch-model";

const ActivitySchema = z.object({
  course: z.number().int().positive().optional(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});
const ScormsSchema = z.object({ scorms: z.array(ActivitySchema) });
const ScormAttemptsSchema = z.object({ attemptscount: z.number().int().nonnegative() });
const H5pActivitiesSchema = z.object({ h5pactivities: z.array(ActivitySchema) });
const H5pAttemptsSchema = z.object({ usersattempts: z.array(z.object({ attempts: z.array(z.object({ id: z.number().int().positive() }).passthrough()) })) });
const LtisSchema = z.object({ ltis: z.array(ActivitySchema) });
const BigBlueButtonsSchema = z.object({ bigbluebuttonbns: z.array(ActivitySchema) });

type LaunchRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  moduleType: string;
  name: string;
  sourceUrl: string | null;
  userId: MoodleUserId;
}>;

function activityResult(
  request: LaunchRequest,
  kind: LaunchActivityData["kind"],
  id: number,
  attemptCount: number | null,
  statusLabel: string,
): MoodleReadResult<LaunchActivityData> {
  return { kind: "ready", data: { attemptCount, id, kind, name: request.name, sourceUrl: request.sourceUrl, statusLabel } };
}

export async function readLaunchActivity(
  request: LaunchRequest,
): Promise<MoodleReadResult<LaunchActivityData | null>> {
  try {
    if (request.moduleType === "url") return activityResult(request, "url", request.instance ?? request.cmid, null, "外部リンク");
    const client = await createAuthenticatedMoodleClient();
    if (request.moduleType === "scorm") {
      const activities = await client.call(MOODLE_FUNCTIONS.scorms, { courseids: [request.courseId] }, ScormsSchema);
      const activity = activities.data.scorms.find((candidate) => candidate.coursemodule === request.cmid || candidate.id === request.instance);
      if (activity === undefined) return { kind: "ready", data: null };
      const attempts = await client.call(MOODLE_FUNCTIONS.scormAttempt, { ignoremissingcompletion: false, scormid: activity.id, userid: request.userId }, ScormAttemptsSchema);
      return activityResult(request, "scorm", activity.id, attempts.data.attemptscount, "隔離ランタイムで起動");
    }
    if (request.moduleType === "h5pactivity") {
      const activities = await client.call(MOODLE_FUNCTIONS.h5pActivities, { courseids: [request.courseId] }, H5pActivitiesSchema);
      const activity = activities.data.h5pactivities.find((candidate) => candidate.coursemodule === request.cmid || candidate.id === request.instance);
      if (activity === undefined) return { kind: "ready", data: null };
      const attempts = await client.call(MOODLE_FUNCTIONS.h5pState, { h5pactivityid: activity.id, userids: [] }, H5pAttemptsSchema);
      const attemptCount = attempts.data.usersattempts.reduce((total, user) => total + user.attempts.length, 0);
      return activityResult(request, "h5pactivity", activity.id, attemptCount, "隔離ランタイムで起動");
    }
    if (request.moduleType === "lti") {
      const activities = await client.call(MOODLE_FUNCTIONS.ltis, { courseids: [request.courseId] }, LtisSchema);
      const activity = activities.data.ltis.find((candidate) => candidate.coursemodule === request.cmid || candidate.id === request.instance);
      return activity === undefined ? { kind: "ready", data: null } : activityResult(request, "lti", activity.id, null, "安全なPOSTで起動");
    }
    if (request.moduleType === "bigbluebuttonbn") {
      const activities = await client.call(MOODLE_FUNCTIONS.bigBlueButtons, { courseids: [request.courseId] }, BigBlueButtonsSchema);
      const activity = activities.data.bigbluebuttonbns.find((candidate) => candidate.coursemodule === request.cmid || candidate.id === request.instance);
      return activity === undefined ? { kind: "ready", data: null } : activityResult(request, "bigbluebuttonbn", activity.id, null, "参加URLを安全に発行");
    }
    return { kind: "ready", data: null };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
