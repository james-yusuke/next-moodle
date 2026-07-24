import { z } from "zod";

import { MoodleNotificationIdSchema } from "../identifiers";
import { safeMoodleDestination } from "../urls";

export const NotificationFilterSchema = z.enum(["unread", "all"]);
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

export const NotificationViewSchema = z.object({
  id: MoodleNotificationIdSchema,
  subject: z.string().min(1).max(512),
  message: z.string().max(16_384),
  timeCreated: z.number().int().nonnegative(),
  read: z.boolean(),
  href: z.string().min(1).nullable(),
});
export type NotificationView = Readonly<z.infer<typeof NotificationViewSchema>>;

export const NotificationsDataSchema = z.object({
  notifications: z.array(NotificationViewSchema),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationsData = Readonly<z.infer<typeof NotificationsDataSchema>>;

export const NotificationsApiSuccessSchema = z.object({
  ok: z.literal(true),
  filter: NotificationFilterSchema,
  ...NotificationsDataSchema.shape,
});

export type NotificationsApiSuccess = Readonly<
  z.infer<typeof NotificationsApiSuccessSchema>
>;

export const NotificationsPageStateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ready"), data: NotificationsDataSchema }),
  z.object({ kind: z.literal("capability") }),
  z.object({ kind: z.literal("auth") }),
  z.object({ kind: z.literal("permission") }),
  z.object({ kind: z.literal("outage") }),
  z.object({ kind: z.literal("error") }),
]);

export type NotificationsPageState = Readonly<
  z.infer<typeof NotificationsPageStateSchema>
>;

export function filterNotifications(
  notifications: readonly NotificationView[],
  filter: NotificationFilter,
): readonly NotificationView[] {
  if (filter === "all") {
    return notifications;
  }
  return notifications.filter((notification) => !notification.read);
}

export function safeNotificationHref(
  value: string | undefined,
  siteOrigin: string,
): string | null {
  return safeMoodleDestination(value, siteOrigin);
}
