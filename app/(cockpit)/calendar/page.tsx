import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { CalendarView } from "@/components/calendar/calendar-view";
import { requireMoodleSession } from "@/lib/auth/server";
import {
  parseCalendarSelection,
  readCalendar,
} from "@/lib/moodle/queries/calendar";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "カレンダー" };

type CalendarPageProps = Readonly<{
  searchParams: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}>;

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (session.manifest.features.calendar !== "available") {
    return (
      <div className="ui-page-stack">
        <header className="ui-page-header"><h1>カレンダー</h1><p>学習予定を{config.timeZone}で確認します。</p></header>
        <StateNotice reason="capability" retryHref="/calendar" siteUrl={session.site.siteUrl} />
      </div>
    );
  }
  const nowSeconds = currentUnixSeconds();
  const selection = parseCalendarSelection(await searchParams, nowSeconds, config.timeZone);
  const result = await readCalendar(session.userId, selection, nowSeconds, config.timeZone);
  return result.kind === "ready" ? (
    <CalendarView canManage={session.manifest.features.calendarManage === "available"} config={config} data={result.data} />
  ) : (
    <div className="ui-page-stack">
      <header className="ui-page-header"><h1>カレンダー</h1><p>学習予定を{config.timeZone}で確認します。</p></header>
      <StateNotice reason={result.reason} retryHref="/calendar" siteUrl={session.site.siteUrl} />
    </div>
  );
}
