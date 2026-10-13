import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("hero explains the platform, keeps its identity and preserves the footer", async ({ page }, testInfo) => {
  await page.goto("/");
  const hero = page.locator(".gateway-home-cover");
  await expect(hero).toContainText("An independent online platform");
  await expect(hero).toContainText("Free tools. Affordable expertise.");
  await expect(hero).toContainText("charities and their advisers");
  await expect(hero).toContainText("UK-based social enterprise initiative");
  await expect(hero.getByRole("img", { name: "My Social Impact" })).toBeVisible();
  await expect(page.locator("#home-vision-title")).toHaveText("Imagine a world where social impact was taken as seriously as financial performance.");
  await expect(page.locator(".gateway-tagline")).toHaveText("REPORTING FOR GREATER IMPACT");
  await expect(page.locator(".gateway-tagline")).toBeVisible();
  await expect(page.locator(".gateway-footer-intro")).toHaveCount(0);
  await hero.screenshot({ path: testInfo.outputPath("hero.png") });
  const results = await new AxeBuilder({ page }).include(".gateway-home-cover").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("small iPhone keeps the tagline and reduced-motion layout readable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".gateway-tagline")).toBeVisible();
  await expect(page.locator(".homepage-editorial")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("platform text uses upright sans-serif without horizontal overflow", async ({ page }, testInfo) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: false } }));
  await page.route("https://asksorp.mysocialimpact.org/**", route => route.abort());
  for (const path of ["/", "/are-you-sorp-ready/", "/ask-sorp/", "/charity-impact-reports/", "/social-impact-excellence/", "/purpose-works/", "/my-impact-director/", "/our-mission/", "/contact/", "/login/"]) {
    await page.goto(path);
    const failures = await page.locator("main, main *, .gateway-header *").evaluateAll(elements =>
      elements.filter(el => Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) && el.getBoundingClientRect().width)
        .filter(el => !getComputedStyle(el).fontFamily.includes("DM Sans") || getComputedStyle(el).fontStyle !== "normal")
        .map(el => el.tagName + "." + el.className));
    expect(failures, path).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(path.replaceAll("/", "_") + ".png") });
  }
});
