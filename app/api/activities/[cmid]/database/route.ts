import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readDatabaseActivity } from "@/lib/moodle/activities/database";
import { encodeDatabaseFieldValue } from "@/lib/moodle/activities/database-model";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import type { MoodleParams } from "@/lib/moodle/params";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.object({ values: z.array(z.object({
  fieldId: z.number().int().positive(),
  value: z.union([z.string().max(50_000), z.array(z.string().max(4_000)).max(200)]),
})).max(200) });
const AddEntryResponseSchema = z.object({ newentryid: z.number().int().nonnegative() });

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    if (Number(request.headers.get("content-length") ?? "0") > 300_000) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.database !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "data" || activity.data.instance === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const database = await readDatabaseActivity({ cmid: cmid.data, courseId: activity.data.course.id, instance: activity.data.instance, siteUrl: session.site.siteUrl });
    if (database.kind !== "ready" || database.data === null || !database.data.canAdd) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const fieldsById = new Map(database.data.fields.map((field) => [field.id, field]));
    if (input.data.values.some(({ fieldId }) => fieldsById.get(fieldId)?.kind === undefined || fieldsById.get(fieldId)?.kind === "unsupported")) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const submitted = new Map(input.data.values.map((value) => [value.fieldId, value.value]));
    if (database.data.fields.some((field) => field.required && !submitted.has(field.id))) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const params: Record<string, string | number> = { databaseid: database.data.id, groupid: 0 };
    input.data.values.forEach((value, index) => {
      const field = fieldsById.get(value.fieldId);
      if (field === undefined) return;
      params[`data[${index}][fieldid]`] = value.fieldId;
      params[`data[${index}][subfield]`] = "";
      params[`data[${index}][value]`] = encodeDatabaseFieldValue(field, value.value);
    });
    const client = await createAuthenticatedMoodleClient();
    const added = await client.call(MOODLE_FUNCTIONS.addDatabaseEntry, params satisfies MoodleParams, AddEntryResponseSchema);
    if (added.data.newentryid === 0) return Response.json({ ok: false, error: { code: "validation_failed" } }, { status: 422 });
    return Response.json({ ok: true, result: { entryId: added.data.newentryid } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "database_update_failed" } }, { status: 502 });
    throw error;
  }
}
