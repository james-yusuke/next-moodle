import { z } from "zod";

import { MoodleNotificationIdSchema } from "../identifiers";

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

function hasSensitiveQueryKey(key: string): boolean {
  return /(token|secret|password|credential|private|api[-_]?key)/i.test(key);
}

export function safeNotificationHref(
  value: string | undefined,
  siteOrigin: string,
): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    const base = new URL(siteOrigin);
    const candidate = new URL(value);
    if (
      candidate.origin !== base.origin ||
      (candidate.protocol !== "http:" && candidate.protocol !== "https:") ||
      candidate.username !== "" ||
      candidate.password !== ""
    ) {
      return null;
    }

    const queryEntries = [...candidate.searchParams.entries()];
    if (queryEntries.some(([key]) => hasSensitiveQueryKey(key))) {
      return null;
    }
    const safeSearch = new URLSearchParams();
    for (const [key, queryValue] of queryEntries) {
      safeSearch.append(key, queryValue);
    }
    candidate.search = safeSearch.toString();
    candidate.hash = "";
    return `${candidate.pathname}${candidate.search}`;
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}
