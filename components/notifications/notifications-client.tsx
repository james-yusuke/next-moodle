"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button, Notice } from "@/components/ui";
import {
  NotificationsApiSuccessSchema,
  type NotificationFilter,
  type NotificationsData,
  type NotificationsPageState,
} from "@/lib/moodle/queries/notifications-schema";
import type { MoodleNotificationId } from "@/lib/moodle/identifiers";

import { createNotificationPoller } from "./polling";
import { NotificationList } from "./notification-list";
import { NotificationStatusNotice } from "./status-notice";
import styles from "./notifications.module.css";

type NotificationsClientProps = Readonly<{
  initialState: NotificationsPageState;
}>;

function updateReadState(
  data: NotificationsData,
  notificationId: MoodleNotificationId,
  read: boolean,
): NotificationsData {
  const target = data.notifications.find((item) => item.id === notificationId);
  if (target === undefined || target.read === read) {
    return data;
  }
  return {
    notifications: data.notifications.map((item) =>
      item.id === notificationId ? { ...item, read } : item,
    ),
    unreadCount: Math.max(0, data.unreadCount + (read ? -1 : 1)),
  };
}

export function mergeNotificationData(
  current: NotificationsData,
  next: NotificationsData,
  locallyReadIds: ReadonlySet<number> = new Set<number>(),
): NotificationsData {
  const nextIds = new Set(next.notifications.map((item) => item.id));
  const retainedRead = current.notifications.filter(
    (item) =>
      !nextIds.has(item.id) &&
      (item.read || locallyReadIds.has(item.id)),
  );
  const notifications = [...next.notifications, ...retainedRead].sort(
    (left, right) => right.timeCreated - left.timeCreated,
  );
  return { notifications, unreadCount: next.unreadCount };
}

export function NotificationsClient({
  initialState,
}: NotificationsClientProps) {
  const [pageState, setPageState] = useState(initialState);
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [pendingId, setPendingId] = useState<MoodleNotificationId | undefined>();
  const [pollError, setPollError] = useState(false);
  const [readError, setReadError] = useState(false);
  const locallyReadIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (pageState.kind !== "ready") {
      return undefined;
    }
    const poller = createNotificationPoller({
      isVisible: () => document.visibilityState === "visible",
      schedule: (callback, delay) => window.setTimeout(callback, delay),
      cancel: (id) => window.clearTimeout(id),
      fetchNotifications: async (signal) => {
        const response = await fetch("/api/notifications?filter=all", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
          signal,
        });
        if (response.status === 401) {
          setPageState({ kind: "auth" });
          return;
        }
        if (!response.ok) {
          throw new Error("Notification polling failed.");
        }
        const payload: unknown = await response.json();
        const parsed = NotificationsApiSuccessSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Notification polling returned an invalid response.");
        }
        setPageState((current) => {
          if (current.kind !== "ready") {
            return current;
          }
          return {
            kind: "ready",
            data: mergeNotificationData(
              current.data,
              parsed.data,
              locallyReadIds.current,
            ),
          };
        });
        setPollError(false);
      },
      onError: () => setPollError(true),
    });
    const onVisibilityChange = (): void => {
      poller.setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    poller.start();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      poller.stop();
    };
  }, [pageState.kind]);

  const markRead = async (notificationId: MoodleNotificationId): Promise<void> => {
    if (pendingId !== undefined || pageState.kind !== "ready") {
      return;
    }
    const target = pageState.data.notifications.find(
      (item) => item.id === notificationId,
    );
    if (target === undefined || target.read) {
      return;
    }
    locallyReadIds.current.add(notificationId);
    setReadError(false);
    setPendingId(notificationId);
    setPageState((current) =>
      current.kind === "ready"
        ? { kind: "ready", data: updateReadState(current.data, notificationId, true) }
        : current,
    );
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.status === 401) {
        locallyReadIds.current.delete(notificationId);
        setPageState({ kind: "auth" });
        return;
      }
      if (!response.ok) {
        locallyReadIds.current.delete(notificationId);
        setPageState((current) =>
          current.kind === "ready"
            ? { kind: "ready", data: updateReadState(current.data, notificationId, false) }
            : current,
        );
        setReadError(true);
      }
    } catch (error) {
      locallyReadIds.current.delete(notificationId);
      setPageState((current) =>
        current.kind === "ready"
          ? { kind: "ready", data: updateReadState(current.data, notificationId, false) }
          : current,
      );
      if (error instanceof Error) {
        setReadError(true);
      } else {
        throw error;
      }
    } finally {
      setPendingId(undefined);
    }
  };

  return (
    <main className={styles.page} aria-labelledby="notifications-title">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title} id="notifications-title">
            Notifications
          </h1>
          <p className={styles.description}>
            Keep track of feedback, announcements, and other updates from Moodle.
          </p>
        </div>
        <div className={styles.controls}>
          <div className={styles.filterGroup} role="group" aria-label="Notification filters">
            <Button
              aria-pressed={filter === "unread"}
              className={styles.filterButton}
              data-selected={filter === "unread"}
              onClick={() => setFilter("unread")}
              variant="ghost"
            >
              Unread
            </Button>
            <Button
              aria-pressed={filter === "all"}
              className={styles.filterButton}
              data-selected={filter === "all"}
              onClick={() => setFilter("all")}
              variant="ghost"
            >
              All
            </Button>
          </div>
          {pageState.kind === "ready" ? (
            <span className={styles.count} aria-live="polite">
              {pageState.data.unreadCount} unread
            </span>
          ) : null}
        </div>
      </header>
      {pollError ? (
        <Notice tone="warning" title="Live updates are paused">
          Moodle did not respond to the latest refresh. Your current list is still available.
        </Notice>
      ) : null}
      {readError ? (
        <Notice tone="error" title="Notification was not marked as read">
          Try the action again when Moodle is available. This action is not retried automatically.
        </Notice>
      ) : null}
      <div aria-live="polite" className={styles.pollStatus}>
        <WarningCircle aria-hidden size={15} weight="duotone" /> Live updates every 60 seconds while this page is visible.
      </div>
      {pageState.kind === "ready" ? (
        <NotificationList
          data={pageState.data}
          filter={filter}
          onMarkRead={(id) => void markRead(id)}
          pendingId={pendingId}
        />
      ) : (
        <NotificationStatusNotice kind={pageState.kind} />
      )}
    </main>
  );
}
