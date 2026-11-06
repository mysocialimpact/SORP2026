import { test, expect } from "@playwright/test";

test("homepage public beta message is slim, single-line and scrolls away", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator(".public-beta-bar-home");
  await expect(bar).toHaveText("SORP 2026 · PUBLIC BETA · FREE ACCOUNTS NOW AVAILABLE");
  await expect(bar).toHaveCSS("position", "static");
  expect((await bar.boundingBox())!.height).toBeLessThan(45);

  const note = page.locator(".homepage-beta-note");
  await expect(note).toHaveText("Now in public beta. Charities and advisers can create a free account, start their readiness review and help shape what comes next.");
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

test("other public pages retain their existing announcement", async ({ page }) => {
  await page.goto("/our-mission/");
  const bar = page.locator(".public-beta-bar");
  await expect(bar).toContainText("Explore the platform. Tell us what you think. Help shape what comes next.");
  await expect(bar).not.toHaveClass(/public-beta-bar-home/);
});
