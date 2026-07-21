import type { Metadata } from "next";

import { StateNotice } from "@/components/app-shell/state-notice";
import { ConversationView } from "@/components/messages/messages-view";
import { Notice } from "@/components/ui";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readConversation, readConversations } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "会話" };

export default async function ConversationPage({ params }: Readonly<{ params: Promise<{ conversationId: string }> }>) {
  const session = await requireMoodleSession();
  const value = Number((await params).conversationId);
  if (!Number.isSafeInteger(value) || value <= 0) return <Notice title="会話が見つかりません" tone="warning"><p>メッセージ一覧から選択してください。</p></Notice>;
  if (session.manifest.features.messages !== "available") return <StateNotice reason="capability" retryHref="/messages" siteUrl={session.site.siteUrl} />;
  const [list, detail] = await Promise.all([readConversations(session.userId), readConversation(session.userId, value)]);
  if (list.kind === "failure") return <StateNotice reason={list.reason} retryHref={`/messages/${value}`} siteUrl={session.site.siteUrl} />;
  if (detail.kind === "failure") return <StateNotice reason={detail.reason} retryHref={`/messages/${value}`} siteUrl={session.site.siteUrl} />;
  return <ConversationView config={readAppRuntimeConfig()} conversation={detail.data} conversations={list.data} />;
}
