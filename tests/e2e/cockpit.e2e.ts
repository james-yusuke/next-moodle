import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

async function signIn(page: import("@playwright/test").Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Moodleユーザー名").fill(username);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "Moodleでログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("student cockpit reads the mock Moodle core routes without exposing a token", async ({ page }) => {
  await signIn(page, "alice", "alice-password");

  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await page.goto("/courses");
  const aliceCourse = page.getByRole("link", {
    name: "Introduction to Marine Biology",
  });
  await expect(aliceCourse).toBeVisible();
  await aliceCourse.click();
  await expect(page.getByText("Tide pool field notes")).toBeVisible();
  await page.goto("/assignments/9101");
  await expect(page.getByRole("heading", { name: "Tide pool field notes" })).toBeVisible();
  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: /Notifications|通知/ })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("synthetic-alice-token");
});

test("a second fixture account cannot see Alice's courses", async ({ page }) => {
  await signIn(page, "bob", "bob-password");

  await page.goto("/courses");
  await expect(
    page.getByRole("link", { name: "Archives and Public Memory" }),
  ).toBeVisible();
  await expect(page.getByText("Introduction to Marine Biology")).toHaveCount(0);
});

test("assignment draft, confirmation, client PDF, and ICS stay usable", async ({ page }) => {
  await signIn(page, "alice", "alice-password");
  await page.goto("/assignments/9101");
  await expect(page.getByRole("button", { name: "提出を確定", exact: true })).toBeDisabled();
  const chooserReady = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "ファイルを選択", exact: true }).click();
  const chooser = await chooserReady;
  await chooser.setFiles({ buffer: Buffer.from("field notes"), mimeType: "text/plain", name: "notes.txt" });
  await expect(page.getByText("notes.txt")).toBeVisible();
  await expect(page.getByRole("button", { name: "提出を確定", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "提出を確定" }).click();
  await expect(page.getByText("この内容で提出を確定しますか？")).toBeVisible();
  await page.getByRole("button", { name: "戻る" }).click();

  await page.goto("/tools/pdf");
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 300]);
  const pdfBytes = await pdf.save();
  await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
    buffer: Buffer.from(pdfBytes), mimeType: "application/pdf", name: "one.pdf",
  });
  await expect(page.getByText("one.pdf")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDFをダウンロード" }).click();
  expect((await download).suggestedFilename()).toBe("combined.pdf");

  await page.goto("/calendar");
  const calendarDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: ".ics保存" }).click();
  expect((await calendarDownload).suggestedFilename()).toBe("learning-calendar.ics");
});
