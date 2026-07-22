"use client";

import { Button, Notice } from "@/components/ui";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";

export default function CockpitError({
  unstable_retry: retry,
}: Readonly<{ unstable_retry: () => void }>) {
  return (
    <PageFrame content={<Notice
        action={<Button onClick={retry}>もう一度試す</Button>}
        title="画面を表示できませんでした"
        tone="error"
        urgent
      >
        <p>安全な状態を保ったまま処理を停止しました。再試行しても続く場合はMoodleで確認してください。</p>
      </Notice>} header={<RouteHeader description="入力内容と安全な状態は維持されています。" eyebrow="一時的な問題" title="画面を表示できませんでした" />} mode="focus" />
  );
}
