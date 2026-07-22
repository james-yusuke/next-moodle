"use client";

import { ArrowLeft, ChalkboardTeacher, CheckCircle, PaperPlaneRight, ShieldCheck } from "@phosphor-icons/react";
import ky, { isKyError } from "ky";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer } from "react";
import { z } from "zod";

import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Button, Field, Notice, Textarea } from "@/components/ui";
import "./messages.css";

const TeacherSchema = z.object({
  avatarUrl: z.string().nullable(),
  canMessage: z.boolean(),
  displayName: z.string(),
  recipientKey: z.string(),
  roles: z.array(z.string()),
});
const TeachersResponseSchema = z.object({ ok: z.literal(true), result: z.array(TeacherSchema) });
const SendResponseSchema = z.object({
  ok: z.literal(true),
  result: z.object({ conversationId: z.number().int().positive(), messageId: z.number().int().positive() }),
});

type CourseOption = Readonly<{ id: number; name: string; shortName: string }>;
type Teacher = z.infer<typeof TeacherSchema>;
type ContactStep = "course" | "recipient" | "compose";
type ContactStatus = "idle" | "sending" | "error";
type ContactState = Readonly<{
  body: string;
  courseId: number | null;
  loadingTeachers: boolean;
  message: string;
  recipientKey: string;
  reviewing: boolean;
  status: ContactStatus;
  step: ContactStep;
  subject: string;
  teachers: readonly Teacher[];
}>;
type ContactAction =
  | Readonly<{ type: "body_changed"; value: string }>
  | Readonly<{ courseId: number; type: "course_selected" }>
  | Readonly<{ type: "recipient_selected"; value: string }>
  | Readonly<{ type: "review_changed"; value: boolean }>
  | Readonly<{ type: "send_failed"; message: string }>
  | Readonly<{ type: "sending" }>
  | Readonly<{ step: ContactStep; type: "step_changed" }>
  | Readonly<{ type: "subject_changed"; value: string }>
  | Readonly<{ teachers: readonly Teacher[]; type: "teachers_loaded" }>
  | Readonly<{ message: string; type: "teachers_failed" }>;

function initialContactState(courses: readonly CourseOption[], initialCourseId: number | null): ContactState {
  return {
    body: "",
    courseId: courses.some((course) => course.id === initialCourseId) ? initialCourseId : courses[0]?.id ?? null,
    loadingTeachers: courses.length > 0,
    message: "",
    recipientKey: "",
    reviewing: false,
    status: "idle",
    step: "course",
    subject: "",
    teachers: [],
  };
}

function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case "body_changed": return { ...state, body: action.value, reviewing: false };
    case "course_selected": return { ...state, courseId: action.courseId, loadingTeachers: true, message: "", recipientKey: "", reviewing: false, status: "idle", step: "recipient", teachers: [] };
    case "recipient_selected": return { ...state, recipientKey: action.value, reviewing: false, step: action.value === "" ? state.step : "compose" };
    case "review_changed": return { ...state, reviewing: action.value };
    case "send_failed": return { ...state, message: action.message, status: "error" };
    case "sending": return { ...state, message: "", status: "sending" };
    case "step_changed": return { ...state, step: action.step };
    case "subject_changed": return { ...state, reviewing: false, subject: action.value };
    case "teachers_failed": return { ...state, loadingTeachers: false, message: action.message };
    case "teachers_loaded": {
      const first = action.teachers.find((teacher) => teacher.canMessage);
      return { ...state, loadingTeachers: false, recipientKey: first?.recipientKey ?? "", teachers: action.teachers };
    }
  }
}

function errorMessage(code: string): string {
  if (code === "recipient_expired") return "宛先の有効期限が切れました。先生を選び直してください。";
  if (code === "message_rejected") return "Moodleの受信設定により送信できません。連絡先申請または受信設定を確認してください。";
  if (code === "permission" || code === "recipient_not_allowed") return "このコースの担当者へ送信する権限を確認できませんでした。";
  if (code === "configuration_error") return "Moodle管理者によるメッセージAPIの許可が必要です。";
  return "送信できませんでした。入力内容は保持されています。";
}

