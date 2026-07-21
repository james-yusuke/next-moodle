import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function hideDevelopmentChrome(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

const VIEWPORTS = [
  { height: 900, name: "mobile", width: 375 },
  { height: 1024, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1280 },
] as const;

const THEMES = ["dark", "light"] as const;

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`renders the ${theme} showcase without overflow at ${viewport.width}px`, async ({
      page,
    }) => {
      // Given
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await page.addInitScript(
        ({ key, value }) => window.localStorage.setItem(key, value),
        { key: "next-moodle-theme", value: theme },
      );

      // When
      await page.goto("/dev/ui");
      await hideDevelopmentChrome(page);

      // Then
      await expect(page.getByTestId("ui-showcase")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".ui-button")).toHaveCount(12);
      await expect(page.locator(".ui-field")).toHaveCount(8);
      await expect(page.locator(".ui-badge")).toHaveCount(6);
      await expect(page.locator(".ui-notice")).toHaveCount(4);
      await expect(page.locator(".ui-skeleton")).toHaveCount(3);

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);

      const undersizedTargets = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button, input:not([type=checkbox]):not(.ui-sr-only)")).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width >= 44 && rect.height >= 44) {
            return [];
          }
          return [
            {
              height: rect.height,
              label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "input",
              width: rect.width,
            },
          ];
        }),
      );
      expect(undersizedTargets).toEqual([]);

      await page.screenshot({
        animations: "disabled",
        fullPage: true,
        path: `.omo/evidence/t1-design-tooling/screenshots/${viewport.name}-${theme}.png`,
      });
    });
  }
}

test("changes theme and exposes a visible keyboard focus treatment", async ({ page }) => {
  // Given
  await page.setViewportSize({ height: 900, width: 375 });
  await page.goto("/dev/ui");
  await hideDevelopmentChrome(page);
  const darkButton = page.getByRole("button", { name: "ダーク" }).first();

  // When
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(darkButton).toBeFocused();
  await page.keyboard.press("Enter");

  // Then
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(darkButton).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => darkButton.evaluate((element) => element.matches(":focus-visible")))
    .toBe(true);
  const focusRing = await darkButton.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  expect(focusRing).toContain("rgb(155, 165, 255)");
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: ".omo/evidence/t1-design-tooling/interaction/theme-focus.png",
  });
});

test("shows press feedback and returns to rest", async ({ page }) => {
  // Given
  await page.setViewportSize({ height: 720, width: 1280 });
  await page.goto("/dev/ui");
  await hideDevelopmentChrome(page);
  const primaryButton = page.getByRole("button", { name: "Save changes" });
  await primaryButton.scrollIntoViewIfNeeded();
  const box = await primaryButton.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  await page.screenshot({
    animations: "allow",
    path: ".omo/evidence/t1-design-tooling/interaction/button-rest.png",
  });

  // When
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  // Then
  await expect
    .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");
  await page.screenshot({
    animations: "allow",
    path: ".omo/evidence/t1-design-tooling/interaction/button-pressed.png",
  });
  await page.mouse.up();
  await expect
    .poll(() => primaryButton.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
  await page.screenshot({
    animations: "allow",
    path: ".omo/evidence/t1-design-tooling/interaction/button-settled.png",
  });
});
