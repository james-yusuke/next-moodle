import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.object({ completed: z.boolean() });
const CompletionResponseSchema = z.object({ status: z.boolean(), warnings: z.array(z.unknown()).optional() });

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!cmid.success || !Number.isFinite(contentLength) || contentLength > 1_024) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const input = InputSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.completionUpdate !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const owned = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (owned.kind === "failure" || owned.data === null) return Response.json({ ok: false, error: { code: "activity_not_found" } }, { status: 404 });
    const client = await createAuthenticatedMoodleClient();
    await client.call(MOODLE_FUNCTIONS.updateActivityCompletion, { cmid: cmid.data, completed: input.data.completed }, CompletionResponseSchema);
    return Response.json({ ok: true, result: { completed: input.data.completed } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "completion_update_failed" } }, { status: 502 });
    throw error;
  }
}
