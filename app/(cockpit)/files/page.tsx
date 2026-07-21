import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { StudentAreaView } from "@/components/student/student-area-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readPrivateFiles } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "プライベートファイル" };

export default async function FilesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.privateFiles !== "available") return <StateNotice reason="capability" retryHref="/files" siteUrl={session.site.siteUrl} />;
  const result = await readPrivateFiles(session.userId, session.site.siteUrl);
  return result.kind === "failure"
    ? <StateNotice reason={result.reason} retryHref="/files" siteUrl={session.site.siteUrl} />
    : <StudentAreaView config={readAppRuntimeConfig()} data={result.data} description="Moodleに保存した自分専用のファイルです。" empty="プライベートファイルはありません" title="プライベートファイル" />;
}
