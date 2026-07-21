import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readWorkshopActivity } from "@/lib/moodle/activities/workshop";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.object({
  content: z.string().max(100_000),
  submissionId: z.number().int().positive().nullable(),
  title: z.string().trim().min(1).max(255),
});
const StatusResponseSchema = z.object({ status: z.boolean() });

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    if (Number(request.headers.get("content-length") ?? "0") > 150_000) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.workshop !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "workshop" || activity.data.instance === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const workshop = await readWorkshopActivity({ cmid: cmid.data, courseId: activity.data.course.id, instance: activity.data.instance, siteUrl: session.site.siteUrl, userId: session.userId });
    if (workshop.kind !== "ready" || workshop.data === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const client = await createAuthenticatedMoodleClient();
    if (input.data.submissionId === null) {
      if (!workshop.data.canCreate) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
      const result = await client.call(MOODLE_FUNCTIONS.addWorkshopSubmission, { attachmentsid: 0, content: input.data.content, contentformat: 2, inlineattachmentsid: 0, title: input.data.title, workshopid: workshop.data.id }, StatusResponseSchema);
      if (!result.data.status) return Response.json({ ok: false, error: { code: "validation_failed" } }, { status: 422 });
    } else {
      if (!workshop.data.canModify || !workshop.data.submissions.some((submission) => submission.id === input.data.submissionId)) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
      const result = await client.call(MOODLE_FUNCTIONS.updateWorkshopSubmission, { attachmentsid: 0, content: input.data.content, contentformat: 2, inlineattachmentsid: 0, submissionid: input.data.submissionId, title: input.data.title }, StatusResponseSchema);
      if (!result.data.status) return Response.json({ ok: false, error: { code: "validation_failed" } }, { status: 422 });
    }
    return Response.json({ ok: true, result: { state: "saved" } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "workshop_update_failed" } }, { status: 502 });
    throw error;
  }
}
