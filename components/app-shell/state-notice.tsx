import { Notice } from "@/components/ui";
import {
  dispositionForMoodlePageFailure,
  MoodlePageReadError,
} from "@/lib/moodle/page-failure";
import type { MoodleReadFailureReason } from "@/lib/moodle/queries/dashboard";
import Link from "next/link";
import { forbidden } from "next/navigation";

import { ReauthenticateButton } from "./logout-button";

type StateNoticeProps = Readonly<{
  reason: Extract<MoodleReadFailureReason, "auth_expired" | "capability">;
  retryHref: string;
  siteUrl: string;
}>;

export function resolveMoodlePageFailure(
  reason: MoodleReadFailureReason,
): StateNoticeProps["reason"] {
  const disposition = dispositionForMoodlePageFailure(reason);
  switch (disposition) {
    case "reauthenticate": return "auth_expired";
    case "capability": return "capability";
    case "forbidden":
      forbidden();
    case "error":
      if (reason === "invalid_response" || reason === "outage") {
        throw new MoodlePageReadError(reason);
      }
      throw new Error("Unexpected Moodle page failure disposition.");
  }
}

export function StateNotice({ reason }: StateNoticeProps) {
  if (reason === "auth_expired") {
    return (
      <Notice
        action={<ReauthenticateButton />}
        title="Moodleの認証期限が切れました"
        tone="warning"
      >
        <p>安全のため、もう一度ログインしてから学習を続けてください。</p>
      </Notice>
    );
  }
  return (
    <Notice
      action={<Link className="ui-app-action-link" href="/diagnostics">接続診断を確認</Link>}
      title="必要なMoodle機能を利用できません"
      tone="info"
    >
      <p>この画面に必要なWebサービスまたは補助アダプターが有効ではありません。接続診断の不足項目をMoodle管理者へ共有してください。</p>
    </Notice>
  );
}
