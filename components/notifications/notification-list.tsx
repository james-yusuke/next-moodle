"use client";

import styles from "./notification-list.module.css";
import { ArrowRight, Bell, Check } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge, Button, Card, EmptyState as UiEmptyState } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import {
  filterNotifications,
  type NotificationFilter,
  type NotificationView,
  type NotificationsData,
} from "@/lib/moodle/queries/notifications-schema";
import type { MoodleNotificationId } from "@/lib/moodle/identifiers";

type NotificationListProps = Readonly<{
  data: NotificationsData;
  filter: NotificationFilter;
  onMarkRead: (id: MoodleNotificationId) => void;
  pendingId: MoodleNotificationId | undefined;
  runtimeConfig: AppRuntimeConfig;
}>;

function EmptyState({ filter }: Readonly<{ filter: NotificationFilter }>) {
  return (
    <UiEmptyState icon={<Bell aria-hidden size={22} />} title={filter === "unread" ? "未読の通知はありません" : "通知はまだありません"}>
      {filter === "unread"
        ? "この画面を開いている間、新しい通知を60秒ごとに確認します。"
        : "Moodleから通知が届くと、ここに時系列で表示されます。"}
    </UiEmptyState>
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
    <li className={styles.style1!} data-unread={!notification.read}>
      {!notification.read ? <span aria-hidden className={styles.style2!} /> : null}
      <div className={styles.style3!}>
        <div className={styles.style4!}>
          <h2 className={styles.style5!}>{notification.subject}</h2>
          <time
            className={styles.style6!}
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
      <p className={styles.style7!}>{notification.message}</p>
      <div className={styles.style8!}>
        {notification.href ? (
          <Link
            className={styles.style9!}
            href={notification.href}
          >
            <ArrowRight aria-hidden size={18} weight="bold" />
            関連する活動を開く
          </Link>
        ) : (
          <span className={styles.style6!}>関連する活動へのリンクはありません。</span>
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
    <Card className={styles.notificationsInbox!} padding="compact" tone="default">
      <ul className={styles.style10!} aria-label="Moodleの通知">
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
    </Card>
  );
}
