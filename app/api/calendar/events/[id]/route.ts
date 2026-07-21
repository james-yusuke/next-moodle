import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCalendarEventIdSchema } from "@/lib/moodle/identifiers";

export const runtime = "nodejs";

const EventsSchema = z.object({ events: z.array(z.object({ id: MoodleCalendarEventIdSchema, eventtype: z.string(), userid: z.number().int().positive().optional() })) });
const StatusSchema = z.object({ status: z.boolean().optional(), warnings: z.array(z.unknown()).optional() });

export async function DELETE(request: Request, context: Readonly<{ params: Promise<{ id: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const eventId = MoodleCalendarEventIdSchema.safeParse(Number((await context.params).id));
    if (!eventId.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.features.calendarManage !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const client = await createAuthenticatedMoodleClient();
    const events = await client.call(MOODLE_FUNCTIONS.calendarEvents, { "events[eventids]": [eventId.data] }, EventsSchema);
    const owned = events.data.events.find((event) => event.id === eventId.data);
    if (owned === undefined || owned.eventtype !== "user" || (owned.userid !== undefined && owned.userid !== session.userId)) return Response.json({ ok: false, error: { code: "permission_denied" } }, { status: 403 });
    await client.call(MOODLE_FUNCTIONS.deleteCalendarEvents, { "events[0][eventid]": eventId.data, "events[0][repeat]": false }, StatusSchema);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "calendar_update_failed" } }, { status: 502 });
    throw error;
  }
}
