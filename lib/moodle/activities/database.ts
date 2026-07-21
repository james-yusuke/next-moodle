import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";
import {
  projectDatabaseActivity,
  type DatabaseActivityData,
} from "./database-model";

const MoodleBooleanSchema = z.union([z.boolean(), z.number().int().min(0).max(1)])
  .transform((value) => value === true || value === 1);
const DatabaseSchema = z.object({
  course: z.number().int().positive(),
  coursemodule: z.number().int().positive().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
});
const DatabasesResponseSchema = z.object({ databases: z.array(DatabaseSchema) });
const DatabaseAccessSchema = z.object({ canaddentry: MoodleBooleanSchema });
export const DatabaseFieldsResponseSchema = z.object({
  fields: z.array(z.object({
    description: z.string().max(100_000).optional().default(""),
    id: z.number().int().positive(),
    name: z.string().min(1).max(16_384),
    param1: z.string().nullable().optional().default(null),
    required: MoodleBooleanSchema.optional().default(false),
    type: z.string().min(1).max(64),
  })).max(200),
});
const DatabaseEntriesResponseSchema = z.object({
  listviewcontents: z.string().max(2_000_000).optional().default(""),
  totalcount: z.number().int().nonnegative(),
});

type DatabaseRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  siteUrl: string;
}>;

export async function readDatabaseActivity(
  request: DatabaseRequest,
): Promise<MoodleReadResult<DatabaseActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const databases = await client.call(
      MOODLE_FUNCTIONS.databases,
      { courseids: [request.courseId] },
      DatabasesResponseSchema,
    );
    const database = databases.data.databases.find((candidate) =>
      candidate.coursemodule === request.cmid || candidate.id === request.instance
    );
    if (database === undefined) return { kind: "ready", data: null };
    const [access, fields, entries] = await Promise.all([
      client.call(MOODLE_FUNCTIONS.databaseAccess, { databaseid: database.id, groupid: 0 }, DatabaseAccessSchema),
      client.call(MOODLE_FUNCTIONS.databaseFields, { databaseid: database.id }, DatabaseFieldsResponseSchema),
      client.call(MOODLE_FUNCTIONS.databaseEntries, {
        databaseid: database.id,
        groupid: 0,
        order: "DESC",
        page: 0,
        perpage: 50,
        returncontents: true,
        sort: 0,
      }, DatabaseEntriesResponseSchema),
    ]);
    return {
      kind: "ready",
      data: projectDatabaseActivity({
        canAdd: access.data.canaddentry,
        entriesHtml: entries.data.listviewcontents,
        fields: fields.data.fields,
        id: database.id,
        name: database.name,
        siteUrl: request.siteUrl,
        total: entries.data.totalcount,
      }),
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
