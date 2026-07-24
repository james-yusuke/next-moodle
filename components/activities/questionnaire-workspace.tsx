"use client";

import { Check, FloppyDisk, PaperPlaneRight } from "@phosphor-icons/react";
import ky from "ky";
import { useMemo, useState } from "react";

import { Button, Notice } from "@/components/ui";
import type { ActivityAdapterPayload } from "@/lib/moodle/activities/contracts";

type QuestionnaireData = NonNullable<ActivityAdapterPayload["activity"]> & { kind: "questionnaire" };
type QuestionnaireQuestion = QuestionnaireData["questions"][number];
type RateAnswer = Readonly<Record<string, string>>;
type AnswerValue = string | readonly string[] | RateAnswer;

function isRateAnswer(value: AnswerValue | undefined): value is RateAnswer {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function initialAnswers(data: QuestionnaireData): Readonly<Record<string, AnswerValue>> {
  return Object.fromEntries(data.answers.map((answer) => [
    String(answer.questionId),
    answer.rateValues.length > 0
      ? Object.fromEntries(answer.rateValues.map((value) => [value.choiceId, value.value]))
      : answer.values.length <= 1 ? answer.values[0] ?? "" : answer.values,
  ]));
}

function answerIsComplete(question: QuestionnaireQuestion, answer: AnswerValue | undefined): boolean {
  if (question.kind === "rate") {
    return isRateAnswer(answer) && question.options.every((row) => answer[row.value] !== undefined && answer[row.value] !== "");
  }
  return Array.isArray(answer) ? answer.length > 0 : typeof answer === "string" && answer !== "";
}

export function QuestionnaireWorkspace({ cmid, data }: Readonly<{ cmid: number; data: QuestionnaireData }>) {
  const [answers, setAnswers] = useState<Readonly<Record<string, AnswerValue>>>(() => initialAnswers(data));
  const [responseId, setResponseId] = useState(data.responseId);
  const [status, setStatus] = useState<"idle" | "saving" | "submitting" | "saved" | "submitted" | "error">(data.status === "submitted" ? "submitted" : "idle");
  const [message, setMessage] = useState("");
  const visibleQuestions = useMemo(() => data.questions.filter((question) => question.dependencies.every((dependency) => {
    const value = answers[String(dependency.questionId)];
    const matches = Array.isArray(value)
      ? value.includes(dependency.value)
      : isRateAnswer(value)
        ? Object.values(value).includes(dependency.value)
        : value === dependency.value;
    return dependency.logic === "equals" ? matches : !matches;
  })), [answers, data.questions]);

  function setAnswer(questionId: number, value: AnswerValue): void {
    setAnswers((current) => ({ ...current, [String(questionId)]: value }));
    if (status === "saved") setStatus("idle");
  }

  async function persist(action: "save" | "submit"): Promise<void> {
    if (status === "saving" || status === "submitting" || status === "submitted") return;
    if (action === "submit") {
      const missing = visibleQuestions.find((question) => {
        if (!question.required || question.kind === "info" || question.kind === "pagebreak") return false;
        const answer = answers[String(question.id)];
        return !answerIsComplete(question, answer);
      });
      if (missing !== undefined) {
        setStatus("error");
        setMessage(`「${missing.label}」は必須です。`);
        return;
      }
    }
    setStatus(action === "save" ? "saving" : "submitting");
    setMessage("");
    const response = await ky.post(`/api/activities/${cmid}/adapter`, { json: { action, answers, responseId }, retry: 0, throwHttpErrors: false, timeout: 20_000 });
    if (!response.ok) {
      setStatus("error");
      setMessage(response.status === 403 ? "アクセスが禁止されています。" : "回答を保存できませんでした。入力内容はこの画面に保持されています。");
      return;
    }
    const payload: unknown = await response.json().catch(() => null);
    if (
      typeof payload !== "object" || payload === null || !("ok" in payload) || payload.ok !== true ||
      !("result" in payload) || typeof payload.result !== "object" || payload.result === null
    ) {
      setStatus("error");
      setMessage("回答を保存できませんでした。入力内容はこの画面に保持されています。");
      return;
    }
    const result = payload.result as Record<string, unknown>;
    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
      setStatus("error");
      setMessage("入力内容を確認してください。入力内容はこの画面に保持されています。");
      return;
    }
    if (typeof result.responseId === "number" && Number.isSafeInteger(result.responseId) && result.responseId >= 0) {
      setResponseId(result.responseId);
    }
    setStatus(action === "save" ? "saved" : result.state === "submitted" ? "submitted" : "error");
    if (action === "submit" && result.state !== "submitted") {
      setMessage("回答を送信できませんでした。入力内容はこの画面に保持されています。");
    }
  }

  if (data.status === "closed") return <Notice title="回答期間は終了しました" tone="warning"><p>回答内容の閲覧可否はアンケート設定に従います。</p></Notice>;
  return (
    <section className="ui-questionnaire" aria-labelledby="questionnaire-title">
      <header><div><span>Questionnaire</span><h2 id="questionnaire-title">アンケート回答</h2></div><small>{data.anonymous ? "匿名回答" : "記名回答"}</small></header>
      <div className="ui-questionnaire__questions">
        {visibleQuestions.map((question) => {
          const key = String(question.id);
          const value = answers[key];
          if (question.kind === "pagebreak") return <hr key={key} />;
          if (question.kind === "info") return <div className="ui-questionnaire__info" key={key}>{question.label === "" ? null : <strong>{question.label}</strong>}{question.description === "" ? null : <p>{question.description}</p>}</div>;
          return <fieldset key={key}><legend>{question.label}{question.required ? <span>必須</span> : null}</legend>{question.description === "" ? null : <p>{question.description}</p>}<QuestionControl answer={value} onChange={(next) => setAnswer(question.id, next)} question={question} /></fieldset>;
        })}
      </div>
      <footer><span aria-live="polite">{message || (status === "saved" ? "下書きを保存しました" : status === "submitted" ? "回答を送信しました" : "回答は自動送信されません")}</span><div>{data.canSave ? <Button disabled={status === "saving" || status === "submitting" || status === "submitted"} onClick={() => void persist("save")} type="button" variant="secondary"><FloppyDisk aria-hidden size={17} />{status === "saving" ? "保存中" : "下書き保存"}</Button> : null}{data.canSubmit ? <Button disabled={status === "saving" || status === "submitting" || status === "submitted"} onClick={() => void persist("submit")} type="button">{status === "submitted" ? <Check aria-hidden size={17} /> : <PaperPlaneRight aria-hidden size={17} />}{status === "submitting" ? "送信中" : status === "submitted" ? "送信済み" : "回答を送信"}</Button> : null}</div></footer>
    </section>
  );
}

