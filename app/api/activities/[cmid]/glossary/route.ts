import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.object({
  concept: z.string().trim().min(1).max(200),
  definition: z.string().trim().min(1).max(20_000),
});
const ResponseSchema = z.object({ entryid: z.number().int().positive() });

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 32_000) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const session = await requireMoodleSession();
    if (session.manifest.features.glossary !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "glossary" || activity.data.instance === null) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const client = await createAuthenticatedMoodleClient();
    const created = await client.call(MOODLE_FUNCTIONS.addGlossaryEntry, {
      glossaryid: activity.data.instance,
      concept: input.data.concept,
      definition: input.data.definition,
      definitionformat: 2,
    }, ResponseSchema);
    return Response.json({ ok: true, result: { entryId: created.data.entryid } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "glossary_update_failed" } }, { status: 502 });
    throw error;
  }
}
