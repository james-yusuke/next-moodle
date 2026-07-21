import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { readConversation } from "@/lib/moodle/queries/student";

export const runtime = "nodejs";

const InputSchema = z.object({ text: z.string().trim().min(1).max(10_000) });
const ResponseSchema = z.array(z.object({ msgid: z.number().int().nonnegative().optional() }));

export async function POST(request: Request, context: Readonly<{ params: Promise<{ conversationId: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > 20_000) return Response.json({ ok: false, error: { code: "request_too_large" } }, { status: 413 });
    const conversationId = Number((await context.params).conversationId);
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const input = InputSchema.safeParse(await request.json());
    if (!input.success) return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    const session = await requireMoodleSession();
    if (session.manifest.operations["message.sendConversation"] !== "available") return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    const owned = await readConversation(session.userId, conversationId);
    if (owned.kind === "failure") return Response.json({ ok: false, error: { code: owned.reason } }, { status: 503 });
    const client = await createAuthenticatedMoodleClient();
    await client.call(MOODLE_FUNCTIONS.sendConversationMessages, {
      conversationid: conversationId,
      "messages[0][text]": input.data.text,
      "messages[0][textformat]": 2,
    }, ResponseSchema);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "message_send_failed" } }, { status: 502 });
    throw error;
  }
}
