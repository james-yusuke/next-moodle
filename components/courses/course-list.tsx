"use client";

import styles from "./course-list.module.css";
import { Books, Eye, EyeSlash, MagnifyingGlass, Star } from "@phosphor-icons/react";
import ky from "ky";
import { useMemo, useState } from "react";

import { SharedTransition, TransitionLink } from "@/components/app-shell/transitions";
import { Badge, Button, Card, EmptyState, Field, Notice, Toolbar } from "@/components/ui";
import { useLocalStorageValue } from "@/components/ui/use-local-storage-value";
import type { AppRuntimeConfig } from "@/lib/app-config";
import {
  filterCourseItems,
  type CourseClassification,
  type CourseListItem,
} from "@/lib/moodle/queries/courses-model";

const CLASSIFICATIONS = ["active", "future", "past"] as const;
type CourseFilter = "all" | "hidden" | CourseClassification;
const CLASSIFICATION_COPY: Readonly<
  Record<CourseClassification, Readonly<{ label: string; tone: "success" | "info" | "neutral" }>>
> = {
  active: { label: "受講中", tone: "success" },
  future: { label: "開始前", tone: "info" },
  past: { label: "終了", tone: "neutral" },
};

function coursePeriod(course: CourseListItem, format: Intl.DateTimeFormat): string {
  const start = course.startDate === undefined
    ? "開始日未設定"
    : format.format(new Date(course.startDate * 1_000));
  const end = course.endDate === undefined || course.endDate === 0
    ? "終了日未設定"
    : format.format(new Date(course.endDate * 1_000));
  return `${start} から ${end}`;
}

function initialFavorites(courses: readonly CourseListItem[]): ReadonlySet<number> {
  const ids = new Set<number>();
  for (const course of courses) {
    if (course.isFavourite) ids.add(course.id);
  }
  return ids;
}

