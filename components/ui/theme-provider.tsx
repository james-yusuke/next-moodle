"use client";

import styles from "./theme-provider.module.css";
import { Desktop, Moon, Sparkle, Sun } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { classNames } from "./class-names";
import {
  parseThemeMode,
  resolveThemeMode,
  THEME_MODES,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import type { ThemeMode } from "@/lib/theme";

type ThemeContextValue = Readonly<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}>;

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

class MissingThemeProviderError extends Error {
  constructor() {
    super("ThemeControl must be rendered inside ThemeProvider");
    this.name = "MissingThemeProviderError";
  }
}

function updateDocumentTheme(mode: ThemeMode, systemPrefersDark: boolean) {
  const resolved = resolveThemeMode(mode, systemPrefersDark);
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.resolvedTheme = resolved;
  root.style.colorScheme = resolved;
}

const THEME_CHANGE_EVENT = "next-moodle:theme-change";

function getClientThemeSnapshot(): ThemeMode {
  return parseThemeMode(document.documentElement.dataset.theme);
}

function getServerThemeSnapshot(): ThemeMode {
  return "dark";
}

function subscribeToTheme(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = (event: MediaQueryListEvent) => {
    const current = getClientThemeSnapshot();
    updateDocumentTheme(current, event.matches);
    listener();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }
    const nextMode = parseThemeMode(event.newValue);
    updateDocumentTheme(nextMode, media.matches);
    listener();
  };

  media.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  return () => {
    media.removeEventListener("change", handleMediaChange);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  };
}

function setPersistedTheme(nextMode: ThemeMode) {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  updateDocumentTheme(nextMode, systemPrefersDark);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const mode = useSyncExternalStore(
    subscribeToTheme,
    getClientThemeSnapshot,
    getServerThemeSnapshot,
  );

  const value = useMemo(() => ({ mode, setMode: setPersistedTheme }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const THEME_LABELS = {
  system: "自動",
  light: "ライト",
  dark: "ダーク",
  neon: "ネオン",
} as const satisfies Record<ThemeMode, string>;

function ThemeGlyph({ mode }: Readonly<{ mode: ThemeMode }>) {
  switch (mode) {
    case "system":
      return <Desktop aria-hidden size={17} weight="regular" />;
    case "light":
      return <Sun aria-hidden size={17} weight="regular" />;
    case "dark":
      return <Moon aria-hidden size={17} weight="regular" />;
    case "neon":
      return <Sparkle aria-hidden size={17} weight="regular" />;
  }
}

export function ThemeControl() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new MissingThemeProviderError();
  }

  return (
    <div aria-label="表示テーマ" className={styles.themeControl!} role="group">
      {THEME_MODES.map((themeMode) => (
        <button
          aria-pressed={context.mode === themeMode}
          className={classNames(
            styles.themeControlItem!,
            context.mode === themeMode && styles.style1!,
          )}
          key={themeMode}
          onClick={() => context.setMode(themeMode)}
          type="button"
        >
          <span aria-hidden className={styles.style2!}><ThemeGlyph mode={themeMode} /></span>
          <span className={styles.style3!}>{THEME_LABELS[themeMode]}</span>
        </button>
      ))}
    </div>
  );
}
