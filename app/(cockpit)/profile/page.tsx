import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readProfile } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "プロフィール" };

export default async function ProfilePage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.profile !== "available") {
    return <StudentAreaView config={readAppRuntimeConfig()} data={{ metric: `User ${session.userId}`, rows: [{ id: "site", meta: "接続中のMoodle", title: session.site.siteName }] }} description="アカウントと学習情報への入口です。プロフィールAPIはMoodle管理者の許可が必要です。" empty="プロフィール情報はありません" title="その他" />;
  }
  const result = await readProfile(session.userId);
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/profile" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="Moodleに登録されているプロフィールを確認します。" empty="プロフィール情報はありません" title="プロフィール" />;
}
