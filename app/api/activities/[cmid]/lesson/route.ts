import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readLessonActivity } from "@/lib/moodle/activities/lesson";
import { extractLessonResponseNames } from "@/lib/moodle/activities/lesson-model";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("launch") }),
  z.object({
    action: z.literal("process"),
    pageId: z.number().int().positive(),
    responses: z.array(z.object({
      name: z.string().regex(/^[a-z][a-z0-9_\[\]-]{0,79}$/i),
      value: z.string().max(20_000),
    })).max(100),
  }),
]);
const StatusResponseSchema = z.object({}).passthrough();
const ProcessResponseSchema = z.object({ newpageid: z.number().int() });

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const length = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length > 250_000) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.lesson !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "lesson" || activity.data.instance === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const client = await createAuthenticatedMoodleClient();
    if (input.data.action === "launch") {
      await client.call(MOODLE_FUNCTIONS.launchLessonAttempt, { lessonid: activity.data.instance, password: "", pageid: 0, review: false }, StatusResponseSchema);
      return Response.json({ ok: true, result: { completed: false, pageId: 0 } });
    }
    const page = await readLessonActivity({ cmid: cmid.data, courseId: activity.data.course.id, instance: activity.data.instance, pageId: input.data.pageId, siteUrl: session.site.siteUrl });
    if (page.kind !== "ready" || page.data === null || page.data.pageId !== input.data.pageId) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const allowed = new Set(extractLessonResponseNames(page.data.content));
    if (input.data.responses.some((response) => !allowed.has(response.name))) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const params: Record<string, string | number | boolean> = { lessonid: activity.data.instance, pageid: input.data.pageId, password: "", review: false };
    input.data.responses.forEach((response, index) => {
      params[`data[${index}][name]`] = response.name;
      params[`data[${index}][value]`] = response.value;
    });
    const processed = await client.call(MOODLE_FUNCTIONS.submitLessonAnswer, params, ProcessResponseSchema);
    const completed = processed.data.newpageid < 0;
    if (completed) await client.call(MOODLE_FUNCTIONS.finishLessonAttempt, { lessonid: activity.data.instance, password: "", outoftime: false, review: false }, StatusResponseSchema);
    return Response.json({ ok: true, result: { completed, pageId: processed.data.newpageid } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "lesson_update_failed" } }, { status: 502 });
    throw error;
  }
}
