import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import {
  projectWikiActivity,
  WikiPageWireSchema,
  type WikiActivityData,
} from "./wiki-model";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

const WikiSchema = z.object({
  cancreatepages: MoodleBooleanSchema.optional().default(false),
  cmid: z.number().int().positive().optional(),
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  defaultformat: z.string().max(80).optional().default("html"),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});

const WikisResponseSchema = z.object({ wikis: z.array(WikiSchema) });
const WikiPagesResponseSchema = z.object({ pages: z.array(WikiPageWireSchema) });

type WikiRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  siteUrl: string;
}>;

export async function readWikiActivity(
  request: WikiRequest,
): Promise<MoodleReadResult<WikiActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const wikis = await client.call(
      MOODLE_FUNCTIONS.wikis,
      { courseids: [request.courseId] },
      WikisResponseSchema,
    );
    const wiki = wikis.data.wikis.find((candidate) =>
      candidate.cmid === request.cmid || candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (wiki === undefined) return { kind: "ready", data: null };
    const pages = await client.call(
      MOODLE_FUNCTIONS.wikiPages,
      {
        wikiid: wiki.id,
        groupid: -1,
        userid: 0,
        "options[sortby]": "title",
        "options[sortdirection]": "ASC",
        "options[includecontent]": 1,
      },
      WikiPagesResponseSchema,
    );
    return {
      kind: "ready",
      data: projectWikiActivity({
        canCreate: wiki.cancreatepages,
        format: wiki.defaultformat,
        id: wiki.id,
        name: wiki.name,
        pages: pages.data.pages,
        siteUrl: request.siteUrl,
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
