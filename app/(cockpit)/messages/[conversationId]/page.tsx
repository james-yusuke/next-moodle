import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { resolveMoodlePageFailure, StateNotice } from "@/components/app-shell/state-notice";
import { ConversationView } from "@/components/messages/messages-view";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { requireMoodleSession } from "@/lib/auth/server";
import { readConversation, readConversations } from "@/lib/moodle/queries/student";

export const metadata: Metadata = { title: "会話" };

export default async function ConversationPage({ params }: Readonly<{ params: Promise<{ conversationId: string }> }>) {
  const session = await requireMoodleSession();
  const value = Number((await params).conversationId);
  if (!Number.isSafeInteger(value) || value <= 0) notFound();
  if (session.manifest.features.messages !== "available") return <StateNotice reason="capability" retryHref="/messages" siteUrl={session.site.siteUrl} />;
  const list = await readConversations(session.userId);
  if (list.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(list.reason)} retryHref={`/messages/${value}`} siteUrl={session.site.siteUrl} />;
  if (!list.data.some((conversation) => conversation.id === value)) notFound();
  const detail = await readConversation(session.userId, value);
  if (detail.kind === "failure") return <StateNotice reason={resolveMoodlePageFailure(detail.reason)} retryHref={`/messages/${value}`} siteUrl={session.site.siteUrl} />;
  return <ConversationView config={readAppRuntimeConfig()} conversation={detail.data} conversations={list.data} />;
}
