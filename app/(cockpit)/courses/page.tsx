import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { CourseList } from "@/components/courses/course-list";
import { requireMoodleSession } from "@/lib/auth/server";
import { readCourses } from "@/lib/moodle/queries/courses";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "コース" };

export default async function CoursesPage() {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (session.manifest.features.courses !== "available") {
    return (
      <PageFrame content={<StateNotice reason="capability" retryHref="/courses" siteUrl={session.site.siteUrl} />} header={<RouteHeader description="受講中と今後のコースを確認します。" eyebrow="コース索引" title="コース" />} mode="overview" />
    );
  }
  const result = await readCourses(session.userId, currentUnixSeconds());
  return (
    <PageFrame
      content={result.kind === "ready" ? (
        <CourseList canFavorite={session.manifest.features.favorites === "available"} config={config} courses={result.data} />
      ) : (
        <StateNotice reason={result.reason} retryHref="/courses" siteUrl={session.site.siteUrl} />
      )}
      header={<RouteHeader description="状態、期限、進捗を比較しながら、学習するコースを選べます。" eyebrow="コース索引" title="コース" />}
      mode="overview"
    />
  );
}
