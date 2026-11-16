import { test, expect } from "@playwright/test";

test("homepage public beta message is slim, single-line and scrolls away", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator(".public-beta-bar");
  await expect(bar).toContainText("SORP 2026 · Public Beta");
  await expect(bar).toHaveCSS("position", "static");
  expect((await bar.boundingBox())!.height).toBeLessThan(45);

  const note = page.locator(".homepage-beta-note");
  await expect(note).toContainText("Our public beta is now open.");
  await expect(note).toContainText("one charity");
  const spacing = await page.evaluate(() => {
    const intro = document.querySelector(".homepage-hero-definition")!.getBoundingClientRect();
    const beta = document.querySelector(".homepage-beta-note")!.getBoundingClientRect();
    return beta.top - intro.bottom;
  });
  expect(spacing).toBeGreaterThanOrEqual(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.evaluate(() => scrollTo(0, 500));
  const scrolledBar = (await bar.boundingBox())!;
  expect(scrolledBar.y + scrolledBar.height).toBeLessThan(0);
});

test("other public pages use the same discreet beta status", async ({ page }) => {
  await page.goto("/our-mission/");
  const bar = page.locator(".public-beta-bar");
  await expect(bar).toContainText("SORP 2026 · Public Beta");
  await expect(bar).not.toContainText("FREE ACCOUNTS NOW AVAILABLE");
  expect((await bar.boundingBox())!.height).toBeLessThan(45);
});
