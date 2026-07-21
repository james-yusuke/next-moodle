"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Play } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Notice } from "@/components/ui";
import type { FeedbackActivityData, FeedbackItem } from "@/lib/moodle/activities/feedback-model";

function FeedbackControl({ item }: Readonly<{ item: FeedbackItem }>) {
  if (item.kind === "display") return <p className="ui-feedback-display">{item.name}</p>;
  if (item.kind === "unsupported") return <Notice title="未対応の質問形式" tone="warning"><p>{item.name} はMoodle管理者によるアダプターが必要です。</p></Notice>;
  if (item.kind === "textarea") return <label><span>{item.name}{item.required ? " *" : ""}</span><textarea maxLength={20_000} name={item.responseName} required={item.required} rows={6} /></label>;
  if (item.kind === "text" || item.kind === "number") return <label><span>{item.name}{item.required ? " *" : ""}</span><input maxLength={item.kind === "text" ? 2_000 : undefined} name={item.responseName} required={item.required} type={item.kind === "number" ? "number" : "text"} /></label>;
  return <fieldset><legend>{item.name}{item.required ? " *" : ""}</legend>{item.options.map((option, index) => <label key={`${item.id}-${index}`}><input name={item.responseName} required={item.required && item.kind === "single"} type={item.kind === "multiple" ? "checkbox" : "radio"} value={index + 1} /><span>{option}</span></label>)}</fieldset>;
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
    const response = await ky.post(`/api/activities/${cmid}/feedback`, { json: { action: "launch" }, retry: 0, throwHttpErrors: false });
    setPending(false);
    if (!response.ok) {
      setError(true);
      return;
    }
    const body = await response.json<Readonly<{ result: { completed: boolean; page: number } }>>();
    if (body.result.completed) setCompleted(true);
    else router.replace(`/activities/${cmid}?feedbackPage=${Math.max(0, body.result.page)}`);
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
    const response = await ky.post(`/api/activities/${cmid}/feedback`, {
      json: { action: "process", page: data.page, previous, responses },
      retry: 0,
      throwHttpErrors: false,
    });
    setPending(false);
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
  }

  return (
    <section className="ui-feedback-activity" aria-labelledby="feedback-title">
      <header><div><span className="ui-kicker">Response form</span><h2 id="feedback-title">フィードバック</h2></div>{data.page === null ? null : <span>ページ {data.page + 1}</span>}</header>
      {completed ? <Notice title="回答を送信しました" tone="success"><p>回答はMoodleへ保存されました。</p></Notice> : data.page === null ? <div className="ui-feedback-launch"><p>質問を確認して回答を開始します。送信前に内容を確認できます。</p><Button disabled={pending} onClick={() => void start()}><Play aria-hidden size={17} />{pending ? "開始中" : "回答を開始"}</Button></div> : <form onSubmit={(event) => void submit(event)}>{data.items.map((item) => <FeedbackControl item={item} key={item.id} />)}<footer>{data.hasPreviousPage ? <Button disabled={pending} formNoValidate type="submit" value="previous" variant="secondary"><ArrowLeft aria-hidden size={17} />前へ</Button> : <span /> }<Button disabled={pending} type="submit">{data.hasNextPage ? <>次へ<ArrowRight aria-hidden size={17} /></> : <><CheckCircle aria-hidden size={17} />回答を送信</>}</Button></footer></form>}
      <span aria-live="polite" className="ui-form-error">{error ? "処理できませんでした。回答内容は保持されています。" : ""}</span>
    </section>
  );
}
