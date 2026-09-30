"use client";

import styles from "./html-activity-workspace.module.css";
import { CheckCircle, ClipboardText, PencilSimple, Warning } from "@phosphor-icons/react";
import ky from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button, Card, EmptyState, Field, FieldGroup, Notice, RichContent, StickyActionBar, Textarea } from "@/components/ui";
import { classNames } from "@/components/ui/class-names";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type { PublicHtmlActivityScreen, QuestionnaireReportItem } from "@/lib/moodle/activities/html-screen-model";
import type { MoodleFormControl, MoodleFormModel, MoodleScreenModel } from "@/lib/moodle/page-model";

type FormValue = string | boolean | readonly string[];
type FormValues = Readonly<Record<string, FormValue>>;

function protectIme(event: KeyboardEvent<HTMLFormElement>): void {
  if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
}

function initialControlValue(control: MoodleFormControl): FormValue {
  if ("value" in control) return control.value;
  if ("selected" in control) return control.selected;
  return control.checked;
}

function initialValues(form: MoodleFormModel): FormValues {
  return Object.fromEntries(form.controls.map((control) => [control.id, initialControlValue(control)]));
}

function complete(control: MoodleFormControl, value: FormValue | undefined): boolean {
  if (control.kind === "checkbox") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim() !== "";
}

function answerLabel(control: MoodleFormControl, value: FormValue | undefined): string {
  if (control.kind === "checkbox") return value === true ? "はい" : "いいえ";
  if (control.kind === "radio" || control.kind === "checkboxes" || control.kind === "select") {
    const selected = Array.isArray(value) ? value : [];
    return selected.map((id) => control.options.find((option) => option.id === id)?.label ?? "").filter(Boolean).join("、");
  }
  return typeof value === "string" ? value : "";
}

function MoodleControl({ control, error, onChange, value }: Readonly<{
  control: MoodleFormControl;
  error: string | undefined;
  onChange: (value: FormValue) => void;
  value: FormValue | undefined;
}>) {
  if (control.kind === "textarea") {
    return <Textarea disabled={control.disabled} id={control.id} label={control.label} {...(control.maxLength === undefined ? {} : { maxLength: control.maxLength })} {...(error === undefined ? {} : { message: error })} onChange={(event) => onChange(event.currentTarget.value)} required={control.required} {...(control.rows === undefined ? {} : { rows: control.rows })} value={typeof value === "string" ? value : ""} />;
  }
  if (control.kind === "text" || control.kind === "email" || control.kind === "number" || control.kind === "date" || control.kind === "datetime" || control.kind === "range") {
    const type = control.kind === "datetime" ? "datetime-local" : control.kind;
    return <Field disabled={control.disabled} id={control.id} label={control.label} {...(control.max === undefined ? {} : { max: control.max })} {...(control.maxLength === undefined ? {} : { maxLength: control.maxLength })} {...(error === undefined ? {} : { message: error })} {...(control.min === undefined ? {} : { min: control.min })} onChange={(event) => onChange(event.currentTarget.value)} {...(control.placeholder === undefined ? {} : { placeholder: control.placeholder })} required={control.required} status={error === undefined ? "default" : "error"} {...(control.step === undefined ? {} : { step: control.step })} type={type} value={typeof value === "string" ? value : ""} />;
  }
  if (control.kind === "checkbox") {
    return <label className={styles.htmlFormCheck!} data-disabled={control.disabled}><input className={styles.style1!} checked={value === true} disabled={control.disabled} onChange={(event) => onChange(event.currentTarget.checked)} required={control.required} type="checkbox" /><span className={styles.style2!}><strong>{control.label}</strong>{error === undefined ? null : <small className={styles.style3!} role="alert">{error}</small>}</span></label>;
  }
  if (control.kind !== "radio" && control.kind !== "checkboxes" && control.kind !== "select") return null;
  const selected = new Set(Array.isArray(value) ? value : []);
  if (control.kind === "select") {
    return <label className={styles.htmlFormSelect!} htmlFor={control.id}><span className={styles.fieldLabel!}>{control.label}</span><select className={styles.style4!} disabled={control.disabled} id={control.id} multiple={control.multiple} onChange={(event) => onChange([...event.currentTarget.selectedOptions].map((option) => option.value))} required={control.required} value={[...selected]}>{control.options.map((option) => <option disabled={option.disabled} key={option.id} value={option.id}>{option.label}</option>)}</select>{error === undefined ? null : <small className={styles.style3!} role="alert">{error}</small>}</label>;
  }
  return <fieldset className={styles.htmlFormOptions!}><legend className={styles.style5!}>{control.label}{control.required ? <span aria-label="必須"> *</span> : null}</legend>{control.options.map((option) => <label className={classNames(styles.style6!, selected.has(option.id) && styles.style7!, (control.disabled || option.disabled) && styles.style8!)} data-selected={selected.has(option.id)} key={option.id}><input className={styles.style9!} checked={selected.has(option.id)} disabled={control.disabled || option.disabled} name={control.id} onChange={(event) => {
    if (control.kind === "radio") onChange(event.currentTarget.checked ? [option.id] : []);
    else {
      const next = new Set(selected);
      if (event.currentTarget.checked) next.add(option.id); else next.delete(option.id);
      onChange([...next]);
    }
  }} type={control.kind === "radio" ? "radio" : "checkbox"} /><span>{option.label}</span></label>)}{error === undefined ? null : <small className={styles.style3!} role="alert">{error}</small>}</fieldset>;
}

