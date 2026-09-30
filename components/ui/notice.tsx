import styles from "./notice.module.css";
import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type NoticeTone = "info" | "success" | "warning" | "error";

const toneClasses: Record<NoticeTone, string> = {
  info: styles.toneClassesinfo1!,
  success: styles.toneClassessuccess2!,
  warning: styles.toneClasseswarning3!,
  error: styles.toneClasseserror4!,
};

type NoticeProps = Readonly<{
  action?: ReactNode;
  children: ReactNode;
  title: ReactNode;
  tone?: NoticeTone;
  urgent?: boolean;
}>;

function NoticeIcon({ tone }: Readonly<{ tone: NoticeTone }>) {
  switch (tone) {
    case "info":
      return <Info aria-hidden size={20} weight="regular" />;
    case "success":
      return <CheckCircle aria-hidden size={20} weight="regular" />;
    case "warning":
      return <Warning aria-hidden size={20} weight="regular" />;
    case "error":
      return <XCircle aria-hidden size={20} weight="regular" />;
  }
}

export function Notice({
  action,
  children,
  title,
  tone = "info",
  urgent = false,
}: NoticeProps) {
  return (
    <div className={classNames(
      styles.style1!,
      toneClasses[tone],
    )} data-tone={tone} role={urgent ? "alert" : "status"}>
      <span className={styles.noticeIcon!}>
        <NoticeIcon tone={tone} />
      </span>
      <div className={styles.noticeContent!}>
        <strong className={styles.noticeTitle!}>{title}</strong>
        <div className={styles.noticeBody!}>{children}</div>
      </div>
      {action ? <div className={styles.noticeAction!}>{action}</div> : null}
    </div>
  );
}
