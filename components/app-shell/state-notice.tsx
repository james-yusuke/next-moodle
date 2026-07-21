import { Notice } from "@/components/ui";
import type { MoodleReadFailureReason } from "@/lib/moodle/queries/dashboard";
import Link from "next/link";

type StateNoticeProps = Readonly<{
  reason: MoodleReadFailureReason;
  retryHref: string;
  siteUrl: string;
}>;

export function StateNotice({ reason, retryHref }: StateNoticeProps) {
  switch (reason) {
    case "auth_expired":
      return (
        <Notice
          action={<Link className="ui-app-action-link" href="/login?reason=expired">再ログイン</Link>}
          title="Moodleの認証期限が切れました"
          tone="warning"
        >
          <p>安全のため、もう一度ログインしてから学習を続けてください。</p>
        </Notice>
      );
    case "permission":
      return (
        <Notice
          action={<Link className="ui-app-action-link" href={retryHref}>もう一度確認</Link>}
          title="この情報を表示する権限がありません"
          tone="warning"
        >
          <p>受講登録または活動の公開条件をMoodle管理者へ確認してください。</p>
        </Notice>
      );
    case "capability":
      return (
        <Notice
          action={<Link className="ui-app-action-link" href="/diagnostics">接続診断を確認</Link>}
          title="必要なMoodle機能を利用できません"
          tone="info"
        >
          <p>この画面に必要なWebサービスまたは補助アダプターが有効ではありません。接続診断の不足項目をMoodle管理者へ共有してください。</p>
        </Notice>
      );
    case "outage":
      return (
        <Notice
          action={<Link className="ui-app-action-link" href={retryHref}>再読み込み</Link>}
          title="Moodleに接続できません"
          tone="error"
          urgent
        >
          <p>一時的な接続障害の可能性があります。少し待ってから再度お試しください。</p>
        </Notice>
      );
    case "invalid_response":
      return (
        <Notice
          action={<Link className="ui-app-action-link" href={retryHref}>再読み込み</Link>}
          title="Moodleの応答を読み取れません"
          tone="error"
        >
          <p>表示内容の安全性を確認できなかったため、この画面ではデータを表示していません。</p>
        </Notice>
      );
  }
}