function QuestionControl({ answer, onChange, question }: Readonly<{ answer: AnswerValue | undefined; onChange: (value: AnswerValue) => void; question: QuestionnaireQuestion }>) {
  const stringValue = typeof answer === "string" ? answer : "";
  if (question.kind === "textarea") return <textarea aria-label={question.label} maxLength={question.max ?? undefined} onChange={(event) => onChange(event.currentTarget.value)} rows={6} value={stringValue} />;
  if (question.kind === "select") return <select aria-label={question.label} onChange={(event) => onChange(event.currentTarget.value)} value={stringValue}><option value="">選択してください</option>{question.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  if (question.kind === "checkbox") {
    const selected = Array.isArray(answer) ? answer : [];
    return <div className="ui-questionnaire__options">{question.options.map((option) => <label key={option.value}><input checked={selected.includes(option.value)} onChange={(event) => onChange(event.currentTarget.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} type="checkbox" /><span>{option.label}</span></label>)}</div>;
  }
  if (question.kind === "rate") {
    const selected = isRateAnswer(answer) ? answer : {};
    return <div aria-label={`${question.label} の評価`} className="ui-questionnaire__rate" role="group">
      {question.options.map((row, rowIndex) => {
        const rowId = `question-${question.id}-row-${rowIndex}`;
        return <div className="ui-questionnaire__rate-row" key={row.value}>
          <p id={rowId}>{row.label}</p>
          <div aria-labelledby={rowId} className="ui-questionnaire__rate-options" role="radiogroup">
            {question.rateOptions.map((option, optionIndex) => {
              const inputId = `question-${question.id}-rate-${rowIndex}-${optionIndex}`;
              return <label htmlFor={inputId} key={option.value}>
                <input aria-label={`${row.label}: ${option.label}`} checked={selected[row.value] === option.value} id={inputId} name={`q-${question.id}-${row.value}`} onChange={() => onChange({ ...selected, [row.value]: option.value })} type="radio" />
                <span>{option.label}</span>
              </label>;
            })}
          </div>
        </div>;
      })}
    </div>;
  }
  if (question.kind === "radio" || question.kind === "scale" || question.kind === "yesno") return <div className="ui-questionnaire__options">{question.options.map((option) => <label key={option.value}><input checked={stringValue === option.value} name={`q-${question.id}`} onChange={() => onChange(option.value)} type="radio" /><span>{option.label}</span></label>)}</div>;
  const inputType = question.kind === "date" ? "date" : question.kind === "number" ? "number" : "text";
  return <input aria-label={question.label} max={inputType === "number" ? question.max ?? undefined : undefined} maxLength={inputType === "text" ? question.max ?? undefined : undefined} min={inputType === "number" ? question.min ?? undefined : undefined} onChange={(event) => onChange(event.currentTarget.value)} step={inputType === "number" ? question.step ?? undefined : undefined} type={inputType} value={stringValue} />;
}
