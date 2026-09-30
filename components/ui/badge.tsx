import styles from "./badge.module.css";
import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "info";

type BadgeProps = Readonly<{
  children: ReactNode;
  icon?: ReactNode;
  tone?: BadgeTone;
}>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: styles.toneClassesneutral1!,
  accent: styles.toneClassesaccent2!,
  success: styles.toneClassessuccess3!,
  warning: styles.toneClasseswarning4!,
  error: styles.toneClasseserror5!,
  info: styles.toneClassesinfo6!,
};

export function Badge({ children, icon, tone = "neutral" }: BadgeProps) {
  return (
    <span className={classNames(
      styles.style1!,
      toneClasses[tone],
    )} data-tone={tone}>
      {icon ? (
        <span aria-hidden className={styles.badgeIcon!}>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
