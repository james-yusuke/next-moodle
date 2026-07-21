import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { QuizAttemptsResponseSchema } from "@/lib/moodle/activities/quiz";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const ResponseItemSchema = z.object({
  name: z.string().min(1).max(240).regex(/^[a-zA-Z0-9_:\-]+$/),
  value: z.string().max(50_000),
});
const InputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.enum(["save", "finish"]),
    attemptId: z.number().int().positive(),
    responses: z.array(ResponseItemSchema).max(500),
  }).refine(
    (value) => value.responses.reduce((total, response) => total + response.value.length, 0) <= 200_000,
    { message: "response payload too large" },
  ),
]);
const StartResponseSchema = z.object({ attempt: z.object({ id: z.number().int().positive() }) });
const SaveResponseSchema = z.object({ status: z.boolean() });
const FinishResponseSchema = z.object({ state: z.string().min(1).max(80) });

function responseParams(
  responses: readonly z.infer<typeof ResponseItemSchema>[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(responses.flatMap((response, index) => [
    [`data[${index}][name]`, response.name],
    [`data[${index}][value]`, response.value],
  ]));
}

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 250_000) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    const input = InputSchema.safeParse(await request.json());
    if (!cmid.success || !input.success) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const session = await requireMoodleSession();
    if (session.manifest.features.quizzes !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    const activity = await readActivityWorkspace({
      cmid: cmid.data,
      manifest: session.manifest,
      siteUrl: session.site.siteUrl,
      userId: session.userId,
    });
    if (activity.kind !== "ready" || activity.data?.moduleType !== "quiz" || activity.data.instance === null) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const client = await createAuthenticatedMoodleClient();
    if (input.data.action === "start") {
      const result = await client.call(
        MOODLE_FUNCTIONS.startQuizAttempt,
        { quizid: activity.data.instance, forcenew: false },
        StartResponseSchema,
      );
      return Response.json({ ok: true, result: { attemptId: result.data.attempt.id } });
    }
    if (!("attemptId" in input.data)) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const mutation = input.data;
    const attempts = await client.call(
      MOODLE_FUNCTIONS.quizAttempts,
      { quizid: activity.data.instance, userid: session.userId, status: "all", includepreviews: false },
      QuizAttemptsResponseSchema,
    );
    const owned = attempts.data.attempts.some((attempt) =>
      attempt.id === mutation.attemptId && attempt.userid === session.userId && attempt.state === "inprogress"
    );
    if (!owned) {
      return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    }
    const params = { attemptid: mutation.attemptId, ...responseParams(mutation.responses) };
    if (mutation.action === "save") {
      await client.call(MOODLE_FUNCTIONS.saveQuizAttempt, params, SaveResponseSchema);
      return Response.json({ ok: true, result: { state: "saved" } });
    }
    const finished = await client.call(
      MOODLE_FUNCTIONS.processQuizAttempt,
      { ...params, finishattempt: true, timeup: false },
      FinishResponseSchema,
    );
    return Response.json({ ok: true, result: { state: finished.data.state } });
  } catch (error) {
    if (error instanceof SameOriginError) {
      return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    }
    if (error instanceof Error) {
      return Response.json({ ok: false, error: { code: "quiz_update_failed" } }, { status: 502 });
    }
    throw error;
  }
}
