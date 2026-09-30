import styles from "./form-layout.module.css";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type FormSectionProps = Readonly<{
  children: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  title?: ReactNode;
}>;

export function FormSection({ children, className, description, title }: FormSectionProps) {
  return (
    <section className={classNames(styles.formSection!, className)}>
      {title === undefined && description === undefined ? null : (
        <header className={styles.style1!}>
          {title === undefined ? null : <h2 className={styles.style2!}>{title}</h2>}
          {description === undefined ? null : <p className={styles.style3!}>{description}</p>}
        </header>
      )}
      <div className={styles.style4!}>{children}</div>
    </section>
  );
}

export function FieldGroup({ children, className }: Readonly<{ children: ReactNode; className?: string | undefined }>) {
  return <div className={classNames(styles.fieldGroup!, className)}>{children}</div>;
}

export function StickyActionBar({ "aria-label": ariaLabel, children, className, role }: Readonly<{ "aria-label"?: string; children: ReactNode; className?: string | undefined; role?: string }>) {
  return (
    <div
      className={classNames(
        styles.stickyActionBar!,
        className,
      )}
      aria-label={ariaLabel}
      role={role}
    >
      {children}
    </div>
  );
}
