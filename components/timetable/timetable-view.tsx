"use client";

import { CalendarPlus, Plus, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { PageFrame, RouteHeader } from "@/components/app-shell/workspace-frame";
import { TransitionLink } from "@/components/app-shell/transitions";
import { Button, Card, DialogSheet, EmptyState, Field, IconButton, Notice } from "@/components/ui";
import { useLocalStorageValue } from "@/components/ui/use-local-storage-value";
import type { CourseListItem } from "@/lib/moodle/queries/courses-model";

const DAYS = [
  { id: "mon", label: "月" },
  { id: "tue", label: "火" },
  { id: "wed", label: "水" },
  { id: "thu", label: "木" },
  { id: "fri", label: "金" },
  { id: "sat", label: "土" },
] as const;
const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;
type DayId = (typeof DAYS)[number]["id"];

type TimetableEntry = Readonly<{
  courseId: number;
  day: DayId;
  id: string;
  period: number;
  room: string;
}>;

function isDayId(value: unknown): value is DayId {
  return typeof value === "string" && DAYS.some((day) => day.id === value);
}

function isEntry(value: unknown): value is TimetableEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<TimetableEntry>;
  return typeof entry.id === "string" && entry.id.length <= 100 &&
    typeof entry.courseId === "number" && Number.isSafeInteger(entry.courseId) && entry.courseId > 0 &&
    isDayId(entry.day) &&
    typeof entry.period === "number" && PERIODS.some((period) => period === entry.period) &&
    typeof entry.room === "string" && entry.room.length <= 100;
}

const selectClass = "min-h-11 w-full rounded-[var(--shape-control)] border-0 bg-[var(--surface-inset)] px-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-control)] outline-none focus-visible:shadow-[var(--shadow-focus)]";

export function TimetableView({ courses, preferenceScope }: Readonly<{
  courses: readonly CourseListItem[];
  preferenceScope: string;
}>) {
  const [open, setOpen] = useState(false);
  const storageKey = `next-moodle:timetable:${preferenceScope}`;
  const [entryValue, setEntryValue] = useLocalStorageValue(storageKey, "[]");
  const entries = useMemo<readonly TimetableEntry[]>(() => {
    try {
      const value: unknown = JSON.parse(entryValue);
      return Array.isArray(value) ? value.filter(isEntry) : [];
    } catch {
      return [];
    }
  }, [entryValue]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  function save(next: readonly TimetableEntry[]): void {
    setEntryValue(JSON.stringify(next));
  }

  function addEntry(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const courseId = Number(form.get("courseId"));
    const day = form.get("day");
    const period = Number(form.get("period"));
    const room = form.get("room");
    if (!courseById.has(courseId) || !isDayId(day) || !PERIODS.some((item) => item === period) || typeof room !== "string") return;
    const normalizedRoom = room.trim().slice(0, 100);
    const next = entries.filter((entry) => entry.day !== day || entry.period !== period);
    save([...next, { courseId, day, id: crypto.randomUUID(), period, room: normalizedRoom }]);
    setOpen(false);
  }

  function removeEntry(entryId: string): void {
    save(entries.filter((entry) => entry.id !== entryId));
  }

  return (
    <PageFrame
      content={<>{courses.length === 0 ? (
        <EmptyState icon={<CalendarPlus aria-hidden size={24} />} title="時間割に追加できるコースがありません">受講コースが反映されると時間割を作成できます。</EmptyState>
      ) : (
        <div className="grid gap-4">
          <Notice title="この端末だけの時間割です" tone="info"><p>曜日・時限はMoodleにないため、このブラウザへ保存します。Moodleのコースや予定は変更しません。</p></Notice>
          <Card className="overflow-hidden" padding="none" tone="default">
            {entries.length === 0 ? <div className="p-4 sm:p-6"><EmptyState icon={<CalendarPlus aria-hidden size={24} />} title="時間割はまだ空です">「授業を追加」から曜日・時限・教室を登録してください。</EmptyState></div> : null}
            <div className="overflow-x-auto" role="region" aria-label="時間割表" tabIndex={0}>
              <div className="grid min-w-[54rem] grid-cols-[4rem_repeat(6,minmax(0,1fr))]">
                <div className="grid min-h-12 place-items-center bg-[var(--surface-inset)] text-xs font-semibold text-[var(--text-tertiary)]">時限</div>
                {DAYS.map((day) => <div className="grid min-h-12 place-items-center bg-[var(--surface-inset)] text-sm font-semibold" key={day.id}>{day.label}</div>)}
                {PERIODS.flatMap((period) => [
                  <div className="grid min-h-28 place-items-center border-t border-[var(--border-subtle)] bg-[var(--surface-inset)] font-mono text-sm text-[var(--text-secondary)]" key={`period-${period}`}>{period}</div>,
                  ...DAYS.map((day) => {
                    const entry = entries.find((item) => item.day === day.id && item.period === period);
                    const course = entry === undefined ? undefined : courseById.get(entry.courseId);
                    return (
                      <div className="min-w-0 border-t border-l border-[var(--border-subtle)] p-2" key={`${day.id}-${period}`}>
                        {entry === undefined || course === undefined ? null : (
                          <div className="group grid min-h-24 grid-cols-[minmax(0,1fr)_auto] content-between gap-2 rounded-[var(--shape-control)] bg-[var(--surface-selected)] p-3">
                            <div className="min-w-0">
                              <strong className="line-clamp-3 text-sm leading-5">{course.name}</strong>
                              {entry.room === "" ? null : <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">{entry.room}</span>}
                            </div>
                            <IconButton className="-m-2" icon={<Trash aria-hidden size={16} />} label={`${course.name}を時間割から削除`} onClick={() => removeEntry(entry.id)} variant="ghost" />
                            <TransitionLink className="col-span-2 text-xs font-semibold text-[var(--accent-400)] no-underline" href={`/courses/${course.id}`} intent="drill-in">コースを見る</TransitionLink>
                          </div>
                        )}
                      </div>
                    );
                  }),
                ])}
              </div>
            </div>
          </Card>
        </div>
      )}<DialogSheet description="同じ曜日・時限に登録済みの授業がある場合は置き換えます。" label="時間割" onOpenChange={setOpen} open={open} placement="center" title="授業を追加">
        <form className="grid gap-5" onSubmit={addEntry}>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="timetable-course">コース<select className={selectClass} id="timetable-course" name="courseId" required>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="timetable-day">曜日<select className={selectClass} id="timetable-day" name="day" required>{DAYS.map((day) => <option key={day.id} value={day.id}>{day.label}曜日</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="timetable-period">時限<select className={selectClass} id="timetable-period" name="period" required>{PERIODS.map((period) => <option key={period} value={period}>{period}限</option>)}</select></label>
          </div>
          <Field id="timetable-room" label="教室（任意）" maxLength={100} name="room" placeholder="例: 1号館 203" />
          <div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)} variant="ghost">キャンセル</Button><Button type="submit" variant="primary">追加</Button></div>
        </form>
      </DialogSheet></>}
      header={<RouteHeader
        actions={<div className="flex flex-wrap gap-2"><TransitionLink className="ui-app-action-link" href="/calendar" intent="switch">予定を見る</TransitionLink><Button icon={<Plus aria-hidden size={18} />} onClick={() => setOpen(true)} variant="primary">授業を追加</Button></div>}
        description="受講コースを曜日と時限へ配置して、自分用の時間割を作成します。"
        eyebrow="学習スケジュール"
        title="時間割"
      />}
      mode="overview"
      width="wide"
    />
  );
}
