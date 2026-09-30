"use client";

import styles from "./timetable-view.module.css";
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

const selectClass = styles.selectClass1!;

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
        <div className={styles.style1!}>
          <Notice title="この端末だけの時間割です" tone="info"><p>曜日・時限はMoodleにないため、このブラウザへ保存します。Moodleのコースや予定は変更しません。</p></Notice>
          <Card className={styles.style2!} padding="none" tone="default">
            {entries.length === 0 ? <div className={styles.style3!}><EmptyState icon={<CalendarPlus aria-hidden size={24} />} title="時間割はまだ空です">「授業を追加」から曜日・時限・教室を登録してください。</EmptyState></div> : null}
            <div className={styles.style4!} role="region" aria-label="時間割表" tabIndex={0}>
              <div className={styles.style5!}>
                <div className={styles.style6!}>時限</div>
                {DAYS.map((day) => <div className={styles.style7!} key={day.id}>{day.label}</div>)}
                {PERIODS.flatMap((period) => [
                  <div className={styles.style8!} key={`period-${period}`}>{period}</div>,
                  ...DAYS.map((day) => {
                    const entry = entries.find((item) => item.day === day.id && item.period === period);
                    const course = entry === undefined ? undefined : courseById.get(entry.courseId);
                    return (
                      <div className={styles.style9!} key={`${day.id}-${period}`}>
                        {entry === undefined || course === undefined ? null : (
                          <div className={styles.style10!}>
                            <div className={styles.style11!}>
                              <strong className={styles.style12!}>{course.name}</strong>
                              {entry.room === "" ? null : <span className={styles.style13!}>{entry.room}</span>}
                            </div>
                            <IconButton className={styles.style14!} icon={<Trash aria-hidden size={16} />} label={`${course.name}を時間割から削除`} onClick={() => removeEntry(entry.id)} variant="ghost" />
                            <TransitionLink className={styles.style15!} href={`/courses/${course.id}`} intent="drill-in">コースを見る</TransitionLink>
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
        <form className={styles.style16!} onSubmit={addEntry}>
          <label className={styles.style17!} htmlFor="timetable-course">コース<select className={selectClass} id="timetable-course" name="courseId" required>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
          <div className={styles.style18!}>
            <label className={styles.style17!} htmlFor="timetable-day">曜日<select className={selectClass} id="timetable-day" name="day" required>{DAYS.map((day) => <option key={day.id} value={day.id}>{day.label}曜日</option>)}</select></label>
            <label className={styles.style17!} htmlFor="timetable-period">時限<select className={selectClass} id="timetable-period" name="period" required>{PERIODS.map((period) => <option key={period} value={period}>{period}限</option>)}</select></label>
          </div>
          <Field id="timetable-room" label="教室（任意）" maxLength={100} name="room" placeholder="例: 1号館 203" />
          <div className={styles.style19!}><Button onClick={() => setOpen(false)} variant="ghost">キャンセル</Button><Button type="submit" variant="primary">追加</Button></div>
        </form>
      </DialogSheet></>}
      header={<RouteHeader
        actions={<div className={styles.style20!}><TransitionLink appearance="action" className={styles.appActionLink!} href="/calendar" intent="switch">予定を見る</TransitionLink><Button icon={<Plus aria-hidden size={18} />} onClick={() => setOpen(true)} variant="primary">授業を追加</Button></div>}
        description="受講コースを曜日と時限へ配置して、自分用の時間割を作成します。"
        eyebrow="学習スケジュール"
        title="時間割"
      />}
      mode="overview"
      width="wide"
    />
  );
}
