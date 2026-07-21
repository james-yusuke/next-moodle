import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import {
  GlossaryEntryWireSchema,
  projectGlossaryActivity,
  type GlossaryActivityData,
} from "./glossary-model";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);

const GlossarySchema = z.object({
  canaddentry: MoodleBooleanSchema.optional().default(false),
  cmid: z.number().int().positive().optional(),
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});

const GlossariesResponseSchema = z.object({ glossaries: z.array(GlossarySchema) });
const GlossaryEntriesResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  entries: z.array(GlossaryEntryWireSchema),
});

type GlossaryRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  siteUrl: string;
}>;

export async function readGlossaryActivity(
  request: GlossaryRequest,
): Promise<MoodleReadResult<GlossaryActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const glossaries = await client.call(
      MOODLE_FUNCTIONS.glossaries,
      { courseids: [request.courseId] },
      GlossariesResponseSchema,
    );
    const glossary = glossaries.data.glossaries.find((candidate) =>
      candidate.cmid === request.cmid || candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (glossary === undefined) return { kind: "ready", data: null };
    const entries = await client.call(
      MOODLE_FUNCTIONS.glossaryEntries,
      {
        id: glossary.id,
        letter: "ALL",
        from: 0,
        limit: 100,
        "options[includenotapproved]": false,
      },
      GlossaryEntriesResponseSchema,
    );
    return {
      kind: "ready",
      data: projectGlossaryActivity({
        canAdd: glossary.canaddentry,
        entries: entries.data.entries,
        id: glossary.id,
        name: glossary.name,
        siteUrl: request.siteUrl,
        total: entries.data.count,
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
