import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readGrades } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "成績" };

export default async function GradesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.grades !== "available") return <StateNotice reason="capability" retryHref="/grades" siteUrl={session.site.siteUrl} />;
  const result = await readGrades(session.userId);
  return result.kind === "failure"
    ? <StateNotice reason={result.reason} retryHref="/grades" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="コースごとの評価と総合点を確認します。" empty="表示できる成績はありません" title="成績" />;
}
