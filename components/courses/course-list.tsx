"use client";

import { Books, MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge, Field, Notice, Surface } from "@/components/ui";
import type { AppRuntimeConfig } from "@/lib/app-config";
import {
  filterCourseItems,
  type CourseClassification,
  type CourseListItem,
} from "@/lib/moodle/queries/courses-model";
import "./courses.css";

const CLASSIFICATIONS = ["active", "future", "past"] as const;
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

export function CourseList({ config, courses }: Readonly<{
  config: AppRuntimeConfig;
  courses: readonly CourseListItem[];
}>) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterCourseItems(courses, query), [courses, query]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium", timeZone: config.timeZone,
  }), [config.locale, config.timeZone]);

  if (courses.length === 0) {
    return (
      <Notice title="表示できる受講コースはありません" tone="info">
        <p>コースへの登録が反映されると、ここに表示されます。</p>
      </Notice>
    );
  }

  return (
    <div className="ui-courses-browser">
      <div className="ui-courses-search">
        <MagnifyingGlass aria-hidden size={20} weight="regular" />
        <Field
          id="course-search"
          label="コースを検索"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="コース名または略称"
          type="search"
          value={query}
        />
      </div>
      {filtered.length === 0 ? (
        <Notice title="検索条件に一致するコースはありません" tone="info">
          <p>コース名または略称を短くして、もう一度検索してください。</p>
        </Notice>
      ) : (
        CLASSIFICATIONS.map((classification) => {
          const group = filtered.filter((course) => course.classification === classification);
          if (group.length === 0) {
            return null;
          }
          const copy = CLASSIFICATION_COPY[classification];
          return (
            <section className="ui-courses-group" key={classification}>
              <header>
                <h2>{copy.label}</h2>
                <Badge tone={copy.tone}>{group.length}コース</Badge>
              </header>
              <Surface className="ui-courses-list" variant="inset">
                <ul>
                  {group.map((course) => (
                    <li key={course.id}>
                      <Link href={`/courses/${course.id}`}>
                        <span className="ui-courses-list__icon">
                          <Books aria-hidden size={21} weight="regular" />
                        </span>
                        <span className="ui-courses-list__title">
                          <strong>{course.name}</strong>
                          <small>{course.shortName}</small>
                        </span>
                        <span className="ui-courses-list__period">{coursePeriod(course, dateFormat)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            </section>
          );
        })
      )}
    </div>
  );
}
