import { ArrowSquareOut, CalendarDots, FileText } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { AssignmentDetail } from "@/lib/moodle/queries/assignments";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { Badge, Notice, Surface } from "@/components/ui";
import { dateTimeFormatter } from "@/lib/date-time";

import { AssignmentSubmissionForm } from "./assignment-submission-form";

function dueLabel(data: AssignmentDetail, config: AppRuntimeConfig): string {
  if (data.dueAt === 0) return "期限なし";
  return dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  }).format(new Date(data.dueAt * 1_000));
}

function fallbackReason(data: AssignmentDetail): string {
  if (data.nativeSubmission.kind === "enabled") return "";
  switch (data.nativeSubmission.reason) {
    case "group_submission": return "グループ提出はMoodleで行ってください。";
    case "submission_statement": return "提出同意文が必要なため、Moodleで行ってください。";
    case "locked": return "この提出はロックされています。";
    case "graded": return "採点済みの提出はMoodleで確認してください。";
    case "final_state": return "提出済みの課題はMoodleで確認してください。";
    case "not_open": return "この課題はまだ提出期間外です。";
    case "cutoff_reached": return "提出締切を過ぎています。";
    case "permission": return "この課題への提出権限がありません。";
    case "capability": return "Moodle管理者のAPI設定ではこの提出方法を利用できません。";
    case "unsupported_plugin": return "この提出形式は現在のアプリでは対応していません。";
  }
}

export function AssignmentDetailView({ config, data, draftStorageKey }: Readonly<{
  config: AppRuntimeConfig;
  data: AssignmentDetail;
  draftStorageKey: string;
}>) {
  const native = data.nativeSubmission;
  return (
    <div className="ui-page-stack ui-assignment">
      <header className="ui-assignment__header">
        <Link href={`/courses/${data.assignment.course}`}>コースに戻る</Link>
        <div>
          <Badge tone={data.isOverdue ? "error" : "accent"}>{data.courseName}</Badge>
          <h1>{data.name}</h1>
          <p><CalendarDots aria-hidden size={18} weight="regular" /> <span className="ui-tabular">{dueLabel(data, config)}</span></p>
        </div>
      </header>
      <div className="ui-assignment__grid">
        <Surface className="ui-assignment__description" title="課題の説明">
          <div dangerouslySetInnerHTML={{ __html: data.description }} />
        </Surface>
        <Surface eyebrow="提出状況" title={data.status} variant="raised">
          <dl className="ui-assignment__facts">
            <div><dt>期限</dt><dd className="ui-tabular">{dueLabel(data, config)}</dd></div>
            <div><dt>最終更新</dt><dd>{data.updatedAt === 0 ? "未保存" : dateTimeFormatter(config.locale, { dateStyle: "medium", timeStyle: "short", timeZone: config.timeZone }).format(new Date(data.updatedAt * 1_000))}</dd></div>
            <div><dt>状態</dt><dd>{data.isLocked ? "ロック中" : data.isGraded ? "採点済み" : data.isOverdue ? "期限超過" : "提出可能"}</dd></div>
          </dl>
          {data.existingFiles.length > 0 ? (
            <ul className="ui-assignment__files">
              {data.existingFiles.map((file) => (
                <li key={`${file.filename}-${file.filesize}`}>
                  <FileText aria-hidden size={18} weight="regular" />
                  {file.downloadUrl === undefined ? file.filename : <a href={file.downloadUrl}>{file.filename}</a>}
                </li>
              ))}
            </ul>
          ) : null}
        </Surface>
      </div>
      {native.kind === "enabled" ? (
        <AssignmentSubmissionForm
          cmid={data.cmid}
          draftStorageKey={draftStorageKey}
          dueLabel={dueLabel(data, config)}
          existingFiles={data.existingFiles}
          initialText={data.existingText}
          locale={config.locale}
          policy={native}
        />
      ) : (
        <Notice
          action={<a className="ui-app-action-link" href={data.moodleUrl} rel="noopener noreferrer" target="_blank">Moodleで提出 <ArrowSquareOut aria-hidden size={17} weight="regular" /></a>}
          title="この課題はMoodleで提出してください"
          tone="warning"
        >
          <p>{fallbackReason(data)} 新規タブで開くため、Moodle側への再ログインが必要な場合があります。</p>
        </Notice>
      )}
      {data.feedback === null ? null : (
        <Surface title="フィードバック">
          {data.feedback.grade === null ? null : <div dangerouslySetInnerHTML={{ __html: data.feedback.grade }} />}
          {data.feedback.comments.map((comment, index) => <div key={index} dangerouslySetInnerHTML={{ __html: comment }} />)}
        </Surface>
      )}
    </div>
  );
}