function QuestionnaireReport({ items, submittedAt }: Readonly<{ items: readonly QuestionnaireReportItem[]; submittedAt: string | null }>) {
  return <Card className={styles.htmlReport!} aria-labelledby="questionnaire-report-title" padding="spacious"><header className={styles.style10!}><div className={styles.style2!}><span className={styles.kicker!}>QUESTIONNAIRE</span><h2 className={styles.style11!} id="questionnaire-report-title">提出した回答</h2></div>{submittedAt === null ? null : <p className={styles.style12!}>{submittedAt}</p>}</header><ol className={styles.style13!}>{items.map((item) => <li className={styles.style14!} key={`${item.number}:${item.prompt}`}><span className={styles.style15!}>{item.number}</span><div className={styles.style16!}><h3 className={styles.style17!}>{item.prompt}</h3>{item.answers.length === 0 ? <p className={styles.questionnaireUnanswered!}>回答なし</p> : item.answers.map((answer) => <p className={styles.style18!} key={answer}>{answer}</p>)}</div><CheckCircle aria-label="回答済み" className={styles.style19!} size={20} weight="fill" /></li>)}</ol></Card>;
}

function AttendanceSummary({ data }: Readonly<{ data: Extract<PublicHtmlActivityScreen, { kind: "attendance" }>["attendance"] }>) {
  const status = data.currentStatus === "present" ? "出席" : data.currentStatus === "late" ? "遅刻" : data.currentStatus === "absent" ? "欠席" : "未確認";
  return <Card className={styles.htmlReport!} aria-labelledby="attendance-summary-title" padding="spacious"><header className={styles.style10!}><div className={styles.style2!}><span className={styles.kicker!}>ATTENDANCE</span><h2 className={styles.style11!} id="attendance-summary-title">出席状況</h2></div><span className={styles.style20!}>{status}</span></header>{data.records.length === 0 ? <EmptyState title="表示できる出席履歴はありません。" /> : <ol className={styles.style13!}>{data.records.map((record, index) => <li className={styles.style21!} key={`${record.date}:${record.status}:${index}`}><span className={styles.style15!}>{index + 1}</span><div><h3 className={styles.style17!}>{record.date}</h3><p className={styles.style22!}>{record.status}</p></div><CheckCircle aria-hidden className={styles.style19!} size={20} /></li>)}</ol>}</Card>;
}

