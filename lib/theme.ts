import { z } from "zod";

export const THEME_MODES = ["system", "light", "dark", "neon"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
// "neon" resolves to the "dark" native color-scheme; its distinct look comes
// from data-theme overrides in globals.css, not a separate resolved value.
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "next-moodle-theme";

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const key = "next-moodle-theme";
  const saved = window.localStorage.getItem(key);
  const mode = saved === "light" || saved === "dark" || saved === "system" || saved === "neon" ? saved : "dark";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "neon" || mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.resolvedTheme = resolved;
  root.style.colorScheme = resolved;
})();`;

const themeModeSchema = z.enum(THEME_MODES);

export function parseThemeMode(value: unknown): ThemeMode {
  const result = themeModeSchema.safeParse(value);
  return result.success ? result.data : "dark";
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedTheme {
  switch (mode) {
    case "system":
      return systemPrefersDark ? "dark" : "light";
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "neon":
      return "dark";
  }
}