import "server-only";

import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import type { MoodleClient } from "../client";
import {
  MoodleNotificationIdSchema,
  type MoodleNotificationId,
  type MoodleUserId,
} from "../identifiers";
import {
  MoodleNotificationsResponseSchema,
  MoodleUnreadNotificationCountSchema,
  type MoodleNotification,
} from "../dto";
import { MOODLE_FUNCTIONS } from "../functions";
import { MoodleResponseError } from "../errors";
import {
  NotificationsDataSchema,
  safeNotificationHref,
  type NotificationView,
  type NotificationsData,
} from "./notifications-schema";

const MARK_NOTIFICATION_READ_RESPONSE_SCHEMA = z.object({
  status: z.literal(true),
});

const NOTIFICATION_LIMIT = 50;

function notificationText(value: string | undefined, fallback: string): string {
  const text = sanitizeHtml(value ?? "", {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
  return text.length > 0 ? text : fallback;
}

export function projectNotification(
  notification: MoodleNotification,
  siteOrigin: string,
): NotificationView {
  const message = notificationText(
    notification.smallmessage || notification.fullmessage,
    "This Moodle notification has no message.",
  );
  const subject = notificationText(notification.subject, "Moodle notification");
  const read = notification.timeread !== undefined && notification.timeread > 0;
  return {
    id: notification.id,
    subject,
    message,
    timeCreated: notification.timecreated,
    read,
    href: safeNotificationHref(notification.contexturl, siteOrigin),
  };
}

export function projectNotifications(
  notifications: readonly MoodleNotification[],
  siteOrigin: string,
): readonly NotificationView[] {
  const projected = notifications.map((notification) =>
    projectNotification(notification, siteOrigin),
  );
  projected.sort((left, right) => right.timeCreated - left.timeCreated);
  return projected;
}

export async function loadNotifications(
  client: MoodleClient,
  userId: MoodleUserId,
  siteOrigin: string,
): Promise<NotificationsData> {
  const [notificationsResult, unreadResult] = await Promise.all([
    client.call(
      MOODLE_FUNCTIONS.notifications,
      {
        useridto: userId,
        newestfirst: true,
        limit: NOTIFICATION_LIMIT,
        offset: 0,
      },
      MoodleNotificationsResponseSchema,
    ),
    client.call(
      MOODLE_FUNCTIONS.unreadNotificationCount,
      { useridto: userId },
      MoodleUnreadNotificationCountSchema,
    ),
  ]);
  return NotificationsDataSchema.parse({
    notifications: projectNotifications(
      notificationsResult.data.notifications,
      siteOrigin,
    ),
    unreadCount: unreadResult.data.count,
  });
}

export async function markNotificationRead(
  client: MoodleClient,
  notificationId: MoodleNotificationId,
): Promise<void> {
  const parsedId = MoodleNotificationIdSchema.safeParse(notificationId);
  if (!parsedId.success) {
    throw new MoodleResponseError();
  }
  await client.call(
    MOODLE_FUNCTIONS.markNotificationRead,
    {
      notificationid: parsedId.data,
      timeread: Math.floor(Date.now() / 1_000),
    },
    MARK_NOTIFICATION_READ_RESPONSE_SCHEMA,
  );
}
