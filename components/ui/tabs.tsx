import styles from "./tabs.module.css";
import type { ReactNode } from "react";

import { classNames } from "./class-names";

type TabsProps = Readonly<{
  children: ReactNode;
  className?: string | undefined;
  label: string;
}>;

type TabProps = Readonly<{
  active?: boolean;
  children: ReactNode;
  className?: string | undefined;
}>;

export function Tabs({ children, className, label }: TabsProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        styles.tabs!,
        className,
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function Tab({ active = false, children, className }: TabProps) {
  return (
    <span
      aria-selected={active}
      className={classNames(
        styles.tab!,
        active
          ? styles.style1!
          : styles.style2!,
        className,
      )}
      role="tab"
    >
      {children}
    </span>
  );
}
