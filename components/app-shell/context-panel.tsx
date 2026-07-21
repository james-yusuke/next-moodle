"use client";

import { CaretLeft } from "@phosphor-icons/react";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";

type ContextPanelProps = Readonly<{
  children: ReactNode;
  count?: ReactNode;
  storageKey: "course" | "messages" | "student";
  title: ReactNode;
}>;

const STORAGE_PREFIX = "next-moodle:studio-ledger:context:";
const STORAGE_EVENT = "next-moodle-context-layout";

export function ContextPanel({ children, count, storageKey, title }: ContextPanelProps) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(STORAGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(STORAGE_EVENT, onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`) === "collapsed",
    [storageKey],
  );
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = () => {
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, collapsed ? "open" : "collapsed");
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };

  return (
    <div className="ui-context-panel" data-collapsed={collapsed}>
      <header className="ui-context-panel__header">
        <div className="ui-context-panel__heading">
          <h2>{title}</h2>
          {count === undefined ? null : <span>{count}</span>}
        </div>
        <button aria-expanded={!collapsed} aria-label={collapsed ? "文脈パネルを開く" : "文脈パネルを閉じる"} onClick={toggle} type="button">
          <CaretLeft aria-hidden size={17} />
        </button>
      </header>
      <div className="ui-context-panel__body">{children}</div>
    </div>
  );
}
