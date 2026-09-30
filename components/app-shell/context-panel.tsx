"use client";

import styles from "./context-panel.module.css";
import { CaretLeft } from "@phosphor-icons/react";
import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { contextPanelStorageKey, peekContextPanelPreference, readContextPanelPreference, writeContextPanelPreference } from "./layout-preferences";
import { classNames } from "@/components/ui/class-names";

type ContextPanelProps = Readonly<{
  children: ReactNode;
  count?: ReactNode;
  mobileAlwaysOpen?: boolean;
  storageKey: "course" | "messages" | "student";
  title: ReactNode;
}>;

const STORAGE_EVENT = "next-moodle-context-layout";

export function ContextPanel({ children, count, mobileAlwaysOpen = false, storageKey, title }: ContextPanelProps) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(STORAGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(STORAGE_EVENT, onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(
    () => {
      return peekContextPanelPreference(window.localStorage, storageKey);
    },
    [storageKey],
  );
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    readContextPanelPreference(window.localStorage, storageKey);
  }, [storageKey]);

  const toggle = () => {
    writeContextPanelPreference(window.localStorage, storageKey, !collapsed);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  const panelId = `context-panel-${storageKey}`;

  return (
    <div className={styles.contextPanel!} data-collapsed={collapsed} data-mobile-always-open={mobileAlwaysOpen ? "true" : undefined} data-storage-key={contextPanelStorageKey(storageKey)} data-ui="context-panel" id={panelId}>
      <header className={classNames(styles.contextPanelHeader!, collapsed && styles.style1!)}>
        <div className={classNames(styles.contextPanelHeading!, collapsed && styles.style2!)}>
          <h2 className={styles.style3!}>{title}</h2>
          {count === undefined ? null : <span className={styles.style4!}>{count}</span>}
        </div>
        <button aria-controls={`${panelId}-body`} aria-expanded={!collapsed} className={styles.style5!} aria-label={collapsed ? "文脈パネルを開く" : "文脈パネルを閉じる"} onClick={toggle} type="button">
          <CaretLeft aria-hidden className={classNames(styles.style6!, collapsed && styles.style7!)} size={17} />
        </button>
      </header>
      <div className={classNames(styles.contextPanelBody!, collapsed && styles.style2!)} id={`${panelId}-body`}>{children}</div>
    </div>
  );
}
