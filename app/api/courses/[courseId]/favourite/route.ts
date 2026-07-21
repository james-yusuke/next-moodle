import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseIdSchema } from "@/lib/moodle/identifiers";
import { MoodleEnrolledCoursesResponseSchema } from "@/lib/moodle/server";

export const runtime = "nodejs";

const InputSchema = z.object({ favourite: z.boolean() });
const ResponseSchema = z.array(z.unknown()).max(100);

export async function POST(request: Request, context: Readonly<{ params: Promise<{ courseId: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    if (Number(request.headers.get("content-length") ?? "0") > 1_024) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const courseId = MoodleCourseIdSchema.safeParse(Number((await context.params).courseId));
    const input = InputSchema.safeParse(await request.json());
    if (!courseId.success || !input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.favorites !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const client = await createAuthenticatedMoodleClient();
    const courses = await client.call(MOODLE_FUNCTIONS.enrolledCourses, { userid: session.userId }, MoodleEnrolledCoursesResponseSchema);
    if (!courses.data.some((course) => course.id === courseId.data && course.visible !== 0)) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    await client.call(MOODLE_FUNCTIONS.setFavouriteCourses, { "courses[0][favourite]": input.data.favourite, "courses[0][id]": courseId.data }, ResponseSchema);
    return Response.json({ ok: true, result: { favourite: input.data.favourite } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "course_update_failed" } }, { status: 502 });
    throw error;
  }
}
