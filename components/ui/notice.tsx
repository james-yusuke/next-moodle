import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

export type NoticeTone = "info" | "success" | "warning" | "error";

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
      return <Info aria-hidden size={20} weight="duotone" />;
    case "success":
      return <CheckCircle aria-hidden size={20} weight="duotone" />;
    case "warning":
      return <Warning aria-hidden size={20} weight="duotone" />;
    case "error":
      return <XCircle aria-hidden size={20} weight="duotone" />;
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
    <div className={`ui-notice ui-notice--${tone}`} role={urgent ? "alert" : "status"}>
      <span className="ui-notice__icon">
        <NoticeIcon tone={tone} />
      </span>
      <div className="ui-notice__content">
        <strong className="ui-notice__title">{title}</strong>
        <div className="ui-notice__body">{children}</div>
      </div>
      {action ? <div className="ui-notice__action">{action}</div> : null}
    </div>
  );
}
