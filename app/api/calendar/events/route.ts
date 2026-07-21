import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";

export const runtime = "nodejs";

const InputSchema = z.object({ name: z.string().trim().min(1).max(200), startsAt: z.iso.datetime({ offset: true }) });
const CreateResponseSchema = z.object({ events: z.array(z.object({ id: z.number().int().positive() })), warnings: z.array(z.unknown()).optional() });

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 4_096) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const input = InputSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.calendarManage !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const client = await createAuthenticatedMoodleClient();
    const result = await client.call(MOODLE_FUNCTIONS.createCalendarEvents, {
      "events[0][name]": input.data.name,
      "events[0][description]": "",
      "events[0][format]": 2,
      "events[0][courseid]": 0,
      "events[0][groupid]": 0,
      "events[0][repeats]": 0,
      "events[0][eventtype]": "user",
      "events[0][timestart]": Math.floor(new Date(input.data.startsAt).getTime() / 1_000),
      "events[0][timeduration]": 0,
      "events[0][visible]": 1,
    }, CreateResponseSchema);
    return Response.json({ ok: true, result: { id: result.data.events[0]?.id ?? null } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "calendar_update_failed" } }, { status: 502 });
    throw error;
  }
}
