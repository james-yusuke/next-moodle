import styles from "./data-list.module.css";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type DataListProps = Readonly<{
  children: ReactNode;
  className?: string | undefined;
  label?: string;
}>;

type DataListItemProps = Readonly<{
  action?: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  icon?: ReactNode;
  metadata?: ReactNode;
  state?: ReactNode;
  title: ReactNode;
}>;

export function DataList({ children, className, label }: DataListProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        styles.dataList!,
        className,
      )}
      role={label === undefined ? undefined : "list"}
    >
      {children}
    </div>
  );
}

export function DataListItem({
  action,
  className,
  description,
  icon,
  metadata,
  state,
  title,
}: DataListItemProps) {
  return (
    <div
      className={classNames(
        styles.dataListItem!,
        styles.style1!,
        className,
      )}
      role="listitem"
    >
      {icon === undefined ? null : (
        <span className={styles.style2!}>
          {icon}
        </span>
      )}
      <span className={classNames(styles.style3!, icon === undefined && styles.style4!)}>
        <span className={styles.style5!}>{title}</span>
        {description === undefined ? null : (
          <span className={styles.style6!}>{description}</span>
        )}
        {metadata === undefined ? null : (
          <span className={styles.style7!}>{metadata}</span>
        )}
      </span>
      {state === undefined && action === undefined ? null : (
        <span className={styles.style8!}>
          {state}
          {action}
        </span>
      )}
    </div>
  );
}
