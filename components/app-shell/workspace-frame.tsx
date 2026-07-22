import type { ReactNode } from "react";

import type { SharedTransitionKind, WorkspaceMode } from "@/components/app-shell/motion";
import { SharedTransition } from "@/components/app-shell/transitions";

type PageFrameProps = Readonly<{
  actions?: ReactNode;
  className?: string;
  content: ReactNode;
  context?: ReactNode;
  header: ReactNode;
  mode: WorkspaceMode;
  state?: string;
  utility?: ReactNode;
}>;

type RouteHeaderProps = Readonly<{
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  shared?: Readonly<{
    identifier: string | number;
    kind: SharedTransitionKind;
  }>;
  title: ReactNode;
}>;

type DataRowProps = Readonly<{
  action?: ReactNode;
  index?: ReactNode;
  metadata?: ReactNode;
  state?: ReactNode;
  title: ReactNode;
}>;

type SectionIndexItem = Readonly<{
  href: string;
  id: string | number;
  label: string;
  state?: ReactNode;
}>;

export function PageFrame({ actions, className, content, context, header, mode, state, utility }: PageFrameProps) {
  return (
    <div className={["ui-page-frame", className].filter(Boolean).join(" ")} data-mode={mode} data-state={state}>
      <div className="ui-page-frame__header">{header}</div>
      {context === undefined ? null : <aside className="ui-page-frame__context">{context}</aside>}
      <section className="ui-page-frame__content">{content}</section>
      {utility === undefined ? null : <aside className="ui-page-frame__utility">{utility}</aside>}
      {actions === undefined ? null : <footer className="ui-page-frame__actions">{actions}</footer>}
    </div>
  );
}

export function RouteHeader({ actions, description, eyebrow, metadata, shared, title }: RouteHeaderProps) {
  const heading = <h1>{title}</h1>;

  return (
    <header className="ui-route-header">
      <div className="ui-route-header__copy">
        {eyebrow === undefined ? null : <div className="ui-route-header__eyebrow">{eyebrow}</div>}
        {shared === undefined ? heading : <SharedTransition identifier={shared.identifier} kind={shared.kind}>{heading}</SharedTransition>}
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {metadata === undefined ? null : <div className="ui-route-header__metadata">{metadata}</div>}
      {actions === undefined ? null : <div className="ui-route-header__actions">{actions}</div>}
    </header>
  );
}

export function SectionIndex({ items }: Readonly<{ items: readonly SectionIndexItem[] }>) {
  return (
    <ol className="ui-section-index">
      {items.map((item, index) => (
        <li key={item.id}>
          <a href={item.href}>
            <span className="ui-section-index__number">{String(index + 1).padStart(2, "0")}</span>
            <span className="ui-section-index__label">{item.label}</span>
            {item.state === undefined ? null : <span className="ui-section-index__state">{item.state}</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function DataRow({ action, index, metadata, state, title }: DataRowProps) {
  return (
    <div className="ui-data-row">
      {index === undefined ? null : <span className="ui-data-row__index">{index}</span>}
      <span className="ui-data-row__copy"><strong>{title}</strong>{metadata === undefined ? null : <small>{metadata}</small>}</span>
      {state === undefined ? null : <span className="ui-data-row__state">{state}</span>}
      {action === undefined ? null : <span className="ui-data-row__action">{action}</span>}
    </div>
  );
}

export function ActionDock({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="ui-action-dock">{children}</div>;
}
