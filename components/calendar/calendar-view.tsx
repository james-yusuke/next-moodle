"use client";

import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Eye,
  EyeSlash,
  ListBullets,
  Table,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { TransitionLink } from "@/components/app-shell/transitions";
import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { Badge, Button, Card, EmptyState, IconButton } from "@/components/ui";
import { useLocalStorageValue } from "@/components/ui/use-local-storage-value";
import { calendarDate, dateTimeFormatter } from "@/lib/date-time";
import type { AppRuntimeConfig } from "@/lib/app-config";
import type { CalendarPageData } from "@/lib/moodle/queries/calendar";
import { moveMonth, type MonthCursor } from "@/lib/moodle/queries/calendar-model";
import { CalendarExportButton } from "./calendar-export-button";
import { CalendarEventCreator, CalendarEventDelete } from "./calendar-event-actions";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function monthHref(cursor: MonthCursor): string {
  return `/calendar?view=month&year=${cursor.year}&month=${cursor.month}`;
}

function CalendarTabs({ data }: Readonly<{ data: CalendarPageData }>) {
  return (
    <nav aria-label="カレンダー表示" className="ui-calendar-tabs inline-flex min-h-11 items-center gap-1 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-1">
      <TransitionLink aria-current={data.view === "agenda" ? "page" : undefined} className="inline-flex min-h-9 items-center gap-2 rounded-[calc(var(--shape-control)-.125rem)] px-3 text-xs font-semibold text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] aria-[current=page]:bg-[var(--surface-elevated)] aria-[current=page]:text-[var(--text-primary)] aria-[current=page]:shadow-[var(--shadow-control)]" href="/calendar" intent="switch">
        <ListBullets aria-hidden size={18} weight="regular" />
        予定一覧
      </TransitionLink>
      <TransitionLink
        aria-current={data.view === "month" ? "page" : undefined}
        className="inline-flex min-h-9 items-center gap-2 rounded-[calc(var(--shape-control)-.125rem)] px-3 text-xs font-semibold text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] aria-[current=page]:bg-[var(--surface-elevated)] aria-[current=page]:text-[var(--text-primary)] aria-[current=page]:shadow-[var(--shadow-control)]"
        href={monthHref(data.cursor)}
        intent="switch"
      >
        <CalendarBlank aria-hidden size={18} weight="regular" />
        月表示
      </TransitionLink>
      <TransitionLink className="inline-flex min-h-9 items-center gap-2 rounded-[calc(var(--shape-control)-.125rem)] px-3 text-xs font-semibold text-[var(--text-secondary)] no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" href="/timetable" intent="switch">
        <Table aria-hidden size={18} weight="regular" />
        時間割
      </TransitionLink>
    </nav>
  );
}

type EventVisibilityProps = Readonly<{
  hiddenEventIds: ReadonlySet<number>;
  onToggleHidden: (eventId: number) => void;
  showHidden: boolean;
}>;

function EventVisibilityButton({ eventId, hidden, onToggleHidden }: Readonly<{
  eventId: number;
  hidden: boolean;
  onToggleHidden: (eventId: number) => void;
}>) {
  const label = hidden ? "予定を一覧へ戻す" : "予定を非表示";
  return <IconButton icon={hidden ? <Eye aria-hidden size={17} /> : <EyeSlash aria-hidden size={17} />} label={label} onClick={() => onToggleHidden(eventId)} variant="ghost" />;
}

