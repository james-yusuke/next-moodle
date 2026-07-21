import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { assertSameOriginMutation } from "@/lib/auth/same-origin";
import { MoodleFunctionError } from "@/lib/moodle/errors";
import { markNotificationRead } from "@/lib/moodle/queries/notifications";
import { MoodleNotificationIdSchema } from "@/lib/moodle/identifiers";
import {
  notificationsErrorResponse,
  notificationsJson,
} from "../../_errors";
import { z } from "zod";

export const runtime = "nodejs";

const NotificationPathIdSchema = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .transform((value) => Number(value))
  .pipe(MoodleNotificationIdSchema);

type RouteContext = Readonly<{
  params: Promise<Readonly<{ id: string }>>;
}>;

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    assertSameOriginMutation(request);
    const { id } = await context.params;
    const parsedId = NotificationPathIdSchema.safeParse(id);
    if (!parsedId.success) {
      return notificationsJson(
        { ok: false, error: { code: "invalid_request" } },
        400,
      );
    }
    const session = await requireMoodleSession();
    if (session.manifest.features.notifications !== "available") {
      throw new MoodleFunctionError();
    }
    const client = await createAuthenticatedMoodleClient();
    await markNotificationRead(client, parsedId.data);
    return notificationsJson({ ok: true, id: parsedId.data });
  } catch (error) {
    if (error instanceof Error) {
      return notificationsErrorResponse(error);
    }
    return notificationsJson(
      { ok: false, error: { code: "internal_error" } },
      500,
    );
  }
}
