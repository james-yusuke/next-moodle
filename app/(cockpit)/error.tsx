"use client";

import { Button, Notice } from "@/components/ui";

export default function CockpitError({
  unstable_retry: retry,
}: Readonly<{ unstable_retry: () => void }>) {
  return (
    <div className="ui-page-stack">
      <Notice
        action={<Button onClick={retry}>もう一度試す</Button>}
        title="画面を表示できませんでした"
        tone="error"
        urgent
      >
        <p>安全な状態を保ったまま処理を停止しました。再試行しても続く場合はMoodleで確認してください。</p>
      </Notice>
    </div>
  );
}
