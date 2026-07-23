import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { isSafeLaunchEndpoint } from "@/lib/moodle/activities/launch-model";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseModuleIdSchema } from "@/lib/moodle/identifiers";
import { readActivityWorkspace } from "@/lib/moodle/queries/activity";

export const runtime = "nodejs";

const LtiLaunchSchema = z.object({
  endpoint: z.string().max(4_096),
  parameters: z.array(z.object({
    name: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
    value: z.string().max(100_000),
  })).max(500),
});
const BigBlueButtonLaunchSchema = z.object({ join_url: z.string().max(8_192).optional() });
const RuntimeTicketSchema = z.object({
  expiresat: z.number().int().positive(),
  ticket: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
});

export async function POST(request: Request, context: Readonly<{ params: Promise<{ cmid: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    if (Number(request.headers.get("content-length") ?? "0") > 1_024) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const cmid = MoodleCourseModuleIdSchema.safeParse(Number((await context.params).cmid));
    if (!cmid.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    const activity = await readActivityWorkspace({ cmid: cmid.data, manifest: session.manifest, siteUrl: session.site.siteUrl, userId: session.userId });
    if (activity.kind !== "ready" || activity.data === null || activity.data.instance === null) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    if (activity.data.moduleType === "url") {
      return Response.json({ ok: false, error: { code: "navigate_to_source" } }, { status: 409 });
    }
    const client = await createAuthenticatedMoodleClient();
    if ((activity.data.moduleType === "scorm" || activity.data.moduleType === "h5pactivity") &&
      session.manifest.companion.contractVersion === 2) {
      const originHeader = request.headers.get("origin");
      if (originHeader === null) return Response.json({ ok: false, error: { code: "origin_rejected" } }, { status: 403 });
      const origin = new URL(originHeader).origin;
      const ticket = await client.call(
        MOODLE_FUNCTIONS.createRuntimeTicket,
        { cmid: cmid.data, origin },
        RuntimeTicketSchema,
      );
      const runtimeUrl = new URL("/local/nextmoodle/runtime.php", session.site.siteUrl);
      runtimeUrl.searchParams.set("ticket", ticket.data.ticket);
      return Response.json({
        ok: true,
        result: {
          expiresAt: ticket.data.expiresat,
          kind: "runtime",
          url: runtimeUrl.toString(),
        },
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (activity.data.moduleType === "lti" && session.manifest.features.lti === "available") {
      const launch = await client.call(MOODLE_FUNCTIONS.ltiLaunchData, { toolid: activity.data.instance }, LtiLaunchSchema);
      if (!isSafeLaunchEndpoint(launch.data.endpoint)) return Response.json({ ok: false, error: { code: "unsafe_launch_url" } }, { status: 502 });
      return Response.json({ ok: true, result: { endpoint: launch.data.endpoint, kind: "lti", parameters: launch.data.parameters } });
    }
    if (activity.data.moduleType === "bigbluebuttonbn" && session.manifest.features.bigBlueButton === "available") {
      const launch = await client.call(MOODLE_FUNCTIONS.bigBlueButtonJoin, { cmid: cmid.data, groupid: 0 }, BigBlueButtonLaunchSchema);
      if (launch.data.join_url === undefined || !isSafeLaunchEndpoint(launch.data.join_url)) return Response.json({ ok: false, error: { code: "unsafe_launch_url" } }, { status: 502 });
      return Response.json({ ok: true, result: { kind: "bigbluebuttonbn", url: launch.data.join_url } });
    }
    return Response.json({ ok: false, error: { code: "unsupported_activity" } }, { status: 400 });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "launch_failed" } }, { status: 502 });
    throw error;
  }
}
