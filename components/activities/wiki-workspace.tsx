"use client";

import styles from "./wiki-workspace.module.css";
import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import type { WikiActivityData } from "@/lib/moodle/activities/wiki-model";

export function WikiWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: WikiActivityData;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState<Readonly<{ content: string; pageId: number; version: number }> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function beginEdit(pageId: number): Promise<void> {
    setPending(true);
    setError(false);
    try {
      const response = await ky.get(`/api/activities/${cmid}/wiki`, {
        searchParams: { pageId }, retry: 0, throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ ok: true; result: { content: string; pageId: number; version: number } }>>();
      setEditing(body.result);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || editing === null) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/wiki`, {
        json: { action: "edit", content: form.get("content"), pageId: editing.pageId, version: editing.version },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.knowledge!} aria-labelledby="wiki-title">
      <header className={styles.style1!}><div className={styles.style2!}><span className={styles.kicker!}>COLLABORATIVE DOCUMENT</span><h2 className={styles.style3!} id="wiki-title">Wiki</h2></div><span className={styles.style4!}>{data.pages.length}ページ</span></header>
      {data.pages.length === 0 ? <EmptyState title="Wikiページはありません。"><p>最初のページが作成されると、ここへ表示されます。</p></EmptyState> : (
        <div className={styles.wikiPages!}>
          {data.pages.map((page, index) => <article className={styles.style5!} key={page.id}><header className={styles.style6!}><span className={styles.tabular!}>{String(index + 1).padStart(2, "0")}</span><h3 className={styles.style7!}>{page.title}</h3>{page.canEdit ? <Button disabled={pending} onClick={() => void beginEdit(page.id)} size="compact" type="button" variant="ghost"><PencilSimple aria-hidden size={16} />編集</Button> : null}</header>{editing?.pageId === page.id ? <form className={styles.style8!} onSubmit={(event) => void save(event)}><Textarea defaultValue={editing.content} id={`wiki-content-${page.id}`} label={`${page.title}の本文`} maxLength={100_000} name="content" required rows={14} /><StickyActionBar aria-label="Wiki編集操作"><Button onClick={() => setEditing(null)} type="button" variant="secondary">キャンセル</Button><Button disabled={pending} loading={pending} type="submit"><FloppyDisk aria-hidden size={17} />保存</Button></StickyActionBar></form> : <RichContent document={page.content} />}</article>)}
        </div>
      )}
      <span aria-live="polite" className={styles.formError!}>{error ? "Wikiを更新できませんでした。編集内容は保持されています。" : ""}</span>
    </section>
  );
}
