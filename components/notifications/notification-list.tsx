"use client";

import { ArrowRight, Bell, Check } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge, Button } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
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
  runtimeConfig: AppRuntimeConfig;
}>;

function EmptyState({ filter }: Readonly<{ filter: NotificationFilter }>) {
  return (
    <div className={styles.empty} role="status">
      <h2 className={styles.emptyTitle}>
        {filter === "unread" ? "未読の通知はありません" : "通知はまだありません"}
      </h2>
      <p className={styles.emptyBody}>
        {filter === "unread"
          ? "この画面を開いている間、新しい通知を60秒ごとに確認します。"
          : "Moodleから通知が届くと、ここに時系列で表示されます。"}
      </p>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  pendingId,
  timeFormatter,
}: Readonly<{
  notification: NotificationView;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
  timeFormatter: Intl.DateTimeFormat;
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
            {timeFormatter.format(new Date(notification.timeCreated * 1_000))}
          </time>
        </div>
        <Badge
          icon={notification.read ? <Check weight="bold" /> : <Bell weight="bold" />}
          tone={notification.read ? "neutral" : "accent"}
        >
          {notification.read ? "既読" : "未読"}
        </Badge>
      </div>
      <p className={styles.message}>{notification.message}</p>
      <div className={styles.itemActions}>
        {notification.href ? (
          <Link
            className={styles.activity}
            href={notification.href}
          >
            <ArrowRight aria-hidden size={18} weight="bold" />
            関連する活動を開く
          </Link>
        ) : (
          <span className={styles.fallback}>関連する活動へのリンクはありません。</span>
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
            既読にする
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
  runtimeConfig,
}: NotificationListProps) {
  const visibleNotifications = filterNotifications(data.notifications, filter);
  const timeFormatter = dateTimeFormatter(runtimeConfig.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: runtimeConfig.timeZone,
  });
  if (visibleNotifications.length === 0) {
    return <EmptyState filter={filter} />;
  }
  return (
    <div className={styles.inbox}>
      <ul className={styles.list} aria-label="Moodleの通知">
        {visibleNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            pendingId={pendingId}
            timeFormatter={timeFormatter}
          />
        ))}
      </ul>
    </div>
  );
}
