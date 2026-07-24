import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MoodleAuthError, MoodlePermissionError } from "@/lib/moodle/errors";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/model";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const RateAnswerSchema = z.record(z.string().regex(/^\d+$/), z.string().min(1).max(500)).refine(
  (value) => Object.keys(value).length <= 200,
  { message: "Too many rate answers" },
);

const InputSchema = z.object({
  action: z.enum(["save", "submit"]),
  answers: z.record(z.string().regex(/^\d+$/), z.union([
    z.string().max(10_000),
    z.array(z.string().max(2_000)).max(100),
    RateAnswerSchema,
  ])),
  responseId: z.number().int().nonnegative(),
});
const ResultSchema = z.object({
  responseid: z.number().int().nonnegative(),
  state: z.enum(["in_progress", "submitted"]),
  warnings: z.array(z.string()).max(20).default([]),
}).transform((result) => ({
  responseId: result.responseid,
  state: result.state,
  warnings: result.warnings,
}));

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 256_000) return Response.json({ ok: false, error: { code: "request_too_large" } }, { status: 413 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind === "failure") {
      const status = activity.reason === "permission" ? 403 : activity.reason === "auth_expired" ? 401 : 503;
      return Response.json({ ok: false, error: { code: activity.reason } }, { status });
    }
    if (activity.data?.companion?.activity?.kind !== "questionnaire" || !activity.data.companion.operations.includes(input.data.action)) {
      return Response.json({ ok: false, error: { code: "activity_not_supported" } }, { status: 403 });
    }
    const client = await createAuthenticatedMoodleClient();
    const result = await client.call(MOODLE_FUNCTIONS.executeActivityAction, {
      action: input.data.action,
      cmid: cmid.data,
      payloadjson: JSON.stringify({
        action: input.data.action === "submit" ? "submit" : "resume",
        answers: input.data.answers,
        completed: input.data.action === "submit" ? 1 : 0,
        responseId: input.data.responseId,
      }),
    }, ResultSchema);
    return Response.json({ ok: true, result: result.data });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof MoodlePermissionError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof MoodleAuthError) return Response.json({ ok: false, error: { code: error.code } }, { status: 401 });
    return Response.json({ ok: false, error: { code: "activity_action_failed" } }, { status: 502 });
  }
}
