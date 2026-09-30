import styles from "./system-state.module.css";
import {
  ArrowLeft,
  House,
  MagnifyingGlass,
  ShieldWarning,
  WarningOctagon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { classNames } from "@/components/ui/class-names";

export type SystemStateKind = "error" | "forbidden" | "not-found";

type SystemStateProps = Readonly<{
  actions?: ReactNode;
  description: ReactNode;
  headingLevel?: 1 | 2;
  kind: SystemStateKind;
  reference?: string;
  title: ReactNode;
}>;

const toneClasses = {
  error: styles.toneClasseserror1!,
  warning: styles.toneClasseswarning2!,
  info: styles.toneClassesinfo3!,
} as const;

const STATE_META = {
  error: { code: "500", eyebrow: "SYSTEM ERROR", icon: WarningOctagon, tone: toneClasses.error },
  forbidden: { code: "403", eyebrow: "ACCESS CONTROL", icon: ShieldWarning, tone: toneClasses.warning },
  "not-found": { code: "404", eyebrow: "NOT FOUND", icon: MagnifyingGlass, tone: toneClasses.info },
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
      className={styles.systemState!}
      data-kind={kind}
    >
      <div aria-hidden className={classNames(styles.systemStateCode!, meta.tone)}>{meta.code}</div>
      <div className={styles.systemStateBody!}>
        <div className={classNames(styles.systemStateEyebrow!, meta.tone)}>
          <Icon aria-hidden size={18} weight="regular" />
          <span>{meta.eyebrow}</span>
        </div>
        <Heading className={styles.style1!}>{title}</Heading>
        <p className={styles.style2!}>{description}</p>
        {reference === undefined ? null : (
          <p className={styles.systemStateReference!}>
            問い合わせ番号 <code>{reference}</code>
          </p>
        )}
        {actions === undefined ? null : (
          <div className={styles.systemStateActions!}>{actions}</div>
        )}
      </div>
    </section>
  );
}

export function DashboardStateLink() {
  return (
    <Link className={styles.systemStateLink!} href="/dashboard">
      <House aria-hidden size={17} />
      ダッシュボードへ
    </Link>
  );
}

export function BackStateLink() {
  return (
    <Link className={styles.systemStateLink2!} href="/courses">
      <ArrowLeft aria-hidden size={17} />
      コース一覧へ
    </Link>
  );
}
