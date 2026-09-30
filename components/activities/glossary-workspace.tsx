"use client";

import styles from "./glossary-workspace.module.css";
import { BookOpenText, Plus } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, Field, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import type { GlossaryActivityData } from "@/lib/moodle/activities/glossary-model";

export function GlossaryWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: GlossaryActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function createEntry(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/glossary`, {
        json: { concept: form.get("concept"), definition: form.get("definition") },
        retry: 0,
        throwHttpErrors: false,
      });
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
    <section className={styles.knowledge!} aria-labelledby="glossary-title">
      <header className={styles.style1!}><div className={styles.style2!}><span className={styles.kicker!}>KNOWLEDGE BASE</span><h2 className={styles.style3!} id="glossary-title">用語集</h2></div><span className={styles.style4!}>{data.total}語</span></header>
      {data.entries.length === 0 ? <EmptyState title="用語はまだ登録されていません。"><p>登録権限がある場合は、最初の用語を追加できます。</p></EmptyState> : (
        <dl className={styles.knowledgeList!}>
          {data.entries.map((entry) => <div className={styles.style5!} key={entry.id}><dt className={styles.style6!}><BookOpenText aria-hidden className={styles.style7!} size={19} /><span className={styles.style2!}>{entry.concept}<small className={styles.style8!}>{entry.author}{entry.approved ? "" : " · 承認待ち"}</small></span></dt><dd className={styles.style9!}><RichContent document={entry.definition} /></dd></div>)}
        </dl>
      )}
      {data.canAdd ? <details className={styles.knowledgeCreate!}><summary className={styles.style10!}><Plus aria-hidden size={17} />用語を追加</summary><form className={styles.style11!} onSubmit={(event) => void createEntry(event)}><Field id="glossary-concept" label="用語" maxLength={200} name="concept" required /><Textarea id="glossary-definition" label="説明" maxLength={20_000} name="definition" required rows={6} /><span aria-live="polite" className={styles.formError!}>{error ? "保存できませんでした。入力内容は保持されています。" : ""}</span><StickyActionBar aria-label="用語操作"><Button disabled={pending} loading={pending} type="submit">用語を保存</Button></StickyActionBar></form></details> : null}
    </section>
  );
}
