import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireMoodleSession } from "@/lib/auth/server";
import { readDashboard } from "@/lib/moodle/queries/dashboard";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function DashboardPage() {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (session.manifest.features.dashboard !== "available") {
    return (
      <PageFrame content={<StateNotice reason="capability" retryHref="/dashboard" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="締切とコースの動きを確認します。" eyebrow="今日" title="学習ワークスペース" />} mode="overview" />
    );
  }
  const result = await readDashboard(session.userId, currentUnixSeconds(), config.timeZone);
  return result.kind === "ready" ? (
    <DashboardView config={config} data={result.data} />
  ) : (
    <PageFrame content={<StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/dashboard" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="締切とコースの動きを確認します。" eyebrow="今日" title="学習ワークスペース" />} mode="overview" />
  );
}
