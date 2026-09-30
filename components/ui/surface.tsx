import styles from "./surface.module.css";
import type { ReactNode } from "react";
import { classNames } from "./class-names";

export type SurfaceVariant = "base" | "raised" | "inset";

type SurfaceProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  eyebrow?: ReactNode;
  title?: ReactNode;
  variant?: SurfaceVariant;
}>;

const variantClasses: Record<SurfaceVariant, string> = {
  base: styles.variantClassesbase1!,
  raised: styles.variantClassesraised2!,
  inset: styles.variantClassesinset3!,
};

export function Surface({
  actions,
  children,
  className,
  eyebrow,
  title,
  variant = "base",
}: SurfaceProps) {
  const classes = classNames(
    styles.surface!,
    variantClasses[variant],
    className,
  );

  return (
    <section className={classes} data-variant={variant}>
      {eyebrow || title || actions ? (
        <header className={styles.surfaceHeader!}>
          <div className={styles.surfaceHeading!}>
            {eyebrow ? <span className={styles.surfaceEyebrow!}>{eyebrow}</span> : null}
            {title ? <h3 className={styles.surfaceTitle!}>{title}</h3> : null}
          </div>
          {actions ? <div className={styles.surfaceActions!}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={styles.surfaceBody!}>{children}</div>
    </section>
  );
}
