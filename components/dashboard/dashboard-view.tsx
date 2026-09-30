import styles from "./dashboard-view.module.css";
import {
  ArrowRight,
  Bell,
  CalendarDots,
  ClockCountdown,
  FilePdf,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Card, DataList, DataListItem, EmptyState, StatusPanel } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type {
  DashboardEvent,
  DashboardProjection,
} from "@/lib/moodle/queries/dashboard-model";

function EventBadge({ event }: Readonly<{ event: DashboardEvent }>) {
  return event.status === "overdue" ? (
    <Badge tone="error">期限超過</Badge>
  ) : (
    <Badge tone="warning">次の期限</Badge>
  );
}

export function DashboardView({ config, data }: Readonly<{
  config: AppRuntimeConfig;
  data: DashboardProjection;
}>) {
  const dateTimeFormat = dateTimeFormatter(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });
  const dayFormat = dateTimeFormatter(config.locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  });
  const formatTimestamp = (value: number) => dateTimeFormat.format(new Date(value * 1_000));
  const formatDateKey = (value: string) => dayFormat.format(calendarDate(value));
  const scheduledDays = data.horizon.filter((day) => day.events.length > 0);

  return (
    <PageFrame
      content={<div className={styles.dashboardBoard!}>
        <Card className={styles.dashboardPanel!} padding="spacious" tone="elevated">
          <header className={styles.style1!}>
            <ClockCountdown aria-hidden size={19} />
            <h2 className={styles.style2!} id="deadline-title">次にやること</h2>
          </header>
          {data.nextUp === null ? (
            <StatusPanel className={styles.style3!} title="急ぎの学習はありません" tone="success">
              次の予定が追加されるまで、進行中のコースを確認できます。
            </StatusPanel>
          ) : (
            <div className={styles.dashboardDeadline!}>
              <div className={styles.style4!}><EventBadge event={data.nextUp} /><span>{data.nextUp.courseName}</span></div>
              <h3 className={styles.style5!}>{data.nextUp.name}</h3>
              <time className={styles.style6!} dateTime={new Date(data.nextUp.startsAt * 1_000).toISOString()}>
                {formatTimestamp(data.nextUp.startsAt)}
              </time>
              <TransitionLink appearance="action" className={styles.appActionLink!} href="/calendar" intent="switch">予定を確認 <ArrowRight aria-hidden size={15} /></TransitionLink>
            </div>
          )}
        </Card>

        <Card className={styles.dashboardPanel2!} padding="standard" tone="default">
          <header className={styles.style7!}>
            <div className={styles.style8!}><CalendarDots aria-hidden size={19} /><h2 className={styles.style9!} id="timeline-title">直近7日の予定</h2></div>
            <TransitionLink className={styles.style10!} href="/calendar" intent="switch">すべて表示 <ArrowRight aria-hidden className={styles.style11!} size={15} /></TransitionLink>
          </header>
          {scheduledDays.length === 0 ? (
            <EmptyState className={styles.style12!} icon={<CalendarDots aria-hidden size={20} />} title="直近の予定はありません">新しい予定が追加されると、ここに表示されます。</EmptyState>
          ) : (
            <DataList className={styles.style13!} label="直近7日の予定">
              {scheduledDays.flatMap((day) => day.events.map((event) => (
                <DataListItem
                  description={event.name}
                  key={`${day.dateKey}-${event.id}`}
                  metadata={formatTimestamp(event.startsAt)}
                  title={<time dateTime={day.dateKey}>{formatDateKey(day.dateKey)}</time>}
                />
              )))}
            </DataList>
          )}
        </Card>

        <Card className={styles.dashboardPanel3!} padding="standard" tone="default">
          <header className={styles.style7!}>
            <div className={styles.style8!}><h2 className={styles.style9!} id="courses-title">進行中のコース</h2><Badge>{data.recentCourses.length}</Badge></div>
            <TransitionLink className={styles.style10!} href="/courses" intent="switch">コース一覧 <ArrowRight aria-hidden className={styles.style11!} size={15} /></TransitionLink>
          </header>
          {data.recentCourses.length === 0 ? (
            <EmptyState className={styles.style12!} title="表示できるコースはありません" />
          ) : (
            <ul className={styles.dashboardCourseList!}>
              {data.recentCourses.map((course, index) => (
                <li className={styles.style14!} key={course.id}>
                  <span className={styles.dashboardCourseIndex!}>{String(index + 1).padStart(2, "0")}</span>
                  <TransitionLink className={styles.style15!} href={`/courses/${course.id}`} intent="drill-in"><SharedTransition identifier={course.id} kind="course"><strong className={styles.style16!}>{course.name}</strong></SharedTransition><small className={styles.style17!}>{course.shortName}</small></TransitionLink>
                  <ArrowRight aria-hidden className={styles.style18!} size={16} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className={styles.dashboardPanel4!} padding="standard" tone="inset">
          <header className={styles.style19!}><Sparkle aria-hidden size={18} /><h2 className={styles.style9!} id="signals-title">クイックアクセス</h2></header>
          <div className={styles.dashboardSignalList!}>
            <TransitionLink className={styles.style20!} href="/notifications" intent="switch"><Bell aria-hidden className={styles.style21!} size={19} /><span className={styles.style22!}><strong className={styles.tabular!}>{data.unreadCount}</strong><small className={styles.style23!}>未読通知</small></span><ArrowRight aria-hidden size={16} /></TransitionLink>
            <TransitionLink className={styles.style20!} href="/tools/pdf" intent="switch"><FilePdf aria-hidden className={styles.style21!} size={19} /><span className={styles.style22!}><strong>PDFツール</strong><small className={styles.style23!}>端末内で整理</small></span><ArrowRight aria-hidden size={16} /></TransitionLink>
          </div>
        </Card>
      </div>}
      header={<RouteHeader description="締切、授業、未読から、いま必要な行動を整理します。" eyebrow={`TODAY / ${config.timeZone}`} title="学習ワークスペース" />}
      mode="overview"
      width="full"
    />
  );
}
