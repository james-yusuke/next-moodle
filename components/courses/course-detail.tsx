import {
  ArrowSquareOut,
  FileText,
  LockSimple,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Notice, Surface } from "@/components/ui";
import type {
  CourseActivity,
  CourseDetail as CourseDetailData,
} from "@/lib/moodle/queries/courses";
import type { ActivityDestination } from "@/lib/moodle/queries/courses-model";
import "./courses.css";

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
      return <Link className="ui-app-action-link" href={destination.href}>課題を開く</Link>;
    case "external":
      return (
        <div className="ui-course-activity__external">
          <a
            className="ui-app-action-link"
            href={destination.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            Moodleで開く
            <ArrowSquareOut aria-hidden size={17} weight="regular" />
          </a>
          <small>別タブで開きます。Moodle側で再ログインが必要な場合があります。</small>
        </div>
      );
    case "disabled":
      return (
        <div className="ui-course-activity__disabled">
          <button disabled type="button">
            <LockSimple aria-hidden size={17} weight="regular" />
            開けません
          </button>
          <small>
            {destination.reason === "hidden"
              ? "このアクティビティは現在利用できません。"
              : "安全に開けるMoodle URLがありません。"}
          </small>
        </div>
      );
    default:
      return assertNever(destination);
  }
}

export function CourseDetail({ data }: Readonly<{ data: CourseDetailData }>) {
  return (
    <div className="ui-page-stack">
      <header className="ui-course-detail__header">
        <Link href="/courses">コース一覧に戻る</Link>
        <div>
          <Badge tone="accent">{data.course.shortName}</Badge>
          <h1>{data.course.name}</h1>
        </div>
      </header>
      {data.sections.length === 0 ? (
        <Notice title="公開中のセクションはありません" tone="info">
          <p>教材が公開されると、この画面に表示されます。</p>
        </Notice>
      ) : (
        <div className="ui-course-sections">
          {data.sections.map((section) => (
            <Surface className="ui-course-section" key={section.id} title={section.name}>
              {section.activities.length === 0 ? (
                <p className="ui-course-section__empty">このセクションに公開中の教材はありません。</p>
              ) : (
                <ul>
                  {section.activities.map((activity) => (
                    <li className="ui-course-activity" key={activity.id}>
                      <span className="ui-course-activity__icon">
                        <FileText aria-hidden size={21} weight="regular" />
                      </span>
                      <span className="ui-course-activity__title">
                        <strong>{activity.name}</strong>
                        <small>{activity.moduleType === "assign" ? "課題" : "Moodleアクティビティ"}</small>
                      </span>
                      <ActivityAction activity={activity} />
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
