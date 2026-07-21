import { MoodleCourseIdSchema } from "@/lib/moodle/model";
import { readTeacherRoleShortnames } from "@/lib/moodle/messages/teacher-config";
import { sealTeacherRecipientKey } from "@/lib/moodle/messages/teacher-recipient";
import { readCourseTeacherCandidates } from "@/lib/moodle/messages/teachers";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { requireMoodleSession } from "@/lib/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const courseId = MoodleCourseIdSchema.safeParse(Number(new URL(request.url).searchParams.get("courseId")));
    if (!courseId.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const secret = process.env.SESSION_PASSWORD;
    if (secret === undefined) return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const session = await requireMoodleSession();
    const teachers = await readCourseTeacherCandidates({
      courseId: courseId.data,
      roleShortnames: readTeacherRoleShortnames(),
      siteUrl: session.site.siteUrl,
      viewerId: session.userId,
    });
    if (teachers.kind === "failure") return Response.json({ ok: false, error: { code: teachers.reason } }, { status: teachers.reason === "permission" ? 403 : 503 });
    const expiresAt = currentUnixSeconds() + 10 * 60;
    return Response.json({
      ok: true,
      result: teachers.data.map((teacher) => ({
        avatarUrl: teacher.avatarUrl,
        canMessage: session.manifest.operations["message.sendDirect"] === "available",
        displayName: teacher.displayName,
        recipientKey: sealTeacherRecipientKey({
          courseId: courseId.data,
          expiresAt,
          recipientId: teacher.id,
          secret,
          siteUrl: session.site.siteUrl,
          viewerId: session.userId,
        }),
        roles: teacher.roles,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ ok: false, error: { code: "teacher_lookup_failed" } }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
