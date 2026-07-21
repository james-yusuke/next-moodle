import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireMoodleSession } from "@/lib/auth/server";
import { readDashboard } from "@/lib/moodle/queries/dashboard";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "ダッシュボード" };

export default async function DashboardPage() {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (!session.capabilities.dashboard) {
    return (
      <div className="ui-page-stack">
        <header className="ui-page-header">
          <h1>ダッシュボード</h1>
          <p>締切とコースの動きを確認します。</p>
        </header>
        <StateNotice reason="capability" retryHref="/dashboard" siteUrl={session.site.siteUrl} />
      </div>
    );
  }
  const result = await readDashboard(session.userId, currentUnixSeconds(), config.timeZone);
  return result.kind === "ready" ? (
    <DashboardView config={config} data={result.data} />
  ) : (
    <div className="ui-page-stack">
      <header className="ui-page-header">
        <h1>ダッシュボード</h1>
        <p>締切とコースの動きを確認します。</p>
      </header>
      <StateNotice reason={result.reason} retryHref="/dashboard" siteUrl={session.site.siteUrl} />
    </div>
  );
}
