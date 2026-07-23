import {
  ArrowLeft,
  House,
  MagnifyingGlass,
  ShieldWarning,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import "./system-state.css";

export type SystemStateKind = "error" | "forbidden" | "not-found";

type SystemStateProps = Readonly<{
  actions?: ReactNode;
  description: ReactNode;
  headingLevel?: 1 | 2;
  kind: SystemStateKind;
  reference?: string;
  title: ReactNode;
}>;

const STATE_META = {
  error: { code: "500", eyebrow: "SYSTEM ERROR", icon: WarningOctagon },
  forbidden: { code: "403", eyebrow: "ACCESS CONTROL", icon: ShieldWarning },
  "not-found": { code: "404", eyebrow: "NOT FOUND", icon: MagnifyingGlass },
} as const;

export function SystemState({
  actions,
  description,
  headingLevel = 1,
  kind,
  reference,
  title,
}: SystemStateProps) {
  const meta = STATE_META[kind];
  const Icon = meta.icon;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      aria-live={kind === "error" ? "assertive" : "polite"}
      className="ui-system-state"
      data-kind={kind}
    >
      <div aria-hidden className="ui-system-state__code">{meta.code}</div>
      <div className="ui-system-state__body">
        <div className="ui-system-state__eyebrow">
          <Icon aria-hidden size={18} weight="regular" />
          <span>{meta.eyebrow}</span>
        </div>
        <Heading>{title}</Heading>
        <p>{description}</p>
        {reference === undefined ? null : (
          <p className="ui-system-state__reference">
            問い合わせ番号 <code>{reference}</code>
          </p>
        )}
        {actions === undefined ? null : (
          <div className="ui-system-state__actions">{actions}</div>
        )}
      </div>
    </section>
  );
}

export function DashboardStateLink() {
  return (
    <Link className="ui-system-state__link ui-system-state__link--primary" href="/dashboard">
      <House aria-hidden size={17} />
      ダッシュボードへ
    </Link>
  );
}

export function BackStateLink() {
  return (
    <Link className="ui-system-state__link" href="/courses">
      <ArrowLeft aria-hidden size={17} />
      コース一覧へ
    </Link>
  );
}
