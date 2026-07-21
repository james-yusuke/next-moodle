import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { createHash } from "node:crypto";
import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { AssignmentDetailView } from "@/components/assignments/assignment-detail";
import { Notice } from "@/components/ui";
import { createAuthenticatedMoodleClient, requireMoodleSession } from "@/lib/auth/server";
import { MoodleCourseModulePathSchema } from "@/lib/moodle/queries/assignments";
import { fetchAssignmentDetail } from "@/lib/moodle/queries/assignments.query";
import { currentUnixSeconds } from "@/lib/moodle/now";
import { readAppRuntimeConfig } from "@/lib/app-config";

export const metadata: Metadata = { title: "課題" };

type AssignmentPageProps = Readonly<{ params: Promise<{ cmid: string }> }>;

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await requireMoodleSession();
  const config = readAppRuntimeConfig();
  const route = await params;
  const cmid = MoodleCourseModulePathSchema.safeParse(route.cmid);
  if (!cmid.success) {
    return (
      <Notice title="課題が見つかりません" tone="warning">
        <p>コース画面からもう一度課題を選択してください。</p>
      </Notice>
    );
  }
  if (!session.capabilities.assignments) {
    return <StateNotice reason="capability" retryHref={`/assignments/${cmid.data}`} siteUrl={session.site.siteUrl} />;
  }
  const data = await fetchAssignmentDetail(
      { client: await createAuthenticatedMoodleClient(), now: currentUnixSeconds(), session },
      cmid.data,
    )
    .catch(() => null);
  if (data === null) {
    return (
      <Notice
        action={(
          <a className="ui-app-action-link" href={session.site.siteUrl} rel="noopener noreferrer" target="_blank">
            Moodleで開く <ArrowSquareOut aria-hidden size={17} weight="regular" />
          </a>
        )}
        title="課題を読み込めませんでした"
        tone="error"
      >
        <p>接続を確認して再読み込みしてください。Moodle側で再ログインが必要な場合があります。</p>
      </Notice>
    );
  }
  const draftStorageKey = `next-moodle:draft:${createHash("sha256")
    .update(`${session.site.siteUrl}|${session.userId}|${cmid.data}`)
    .digest("base64url")}`;
  return <AssignmentDetailView config={config} data={data} draftStorageKey={draftStorageKey} />;
}
