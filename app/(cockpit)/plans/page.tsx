import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readPlans } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "学習プラン" };

export default async function PlansPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.plans !== "available") return <StateNotice reason="capability" retryHref="/plans" siteUrl={session.site.siteUrl} />;
  const result = await readPlans(session.userId);
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/plans" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="コンピテンシーと学習目標の進行状況です。" empty="学習プランはありません" title="学習プラン" />;
}
