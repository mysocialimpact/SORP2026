import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("portrait convergence waits for the portraits, settles once, and stays behind the people", async ({ page }, testInfo) => {
  await page.goto("/");
  const stage = page.locator("[data-portrait-stage]");
  await expect(stage).toHaveAttribute("data-portrait-motion", "waiting");
  expect(await stage.locator("svg > g").evaluateAll(groups => groups.every(group => getComputedStyle(group).opacity === "0"))).toBe(true);
  await stage.evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 170, behavior: "instant" }));
  await expect(stage).toHaveAttribute("data-portrait-motion", "playing");
  await expect.poll(() => stage.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length), { timeout: 5000 }).toBe(0);
  const geometry = await stage.evaluate(element => {
    const images = [...element.querySelectorAll("img")];
    const artwork = element.querySelector("svg")!;
    return {
      background: getComputedStyle(element).backgroundColor,
      imagesLoaded: images.every(img => img.complete && img.naturalWidth > 0),
      imagesAboveArt: images.every(img => Number(getComputedStyle(img).zIndex) > Number(getComputedStyle(artwork).zIndex)),
      mask: getComputedStyle(images[0]).maskImage,
      artHidden: artwork.getAttribute("aria-hidden"),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(geometry.background).toBe("rgb(233, 223, 210)");
  expect(geometry.imagesLoaded).toBe(true);
  expect(geometry.imagesAboveArt).toBe(true);
  expect(geometry.mask).toContain("marcus-outdoor-silhouette.svg");
  expect(geometry.artHidden).toBe("true");
  expect(geometry.overflow).toBe(false);
  await stage.screenshot({ path: testInfo.outputPath("portraits-settled.png") });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await stage.scrollIntoViewIfNeeded();
  expect(await stage.evaluate(element => element.getAnimations({ subtree: true }).filter(a => a.playState === "running").length)).toBe(0);
  const accessibility = await new AxeBuilder({ page }).include("#our-ambition").analyze();
  expect(accessibility.violations).toEqual([]);
});

test("reduced motion shows the finished artwork without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stage = page.locator("[data-portrait-stage]");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-portrait-motion", "complete");
  expect(await stage.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await stage.locator("svg > g").evaluateAll(groups => groups.every(group => Number(getComputedStyle(group).opacity) > 0))).toBe(true);
});

test("changing motion preference cancels the effect and does not replay it", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-portrait-stage]");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-portrait-motion", "playing");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stage).toHaveAttribute("data-portrait-motion", "complete");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await stage.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test("without JavaScript the photographs and finished composition remain visible", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  await page.goto(String(testInfo.project.use.baseURL));
  const stage = page.locator("[data-portrait-stage]");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage.getByAltText("Marcus Warry")).toBeVisible();
  await expect(stage.getByAltText("Dr Chris Arnold")).toBeVisible();
  expect(await stage.locator("svg > g").evaluateAll(groups => groups.every(group => Number(getComputedStyle(group).opacity) > 0))).toBe(true);
  await context.close();
});
