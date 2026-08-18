import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { TimetableView } from "@/components/timetable/timetable-view";
import { requireMoodleSession } from "@/lib/auth/server";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readCourses } from "@/lib/moodle/queries/courses";

export const metadata: Metadata = { title: "時間割" };

export default async function TimetablePage() {
  const session = await requireMoodleSession();
  const result = await readCourses(session.userId, currentUnixSeconds());
  return result.kind === "ready" ? (
    <TimetableView courses={result.data} preferenceScope={String(session.userId)} />
  ) : (
    <PageFrame content={<StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/timetable" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="受講コースを曜日と時限へ配置します。" eyebrow="学習スケジュール" title="時間割" />} mode="overview" width="wide" />
  );
}
