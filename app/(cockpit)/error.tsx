"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { useEffect } from "react";

import {
  DashboardStateLink,
  SystemState,
} from "@/components/app-shell/system-state";
import { PageFrame } from "@/components/app-shell/workspace-frame";
import { Button } from "@/components/ui";

export default function CockpitError({
  error,
  unstable_retry: retry,
}: Readonly<{
  error: Error & { digest?: string };
  unstable_retry: () => void;
}>) {
  useEffect(() => {
    console.error("Cockpit rendering error", { digest: error.digest });
  }, [error.digest]);

  return (
    <PageFrame
      content={<SystemState
        actions={<><Button icon={<ArrowClockwise aria-hidden size={17} />} onClick={retry}>もう一度試す</Button><DashboardStateLink /></>}
        description="安全な状態を保ったまま処理を停止しました。再試行しても続く場合は、問い合わせ番号を管理者へ共有してください。"
        kind="error"
      {...(error.digest === undefined ? {} : { reference: error.digest })}
        title="画面を表示できませんでした"
      />}
      mode="focus"
    />
  );
}
