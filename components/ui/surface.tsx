import type { ReactNode } from "react";

export type SurfaceVariant = "base" | "raised" | "inset";

type SurfaceProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  eyebrow?: ReactNode;
  title?: ReactNode;
  variant?: SurfaceVariant;
}>;

export function Surface({
  actions,
  children,
  className,
  eyebrow,
  title,
  variant = "base",
}: SurfaceProps) {
  const classes = ["ui-surface", `ui-surface--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes}>
      {eyebrow || title || actions ? (
        <header className="ui-surface__header">
          <div className="ui-surface__heading">
            {eyebrow ? <span className="ui-surface__eyebrow">{eyebrow}</span> : null}
            {title ? <h3 className="ui-surface__title">{title}</h3> : null}
          </div>
          {actions ? <div className="ui-surface__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ui-surface__body">{children}</div>
    </section>
  );
}
