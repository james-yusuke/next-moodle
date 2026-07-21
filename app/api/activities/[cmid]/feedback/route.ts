import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { readFeedbackActivity } from "@/lib/moodle/activities/feedback";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import type { MoodleParams } from "@/lib/moodle/params";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("launch") }),
  z.object({
    action: z.literal("process"),
    page: z.number().int().min(0).max(1_000),
    previous: z.boolean(),
    responses: z.array(z.object({
      name: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
      value: z.string().max(20_000),
    })).max(100),
  }),
]);
const LaunchResponseSchema = z.object({ gopage: z.number().int() });
const ProcessResponseSchema = z.object({ completed: z.boolean(), jumpto: z.number().int() });

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 250_000) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.feedback !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "feedback" || activity.data.instance === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const client = await createAuthenticatedMoodleClient();
    if (input.data.action === "launch") {
      const launch = await client.call(MOODLE_FUNCTIONS.launchFeedback, { feedbackid: activity.data.instance, courseid: activity.data.course.id }, LaunchResponseSchema);
      return Response.json({ ok: true, result: { completed: launch.data.gopage < 0, page: launch.data.gopage } });
    }
    const current = await readFeedbackActivity({ cmid: cmid.data, courseId: activity.data.course.id, instance: activity.data.instance, page: input.data.page });
    if (current.kind !== "ready" || current.data === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    const allowed = new Set(current.data.items.filter((item) => item.kind !== "display" && item.kind !== "unsupported").map((item) => item.responseName));
    if (input.data.responses.some((response) => !allowed.has(response.name))) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const params: Record<string, string | number | boolean> = {
      feedbackid: activity.data.instance,
      page: input.data.page,
      goprevious: input.data.previous,
      courseid: activity.data.course.id,
    };
    input.data.responses.forEach((response, index) => {
      params[`responses[${index}][name]`] = response.name;
      params[`responses[${index}][value]`] = response.value;
    });
    const processed = await client.call(MOODLE_FUNCTIONS.submitFeedback, params satisfies MoodleParams, ProcessResponseSchema);
    return Response.json({ ok: true, result: { completed: processed.data.completed, page: processed.data.jumpto } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "feedback_update_failed" } }, { status: 502 });
    throw error;
  }
}
