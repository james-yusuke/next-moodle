import type { Metadata } from "next";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { MessagesIndex } from "@/components/messages/messages-view";
import { requireMoodleSession } from "@/lib/auth/server";
import { readConversations } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "メッセージ" };

export default async function MessagesPage() {
  const session = await requireMoodleSession();
  if (session.manifest.features.messages !== "available") return <StateNotice reason="capability" retryHref="/messages" siteUrl={session.site.siteUrl} />;
  const result = await readConversations(session.userId);
  return result.kind === "failure" ? <StateNotice reason={resolveMoodlePageFailure(result.reason)} retryHref="/messages" siteUrl={session.site.siteUrl} /> : <MessagesIndex conversations={result.data} />;
}
