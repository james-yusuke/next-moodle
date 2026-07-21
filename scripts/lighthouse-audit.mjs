import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { chromium } from "playwright";

const baseUrl = process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3100";
const username = process.env.LIGHTHOUSE_USER;
const password = process.env.LIGHTHOUSE_PASSWORD;
const outputDir = resolve(process.env.LIGHTHOUSE_OUTPUT_DIR ?? ".omo/evidence/lighthouse");
const port = 9_223;

if (username === undefined || password === undefined) {
  throw new Error("LIGHTHOUSE_USER and LIGHTHOUSE_PASSWORD are required.");
}

const profile = await mkdtemp(join(tmpdir(), "next-moodle-lighthouse-"));
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    "--disable-component-extensions-with-background-pages",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-default-browser-check",
    "--no-first-run",
  ],
  { stdio: "ignore" },
);

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

function categoryScores(result) {
  return Object.fromEntries(
    Object.entries(result.lhr.categories).map(([id, category]) => [id, category.score]),
  );
}

try {
  await waitForChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  if (context === undefined) throw new Error("Chrome context is unavailable.");
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Moodleユーザー名").fill(username);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "Moodleでログイン" }).click();
  await page.waitForURL(`${baseUrl}/dashboard`);

  await mkdir(outputDir, { recursive: true });
  const flags = {
    disableStorageReset: true,
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    output: "json",
    port,
  };
  const audits = [
    ["mobile", undefined],
    ["desktop", desktopConfig],
  ];
  const summary = {};
  for (const [mode, config] of audits) {
    const result = await lighthouse(`${baseUrl}/dashboard`, flags, config);
    if (result === undefined) throw new Error(`${mode} Lighthouse audit failed.`);
    await writeFile(join(outputDir, `${mode}.json`), result.report);
    summary[mode] = categoryScores(result);
  }
  console.log(JSON.stringify(summary));
  if (Object.values(summary).some((scores) => Object.values(scores).some((score) => score !== 1))) {
    process.exitCode = 1;
  }
  await browser.close();
} finally {
  if (chrome.exitCode === null) {
    chrome.kill("SIGTERM");
    await once(chrome, "exit");
  }
  await rm(profile, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
}
