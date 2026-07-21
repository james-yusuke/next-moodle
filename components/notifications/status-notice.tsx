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
        <Notice tone="info" title="通知機能を利用できません">
          このMoodleでは、アカウント向けの通知Webサービスが有効になっていません。
        </Notice>
      );
    case "auth":
      return (
        <Notice tone="warning" title="Moodleの認証期限が切れました">
          通知を安全に読み込むため、もう一度ログインしてください。
        </Notice>
      );
    case "permission":
      return (
        <Notice tone="warning" title="通知の閲覧が制限されています">
          このアカウントには通知を読み取る権限がありません。
        </Notice>
      );
    case "outage":
      return (
        <Notice tone="warning" title="Moodleに一時的に接続できません">
          少し待ってから、もう一度この画面を開いてください。
        </Notice>
      );
    case "error":
      return (
        <Notice tone="error" title="通知を読み込めませんでした">
          Moodleの応答を安全に解釈できませんでした。時間をおいて再度お試しください。
        </Notice>
      );
    default:
      return assertNever(kind);
  }
}
