import { Notice } from "@/components/ui";
import type { NotificationsPageState } from "@/lib/moodle/queries/notifications-schema";

type NotificationStatusKind = Exclude<NotificationsPageState["kind"], "ready">;

function assertNever(value: never): never {
  throw new Error(`Unknown notification state: ${String(value)}`);
}

export function NotificationStatusNotice({
  kind,
}: Readonly<{ kind: NotificationStatusKind }>) {
  switch (kind) {
    case "capability":
      return (
        <Notice tone="info" title="Notifications are unavailable">
          This Moodle site has not enabled the notification service for your account.
        </Notice>
      );
    case "auth":
      return (
        <Notice tone="warning" title="Your Moodle session has expired">
          Sign in again to load notifications and keep this page private.
        </Notice>
      );
    case "permission":
      return (
        <Notice tone="warning" title="Notifications are restricted">
          Moodle did not grant permission to read notifications for this account.
        </Notice>
      );
    case "outage":
      return (
        <Notice tone="warning" title="Moodle is temporarily unavailable">
          Keep this page open and try again when Moodle is reachable.
        </Notice>
      );
    case "error":
      return (
        <Notice tone="error" title="Notifications could not be loaded">
          The response from Moodle was not usable. Please try again later.
        </Notice>
      );
    default:
      return assertNever(kind);
  }
}
