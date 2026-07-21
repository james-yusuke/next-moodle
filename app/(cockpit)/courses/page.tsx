import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { CourseList } from "@/components/courses/course-list";
import { requireMoodleSession } from "@/lib/auth/server";
import { readCourses } from "@/lib/moodle/queries/courses";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "コース" };

export default async function CoursesPage() {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  if (!session.capabilities.courses) {
    return (
      <div className="ui-page-stack">
        <header className="ui-page-header"><h1>コース</h1><p>受講中と今後のコースを確認します。</p></header>
        <StateNotice reason="capability" retryHref="/courses" siteUrl={session.site.siteUrl} />
      </div>
    );
  }
  const result = await readCourses(session.userId, currentUnixSeconds());
  return (
    <div className="ui-page-stack">
      <header className="ui-page-header">
        <h1>コース</h1>
        <p>受講中、開始前、終了済みのコースを検索できます。</p>
      </header>
      {result.kind === "ready" ? (
        <CourseList config={config} courses={result.data} />
      ) : (
        <StateNotice reason={result.reason} retryHref="/courses" siteUrl={session.site.siteUrl} />
      )}
    </div>
  );
}
