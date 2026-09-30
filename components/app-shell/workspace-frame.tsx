import styles from "./workspace-frame.module.css";
import type { ReactNode } from "react";

import type { SharedTransitionKind, WorkspaceMode } from "@/components/app-shell/motion";
import { SharedTransition } from "@/components/app-shell/transitions";
import { classNames } from "@/components/ui/class-names";

export type PageWidth = "reading" | "standard" | "wide" | "full";

type PageFrameProps = Readonly<{
  actions?: ReactNode;
  className?: string | undefined;
  content: ReactNode;
  context?: ReactNode;
  header?: ReactNode;
  mode: WorkspaceMode;
  mobileView?: "content" | "context";
  state?: string;
  utility?: ReactNode;
  width?: PageWidth;
}>;

type RouteHeaderProps = Readonly<{
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  shared?: Readonly<{
    identifier: string | number;
    kind: SharedTransitionKind;
  }>;
  status?: ReactNode;
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

const widthClasses: Record<PageWidth, string> = {
  reading: styles.widthClassesreading1!,
  standard: styles.widthClassesstandard2!,
  wide: styles.widthClasseswide3!,
  full: styles.widthClassesfull4!,
};

export function PageFrame({ actions, className, content, context, header, mobileView = "content", mode, state, utility, width }: PageFrameProps) {
  const resolvedWidth = width ?? (mode === "focus" ? "reading" : mode === "conversation" ? "full" : "wide");
  return (
    <div className={classNames(
      styles.pageFrame!,
      mode === "conversation" && styles.style1!,
      context !== undefined && mode === "conversation" && styles.style2!,
      context !== undefined && mode === "browse" && styles.style3!,
      utility !== undefined && styles.style4!,
      className,
    )} data-mode={mode} data-state={state} data-ui="page-frame" data-width={resolvedWidth}>
      {header === undefined ? null : (
        <div className={styles.pageFrameHeader!}>
          <div className={classNames(styles.style5!, widthClasses[resolvedWidth])}>{header}</div>
        </div>
      )}
      {context === undefined ? null : (
        <aside className={classNames(
          styles.pageFrameContext!,
          mobileView === "context" && styles.style6!,
          mode === "conversation" && styles.style7!,
          mode === "browse" && styles.style8!,
        )} data-testid="page-frame-context">{context}</aside>
      )}
      <section className={classNames(
        styles.pageFrameContent!,
        mobileView === "context" && styles.style9!,
        context !== undefined && mode === "conversation" && styles.style10!,
        context !== undefined && mode === "browse" && styles.style11!,
        mode === "conversation" && styles.style12!,
      )} data-testid="page-frame-content">
        <div className={classNames(styles.style5!, widthClasses[resolvedWidth], mode === "conversation" && styles.style13!)}>{content}</div>
      </section>
      {utility === undefined ? null : <aside className={styles.pageFrameUtility!}>{utility}</aside>}
      {actions === undefined ? null : <footer className={styles.pageFrameActions!}>{actions}</footer>}
    </div>
  );
}

export function RouteHeader({ actions, breadcrumbs, description, eyebrow, metadata, primaryAction, secondaryActions, shared, status, title }: RouteHeaderProps) {
  const heading = <h1 className={styles.style14!}>{title}</h1>;
  const resolvedEyebrow = breadcrumbs ?? eyebrow;
  const resolvedActions = actions ?? (
    primaryAction === undefined && secondaryActions === undefined ? undefined : (
      <>{secondaryActions}{primaryAction}</>
    )
  );

  return (
    <header className={styles.routeHeader!}>
      <div className={styles.routeHeaderCopy!}>
        {resolvedEyebrow === undefined ? null : <div className={styles.routeHeaderEyebrow!}>{resolvedEyebrow}</div>}
        <div className={styles.style15!}>
          {shared === undefined ? heading : <SharedTransition identifier={shared.identifier} kind={shared.kind}>{heading}</SharedTransition>}
          {status}
        </div>
        {description === undefined ? null : <p className={styles.style16!}>{description}</p>}
      </div>
      {metadata === undefined ? null : <div className={styles.routeHeaderMetadata!}>{metadata}</div>}
      {resolvedActions === undefined ? null : <div className={styles.routeHeaderActions!}>{resolvedActions}</div>}
    </header>
  );
}

export function SectionIndex({ items }: Readonly<{ items: readonly SectionIndexItem[] }>) {
  return (
    <ol className={styles.sectionIndex!}>
      {items.map((item, index) => (
        <li key={item.id}>
          <a className={styles.style17!} href={item.href}>
            <span className={styles.sectionIndexNumber!}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.sectionIndexLabel!}>{item.label}</span>
            {item.state === undefined ? null : <span className={styles.sectionIndexState!}>{item.state}</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function DataRow({ action, index, metadata, state, title }: DataRowProps) {
  return (
    <div className={styles.dataRow!} data-testid="data-row">
      {index === undefined ? null : <span className={styles.dataRowIndex!}>{index}</span>}
      <span className={styles.dataRowCopy!}><strong className={styles.style18!}>{title}</strong>{metadata === undefined ? null : <small className={styles.style19!}>{metadata}</small>}</span>
      {state === undefined ? null : <span className={styles.dataRowState!}>{state}</span>}
      {action === undefined ? null : <span className={styles.dataRowAction!}>{action}</span>}
    </div>
  );
}

export function ActionDock({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.actionDock!} data-testid="action-dock">{children}</div>;
}
