"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Play, SpinnerGap } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button, Notice } from "@/components/ui";
import type { QuizActivityData } from "@/lib/moodle/activities/quiz";

type SaveState = "idle" | "saving" | "saved" | "error";

function attemptLabel(state: QuizActivityData["attempts"][number]["state"]): string {
  if (state === "inprogress") return "回答中";
  if (state === "finished") return "提出済み";
  if (state === "overdue") return "期限超過";
  return "中断";
}

export function QuizWorkspace({ cmid, data }: Readonly<{ cmid: number; data: QuizActivityData }>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pendingAction, setPendingAction] = useState<"start" | "finish" | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  function responses(): readonly Readonly<{ name: string; value: string }>[] {
    if (formRef.current === null) return [];
    return [...new FormData(formRef.current).entries()].flatMap(([name, value]) =>
      typeof value === "string" ? [{ name, value }] : []
    );
  }

  async function save(): Promise<boolean> {
    if (data.activeAttempt === null) return true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSaveState("saving");
    try {
      const response = await ky.post(`/api/activities/${cmid}/quiz`, {
        json: { action: "save", attemptId: data.activeAttempt.attempt.id, responses: responses() },
        retry: 0,
        signal: controller.signal,
        throwHttpErrors: false,
      });
      setSaveState(response.ok ? "saved" : "error");
      return response.ok;
    } catch {
      if (controller.signal.aborted) return false;
      setSaveState("error");
      return false;
    }
  }

  function scheduleSave(): void {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setSaveState("idle");
    timerRef.current = setTimeout(() => void save(), 1_000);
  }

  async function start(): Promise<void> {
    if (pendingAction !== null) return;
    setPendingAction("start");
    const response = await ky.post(`/api/activities/${cmid}/quiz`, {
      json: { action: "start" }, retry: 0, throwHttpErrors: false,
    });
    setPendingAction(null);
    if (response.ok) router.refresh();
    else setSaveState("error");
  }

  async function move(page: number): Promise<void> {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (await save()) router.push(`?page=${page}`);
  }

  async function finish(): Promise<void> {
    if (data.activeAttempt === null || pendingAction !== null) return;
    if (!window.confirm("回答を提出すると、通常は編集できなくなります。提出しますか？")) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setPendingAction("finish");
    const response = await ky.post(`/api/activities/${cmid}/quiz`, {
      json: { action: "finish", attemptId: data.activeAttempt.attempt.id, responses: responses() },
      retry: 0,
      throwHttpErrors: false,
    });
    setPendingAction(null);
    if (response.ok) router.refresh();
    else setSaveState("error");
  }

  if (data.activeAttempt === null) {
    const attemptsRemaining = data.maxAttempts === 0 || data.attempts.length < data.maxAttempts;
    return (
      <section className="ui-quiz-start" aria-labelledby="quiz-start-title">
        <div><span className="ui-kicker">Assessment</span><h2 id="quiz-start-title">小テストを開始</h2><p>開始後は回答が自動保存されます。提出前に確認できます。</p></div>
        <dl><div><dt>受験回数</dt><dd>{data.attempts.length}{data.maxAttempts === 0 ? " / 無制限" : ` / ${data.maxAttempts}`}</dd></div><div><dt>制限時間</dt><dd>{data.timeLimit === 0 ? "なし" : `${Math.ceil(data.timeLimit / 60)}分`}</dd></div></dl>
        {data.hasQuestions && attemptsRemaining ? <Button disabled={pendingAction !== null} onClick={() => void start()}><Play aria-hidden size={17} />{pendingAction === "start" ? "開始中" : "受験を開始"}</Button> : <Notice title="現在は開始できません" tone="warning"><p>設問または受験回数を確認してください。</p></Notice>}
        {data.attempts.length > 0 ? <ul className="ui-quiz-attempts">{data.attempts.map((attempt) => <li key={attempt.id}><span>第{attempt.attempt}回</span><strong>{attemptLabel(attempt.state)}</strong>{attempt.sumgrades == null ? null : <span>{attempt.sumgrades}点</span>}</li>)}</ul> : null}
      </section>
    );
  }

  const active = data.activeAttempt;
  return (
    <form className="ui-quiz-attempt" onInput={scheduleSave} ref={formRef}>
      <header><div><span className="ui-kicker">Attempt {active.attempt.attempt}</span><h2>回答ページ {active.page + 1}</h2></div><span className={`ui-quiz-save ui-quiz-save--${saveState}`} aria-live="polite">{saveState === "saving" ? <SpinnerGap aria-hidden className="ui-spin" size={15} /> : saveState === "saved" ? <CheckCircle aria-hidden size={15} /> : null}{saveState === "saving" ? "保存中" : saveState === "saved" ? "保存済み" : saveState === "error" ? "保存できません" : "入力待ち"}</span></header>
      {active.messages.map((message) => <Notice key={message} title="受験条件" tone="warning"><p>{message}</p></Notice>)}
      <div className="ui-quiz-questions">
        {active.questions.map((question) => <article className="ui-quiz-question" key={question.slot}><div className="ui-quiz-question__meta"><span>問 {question.slot}</span><span>{question.status ?? question.type}</span></div><div className="ui-quiz-question__body" dangerouslySetInnerHTML={{ __html: question.html }} /></article>)}
      </div>
      <footer className="ui-quiz-actions">
        <Button disabled={active.page === 0 || pendingAction !== null} onClick={() => void move(active.page - 1)} type="button" variant="secondary"><ArrowLeft aria-hidden size={17} />前へ</Button>
        <span>回答は1秒後に自動保存</span>
        {active.nextPage >= 0 ? <Button disabled={pendingAction !== null} onClick={() => void move(active.nextPage)} type="button">次へ<ArrowRight aria-hidden size={17} /></Button> : <Button disabled={pendingAction !== null} onClick={() => void finish()} type="button">{pendingAction === "finish" ? "提出中" : "回答を提出"}</Button>}
      </footer>
    </form>
  );
}
