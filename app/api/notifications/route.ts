import { requireMoodleSession, createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { MoodleFunctionError } from "@/lib/moodle/errors";
import {
  loadNotifications,
} from "@/lib/moodle/queries/notifications";
import {
  filterNotifications,
  NotificationFilterSchema,
  type NotificationFilter,
} from "@/lib/moodle/queries/notifications-schema";
import {
  notificationsErrorResponse,
  notificationsJson,
} from "./_errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readFilter(request: Request): NotificationFilter | null {
  const value = new URL(request.url).searchParams.get("filter") ?? "all";
  const parsed = NotificationFilterSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireMoodleSession();
    if (!session.capabilities.notifications) {
      throw new MoodleFunctionError();
    }
    const filter = readFilter(request);
    if (filter === null) {
      return notificationsJson(
        { ok: false, error: { code: "invalid_request" } },
        400,
      );
    }
    const client = await createAuthenticatedMoodleClient();
    const data = await loadNotifications(
      client,
      session.userId,
      session.site.siteUrl,
    );
    return notificationsJson({
      ok: true,
      filter,
      notifications: filterNotifications(data.notifications, filter),
      unreadCount: data.unreadCount,
    });
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
