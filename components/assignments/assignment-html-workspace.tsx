"use client";

import styles from "./assignment-html-workspace.module.css";
import { CalendarDots, ClockCountdown, FileText, WarningCircle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { MoodleScreenForm } from "@/components/activities/html-activity-workspace";
import { Badge, Card, Notice, RichContent } from "@/components/ui";
import {
  hasAssignmentHtmlDescription,
  projectAssignmentHtmlScreen,
  type AssignmentHtmlFact,
} from "@/lib/moodle/activities/assignment-html-view";
import type { MoodleScreenModel } from "@/lib/moodle/page-model";

function statusTone(status: readonly AssignmentHtmlFact[]): "accent" | "success" | "warning" {
  const value = status.find((fact) => /提出(?:ステータス|状況)/.test(fact.label))?.value ?? "";
  if (/提出済み|送信済み|提出完了/.test(value)) return "success";
  return value === "" ? "accent" : "warning";
}

function statusLabel(status: readonly AssignmentHtmlFact[]): string {
  return status.find((fact) => /提出(?:ステータス|状況)/.test(fact.label))?.value || "提出状況を確認";
}

function Schedule({ facts }: Readonly<{ facts: readonly AssignmentHtmlFact[] }>) {
  if (facts.length === 0) return null;
  return <dl className={styles.assignmentHtmlSchedule!}>{facts.map((fact) => <div className={styles.style1!} key={`${fact.label}:${fact.value}`}><dt className={styles.style2!}>{/期限|締切|終了/.test(fact.label) ? <ClockCountdown aria-hidden className={styles.style3!} size={17} /> : <CalendarDots aria-hidden className={styles.style3!} size={17} />}{fact.label}</dt><dd className={styles.style4!}>{fact.value}</dd></div>)}</dl>;
}

function StatusList({ facts }: Readonly<{ facts: readonly AssignmentHtmlFact[] }>) {
  if (facts.length === 0) return null;
  return <Card className={styles.assignmentHtmlStatus!} aria-labelledby="assignment-status-title" padding="standard" tone="inset"><header className={styles.style5!}><div className={styles.style6!}><span className={styles.kicker!}>STATUS</span><h2 className={styles.style7!} id="assignment-status-title">提出状況</h2></div><Badge tone={statusTone(facts)}>{statusLabel(facts)}</Badge></header><dl className={styles.style8!}>{facts.map((fact) => <div className={styles.style9!} key={`${fact.label}:${fact.value}`}><dt className={styles.style10!}>{fact.label}</dt><dd className={styles.style4!}>{fact.value || "—"}</dd></div>)}</dl></Card>;
}

export function AssignmentHtmlWorkspace({ actionEndpoint, screen }: Readonly<{
  actionEndpoint: string;
  screen: MoodleScreenModel;
}>) {
  const [currentScreen, setCurrentScreen] = useState(screen);
  const initialView = useMemo(() => projectAssignmentHtmlScreen(screen), [screen]);
  const currentView = useMemo(() => projectAssignmentHtmlScreen(currentScreen), [currentScreen]);
  const view = {
    description: hasAssignmentHtmlDescription(currentView) ? currentView.description : initialView.description,
    schedule: currentView.schedule.length > 0 ? currentView.schedule : initialView.schedule,
    status: currentView.status.length > 0 ? currentView.status : initialView.status,
  };
  const startForms = currentScreen.forms.filter((form) => form.controls.length === 0 && form.actions.some((action) => action.purpose === "next"));
  const startFormIds = new Set(startForms.map((form) => form.id));
  const editForms = currentScreen.forms.filter((form) => !startFormIds.has(form.id));
  return <section className={styles.assignmentHtml!} data-testid="html-assignment-workspace">
    {currentScreen.state === "closed" ? <Notice title="提出受付は終了しています" tone="warning"><p>提出状況と、これまでに保存した内容を確認できます。</p></Notice> : null}
    {currentScreen.notices.map((notice, index) => <Notice key={`${notice.message}:${index}`} title="課題からのお知らせ" tone={notice.tone}><p>{notice.message}</p></Notice>)}
    <Card className={styles.assignmentHtmlOverview!} aria-label="課題の期限と提出状況" padding="spacious" tone="selected"><div className={styles.assignmentHtmlOverviewCopy!}><span className={styles.kicker!}>ASSIGNMENT</span><h2 className={styles.style11!}>次にすること</h2><p className={styles.style12!}>{currentScreen.forms.length > 0 ? "提出内容を入力し、確認後にMoodleへ保存できます。" : "この課題の現在の提出状況を確認できます。"}</p>{startForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className={styles.assignmentHtmlStart!} form={form} key={`${form.id}:${form.revision}`} layout="compact-action" onScreenChange={setCurrentScreen} presentation="assignment" />)}</div><Schedule facts={view.schedule} /></Card>
    <div className={styles.assignmentHtmlGrid!}>
      {hasAssignmentHtmlDescription(view) ? <Card className={styles.assignmentHtmlDescription!} aria-labelledby="assignment-description-title" padding="spacious" tone="default"><header className={styles.style6!}><span className={styles.kicker!}>BRIEF</span><h2 className={styles.style7!} id="assignment-description-title">課題の説明</h2></header><RichContent className={styles.richContent!} document={view.description} /></Card> : null}
      <StatusList facts={view.status} />
    </div>
    {editForms.map((form) => <MoodleScreenForm actionEndpoint={actionEndpoint} className={styles.assignmentHtmlForm!} form={form} key={`${form.id}:${form.revision}`} onPrevious={() => setCurrentScreen(screen)} onScreenChange={setCurrentScreen} presentation="assignment" />)}
    {currentScreen.forms.length === 0 ? <Notice title="この画面で行える操作はありません" tone="info"><FileText aria-hidden size={18} /><p>必要な情報は上部にまとめて表示しています。</p></Notice> : null}
    {currentScreen.state === "forbidden" ? <Notice title="この課題へのアクセス権がありません" tone="error"><WarningCircle aria-hidden size={18} /><p>Moodleの受講状態または提出条件を確認してください。</p></Notice> : null}
  </section>;
}
