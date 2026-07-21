import {
  ArrowRight,
  Bell,
  CalendarDots,
  ClockCountdown,
  FilePdf,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge, Notice } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type {
  DashboardEvent,
  DashboardProjection,
} from "@/lib/moodle/queries/dashboard-model";
import "./dashboard.css";

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

  return (
    <div className="ui-page-stack">
      <header className="ui-page-header">
        <div>
          <h1>学習ワークスペース</h1>
          <p className="ui-dashboard-eyebrow">TODAY / {config.timeZone}</p>
        </div>
        <p>締切、授業、未読を一画面で整理します。</p>
      </header>

      <div className="ui-dashboard-board">
        <section className="ui-dashboard-panel ui-dashboard-panel--timeline" aria-labelledby="timeline-title">
          <header className="ui-dashboard-panel__header">
            <div><CalendarDots aria-hidden size={18} /><h2 id="timeline-title">7日予定</h2></div>
            <Link href="/calendar">すべて表示 <ArrowRight aria-hidden size={15} /></Link>
          </header>
          <ol className="ui-dashboard-timeline">
            {data.horizon.map((day, index) => (
              <li data-today={index === 0 ? "true" : undefined} key={day.dateKey}>
                <time dateTime={day.dateKey}>{formatDateKey(day.dateKey)}</time>
                <span className="ui-dashboard-timeline__rule" />
                <div>
                  {day.events.length === 0 ? (
                    <span className="ui-dashboard-empty-copy">予定なし</span>
                  ) : day.events.map((event) => (
                    <article key={event.id}>
                      <strong>{event.name}</strong>
                      <span className="ui-tabular">{formatTimestamp(event.startsAt)}</span>
                    </article>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="ui-dashboard-panel ui-dashboard-panel--deadline" aria-labelledby="deadline-title">
          <header className="ui-dashboard-panel__header">
            <div><ClockCountdown aria-hidden size={18} /><h2 id="deadline-title">次の課題</h2></div>
          </header>
          {data.nextUp === null ? (
            <Notice title="未完了の期限はありません" tone="success">
              <p>現在取得できる範囲では、急ぎの学習アクションはありません。</p>
            </Notice>
          ) : (
            <div className="ui-dashboard-deadline">
              <div><EventBadge event={data.nextUp} /><span>{data.nextUp.courseName}</span></div>
              <h3>{data.nextUp.name}</h3>
              <time dateTime={new Date(data.nextUp.startsAt * 1_000).toISOString()}>
                {formatTimestamp(data.nextUp.startsAt)}
              </time>
              <Link className="ui-app-action-link" href="/calendar">予定を確認</Link>
            </div>
          )}
        </section>

        <section className="ui-dashboard-panel ui-dashboard-panel--courses" aria-labelledby="courses-title">
          <header className="ui-dashboard-panel__header">
            <div><h2 id="courses-title">進行中のコース</h2><span>{data.recentCourses.length}</span></div>
            <Link href="/courses">コース一覧 <ArrowRight aria-hidden size={15} /></Link>
          </header>
          {data.recentCourses.length === 0 ? (
            <p className="ui-dashboard-empty-copy">表示できる受講コースはありません。</p>
          ) : (
            <ul className="ui-dashboard-course-list ui-ledger">
              {data.recentCourses.map((course, index) => (
                <li key={course.id}>
                  <span className="ui-dashboard-course-index ui-tabular">{String(index + 1).padStart(2, "0")}</span>
                  <Link href={`/courses/${course.id}`}><strong>{course.name}</strong><small>{course.shortName}</small></Link>
                  <ArrowRight aria-hidden size={16} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ui-dashboard-panel ui-dashboard-panel--signals" aria-labelledby="signals-title">
          <header className="ui-dashboard-panel__header"><div><h2 id="signals-title">クイックアクセス</h2></div></header>
          <div className="ui-dashboard-signal-list">
            <Link href="/notifications"><Bell aria-hidden size={19} /><span><strong className="ui-tabular">{data.unreadCount}</strong><small>未読通知</small></span><ArrowRight aria-hidden size={16} /></Link>
            <Link href="/tools/pdf"><FilePdf aria-hidden size={19} /><span><strong>PDF</strong><small>端末内ツール</small></span><ArrowRight aria-hidden size={16} /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
