import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { ChoiceOptionsResponseSchema } from "@/lib/moodle/activities/choice";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const InputSchema = z.object({ responses: z.array(z.number().int().positive()).min(1).max(100) });
const SubmitResponseSchema = z.object({ answers: z.array(z.unknown()).optional() });

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.choice !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "choice" || activity.data.instance === null) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const client = await createAuthenticatedMoodleClient();
    const options = await client.call(MOODLE_FUNCTIONS.choiceOptions, { choiceid: activity.data.instance }, ChoiceOptionsResponseSchema);
    const allowed = new Set(options.data.options.filter((option) => !option.disabled).map((option) => option.id));
    if (new Set(input.data.responses).size !== input.data.responses.length || input.data.responses.some((id) => !allowed.has(id))) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    await client.call(MOODLE_FUNCTIONS.submitChoice, { choiceid: activity.data.instance, responses: input.data.responses }, SubmitResponseSchema);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "choice_update_failed" } }, { status: 502 });
    throw error;
  }
}
