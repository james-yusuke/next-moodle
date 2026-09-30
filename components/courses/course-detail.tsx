import styles from "./course-detail.module.css";
import {
  ArrowRight,
  CheckCircle,
  Circle,
  FileText,
  DownloadSimple,
  Info,
  LockSimple,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { Badge, Card, EmptyState, Progress, RichContent } from "@/components/ui";
import { InspectorSheet } from "@/components/app-shell/inspector-sheet";
import { ContextPanel } from "@/components/app-shell/context-panel";
import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader, SectionIndex } from "@/components/app-shell/workspace-frame";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { dateTimeFormatter } from "@/lib/date-time";
import { isEmptyMoodleDocument } from "@/lib/moodle/html";
import type {
  CourseActivity,
  CourseSubsection,
  CourseDetail as CourseDetailData,
} from "@/lib/moodle/queries/courses";
import type { ActivityDestination } from "@/lib/moodle/queries/courses-model";

class UnexpectedActivityDestinationError extends Error {
  override readonly name = "UnexpectedActivityDestinationError";
}

function assertNever(value: never): never {
  throw new UnexpectedActivityDestinationError(`Unexpected activity destination: ${String(value)}`);
}

function ActivityAction({ activity }: Readonly<{ activity: CourseActivity }>): ReactNode {
  const destination: ActivityDestination = activity.destination;
  switch (destination.kind) {
    case "internal":
      return <TransitionLink className={styles.courseActivityAction!} href={destination.href} intent="drill-in">開く <ArrowRight aria-hidden size={15} /></TransitionLink>;
    case "disabled":
      return <span className={styles.courseActivityLocked!}><LockSimple aria-hidden size={15} />利用不可</span>;
    default:
      return assertNever(destination);
  }
}

function CompletionIcon({ state }: Readonly<{ state: CourseActivity["completion"] }>) {
  return state === "complete"
    ? <CheckCircle aria-label="完了" className={styles.courseActivityComplete!} size={18} weight="fill" />
    : <Circle aria-label={state === "none" ? "完了条件なし" : "未完了"} className={styles.style1!} size={18} />;
}

function SubsectionMarker({ item }: Readonly<{ item: CourseSubsection }>) {
  return <div className={styles.courseSubsection!} data-indent={Math.min(item.indent, 4)}><span className={styles.style2!}>サブセクション</span><strong>{item.title}</strong></div>;
}

