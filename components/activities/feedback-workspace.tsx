"use client";

import styles from "./feedback-workspace.module.css";
import { ArrowLeft, ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice, StickyActionBar } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import type { FeedbackActivityData, FeedbackItem } from "@/lib/moodle/activities/feedback-model";

function FeedbackControl({ item }: Readonly<{ item: FeedbackItem }>) {
  const inputClass = styles.inputClass1!;
  if (item.kind === "display") return <p className={styles.feedbackDisplay!}>{item.name}</p>;
  if (item.kind === "unsupported") return <Notice title="未対応の質問形式" tone="warning"><p>{item.name} はMoodle管理者によるアダプターが必要です。</p></Notice>;
  if (item.kind === "textarea") return <label className={styles.style1!}><span className={styles.style2!}>{item.name}{item.required ? " *" : ""}</span><textarea className={classNames(inputClass, styles.style13!)} maxLength={20_000} name={item.responseName} required={item.required} rows={6} /></label>;
  if (item.kind === "text" || item.kind === "number") return <label className={styles.style1!}><span className={styles.style2!}>{item.name}{item.required ? " *" : ""}</span><input className={inputClass} maxLength={item.kind === "text" ? 2_000 : undefined} name={item.responseName} required={item.required} type={item.kind === "number" ? "number" : "text"} /></label>;
  return <fieldset className={styles.style3!}><legend className={styles.style4!}>{item.name}{item.required ? " *" : ""}</legend>{item.options.map((option, index) => <label className={styles.style5!} key={`${item.id}-${index}`}><input className={styles.style6!} name={item.responseName} required={item.required && item.kind === "single"} type={item.kind === "multiple" ? "checkbox" : "radio"} value={index + 1} /><span>{option}</span></label>)}</fieldset>;
}

export function FeedbackWorkspace({ cmid, data }: Readonly<{
  cmid: number;
  data: FeedbackActivityData;
}>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function start(): Promise<void> {
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/feedback`, { json: { action: "launch" }, retry: 0, throwHttpErrors: false });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; page: number } }>>();
      if (body.result.completed) setCompleted(true);
      else router.replace(`/activities/${cmid}?feedbackPage=${Math.max(0, body.result.page)}`);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || data.page === null) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const previous = submitter instanceof HTMLButtonElement && submitter.value === "previous";
    const form = new FormData(event.currentTarget);
    const responses = data.items.filter((item) => item.kind !== "display" && item.kind !== "unsupported").map((item) => ({
      name: item.responseName,
      value: form.getAll(item.responseName).map(String).join("|"),
    }));
    setPending(true);
    setError(false);
    try {
      const response = await ky.post(`/api/activities/${cmid}/feedback`, {
        json: { action: "process", page: data.page, previous, responses },
        retry: 0,
        throwHttpErrors: false,
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = await response.json<Readonly<{ result: { completed: boolean; page: number } }>>();
      if (body.result.completed) {
        setCompleted(true);
        router.refresh();
      } else {
        router.replace(`/activities/${cmid}?feedbackPage=${Math.max(0, body.result.page)}`);
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.feedbackActivity!} aria-labelledby="feedback-title">
      <header className={styles.style7!}><div className={styles.style8!}><span className={styles.kicker!}>RESPONSE FORM</span><h2 className={styles.style9!} id="feedback-title">フィードバック</h2></div>{data.page === null ? null : <span className={styles.style10!}>ページ {data.page + 1}</span>}</header>
      {completed ? <Notice title="回答を送信しました" tone="success"><p>回答はMoodleへ保存されました。</p></Notice> : data.page === null ? <div className={styles.feedbackLaunch!}><p className={styles.style11!}>質問を確認して回答を開始します。送信前に内容を確認できます。</p><Button disabled={pending} loading={pending} onClick={() => void start()}><Play aria-hidden size={17} />回答を開始</Button></div> : <form className={styles.style12!} onSubmit={(event) => void submit(event)}>{data.items.map((item) => <FeedbackControl item={item} key={item.id} />)}<StickyActionBar aria-label="フィードバック操作">{data.hasPreviousPage ? <Button disabled={pending} formNoValidate type="submit" value="previous" variant="secondary"><ArrowLeft aria-hidden size={17} />前へ</Button> : null}<Button disabled={pending} loading={pending} type="submit">{data.hasNextPage ? <>次へ<ArrowRight aria-hidden size={17} /></> : <><CheckCircle aria-hidden size={17} />回答を送信</>}</Button></StickyActionBar></form>}
      <span aria-live="polite" className={styles.formError!}>{error ? "処理できませんでした。回答内容は保持されています。" : ""}</span>
    </section>
  );
}
