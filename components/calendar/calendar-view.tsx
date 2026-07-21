import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Badge, Notice } from "@/components/ui";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { CalendarPageData } from "@/lib/moodle/queries/calendar";
import { moveMonth, type MonthCursor } from "@/lib/moodle/queries/calendar-model";
import "./calendar.css";
import { CalendarExportButton } from "./calendar-export-button";
import { CalendarEventCreator, CalendarEventDelete } from "./calendar-event-actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function monthHref(cursor: MonthCursor): string {
  return `/calendar?view=month&year=${cursor.year}&month=${cursor.month}`;
}

function CalendarTabs({ data }: Readonly<{ data: CalendarPageData }>) {
  return (
    <nav aria-label="カレンダー表示" className="ui-calendar-tabs">
      <Link aria-current={data.view === "agenda" ? "page" : undefined} href="/calendar">
        <ListBullets aria-hidden size={18} weight="regular" />
        予定一覧
      </Link>
      <Link
        aria-current={data.view === "month" ? "page" : undefined}
        href={monthHref(data.cursor)}
      >
        <CalendarBlank aria-hidden size={18} weight="regular" />
        月表示
      </Link>
    </nav>
  );
}

function AgendaView({ data, dateFormat, timeFormat }: Readonly<{
  data: Extract<CalendarPageData, { view: "agenda" }>;
  dateFormat: Intl.DateTimeFormat;
  timeFormat: Intl.DateTimeFormat;
}>) {
  if (data.groups.length === 0) {
    return (
      <Notice title="今後の予定はありません" tone="success">
        <p>Moodleに新しい予定が追加されると、ここに表示されます。</p>
      </Notice>
    );
  }
  return (
    <div className="ui-calendar-agenda">
      {data.groups.map((group) => (
        <section key={group.dateKey}>
          <h2><time dateTime={group.dateKey}>{dateFormat.format(calendarDate(group.dateKey))}</time></h2>
          <ul>
            {group.events.map((event) => (
              <li key={event.id}>
                <time dateTime={new Date(event.startsAt * 1_000).toISOString()}>
                  {timeFormat.format(new Date(event.startsAt * 1_000))}
                </time>
                <strong>{event.name}</strong>
                {event.status === "late" ? <Badge tone="error">期限超過</Badge> : <Badge tone="info">予定</Badge>}
                {event.editable ? <CalendarEventDelete eventId={event.id} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MonthView({ data, monthFormat, timeFormat }: Readonly<{
  data: Extract<CalendarPageData, { view: "month" }>;
  monthFormat: Intl.DateTimeFormat;
  timeFormat: Intl.DateTimeFormat;
}>) {
  const previous = moveMonth(data.cursor, -1);
  const next = moveMonth(data.cursor, 1);
  const monthDate = new Date(Date.UTC(data.cursor.year, data.cursor.month - 1, 1));
  const hasEvents = data.cells.some((cell) => cell.events.length > 0);

  return (
    <div className="ui-calendar-month">
      <div className="ui-calendar-month__toolbar">
        <Link aria-label="前の月" className="ui-app-action-link" href={monthHref(previous)}>
          <CaretLeft aria-hidden size={18} weight="regular" />
        </Link>
        <h2>{monthFormat.format(monthDate)}</h2>
        <Link aria-label="次の月" className="ui-app-action-link" href={monthHref(next)}>
          <CaretRight aria-hidden size={18} weight="regular" />
        </Link>
      </div>
      {!hasEvents ? (
        <Notice title="この月の予定はありません" tone="info">
          <p>前後の月へ移動するか、予定一覧を確認してください。</p>
        </Notice>
      ) : null}
      <div className="ui-calendar-month__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <ol aria-label={`${data.cursor.year}年${data.cursor.month}月`} className="ui-calendar-month__grid">
        {data.cells.map((cell) => (
          <li
            aria-hidden={cell.day === null}
            className={cell.day === null ? "ui-calendar-day ui-calendar-day--placeholder" : "ui-calendar-day"}
            key={cell.key}
          >
            {cell.day === null || cell.dateKey === null ? null : (
              <>
                <time dateTime={cell.dateKey}>{cell.day}</time>
                <ul>
                  {cell.events.map((event) => (
                    <li key={event.id}>
                      <strong>{event.name}</strong>
                      <span>{timeFormat.format(new Date(event.startsAt * 1_000))}</span>
                      {event.status === "late" ? <Badge tone="error">期限超過</Badge> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CalendarView({ canManage, config, data }: Readonly<{
  canManage: boolean;
  config: AppRuntimeConfig;
  data: CalendarPageData;
}>) {
  const dateFormat = dateTimeFormatter(config.locale, {
    dateStyle: "full", timeZone: "UTC",
  });
  const timeFormat = dateTimeFormatter(config.locale, {
    hour: "2-digit", minute: "2-digit", timeZone: config.timeZone,
  });
  const monthFormat = dateTimeFormatter(config.locale, {
    month: "long", timeZone: "UTC", year: "numeric",
  });
  const exportEvents = data.view === "agenda"
    ? data.groups.flatMap((group) => group.events)
    : data.cells.flatMap((cell) => cell.events);
  return (
    <div className="ui-page-stack">
      <header className="ui-calendar-header">
        <div className="ui-page-header">
          <h1>カレンダー</h1>
          <p>すべての日時は{config.timeZone}で表示しています。</p>
        </div>
        <div className="ui-calendar-header__actions">
          {canManage ? <CalendarEventCreator /> : null}
          <CalendarExportButton events={exportEvents} />
          <CalendarTabs data={data} />
        </div>
      </header>
      {data.view === "agenda" ? (
        <AgendaView data={data} dateFormat={dateFormat} timeFormat={timeFormat} />
      ) : (
        <MonthView data={data} monthFormat={monthFormat} timeFormat={timeFormat} />
      )}
    </div>
  );
}