export function MoodleScreenForm({ actionEndpoint, className, form, layout = "default", onPrevious, onScreenChange, presentation = "default" }: Readonly<{
  actionEndpoint: string;
  className?: string | undefined;
  form: MoodleFormModel;
  layout?: "compact-action" | "default";
  onPrevious?: () => void;
  onScreenChange: (screen: MoodleScreenModel) => void;
  presentation?: "assignment" | "default" | "forum";
}>) {
  const router = useRouter();
  const statusRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);
  const [values, setValues] = useState<FormValues>(() => initialValues(form));
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>(form.errors);
  const [state, setState] = useState<"editing" | "reviewing" | "submitting" | "success" | "error">("editing");
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const progress = useMemo(() => ({ answered: form.controls.filter((control) => complete(control, values[control.id])).length, total: form.controls.length }), [form.controls, values]);

  useEffect(() => {
    if (!dirty || state === "success") return;
    const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, state]);

  function change(id: string, value: FormValue): void {
    setValues((current) => ({ ...current, [id]: value }));
    setDirty(true);
    setErrors((current) => {
      if (current[id] === undefined) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function validate(): Readonly<Record<string, string>> {
    return Object.fromEntries(form.controls.flatMap((control) => control.required && !complete(control, values[control.id]) ? [[control.id, "この項目は必須です。"]] : []));
  }

  async function send(action: MoodleFormModel["actions"][number]): Promise<void> {
    if (inFlightRef.current) return;
    const mustValidate = action.purpose === "next" || action.purpose === "submit";
    const nextErrors = mustValidate ? validate() : {};
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setState("error");
      setMessage(`未入力の必須項目が${Object.keys(nextErrors).length}件あります。`);
      document.getElementById(Object.keys(nextErrors)[0] ?? "")?.focus();
      return;
    }
    inFlightRef.current = true;
    setState("submitting");
    setMessage("Moodleへ送信しています。");
    try {
      const response = await ky.post(actionEndpoint, {
        json: { actionId: action.id, formId: form.id, revision: form.revision, values },
        retry: 0,
        throwHttpErrors: false,
        timeout: 25_000,
      });
      type ActionPayload = Readonly<{ ok?: boolean; result?: Readonly<{ fieldErrors?: Readonly<Record<string, string>>; kind?: string; message?: string; screen?: MoodleScreenModel }> }>;
      const payload: ActionPayload = await response.json<ActionPayload>().catch(() => ({}));
      if (response.ok && payload.ok === true && payload.result?.kind === "success") {
        setDirty(false);
        setState("success");
        setMessage("Moodleへ保存しました。");
        statusRef.current?.focus();
        if (payload.result.screen !== undefined) onScreenChange(payload.result.screen);
        else router.refresh();
        return;
      }
      setErrors(payload.result?.fieldErrors ?? {});
      setState("error");
      setMessage(payload.result?.kind === "reauth_required" ? "Moodleへの再ログインが必要です。" : payload.result?.message ?? "送信できませんでした。入力内容は保持されています。");
      statusRef.current?.focus();
    } catch {
      setState("error");
      setMessage("通信に失敗しました。入力内容は保持されています。");
      statusRef.current?.focus();
    } finally {
      inFlightRef.current = false;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const primary = form.actions.findLast((action) => action.intent === "primary") ?? form.actions[0];
    if (primary === undefined || state === "submitting") return;
    if (state !== "reviewing" && (primary.purpose === "submit" || primary.purpose === "delete")) {
      const nextErrors = primary.purpose === "submit" ? validate() : {};
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors); setState("error"); setMessage(`未入力の必須項目が${Object.keys(nextErrors).length}件あります。`); return;
      }
      setState("reviewing");
      setReviewActionId(primary.id);
      setMessage(primary.purpose === "delete" ? "削除すると元に戻せません。内容を確認して確定してください。" : "回答内容を確認して、確定してください。");
      statusRef.current?.focus();
      return;
    }
    void send(primary);
  }

  function beginSecondaryAction(action: MoodleFormModel["actions"][number]): void {
    if (action.purpose === "previous" && onPrevious !== undefined) {
      onPrevious();
      return;
    }
    if (action.purpose === "delete") {
      setReviewActionId(action.id);
      setState("reviewing");
      setMessage("削除すると元に戻せません。内容を確認して確定してください。");
      statusRef.current?.focus();
      return;
    }
    void send(action);
  }

  const reviewAction = reviewActionId === null ? undefined : form.actions.find((action) => action.id === reviewActionId);
  const isNavigationForm = form.controls.length === 0 && form.actions.some((action) => action.purpose === "next");
  const isAssignmentSubmission = presentation === "assignment" && form.title === "入力フォーム";
  const isForumSearch = presentation === "forum" && form.actions.some((action) => action.purpose === "search");
  const heading = isNavigationForm && isAssignmentSubmission ? "提出を開始する" : isAssignmentSubmission ? "提出内容を入力" : isForumSearch && form.title === "入力フォーム" ? "フォーラムを検索" : form.title;
  const statusMessage = message || (isNavigationForm ? presentation === "assignment" ? "入力欄を開きます。保存・提出はまだ行いません。" : "次の画面で提出内容を入力できます。" : isForumSearch ? "キーワードと一致する投稿を検索します。" : "入力内容はMoodleへ直接保存されます。");
  const actionButtons = state === "reviewing"
    ? <><Button onClick={() => { setReviewActionId(null); setState("editing"); }} type="button" variant="secondary">入力へ戻る</Button>{reviewAction === undefined ? null : <Button onClick={() => void send(reviewAction)} type="button" variant={reviewAction.purpose === "delete" ? "danger" : "primary"}>{reviewAction.purpose === "delete" ? "削除を確定" : "この内容で確定"}</Button>}</>
    : form.actions.map((action) => {
      const isPrimary = action.intent === "primary";
      const label = isNavigationForm && presentation === "assignment" && isPrimary ? "提出内容を入力する" : action.label;
      return <Button disabled={state === "submitting"} key={action.id} loading={state === "submitting" && isPrimary} onClick={action.intent === "secondary" ? () => beginSecondaryAction(action) : undefined} type={isPrimary ? "submit" : "button"} variant={action.purpose === "delete" ? "danger" : isPrimary ? "primary" : "secondary"}>{isNavigationForm && isPrimary ? <PencilSimple aria-hidden size={17} /> : null}{label}</Button>;
    });
  if (layout === "compact-action") {
    return <form className={classNames(styles.htmlForm!, className)} noValidate onKeyDown={protectIme} onSubmit={submit}><p aria-live="polite" className={classNames(styles.assignmentHtmlStartNote!, state === "error" ? styles.style23! : state === "success" ? styles.style19! : styles.style24!)} ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden className={styles.style25!} size={18} /> : state === "success" ? <CheckCircle aria-hidden className={styles.style25!} size={18} /> : <ClipboardText aria-hidden className={styles.style25!} size={18} />}{statusMessage}</p><footer className={styles.style26!}>{actionButtons}</footer></form>;
  }
  return <form className={classNames(styles.htmlForm2!, className)} noValidate onKeyDown={protectIme} onSubmit={submit}>
    <header className={styles.style27!}><div className={styles.style2!}><span className={styles.kicker!}>{isNavigationForm || isAssignmentSubmission ? "SUBMISSION" : isForumSearch ? "SEARCH" : "FORM"}</span><h2 className={styles.style11!}>{heading}</h2></div><span className={styles.style28!}>{isNavigationForm ? "入力前" : `${progress.answered} / ${progress.total} 入力`}</span></header>
    {state === "reviewing" ? <section className={styles.htmlFormReview!} aria-label={reviewAction?.purpose === "delete" ? "削除確認" : "回答確認"}><h3 className={styles.style29!}>{reviewAction?.purpose === "delete" ? "削除する内容を確認" : "回答内容を確認"}</h3><dl className={styles.style30!}>{form.controls.map((control) => <div className={styles.style31!} key={control.id}><dt className={styles.style32!}>{control.label}</dt><dd className={styles.style33!}>{answerLabel(control, values[control.id]) || "未回答"}</dd></div>)}</dl></section> : <FieldGroup className={styles.htmlFormControls!}>{form.controls.map((control) => <MoodleControl control={control} error={errors[control.id]} key={control.id} onChange={(value) => change(control.id, value)} value={values[control.id]} />)}</FieldGroup>}
    <div aria-live="polite" className={classNames(styles.htmlFormStatus!, state === "error" ? styles.style23! : state === "success" ? styles.style19! : styles.style24!)} ref={statusRef} tabIndex={-1}>{state === "error" ? <Warning aria-hidden className={styles.style25!} size={18} /> : state === "success" ? <CheckCircle aria-hidden className={styles.style25!} size={18} /> : <ClipboardText aria-hidden className={styles.style25!} size={18} />}{statusMessage}</div>
    <StickyActionBar aria-label="フォーム操作">{actionButtons}</StickyActionBar>
  </form>;
}

