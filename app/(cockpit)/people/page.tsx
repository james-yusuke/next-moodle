import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { MoodleCourseIdSchema } from "@/lib/moodle/identifiers";
import { readCourses } from "@/lib/moodle/queries/courses";
import { readPeople } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "参加者" };

export default async function PeoplePage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.people !== "available") return <StateNotice reason="capability" retryHref="/people" siteUrl={session.site.siteUrl} />;
  const courses = await readCourses(session.userId, currentUnixSeconds());
  if (courses.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(courses.reason)} retryHref="/people" siteUrl={session.site.siteUrl} />;
  const course = courses.data[0];
  if (course === undefined) return <StudentAreaView config={readAppRuntimeConfig()} data={{ metric: "0人", rows: [] }} description="受講コースの参加者を確認します。" empty="表示できるコースはありません" title="参加者" />;
  const result = await readPeople(MoodleCourseIdSchema.parse(course.id));
  return result.kind === "failure"
    ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/people" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description={`${course.name} の参加者を表示しています。`} empty="表示できる参加者はいません" title="参加者" />;
}