export function TeacherContactForm({ courses, initialCourseId = null }: Readonly<{
  courses: readonly CourseOption[];
  initialCourseId?: number | null;
}>) {
  const router = useRouter();
  const [state, dispatch] = useReducer(contactReducer, undefined, () => initialContactState(courses, initialCourseId));
  const { body, courseId, loadingTeachers, message, recipientKey, reviewing, status, step, subject, teachers } = state;
  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId), [courseId, courses]);
  const selectedTeacher = useMemo(() => teachers.find((teacher) => teacher.recipientKey === recipientKey), [recipientKey, teachers]);

  useEffect(() => {
    if (courseId === null) return;
    const controller = new AbortController();
    void ky.get(`/api/messages/teachers?courseId=${courseId}`, {
      cache: "no-store",
      retry: 0,
      signal: controller.signal,
      timeout: 12_000,
    }).json().then((payload) => {
      const parsed = TeachersResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("invalid_response");
      dispatch({ teachers: parsed.data.result, type: "teachers_loaded" });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (!isKyError(error) && !(error instanceof Error)) throw error;
      dispatch({ message: "担当教員を取得できませんでした。コースとMoodleの権限設定を確認してください。", type: "teachers_failed" });
    });
    return () => controller.abort();
  }, [courseId]);

  function selectCourse(nextCourseId: number): void {
    if (nextCourseId === courseId) return;
    dispatch({ courseId: nextCourseId, type: "course_selected" });
  }

  async function submit(): Promise<void> {
    if (courseId === null || recipientKey === "" || subject.trim() === "" || body.trim() === "" || status === "sending") return;
    dispatch({ type: "sending" });
    try {
      const response = await ky.post("/api/messages", {
        json: { body, clientRequestId: crypto.randomUUID(), courseId, recipientKey, subject },
        retry: 0,
        throwHttpErrors: false,
        timeout: 20_000,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const code = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "object" && payload.error !== null && "code" in payload.error && typeof payload.error.code === "string" ? payload.error.code : "message_send_failed";
        dispatch({ message: errorMessage(code), type: "send_failed" });
        return;
      }
      const parsed = SendResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error("invalid_response");
      router.push(`/messages/${parsed.data.result.conversationId}`);
      router.refresh();
    } catch (error) {
      if (!isKyError(error) && !(error instanceof Error)) throw error;
      dispatch({ message: "送信できませんでした。入力内容は保持されています。", type: "send_failed" });
    }
  }

  const command = (
    <div className="ui-teacher-compose__command">
      <span>{status === "sending" ? "Moodleへ送信中…" : "入力は送信に成功するまで保持されます"}</span>
      {reviewing ? (
        <div><Button onClick={() => dispatch({ type: "review_changed", value: false })} type="button" variant="secondary">修正する</Button><Button disabled={status === "sending"} onClick={submit} type="button"><PaperPlaneRight aria-hidden size={18} />{status === "sending" ? "送信中" : "送信を確定"}</Button></div>
      ) : (
        <Button disabled={recipientKey === "" || subject.trim() === "" || body.trim() === "" || status === "sending"} onClick={() => dispatch({ type: "review_changed", value: true })} type="button">送信内容を確認</Button>
      )}
    </div>
  );

  return (
    <PageFrame
      actions={command}
      className="ui-teacher-contact"
      content={<section aria-label="先生への新規連絡" className="ui-teacher-compose" data-step="compose">
        <header><div><h2>{selectedTeacher?.displayName ?? "担当者を選択"}</h2><p>{selectedCourse?.name ?? "コースを選択"}</p></div><ChalkboardTeacher aria-hidden size={22} /></header>
        <div className="ui-teacher-compose__body">
          <Field autoComplete="off" id="teacher-message-subject" label="件名" maxLength={200} onChange={(event) => dispatch({ type: "subject_changed", value: event.currentTarget.value })} placeholder="用件を簡潔に入力" value={subject} />
          <Textarea label="本文" maxLength={10_000} onChange={(event) => dispatch({ type: "body_changed", value: event.currentTarget.value })} placeholder="所属・要件・希望する対応を具体的に入力してください" rows={12} value={body} />
          {reviewing ? (
            <section className="ui-teacher-review" aria-labelledby="teacher-review-title">
              <header><CheckCircle aria-hidden size={20} /><div><h3 id="teacher-review-title">送信前の確認</h3><p>この内容でMoodle側の宛先を再検証します。</p></div></header>
              <dl>
                <div><dt>宛先</dt><dd>{selectedTeacher?.displayName ?? "未選択"}</dd></div>
                <div><dt>コース</dt><dd>{selectedCourse?.name ?? "未選択"}</dd></div>
                <div><dt>件名</dt><dd>{subject.trim()}</dd></div>
                <div><dt>本文冒頭</dt><dd>{body.trim().slice(0, 120)}{body.trim().length > 120 ? "…" : ""}</dd></div>
                <div><dt>再検証</dt><dd>受講関係 / 教員ロール / 受信可否</dd></div>
              </dl>
            </section>
          ) : null}
          <p className="ui-teacher-compose__error" aria-live="polite">{message}</p>
        </div>
      </section>}
      context={<div className="ui-teacher-recipient-panel">
        <nav aria-label="連絡作成の進行状況" className="ui-teacher-steps">
        <button aria-current={step === "course" ? "step" : undefined} onClick={() => dispatch({ step: "course", type: "step_changed" })} type="button"><span>01</span>コース</button>
        <button aria-current={step === "recipient" ? "step" : undefined} disabled={courseId === null} onClick={() => dispatch({ step: "recipient", type: "step_changed" })} type="button"><span>02</span>担当者</button>
        <button aria-current={step === "compose" ? "step" : undefined} disabled={recipientKey === ""} onClick={() => dispatch({ step: "compose", type: "step_changed" })} type="button"><span>03</span>本文確認</button>
        </nav>
        <section className="ui-teacher-courses" data-step="course">
          <header><h2>コース</h2><span>{courses.length}</span></header>
          {courses.length === 0 ? <Notice title="受講コースがありません" tone="info"><p>コースへ参加すると、担当教員を選択できます。</p></Notice> : (
            <nav aria-label="連絡するコース">
              {courses.map((course) => (
                <button aria-pressed={course.id === courseId} key={course.id} onClick={() => selectCourse(course.id)} type="button">
                  <span>{course.shortName.slice(0, 1)}</span><span><strong>{course.name}</strong><small>{course.shortName}</small></span>
                </button>
              ))}
            </nav>
          )}
        </section>
        <section className="ui-teacher-recipient" data-step="recipient">
          <header><h2>担当教員</h2><span>{loadingTeachers ? "確認中" : `${teachers.length}人`}</span></header>
          <label className="ui-teacher-select">
            <span>送信先</span>
            <select
              disabled={loadingTeachers || teachers.length === 0}
              onChange={(event) => {
                dispatch({ type: "recipient_selected", value: event.currentTarget.value });
              }}
              value={recipientKey}
            >
              <option value="">{loadingTeachers ? "確認中…" : "担当教員を選択"}</option>
              {teachers.map((teacher) => <option disabled={!teacher.canMessage} key={teacher.recipientKey} value={teacher.recipientKey}>{teacher.displayName} — {teacher.roles.join(" / ")}</option>)}
            </select>
          </label>
          <div className="ui-teacher-person"><span>{selectedTeacher?.displayName.slice(0, 1) ?? "?"}</span><div><strong>{selectedTeacher?.displayName ?? "未選択"}</strong><small>{selectedTeacher?.roles.join(" / ") ?? "担当教員を選択"}</small></div></div>
          <div className="ui-teacher-safety"><ShieldCheck aria-hidden size={20} /><p>宛先IDはブラウザへ公開せず、送信直前に受講関係と教員ロールを再確認します。</p></div>
        </section>
      </div>}
      header={<RouteHeader actions={<TransitionLink className="ui-app-action-link" href="/messages" intent="return"><ArrowLeft aria-hidden size={18} />会話へ戻る</TransitionLink>} description="受講コースの担当教員へ、Moodleの個別メッセージを送ります。" eyebrow="新規メッセージ" title="先生へ連絡" />}
      mode="conversation"
      state={step}
    />
  );
}
