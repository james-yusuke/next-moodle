const CONTEXT_STORAGE_PREFIX = "next-moodle:layout:v2:context:";
const LEGACY_CONTEXT_STORAGE_PREFIX = "next-moodle:studio-ledger:context:";

type LayoutStorage = Pick<Storage, "getItem" | "setItem">;

export function contextPanelStorageKey(key: string): string {
  return `${CONTEXT_STORAGE_PREFIX}${key}`;
}

export function peekContextPanelPreference(storage: Pick<Storage, "getItem">, key: string): boolean {
  const current = storage.getItem(contextPanelStorageKey(key));
  const value = current ?? storage.getItem(`${LEGACY_CONTEXT_STORAGE_PREFIX}${key}`);
  return value === "collapsed";
}

export function readContextPanelPreference(storage: LayoutStorage, key: string): boolean {
  const currentKey = contextPanelStorageKey(key);
  const current = storage.getItem(currentKey);
  if (current !== null) return current === "collapsed";

  const legacy = storage.getItem(`${LEGACY_CONTEXT_STORAGE_PREFIX}${key}`);
  if (legacy === null) return false;
  storage.setItem(currentKey, legacy);
  return legacy === "collapsed";
}

export function writeContextPanelPreference(storage: LayoutStorage, key: string, collapsed: boolean): void {
  storage.setItem(contextPanelStorageKey(key), collapsed ? "collapsed" : "open");
}
