import styles from "./status-panel.module.css";
import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

type StatusPanelProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  title: ReactNode;
  tone?: StatusTone;
}>;

const toneClasses: Record<StatusTone, string> = {
  neutral: styles.toneClassesneutral1!,
  info: styles.toneClassesinfo2!,
  success: styles.toneClassessuccess3!,
  warning: styles.toneClasseswarning4!,
  error: styles.toneClasseserror5!,
};

function StatusIcon({ tone }: Readonly<{ tone: StatusTone }>) {
  if (tone === "success") return <CheckCircle aria-hidden size={20} />;
  if (tone === "warning") return <Warning aria-hidden size={20} />;
  if (tone === "error") return <XCircle aria-hidden size={20} />;
  return <Info aria-hidden size={20} />;
}

export function StatusPanel({
  action,
  children,
  className,
  title,
  tone = "neutral",
}: StatusPanelProps) {
  return (
    <section
      className={classNames(
        styles.statusPanel!,
        toneClasses[tone],
        className,
      )}
    >
      <span className={styles.style1!}><StatusIcon tone={tone} /></span>
      <div className={styles.style2!}>
        <strong className={styles.style3!}>{title}</strong>
        <div className={styles.style4!}>{children}</div>
      </div>
      {action === undefined ? null : <div className={styles.style5!}>{action}</div>}
    </section>
  );
}
