import { describe, expect, test } from "bun:test";

import { readContextPanelPreference, writeContextPanelPreference } from "@/components/app-shell/layout-preferences";

function memoryStorage(entries: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe("context panel layout preference", () => {
  test("migrates the legacy preference into the v2 layout namespace", () => {
    const storage = memoryStorage({ "next-moodle:studio-ledger:context:course": "collapsed" });
    expect(readContextPanelPreference(storage, "course")).toBe(true);
    expect(storage.values.get("next-moodle:layout:v2:context:course")).toBe("collapsed");
  });

  test("preserves an explicit expanded preference", () => {
    const storage = memoryStorage();
    writeContextPanelPreference(storage, "messages", false);
    expect(readContextPanelPreference(storage, "messages")).toBe(false);
  });
});
