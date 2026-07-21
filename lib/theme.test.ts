import { describe, expect, test } from "bun:test";
import { parseThemeMode, resolveThemeMode } from "./theme";

describe("theme boundary", () => {
  test("returns a supported mode when persisted input is valid", () => {
    // Given
    const persistedValue: unknown = "light";

    // When
    const mode = parseThemeMode(persistedValue);

    // Then
    expect(mode).toBe("light");
  });

  test("falls back to dark when persisted input is malformed", () => {
    // Given
    const persistedValue: unknown = "sepia";

    // When
    const mode = parseThemeMode(persistedValue);

    // Then
    expect(mode).toBe("dark");
  });

  test("resolves system mode from the active media preference", () => {
    // Given
    const systemPrefersDark = false;

    // When
    const resolved = resolveThemeMode("system", systemPrefersDark);

    // Then
    expect(resolved).toBe("light");
  });

  test("keeps an explicit mode regardless of the media preference", () => {
    // Given
    const systemPrefersDark = true;

    // When
    const resolved = resolveThemeMode("light", systemPrefersDark);

    // Then
    expect(resolved).toBe("light");
  });
});
