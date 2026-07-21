"use client";

import { ArrowSquareOut, Bell, Check } from "@phosphor-icons/react";

import { Badge, Button, Surface } from "@/components/ui";
import {
  filterNotifications,
  type NotificationFilter,
  type NotificationView,
  type NotificationsData,
} from "@/lib/moodle/queries/notifications-schema";
import type { MoodleNotificationId } from "@/lib/moodle/identifiers";

import styles from "./notifications.module.css";

type NotificationListProps = Readonly<{
  data: NotificationsData;
  filter: NotificationFilter;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
}>;

const timeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function notificationTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp * 1_000));
}

function EmptyState({ filter }: Readonly<{ filter: NotificationFilter }>) {
  return (
    <div className={styles.empty} role="status">
      <h2 className={styles.emptyTitle}>
        {filter === "unread" ? "You are all caught up" : "No notifications yet"}
      </h2>
      <p className={styles.emptyBody}>
        {filter === "unread"
          ? "New Moodle updates will appear here while this page is visible."
          : "Moodle has not sent any notifications for this account."}
      </p>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  pendingId,
}: Readonly<{
  notification: NotificationView;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
}>) {
  const isPending = pendingId === notification.id;
  return (
    <li className={styles.item} data-unread={!notification.read}>
      <div className={styles.itemHeader}>
        <div className={styles.itemHeading}>
          <h2 className={styles.subject}>{notification.subject}</h2>
          <time
            className={styles.meta}
            dateTime={new Date(notification.timeCreated * 1_000).toISOString()}
          >
            {notificationTime(notification.timeCreated)} UTC
          </time>
        </div>
        <Badge
          icon={notification.read ? <Check weight="bold" /> : <Bell weight="bold" />}
          tone={notification.read ? "neutral" : "accent"}
        >
          {notification.read ? "Read" : "Unread"}
        </Badge>
      </div>
      <p className={styles.message}>{notification.message}</p>
      <div className={styles.itemActions}>
        {notification.href ? (
          <a
            className={styles.activity}
            href={notification.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ArrowSquareOut aria-hidden size={18} weight="bold" />
            Open related activity
          </a>
        ) : (
          <span className={styles.fallback}>Related activity link unavailable.</span>
        )}
        {!notification.read ? (
          <Button
            disabled={isPending}
            icon={<Check aria-hidden size={17} weight="bold" />}
            loading={isPending}
            onClick={() => onMarkRead(notification.id)}
            size="compact"
            variant="ghost"
          >
            Mark as read
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function NotificationList({
  data,
  filter,
  onMarkRead,
  pendingId,
}: NotificationListProps) {
  const visibleNotifications = filterNotifications(data.notifications, filter);
  if (visibleNotifications.length === 0) {
    return <EmptyState filter={filter} />;
  }
  return (
    <Surface variant="base">
      <ul className={styles.list} aria-label="Moodle notifications">
        {visibleNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            pendingId={pendingId}
          />
        ))}
      </ul>
    </Surface>
  );
}
