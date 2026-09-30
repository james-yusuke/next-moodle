import styles from "./toolbar.module.css";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type ToolbarProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  label: string;
}>;

export function Toolbar({ actions, children, className, label }: ToolbarProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        styles.toolbar!,
        className,
      )}
      role="toolbar"
    >
      <div className={styles.style1!}>{children}</div>
      {actions === undefined ? null : (
        <div className={styles.style2!}>{actions}</div>
      )}
    </div>
  );
}
