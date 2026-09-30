import styles from "./empty-state.module.css";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type EmptyStateProps = Readonly<{
  action?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
  icon?: ReactNode;
  title: ReactNode;
}>;

export function EmptyState({ action, children, className, icon, title }: EmptyStateProps) {
  return (
    <div
      className={classNames(
        styles.emptyState!,
        className,
      )}
    >
      <div className={styles.style1!}>
        {icon === undefined ? null : (
          <span className={styles.style2!}>
            {icon}
          </span>
        )}
        <strong className={styles.style3!}>{title}</strong>
        {children === undefined ? null : (
          <div className={styles.style4!}>{children}</div>
        )}
        {action === undefined ? null : <div className={styles.style5!}>{action}</div>}
      </div>
    </div>
  );
}