export function CourseDetail({ config, data }: Readonly<{
  config: AppRuntimeConfig;
  data: CourseDetailData;
}>) {
  const dateFormat = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const activities = data.sections.flatMap((section) =>
    section.items.filter((item): item is CourseActivity => item.kind === "activity"),
  );
  const completed = activities.filter((activity) => activity.completion === "complete").length;
  const tracked = activities.filter((activity) => activity.completion !== "none").length;
  const restricted = activities.filter((activity) => activity.availability !== "available").length;

  const inspector = (
    <div className={styles.courseInspectorContent!}>
      <div className={styles.style3!}>
        <div className={styles.style4!}><strong className={styles.tabular!}>{tracked === 0 ? "—" : `${Math.round((completed / tracked) * 100)}%`}</strong><span className={styles.style5!}>{completed} / {tracked} 完了</span></div>
        <Progress label="コース進捗" value={tracked === 0 ? 0 : (completed / tracked) * 100} />
      </div>
      <dl className={styles.style6!}>
        <div className={styles.style7!}><dt className={styles.style8!}>コース</dt><dd className={styles.style9!}>{data.course.shortName}</dd></div>
        <div className={styles.style7!}><dt className={styles.style8!}>教材</dt><dd className={styles.style9!}>{activities.length}</dd></div>
        <div className={styles.style7!}><dt className={styles.style8!}>利用制限</dt><dd className={styles.style9!}>{restricted}</dd></div>
      </dl>
      <TransitionLink appearance="action" className={styles.appActionLink!} href="/grades" intent="switch">成績を確認</TransitionLink>
      <TransitionLink appearance="action" className={styles.appActionLink!} href={`/messages/new?courseId=${data.course.id}`} intent="drill-in">メッセージを送る</TransitionLink>
    </div>
  );

  return (
    <PageFrame
      content={data.sections.length === 0 ? (
        <EmptyState title="公開中のセクションはありません">教材が公開されると、この画面に表示されます。</EmptyState>
      ) : (
        <div className={styles.courseCanvas!} aria-label="コース教材ストリーム">
          <div className={styles.courseOverviewBand!}>
            <span className={styles.style10!}><strong className={styles.tabular2!}>{activities.length}</strong> 教材</span>
            <span className={styles.style10!}><strong className={styles.tabular2!}>{completed}</strong> 完了</span>
            <span className={styles.style10!}><strong className={styles.tabular2!}>{restricted}</strong> 利用制限</span>
          </div>
          <div className={styles.courseSections!}>
              {data.sections.map((section) => (
                <Card id={`section-${section.id}`} key={section.id} padding="standard" tone="default">
                  <header className={styles.style11!}><h2 className={styles.style12!}>{section.name}</h2><Badge>{section.items.length}</Badge></header>
                  {isEmptyMoodleDocument(section.summary) ? null : <RichContent className={styles.courseSectionSummary!} document={section.summary} />}
                  {section.items.length === 0 ? (
                    <p className={styles.courseSectionEmpty!}>公開中の教材はありません。</p>
                  ) : (
                    <div className={styles.courseStream!}>
                      {section.items.map((item) => item.kind === "label" ? (
                        <article className={styles.courseLabel!} key={item.id}>
                          <span className={styles.style2!}>{item.title}</span>
                          {isEmptyMoodleDocument(item.content) ? null : <RichContent className={styles.richContent!} document={item.content} />}
                        </article>
                      ) : item.kind === "subsection" ? (
                        <SubsectionMarker item={item} key={item.id} />
                      ) : item.kind === "error" ? (
                        <div className={styles.courseModuleError!} key={item.id}>
                          <WarningCircle aria-hidden className={styles.style13!} size={18} />
                          <span className={styles.style14!}><strong>{item.name}</strong><small className={styles.style5!}>{item.moduleType} · 応答を読み取れません</small></span>
                        </div>
                      ) : (
                        <article className={styles.courseActivity!} data-indent={Math.min(item.indent, 4)} key={item.id}>
                          <div className={styles.courseActivityRow!}>
                            <CompletionIcon state={item.completion} />
                            <span className={styles.courseActivityIcon!}><FileText aria-hidden size={19} /></span>
                            <span className={styles.courseActivityTitle!}>
                              <SharedTransition identifier={item.id} kind="activity"><strong className={styles.style15!}>{item.name}</strong></SharedTransition>
                              <small className={styles.style16!}>{item.typeLabel}{item.dueAt === undefined ? "" : ` · ${dateFormat.format(new Date(item.dueAt * 1_000))}`}</small>
                            </span>
                            {item.availability !== "available" ? <Badge tone="warning">利用制限</Badge> : null}
                            {item.supportState === "html" ? <Badge tone="info">アプリ内HTML</Badge> : null}
                            <ActivityAction activity={item} />
                          </div>
                          {isEmptyMoodleDocument(item.description) ? null : <RichContent className={styles.courseActivityDescription!} document={item.description} />}
                          {item.files.length === 0 ? null : <ul className={styles.courseActivityFiles!}>{item.files.map((file) => <li className={styles.style17!} key={`${file.filename}:${file.filesize}`}>{file.downloadUrl === null ? <span>{file.filename}</span> : <a className={styles.style18!} href={file.downloadUrl}><DownloadSimple aria-hidden className={styles.style13!} size={16} /><span className={styles.style19!}>{file.filename}</span></a>}<small className={styles.style20!}>{file.mimetype}</small></li>)}</ul>}
                        </article>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
        </div>
        </div>
      )}
      context={data.sections.length === 0 ? undefined : (
        <ContextPanel count={data.sections.length} storageKey="course" title="セクション">
          <nav aria-label="コースセクション">
            <SectionIndex items={data.sections.map((section) => ({ href: `#section-${section.id}`, id: section.id, label: section.name }))} />
          </nav>
        </ContextPanel>
      )}
      header={(
        <RouteHeader
          actions={<InspectorSheet description="進捗、成績、参加者へのメッセージ" label={<><Info aria-hidden size={17} />コース情報</>} title="コース情報">{inspector}</InspectorSheet>}
          eyebrow={<><TransitionLink href="/courses" intent="return">コース</TransitionLink><span> / {data.course.shortName}</span></>}
          metadata={`${activities.length} activities`}
          shared={{ identifier: data.course.id, kind: "course" }}
          title={data.course.name}
        />
      )}
      mode="browse"
      width="wide"
    />
  );
}
