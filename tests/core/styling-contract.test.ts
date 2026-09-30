import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });
}

describe("styling and feature boundaries", () => {
  test("uses CSS Modules without a Tailwind build dependency", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const globals = readFileSync(join(root, "app/globals.css"), "utf8");
    const componentSources = [join(root, "app"), join(root, "components")]
      .flatMap(sourceFiles)
      .map((path) => readFileSync(path, "utf8"));

    expect(dependencies).not.toHaveProperty("tailwindcss");
    expect(dependencies).not.toHaveProperty("@tailwindcss/postcss");
    expect(existsSync(join(root, "postcss.config.mjs"))).toBe(false);
    expect(globals).not.toMatch(/@(?:theme|apply)\b/);
    expect(componentSources.some((source) => /className\s*=\s*["']/.test(source))).toBe(false);
  });

  test("does not ship the removed writing-assistance implementation", () => {
    expect(existsSync(join(root, "lib/ai"))).toBe(false);
    expect(existsSync(join(root, "components/assignments/ai-assist-panel.tsx"))).toBe(false);
    expect(existsSync(join(root, "app/api/assignments/[cmid]/ai/review/route.ts"))).toBe(false);
  });
});
