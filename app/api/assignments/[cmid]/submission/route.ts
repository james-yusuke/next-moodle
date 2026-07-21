import { requireMoodleSession } from "@/lib/auth/server";
import { MoodleClient } from "@/lib/moodle/server";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { handleAssignmentSubmissionRequest } from "@/lib/moodle/submission/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: Readonly<{ params: Promise<{ cmid: string }> }>,
): Promise<Response> {
  const { cmid } = await context.params;
  return handleAssignmentSubmissionRequest(request, cmid, {
    loadContext: async () => {
      const session = await requireMoodleSession();
      const client = new MoodleClient({
        config: {
          baseUrl: session.site.siteUrl,
          service: session.service,
          timeoutMs: 10_000,
        },
        token: session.token,
        availableFunctions: session.site.availableFunctions,
      });
      return { client, session };
    },
    now: currentUnixSeconds,
  });
}