function AgendaView({ data, dateFormat, hiddenEventIds, onToggleHidden, showHidden, timeFormat }: Readonly<{
  data: Extract<CalendarPageData, { view: "agenda" }>;
  dateFormat: Intl.DateTimeFormat;
  timeFormat: Intl.DateTimeFormat;
}> & EventVisibilityProps) {
  const groups = data.groups.map((group) => ({
    ...group,
    events: group.events.filter((event) => hiddenEventIds.has(event.id) === showHidden),
  })).filter((group) => group.events.length > 0);
  if (groups.length === 0) {
    return (
      <EmptyState icon={<CalendarBlank aria-hidden size={22} />} title={showHidden ? "非表示の予定はありません" : "今後の予定はありません"}>{showHidden ? "予定を非表示にすると、ここからいつでも一覧へ戻せます。" : "Moodleに新しい予定が追加されると、ここに表示されます。"}</EmptyState>
    );
  }
  return (
    <div className="ui-calendar-agenda grid gap-6">
      {groups.map((group) => (
        <Card key={group.dateKey} padding="standard" tone="default">
          <h2 className="m-0 min-h-11 text-lg font-semibold"><time dateTime={group.dateKey}>{dateFormat.format(calendarDate(group.dateKey))}</time></h2>
          <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
            {group.events.map((event) => (
              <li className="grid min-h-16 grid-cols-[5rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[var(--shape-control)] px-2 transition-colors duration-[120ms] hover:bg-[var(--surface-elevated)] max-sm:grid-cols-[4rem_minmax(0,1fr)_auto]" key={event.id}>
                <time className="font-mono text-xs text-[var(--text-secondary)]" dateTime={new Date(event.startsAt * 1_000).toISOString()}>
                  {timeFormat.format(new Date(event.startsAt * 1_000))}
                </time>
                <strong className="min-w-0 break-words">{event.name}</strong>
                {event.status === "late" ? <Badge tone="error">期限超過</Badge> : <Badge tone="info">予定</Badge>}
                <div className="flex items-center gap-1 max-sm:col-start-3 max-sm:row-span-2">
                  {event.editable && !showHidden ? <CalendarEventDelete eventId={event.id} /> : null}
                  <EventVisibilityButton eventId={event.id} hidden={showHidden} onToggleHidden={onToggleHidden} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function MonthView({ data, hiddenEventIds, monthFormat, onToggleHidden, showHidden, timeFormat }: Readonly<{
  data: Extract<CalendarPageData, { view: "month" }>;
  monthFormat: Intl.DateTimeFormat;
  timeFormat: Intl.DateTimeFormat;
}> & EventVisibilityProps) {
  const previous = moveMonth(data.cursor, -1);
  const next = moveMonth(data.cursor, 1);
  const monthDate = new Date(Date.UTC(data.cursor.year, data.cursor.month - 1, 1));
  const hasEvents = data.cells.some((cell) => cell.events.some((event) => hiddenEventIds.has(event.id) === showHidden));

  return (
    <div className="ui-calendar-month grid min-w-0 gap-4">
      <div className="ui-calendar-month__toolbar flex items-center justify-center gap-3">
        <TransitionLink aria-label="前の月" className="ui-app-action-link" href={monthHref(previous)} intent="switch">
          <CaretLeft aria-hidden size={18} weight="regular" />
        </TransitionLink>
        <h2 className="m-0 min-w-36 text-center text-lg font-semibold">{monthFormat.format(monthDate)}</h2>
        <TransitionLink aria-label="次の月" className="ui-app-action-link" href={monthHref(next)} intent="switch">
          <CaretRight aria-hidden size={18} weight="regular" />
        </TransitionLink>
      </div>
      {!hasEvents ? (
        <EmptyState title={showHidden ? "この月に非表示の予定はありません" : "この月の予定はありません"}>前後の月へ移動するか、予定一覧を確認してください。</EmptyState>
      ) : null}
      <div className="overflow-x-auto rounded-[var(--shape-card)]" role="region" aria-label="月間カレンダー">
        <div className="ui-calendar-month__weekdays grid min-w-[42rem] grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold text-[var(--text-tertiary)]" aria-hidden="true">
          {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <ol aria-label={`${data.cursor.year}年${data.cursor.month}月`} className="ui-calendar-month__grid m-0 grid min-w-[42rem] grid-cols-7 gap-1 overflow-hidden p-0">
          {data.cells.map((cell) => (
          <li
            aria-hidden={cell.day === null}
            className={cell.day === null ? "ui-calendar-day ui-calendar-day--placeholder min-h-28 rounded-[var(--shape-control)] bg-[var(--surface-inset)] opacity-35" : "ui-calendar-day min-h-28 rounded-[var(--shape-control)] bg-[var(--surface-inset)] p-2"}
            key={cell.key}
          >
            {cell.day === null || cell.dateKey === null ? null : (
              <>
                <time className="font-mono text-xs text-[var(--text-secondary)]" dateTime={cell.dateKey}>{cell.day}</time>
                <ul className="m-0 mt-2 grid list-none gap-1 p-0">
                  {cell.events.filter((event) => hiddenEventIds.has(event.id) === showHidden).map((event) => (
                    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1 rounded-md bg-[var(--surface-elevated)] p-2" key={event.id}>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="line-clamp-2 text-xs">{event.name}</strong>
                        <span className="text-[.6875rem] text-[var(--text-tertiary)]">{timeFormat.format(new Date(event.startsAt * 1_000))}</span>
                        {event.status === "late" ? <Badge tone="error">期限超過</Badge> : null}
                      </span>
                      <EventVisibilityButton eventId={event.id} hidden={showHidden} onToggleHidden={onToggleHidden} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function CalendarView({ canManage, config, data, preferenceScope }: Readonly<{
  canManage: boolean;
  config: AppRuntimeConfig;
  data: CalendarPageData;
  preferenceScope: string;
}>) {
  const [showHidden, setShowHidden] = useState(false);
  const storageKey = `next-moodle:hidden-calendar-events:${preferenceScope}`;
  const [hiddenValue, setHiddenValue] = useLocalStorageValue(storageKey, "[]");
  const hiddenEventIds = useMemo<ReadonlySet<number>>(() => {
    try {
      const value: unknown = JSON.parse(hiddenValue);
      return Array.isArray(value) ? new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0)) : new Set();
    } catch {
      return new Set();
    }
  }, [hiddenValue]);
  function toggleHidden(eventId: number): void {
    const next = new Set(hiddenEventIds);
    if (next.has(eventId)) next.delete(eventId); else next.add(eventId);
    setHiddenValue(JSON.stringify([...next]));
  }
  const dateFormat = dateTimeFormatter(config.locale, {
    dateStyle: "full", timeZone: "UTC",
  });
  const timeFormat = dateTimeFormatter(config.locale, {
    hour: "2-digit", minute: "2-digit", timeZone: config.timeZone,
  });
  const monthFormat = dateTimeFormatter(config.locale, {
    month: "long", timeZone: "UTC", year: "numeric",
  });
  const exportEvents = (data.view === "agenda"
    ? data.groups.flatMap((group) => group.events)
    : data.cells.flatMap((cell) => cell.events)).filter((event) => !hiddenEventIds.has(event.id));
  return (
    <PageFrame
      content={data.view === "agenda" ? (
        <AgendaView data={data} dateFormat={dateFormat} hiddenEventIds={hiddenEventIds} onToggleHidden={toggleHidden} showHidden={showHidden} timeFormat={timeFormat} />
      ) : (
        <MonthView data={data} hiddenEventIds={hiddenEventIds} monthFormat={monthFormat} onToggleHidden={toggleHidden} showHidden={showHidden} timeFormat={timeFormat} />
      )}
      header={<RouteHeader
        actions={<div className="ui-calendar-header__actions flex flex-wrap items-center justify-end gap-2 max-md:justify-start">
          {canManage ? <CalendarEventCreator /> : null}
          <Button aria-pressed={showHidden} icon={showHidden ? <Eye aria-hidden size={17} /> : <EyeSlash aria-hidden size={17} />} onClick={() => setShowHidden((current) => !current)} variant={showHidden ? "primary" : "secondary"}>{showHidden ? "予定一覧へ戻る" : `非表示 ${hiddenEventIds.size}`}</Button>
          <CalendarExportButton events={exportEvents} />
          <CalendarTabs data={data} />
        </div>}
        description={`すべての日時は${config.timeZone}で表示しています。`}
        eyebrow={data.view === "agenda" ? "予定一覧" : "月の見通し"}
        title="カレンダー"
      />}
      mode="overview"
      width="wide"
    />
  );
}
