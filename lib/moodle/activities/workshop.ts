import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId, MoodleUserId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import {
  projectWorkshopActivity,
  type WorkshopActivityData,
  workshopSubmissionQuery,
} from "./workshop-model";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);
const WorkshopSchema = z.object({
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  instructauthors: z.string().nullable().optional().default(""),
  name: z.string().min(1).max(16_384),
  phase: z.number().int().nonnegative().optional().default(0),
});
const WorkshopsResponseSchema = z.object({ workshops: z.array(WorkshopSchema) });
const WorkshopAccessSchema = z.object({
  creatingsubmissionallowed: MoodleBooleanSchema,
  modifyingsubmissionallowed: MoodleBooleanSchema,
});
const WorkshopSubmissionsSchema = z.object({
  submissions: z.array(z.object({
    content: z.string().nullable().optional().default(""),
    id: z.number().int().positive(),
    timecreated: z.number().int().nonnegative(),
    timemodified: z.number().int().nonnegative(),
    title: z.string().max(16_384),
  })).max(200),
});

type WorkshopRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  siteUrl: string;
  userId: MoodleUserId;
}>;

export async function readWorkshopActivity(
  request: WorkshopRequest,
): Promise<MoodleReadResult<WorkshopActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const workshops = await client.call(
      MOODLE_FUNCTIONS.workshops,
      { courseids: [request.courseId] },
      WorkshopsResponseSchema,
    );
    const workshop = workshops.data.workshops.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (workshop === undefined) return { kind: "ready", data: null };
    const [access, submissions] = await Promise.all([
      client.call(MOODLE_FUNCTIONS.workshopAccess, { workshopid: workshop.id }, WorkshopAccessSchema),
      client.call(
        MOODLE_FUNCTIONS.workshopSubmissions,
        workshopSubmissionQuery(workshop.id, request.userId),
        WorkshopSubmissionsSchema,
      ),
    ]);
    return {
      kind: "ready",
      data: projectWorkshopActivity({
        canCreate: access.data.creatingsubmissionallowed,
        canModify: access.data.modifyingsubmissionallowed,
        id: workshop.id,
        instructions: workshop.instructauthors ?? "",
        name: workshop.name,
        phase: workshop.phase,
        siteUrl: request.siteUrl,
        submissions: submissions.data.submissions,
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
