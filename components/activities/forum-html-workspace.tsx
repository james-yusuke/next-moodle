"use client";

import styles from "./forum-html-workspace.module.css";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MoodleScreenForm } from "@/components/activities/html-activity-workspace";
import { Card, EmptyState, Notice, RichContent } from "@/components/ui";
import { moodleDocumentText } from "@/lib/moodle/html";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";

function emptyForumMessage(screen: MoodleScreenModel): string | null {
  const value = moodleDocumentText(screen.document);
  const matched = value.match(/(?:まだ新しい[^。]*投稿(?:されて)?いません。|[^。]*(?:投稿|ディスカッション)[^。]*(?:ありません|なし)。?)/i);
  return matched?.[0]?.trim() || null;
}

export function ForumHtmlWorkspace({ cmid, screen }: Readonly<{ cmid: number; screen: MoodleScreenModel }>) {
  const [screenOverride, setScreenOverride] = useState<Readonly<{ cmid: number; screen: MoodleScreenModel }> | null>(null);
  const currentScreen = screenOverride?.cmid === cmid ? screenOverride.screen : screen;
  const setCurrentScreen = (nextScreen: MoodleScreenModel): void => setScreenOverride({ cmid, screen: nextScreen });
  const emptyMessage = useMemo(() => emptyForumMessage(currentScreen), [currentScreen]);
  return <section className={styles.forumHtml!} data-testid="html-forum-workspace">
    {currentScreen.notices.filter((notice) => emptyMessage === null || !/まだ新しい[^。]*投稿(?:されて)?いません。/i.test(notice.message)).map((notice, index) => <Notice key={`${notice.message}:${index}`} title="フォーラムからのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    <section className={styles.forumHtmlFeed!} aria-labelledby="forum-html-feed-title">
      <header className={styles.style1!}><span className={styles.kicker!}>DISCUSSIONS</span><h2 className={styles.style2!} id="forum-html-feed-title">投稿</h2></header>
      {emptyMessage === null ? <Card padding="spacious"><RichContent className={styles.forumHtmlDocument!} document={currentScreen.document} /></Card> : <EmptyState title="まだ新しい投稿はありません"><p>{emptyMessage} 新しい投稿が公開されると、ここに時系列で表示されます。</p></EmptyState>}
    </section>
    {currentScreen.forms.length === 0 ? null : <details className={styles.forumHtmlSearch!}><summary className={styles.style3!}><MagnifyingGlass aria-hidden size={18} />投稿を検索</summary><div className={styles.style4!}>{currentScreen.forms.map((form) => <MoodleScreenForm actionEndpoint={`/api/activities/${cmid}/html-action`} form={form} key={`${form.id}:${form.revision}`} onScreenChange={setCurrentScreen} presentation="forum" />)}</div></details>}
  </section>;
}
