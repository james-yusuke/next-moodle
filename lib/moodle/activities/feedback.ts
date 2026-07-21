import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import {
  FeedbackItemWireSchema,
  projectFeedbackItems,
  type FeedbackActivityData,
} from "./feedback-model";

const FeedbackSchema = z.object({
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});
const FeedbacksResponseSchema = z.object({ feedbacks: z.array(FeedbackSchema) });
const PageResponseSchema = z.object({
  hasnextpage: z.boolean(),
  hasprevpage: z.boolean(),
  items: z.array(FeedbackItemWireSchema),
});

type FeedbackRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  page: number | null;
}>;

export async function readFeedbackActivity(
  request: FeedbackRequest,
): Promise<MoodleReadResult<FeedbackActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const feedbacks = await client.call(
      MOODLE_FUNCTIONS.feedbacks,
      { courseids: [request.courseId] },
      FeedbacksResponseSchema,
    );
    const feedback = feedbacks.data.feedbacks.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (feedback === undefined) return { kind: "ready", data: null };
    if (request.page === null) {
      return { kind: "ready", data: { hasNextPage: false, hasPreviousPage: false, id: feedback.id, items: [], name: feedback.name, page: null } };
    }
    const page = await client.call(
      MOODLE_FUNCTIONS.feedbackPageItems,
      { feedbackid: feedback.id, page: request.page, courseid: request.courseId },
      PageResponseSchema,
    );
    return {
      kind: "ready",
      data: {
        hasNextPage: page.data.hasnextpage,
        hasPreviousPage: page.data.hasprevpage,
        id: feedback.id,
        items: projectFeedbackItems(page.data.items),
        name: feedback.name,
        page: request.page,
      },
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
