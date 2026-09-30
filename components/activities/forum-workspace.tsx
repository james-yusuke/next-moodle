"use client";

import styles from "./forum-workspace.module.css";
import { Bell, BellSlash, ChatCircle, Check, LockSimple, PaperPlaneTilt, PushPin } from "@phosphor-icons/react";
import ky from "ky";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, EmptyState, Field, Notice, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import type { ForumActivityData } from "@/lib/moodle/activities/forum";

export function ForumWorkspace({ cmid, data, locale, timeZone }: Readonly<{
  cmid: number;
  data: ForumActivityData;
  locale: string;
  timeZone: string;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }), [locale, timeZone]);
  const selected = data.discussions.find((discussion) => discussion.discussion === data.selectedDiscussionId);
  const replyTarget = data.posts.find((post) => post.canReply) ?? data.posts[0];

  async function updateDiscussion(action: "read" | "subscribe", subscribed?: boolean): Promise<void> {
    if (pending || data.selectedDiscussionId === null) return;
    setPending(true);
    setError(false);
    const json = action === "subscribe"
      ? { action, discussionId: data.selectedDiscussionId, subscribed: subscribed ?? false }
      : { action, discussionId: data.selectedDiscussionId };
    try {
      const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>, action: "create" | "reply"): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const subject = form.get("subject");
    const message = form.get("message");
    if (typeof subject !== "string" || typeof message !== "string") return;
    setPending(true);
    setError(false);
    const json = action === "create"
      ? { action, subject, message }
      : { action, subject, message, discussionId: data.selectedDiscussionId, postId: replyTarget?.id };
    try {
      const response = await ky.post(`/api/activities/${cmid}/forum`, { json, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.forum!} aria-labelledby="forum-title">
      <header className={styles.style1!}><div className={styles.style2!}><span className={styles.kicker!}>DISCUSSION</span><h2 className={styles.style3!} id="forum-title">フォーラム</h2></div><span className={styles.style4!}>{data.discussions.length}件</span></header>
      <div className={styles.forumGrid!}>
        <nav className={styles.style5!} aria-label="ディスカッション">
          {data.discussions.length === 0 ? <div className={styles.style6!}><EmptyState title="ディスカッションはありません。" /></div> : data.discussions.map((discussion) => (
            <Link className={styles.style7!} aria-current={discussion.discussion === data.selectedDiscussionId ? "page" : undefined} href={`?discussion=${discussion.discussion}`} key={discussion.discussion}>
              <span className={styles.style8!}>{discussion.pinned ? <PushPin className={styles.style9!} aria-label="固定" size={14} /> : null}{discussion.locked ? <LockSimple className={styles.style9!} aria-label="ロック" size={14} /> : null}<strong className={styles.style10!}>{discussion.subject}</strong></span>
              <small className={styles.style11!}>{discussion.userfullname} · 返信 {discussion.numreplies} · 未読 {discussion.numunread}</small>
            </Link>
          ))}
        </nav>
        <div className={styles.forumThread!}>
          {selected === undefined ? <Notice title="ディスカッションを選択" tone="info"><p>一覧から会話を開いてください。</p></Notice> : <>
            <div className={styles.forumThreadTitle!}><div className={styles.style12!}><h3 className={styles.style13!}>{selected.subject}</h3><span className={styles.style4!}>{selected.locked ? "返信不可" : `${selected.numreplies}件の返信`}</span></div><div className={styles.style14!}>{data.operations.markRead && selected.numunread > 0 ? <Button disabled={pending} onClick={() => void updateDiscussion("read")} variant="ghost"><Check aria-hidden size={16} />既読にする</Button> : null}{data.operations.subscribe ? <Button disabled={pending} onClick={() => void updateDiscussion("subscribe", !selected.subscribed)} variant="ghost">{selected.subscribed ? <BellSlash aria-hidden size={16} /> : <Bell aria-hidden size={16} />}{selected.subscribed ? "購読解除" : "購読"}</Button> : null}</div></div>
            <ol className={styles.style15!}>{data.posts.map((post) => <li className={styles.style16!} data-unread={post.unread} key={post.id}><div className={styles.style17!}><span className={styles.avatar!} aria-hidden>{post.author.slice(0, 1)}</span><span className={styles.style12!}><strong>{post.author}</strong><small className={styles.style4!}>{post.created === 0 ? "" : dateTime.format(new Date(post.created * 1_000))}</small></span></div><h4 className={styles.style18!}>{post.subject}</h4><RichContent document={post.message} /></li>)}</ol>
            {data.operations.reply && selected.canreply && replyTarget !== undefined && !selected.locked ? <form className={styles.forumComposer!} onSubmit={(event) => void submit(event, "reply")}><Field id="forum-reply-subject" label="件名" maxLength={200} name="subject" required value={`Re: ${selected.subject}`} readOnly /><Textarea id="forum-reply-message" label="返信" maxLength={20_000} name="message" required rows={4} /><StickyActionBar aria-label="返信操作"><Button disabled={pending} loading={pending} type="submit"><PaperPlaneTilt aria-hidden size={17} />返信を投稿</Button></StickyActionBar></form> : null}
          </>}
        </div>
      </div>
      {data.canCreate ? <details className={styles.forumCreate!}><summary className={styles.style19!}><ChatCircle aria-hidden size={17} />新しいディスカッション</summary><form className={styles.style20!} onSubmit={(event) => void submit(event, "create")}><Field id="forum-new-subject" label="件名" maxLength={200} name="subject" required /><Textarea id="forum-new-message" label="本文" maxLength={20_000} name="message" required rows={5} /><StickyActionBar aria-label="ディスカッション操作"><Button disabled={pending} loading={pending} type="submit">作成</Button></StickyActionBar></form></details> : null}
      <span className={styles.formError!} aria-live="polite">{error ? "投稿できませんでした。入力内容は保持されています。" : ""}</span>
    </section>
  );
}