export function MoodleScreenWorkspace({ actionEndpoint, kicker, screen, testId = "moodle-screen-workspace" }: Readonly<{
  actionEndpoint: string;
  kicker: string;
  screen: MoodleScreenModel;
  testId?: string;
}>) {
  const [screenOverride, setScreenOverride] = useState<Readonly<{ endpoint: string; screen: MoodleScreenModel }> | null>(null);
  const currentScreen = screenOverride?.endpoint === actionEndpoint ? screenOverride.screen : screen;
  const setCurrentScreen = (nextScreen: MoodleScreenModel): void => setScreenOverride({ endpoint: actionEndpoint, screen: nextScreen });
  return <section className={styles.htmlActivity!} data-testid={testId}>
    <header className={styles.style2!}><span className={styles.kicker!}>{kicker.toUpperCase()}</span><h2 className={styles.style34!}>{currentScreen.title}</h2></header>
    {currentScreen.state === "closed" ? <Notice title="受付は終了しています" tone="warning"><p>現在の状態と提出済みの内容を確認できます。</p></Notice> : null}
    {currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="Moodleからのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    {isEmptyMoodleDocument(currentScreen.document) ? null : <Card padding="spacious"><RichContent document={currentScreen.document} /></Card>}
    {currentScreen.forms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} form={form} key={`${form.id}:${form.revision}`} onScreenChange={setCurrentScreen} />)}
    {currentScreen.forms.length === 0 ? <EmptyState title="現在、操作できる項目はありません。"><p>この画面の最新状態を表示しています。</p></EmptyState> : null}
  </section>;
}

export function HtmlActivityWorkspace({ cmid, data }: Readonly<{ cmid: number; data: PublicHtmlActivityScreen }>) {
  const kicker = data.kind === "questionnaire" ? "Questionnaire" : data.kind === "attendance" ? "Attendance" : data.moduleName;
  return <><MoodleScreenWorkspace actionEndpoint={`/api/activities/${cmid}/html-action`} kicker={kicker} screen={data.screen} testId="html-activity-workspace" />{data.kind === "questionnaire" && data.report.length > 0 ? <QuestionnaireReport items={data.report} submittedAt={data.submittedAt} /> : null}{data.kind === "attendance" ? <AttendanceSummary data={data.attendance} /> : null}</>;
}
