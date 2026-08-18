"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_PREFERENCE_EVENT = "next-moodle-local-preference";
const volatilePreferences = new Map<string, string>();

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCAL_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCAL_PREFERENCE_EVENT, onStoreChange);
  };
}

export function useLocalStorageValue(key: string, fallback: string): readonly [string, (value: string) => void] {
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key) ?? volatilePreferences.get(key) ?? fallback;
    } catch {
      return volatilePreferences.get(key) ?? fallback;
    }
  }, [fallback, key]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((next: string) => {
    volatilePreferences.set(key, next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Keep the preference in memory when the browser disables persistent storage.
    }
    window.dispatchEvent(new Event(LOCAL_PREFERENCE_EVENT));
  }, [key]);
  return [value, setValue] as const;
}
