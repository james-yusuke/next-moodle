import { z } from "zod";

import { SameOriginError, assertSameOriginMutation } from "@/lib/auth/same-origin";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { readConversation } from "@/lib/moodle/queries/student";

export const runtime = "nodejs";

const WarningsSchema = z.array(z.unknown()).max(100);

export async function POST(request: Request, context: Readonly<{ params: Promise<{ conversationId: string }> }>): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const conversationId = Number((await context.params).conversationId);
    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
      return Response.json({ ok: false, error: { code: "invalid_request" } }, { status: 400 });
    }
    const session = await requireMoodleSession();
    if (session.manifest.operations["message.markRead"] !== "available") {
      return Response.json({ ok: false, error: { code: "configuration_error" } }, { status: 503 });
    }
    const conversation = await readConversation(session.userId, conversationId);
    if (conversation.kind === "failure") {
      return Response.json({ ok: false, error: { code: conversation.reason } }, { status: conversation.reason === "permission" ? 403 : 502 });
    }
    const client = await createAuthenticatedMoodleClient();
    await client.call(MOODLE_FUNCTIONS.markConversationRead, {
      conversationid: conversationId,
      userid: session.userId,
    }, WarningsSchema);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof SameOriginError) return Response.json({ ok: false, error: { code: error.code } }, { status: 403 });
    if (error instanceof Error) return Response.json({ ok: false, error: { code: "message_read_failed" } }, { status: 502 });
    throw error;
  }
}
