import type { ReactNode } from "react";

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

export function Badge({ children, icon, tone = "neutral" }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {icon ? (
        <span aria-hidden className="ui-badge__icon">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
