import {
  Bell,
  CalendarDots,
  ClockCountdown,
  FilePdf,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge, Notice, Surface } from "@/components/ui";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type {
  DashboardEvent,
  DashboardProjection,
} from "@/lib/moodle/queries/dashboard-model";
import "./dashboard.css";

function EventBadge({ event }: Readonly<{ event: DashboardEvent }>) {
  return event.status === "overdue" ? (
    <Badge tone="error">期限超過</Badge>
  ) : (
    <Badge tone="warning">次の予定</Badge>
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
  const hasHorizonEvents = data.horizon.some((day) => day.events.length > 0);

  return (
    <div className="ui-page-stack">
      <header className="ui-page-header">
        <h1>ダッシュボード</h1>
        <p>締切とコースの動きを、今日から7日先まで確認できます。</p>
      </header>

      {data.nextUp === null ? (
        <Notice
          action={<Link className="ui-app-action-link" href="/calendar">予定を見る</Link>}
          title="次に必要な学習アクションはありません"
          tone="success"
        >
          <p>現在、Moodleから取得できる未完了の予定はありません。</p>
        </Notice>
      ) : (
        <Surface className="ui-dashboard-next" variant="raised">
          <div className="ui-dashboard-next__icon">
            <ClockCountdown aria-hidden size={30} weight="regular" />
          </div>
          <div className="ui-dashboard-next__content">
            <div className="ui-dashboard-next__status">
              <EventBadge event={data.nextUp} />
              <span>{data.nextUp.courseName}</span>
            </div>
            <h2>{data.nextUp.name}</h2>
            <time dateTime={new Date(data.nextUp.startsAt * 1_000).toISOString()}>
              {formatTimestamp(data.nextUp.startsAt)}
            </time>
          </div>
          <Link className="ui-app-action-link" href="/calendar">カレンダーで確認</Link>
        </Surface>
      )}

      <section className="ui-dashboard-section" aria-labelledby="horizon-title">
        <div className="ui-dashboard-section__heading">
          <div>
            <CalendarDots aria-hidden size={24} weight="regular" />
            <h2 id="horizon-title">7日間の学習予定</h2>
          </div>
          <span>{config.timeZone}</span>
        </div>
        {!hasHorizonEvents ? (
          <Notice title="7日以内の予定はありません" tone="info">
            <p>新しい締切や予定がMoodleに追加されると、ここに表示されます。</p>
          </Notice>
        ) : (
          <ol className="ui-dashboard-horizon">
            {data.horizon.map((day) => (
              <li className="ui-dashboard-day" key={day.dateKey}>
                <time dateTime={day.dateKey}>{formatDateKey(day.dateKey)}</time>
                {day.events.length === 0 ? (
                  <span className="ui-dashboard-day__empty">予定なし</span>
                ) : (
                  <ul>
                    {day.events.map((event) => (
                      <li key={event.id}>
                        <strong>{event.name}</strong>
                        <span>{formatTimestamp(event.startsAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="ui-page-grid">
        <Surface title="最近のコース">
          {data.recentCourses.length === 0 ? (
            <p className="ui-dashboard-empty-copy">表示できる受講コースはありません。</p>
          ) : (
            <ul className="ui-dashboard-course-list">
              {data.recentCourses.map((course) => (
                <li key={course.id}>
                  <Link href={`/courses/${course.id}`}>
                    <span>{course.name}</span>
                    <small>{course.shortName}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
        <Surface className="ui-dashboard-unread" title="未読通知">
          <Bell aria-hidden size={28} weight="regular" />
          <strong className="ui-tabular">{data.unreadCount}</strong>
          <p>{data.unreadCount === 0 ? "未読のお知らせはありません。" : "未読のお知らせがあります。"}</p>
          <Link className="ui-app-action-link" href="/notifications">通知を確認</Link>
        </Surface>
        <Surface className="ui-dashboard-unread" title="PDFツール">
          <FilePdf aria-hidden size={28} weight="regular" />
          <strong>PDF</strong>
          <p>画像のPDF化、結合、並べ替えを端末内で行えます。</p>
          <Link className="ui-app-action-link" href="/tools/pdf">ツールを開く</Link>
        </Surface>
      </div>
    </div>
  );
}
