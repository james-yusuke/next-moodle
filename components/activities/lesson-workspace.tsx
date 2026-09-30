"use client";

import styles from "./lesson-workspace.module.css";
import { ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, Progress, RichContent, StickyActionBar } from "@/components/ui";
import type { LessonActivityData } from "@/lib/moodle/activities/lesson-model";

export function LessonWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: LessonActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [completedCmid, setCompletedCmid] = useState<number | null>(null);
  const completed = data.completed || completedCmid === cmid;

  async function mutate(payload: unknown): Promise<Readonly<{ completed: boolean; pageId: number }>|null> {
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/lesson`, { json: payload, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return null;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; pageId: number } }>>();
      return body.result;
    } catch {
      setError(true);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function start(): Promise<void> {
    const result = await mutate({ action: "launch" });
    if (result !== null) router.replace(`/activities/${cmid}?lessonPage=${result.pageId}`);
  }

  async function answer(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (data.pageId === null) return;
    const form = new FormData(event.currentTarget);
    const responses = [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string").map(([name, value]) => ({ name, value }));
    const result = await mutate({ action: "process", pageId: data.pageId, responses });
    if (result === null) return;
    if (result.completed) {
      setCompletedCmid(cmid);
      router.refresh();
    } else router.replace(`/activities/${cmid}?lessonPage=${result.pageId}`);
  }

  return (
    <section className={styles.lesson!} aria-labelledby="lesson-title">
      <header className={styles.style1!}><div className={styles.style2!}><span className={styles.kicker!}>GUIDED LEARNING</span><h2 className={styles.style3!} id="lesson-title">レッスン</h2></div>{data.progress === null ? null : <span className={styles.style4!}>{data.progress}%</span>}</header>
      {data.progress === null ? null : <Progress label="レッスンの進捗" value={data.progress} />}
      {completed ? <Notice title="レッスンを完了しました" tone="success"><p>学習結果はMoodleへ保存されています。</p></Notice> : data.pageId === null ? <div className={styles.feedbackLaunch!}><p className={styles.style5!}>ページを順番に進み、各設問へ回答します。</p><Button disabled={pending} loading={pending} onClick={() => void start()}><Play aria-hidden size={17} />レッスンを開始</Button></div> : <form className={styles.style6!} onSubmit={(event) => void answer(event)}><RichContent className={styles.lessonContent!} document={data.content} /><StickyActionBar aria-label="レッスン操作"><span className={styles.style7!}>{pending ? "保存中" : "回答は次へ進むと保存されます"}</span><Button disabled={pending} loading={pending} type="submit">回答して次へ<ArrowRight aria-hidden size={17} /></Button></StickyActionBar></form>}
      <span aria-live="polite" className={styles.formError!}>{error ? "レッスンを更新できませんでした。回答内容は保持されています。" : ""}</span>
      {completed ? <CheckCircle aria-hidden className={styles.lessonComplete!} size={22} weight="fill" /> : null}
    </section>
  );
}