export function CourseList({ canFavorite, config, courses, preferenceScope }: Readonly<{
  canFavorite: boolean;
  config: AppRuntimeConfig;
  courses: readonly CourseListItem[];
  preferenceScope: string;
}>) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favorites, setFavorites] = useState<ReadonlySet<number>>(() => initialFavorites(courses));
  const [pendingFavorite, setPendingFavorite] = useState<number | null>(null);
  const [favoriteError, setFavoriteError] = useState("");
  const storageKey = `next-moodle:hidden-courses:${preferenceScope}`;
  const [hiddenValue, setHiddenValue] = useLocalStorageValue(storageKey, "[]");
  const hiddenCourses = useMemo<ReadonlySet<number>>(() => {
    try {
      const value: unknown = JSON.parse(hiddenValue);
      return Array.isArray(value) ? new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0)) : new Set();
    } catch {
      return new Set();
    }
  }, [hiddenValue]);
  const filtered = useMemo(() => filterCourseItems(courses, query).filter((course) => {
    const hidden = hiddenCourses.has(course.id);
    const matchesClassification = courseFilter === "hidden"
      ? hidden
      : !hidden && (courseFilter === "all" || course.classification === courseFilter);
    return matchesClassification && (!favoriteOnly || favorites.has(course.id));
  }), [courseFilter, courses, favoriteOnly, favorites, hiddenCourses, query]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium", timeZone: config.timeZone,
  }), [config.locale, config.timeZone]);

  async function toggleFavourite(course: CourseListItem): Promise<void> {
    if (!canFavorite || pendingFavorite !== null) return;
    const favourite = !favorites.has(course.id);
    setFavoriteError("");
    setPendingFavorite(course.id);
    const response = await ky.post(`/api/courses/${course.id}/favourite`, { json: { favourite }, retry: 0, throwHttpErrors: false });
    setPendingFavorite(null);
    if (!response.ok) {
      setFavoriteError("スターを更新できませんでした。接続を確認して、もう一度お試しください。");
      return;
    }
    setFavorites((current) => {
      const next = new Set(current);
      if (favourite) next.add(course.id); else next.delete(course.id);
      return next;
    });
  }

  function toggleHidden(courseId: number): void {
    const next = new Set(hiddenCourses);
    if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
    setHiddenValue(JSON.stringify([...next]));
  }

  if (courses.length === 0) {
    return (
      <EmptyState icon={<Books aria-hidden size={22} />} title="表示できる受講コースはありません">
        コースへの登録が反映されると、ここに表示されます。
      </EmptyState>
    );
  }

  return (
    <div className={styles.coursesBrowser!}>
      <Toolbar label="コースを検索・絞り込み">
        <div className={styles.coursesSearch!}>
          <span className={styles.style1!}><MagnifyingGlass aria-hidden size={20} weight="regular" /></span>
          <Field
            className={styles.style2!}
            id="course-search"
            label="コースを検索"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="コース名または略称"
            type="search"
            value={query}
          />
        </div>
        <div className={styles.coursesFilters!} aria-label="コースの絞り込み" role="group">
          <Button aria-pressed={courseFilter === "all"} className={styles.style3!} onClick={() => setCourseFilter("all")} size="compact" variant={courseFilter === "all" ? "primary" : "ghost"}>すべて</Button>
          {CLASSIFICATIONS.map((classification) => (
            <Button aria-pressed={courseFilter === classification} className={styles.style3!} key={classification} onClick={() => setCourseFilter(classification)} size="compact" variant={courseFilter === classification ? "primary" : "ghost"}>{CLASSIFICATION_COPY[classification].label}</Button>
          ))}
          <Button aria-pressed={courseFilter === "hidden"} className={styles.style3!} onClick={() => setCourseFilter("hidden")} size="compact" variant={courseFilter === "hidden" ? "primary" : "ghost"}><EyeSlash aria-hidden size={15} />非表示 {hiddenCourses.size}</Button>
          {canFavorite ? <Button aria-pressed={favoriteOnly} className={styles.style3!} onClick={() => setFavoriteOnly((current) => !current)} size="compact" variant={favoriteOnly ? "primary" : "ghost"}><Star aria-hidden size={15} weight={favoriteOnly ? "fill" : "regular"} />スター付き</Button> : null}
        </div>
      </Toolbar>
      <p aria-live="polite" className={styles.coursesResultCount!}>{filtered.length}件のコースを表示</p>
      {favoriteError === "" ? null : <Notice title="スターを更新できませんでした" tone="error" urgent><p>{favoriteError}</p></Notice>}
      {filtered.length === 0 ? (
        <EmptyState icon={courseFilter === "hidden" ? <EyeSlash aria-hidden size={22} /> : <MagnifyingGlass aria-hidden size={22} />} title={courseFilter === "hidden" ? "非表示のコースはありません" : "検索条件に一致するコースはありません"}>
          {courseFilter === "hidden" ? "コース行の非表示ボタンを押すと、ここからいつでも一覧へ戻せます。" : "コース名または略称を短くして、もう一度検索してください。"}
        </EmptyState>
      ) : (
        (courseFilter === "hidden" ? ["hidden"] as const : CLASSIFICATIONS).map((classification) => {
          const group = classification === "hidden" ? filtered : filtered.filter((course) => course.classification === classification);
          if (group.length === 0) {
            return null;
          }
          const copy = classification === "hidden" ? { label: "非表示済み", tone: "neutral" as const } : CLASSIFICATION_COPY[classification];
          return (
            <Card className={styles.coursesGroup!} key={classification} padding="standard" tone="default">
              <header className={styles.style4!}>
                <h2 className={styles.style5!}>{copy.label}</h2>
                <Badge tone={copy.tone}>{group.length}コース</Badge>
              </header>
              <div className={styles.coursesList!} data-testid={`course-list-${classification}`}>
                <ul className={styles.style6!}>
                  {group.map((course) => (
                    <li className={styles.style7!} key={course.id}>
                      <div className={styles.coursesRow!}><TransitionLink className={styles.style8!} href={`/courses/${course.id}`} intent="drill-in">
                        <span className={styles.coursesListIcon!}>
                          <Books aria-hidden size={21} weight="regular" />
                        </span>
                        <span className={styles.coursesListTitle!}>
                          <SharedTransition identifier={course.id} kind="course"><strong className={styles.style9!}>{course.name}</strong></SharedTransition>
                          <small className={styles.style10!}>{course.shortName}</small>
                        </span>
                        <span className={styles.coursesListPeriod!}>{coursePeriod(course, dateFormat)}</span>
                      </TransitionLink><div className={styles.style11!}>{canFavorite ? <button aria-label={favorites.has(course.id) ? `${course.name}のスターを解除` : `${course.name}にスターを付ける`} aria-pressed={favorites.has(course.id)} className={styles.courseFavourite!} disabled={pendingFavorite !== null} onClick={() => void toggleFavourite(course)} type="button"><Star aria-hidden size={19} weight={favorites.has(course.id) ? "fill" : "regular"} /></button> : null}<button aria-label={hiddenCourses.has(course.id) ? `${course.name}を一覧へ戻す` : `${course.name}を一覧から非表示`} className={styles.style12!} onClick={() => toggleHidden(course.id)} type="button">{hiddenCourses.has(course.id) ? <Eye aria-hidden size={19} /> : <EyeSlash aria-hidden size={19} />}</button></div></div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
