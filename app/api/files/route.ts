import { requireMoodleSession } from "@/lib/auth/server";
import { MoodleAuthError } from "@/lib/moodle/errors";
import {
  MoodleFileProxyError,
  proxyMoodleFile,
} from "@/lib/security/moodle-file-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url).searchParams.get("url");
    if (url === null) {
      return Response.json({ ok: false, error: { code: "invalid_file_target" } }, {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    return await proxyMoodleFile(await requireMoodleSession(), url);
  } catch (error) {
    const code = error instanceof MoodleAuthError
      ? "authentication_failed"
      : error instanceof MoodleFileProxyError
        ? error.code
        : "file_not_available";
    const status = error instanceof MoodleAuthError ? 401 : 400;
    return Response.json({ ok: false, error: { code } }, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
