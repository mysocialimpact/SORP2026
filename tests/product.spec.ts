import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function contrastRatio(locator: Locator) {
  return locator.evaluate((element) => {
    const channel = (value: number) => {
      const normalised = value / 255;
      return normalised <= 0.04045 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (colour: string) => {
      const [red, green, blue] = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel);
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const styles = getComputedStyle(element);
    const foreground = luminance(styles.color);
    const background = luminance(styles.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}

async function hasOpaqueBackground(locator: Locator) {
  return locator.evaluate((element) => {
    const colour = getComputedStyle(element).backgroundColor;
    const channels = colour.match(/[\d.]+/g)?.map(Number) ?? [];
    return colour !== "transparent" && (channels.length < 4 || channels[3] > 0.98);
  });
}

test("presentation and assessment remain on SORP2026", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/are-you-sorp-ready/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Are You\s*SORP Ready\?/);
  await expect(page.getByText("Find out how prepared your charity is for SORP 2026.")).toBeVisible();
  await expect(page.getByText("100% free. No obligation.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Charities", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accountants & Advisers", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your readiness score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your gaps and priorities" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your next steps" })).toBeVisible();
  const deck = page.locator(".sorp-film");
  await expect(deck).toHaveAttribute("data-ready", "true");
  await expect(deck.locator(".sf-chapters button")).toHaveCount(9);
  await expect(page.locator(".sr-more > details")).toHaveCount(1);
  await expect(page.locator(".sr-more > details")).not.toHaveAttribute("open", "");
  await page.locator(".sr-more summary").click();
  await expect(page.getByRole("heading", { name: "How your score works" })).toBeVisible();
  const fixedAction = page.locator(".folder-action-bar");
  await expect(fixedAction).toBeVisible();
  await expect(fixedAction.getByRole("link", { name: /Play Presentation/ })).toHaveAttribute("href", "/are-you-sorp-ready/presentation/");
  await expect(fixedAction.getByRole("link", { name: /Start Free Review/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  await expect(fixedAction.getByRole("link", { name: /Give Feedback/ })).toHaveAttribute("href", "#page-feedback");
  await expect(fixedAction.getByRole("link", { name: /Talk to Us/ })).toHaveAttribute("href", "#say-hello");
  await expect(fixedAction.getByRole("link")).toHaveText([/Play Presentation/, /Start Free Review/, /Give Feedback/, /Talk to Us/]);
  await expect(fixedAction).toHaveCSS("position", "fixed");
  const fixedBox = (await fixedAction.boundingBox())!;
  expect(fixedBox.height).toBeLessThanOrEqual(90);
  expect(Math.abs(fixedBox.y + fixedBox.height - page.viewportSize()!.height)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("sorp-ready-top.png") });
  await fixedAction.screenshot({ path: testInfo.outputPath("sorp-ready-action.png") });
  await page.screenshot({ path: testInfo.outputPath("sorp-ready-page.png"), fullPage: true });

  await deck.locator(".sf-chapters button").nth(8).click();
  const start = deck.getByRole("link", { name: "START THE FREE REVIEW" });
  await expect(start).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  await start.click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/review\/?$/);
  await expect(page.locator(".si-welcome")).toBeVisible();
  await expect(page.locator(".platform-sticky-navigation")).toBeHidden();
  await expect(page.locator(".scr-assessment-header")).toContainText("SORP 2026");
  await expect(page.locator(".scr-assessment-header")).toContainText("Are You SORP Ready?");
  await expect(page.getByRole("link", { name: /Back to website/ })).toHaveAttribute("href", "/are-you-sorp-ready/");
  await expect(page.locator(".scr-top nav li")).toHaveCount(8);
  await expect(page.locator(".scr-top [aria-current=step]")).toContainText("Introduction");
  for (const selector of [".scr-assessment-header", ".scr-top", ".scr-bottom"]) {
    expect(await hasOpaqueBackground(page.locator(selector))).toBeTruthy();
  }
  const shellHeight = await page.locator(".scr-assessment-header, .scr-top").evaluateAll((elements) => elements.reduce((height, element) => height + element.getBoundingClientRect().height, 0));
  expect(shellHeight).toBeLessThanOrEqual(110);
  const forwardMotion = await page.locator(".scr-forward-trace[data-measured]").evaluate((element) => {
    const styles = getComputedStyle(element);
    return { name: styles.animationName, duration: Number.parseFloat(styles.animationDuration) };
  });
  expect(forwardMotion.name).toContain("scr-forward-travel");
  expect(forwardMotion.duration).toBeGreaterThan(0);
  expect(errors.filter((message) => message !== "Failed to load Stripe.js")).toEqual([]);

  await page.screenshot({
    path: `test-results/product-${testInfo.project.name}.png`,
    fullPage: true,
  });

  for (let screen = 0; screen < 4; screen += 1) {
    const primary = page.locator(".scr-bottom > div:last-child > button:not(.is-secondary)");
    await expect(primary).toBeVisible();
    await expect(primary).toBeEnabled();
    expect(await contrastRatio(primary)).toBeGreaterThanOrEqual(4.5);
    await primary.click();
  }
  await expect(page.locator(".scr-top [aria-current=step]")).toContainText("Find charity");
  await page.locator(".scr-find input").fill("1165694");
  const findCharity = page.getByRole("button", { name: /FIND MY CHARITY/ });
  await expect(findCharity).toHaveCount(2);
  for (const button of await findCharity.all()) {
    await expect(button).toBeEnabled();
    expect(await contrastRatio(button)).toBeGreaterThanOrEqual(4.5);
  }
});

test("presentation mode uses the focused product shell", async ({ page }) => {
  await page.goto("/are-you-sorp-ready/");
  await page.locator(".sr-hero-actions").getByRole("link", { name: /Play Presentation/ }).click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/presentation\/$/);
  await expect(page.locator(".platform-sticky-navigation")).toBeHidden();
  await expect(page.locator(".scr-assessment-header")).toContainText("SORP 2026");
  await expect(page.locator(".scr-assessment-header")).toContainText("Are You SORP Ready?");
  const back = page.getByRole("link", { name: "Back to website" });
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("href", "/are-you-sorp-ready/");
  await expect(page.locator(".sorp-film")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".sf-chapters button")).toHaveCount(9);
  await expect(page.locator(".folder-action-bar")).toBeHidden();
  await expect(page.locator(".page-feedback")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.locator(".sorp-film")).toHaveAttribute("data-slide", "1");
  await back.click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/$/);
});

test("readiness feedback controls do not overlap at desktop, tablet or mobile widths", async ({ page }) => {
  await page.route("**/api/continuous-improvement/**", route => route.fulfill({ status: 201, json: { accepted: true, id: "readiness-feedback" } }));
  for (const viewport of [{ width: 1440, height: 900 }, { width: 834, height: 1112 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/are-you-sorp-ready/#page-feedback");
    const section = page.locator(".page-feedback");
    const heading = (await section.locator(".page-feedback-heading").boundingBox())!;
    const rating = (await section.locator(".page-feedback-rating").boundingBox())!;
    const comment = (await section.locator("textarea").boundingBox())!;
    const separated = (left: typeof heading, right: typeof heading) =>
      left.x + left.width <= right.x + 1 || right.x + right.width <= left.x + 1 ||
      left.y + left.height <= right.y + 1 || right.y + right.height <= left.y + 1;
    expect(separated(heading, rating)).toBe(true);
    expect(separated(rating, comment)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const star of await section.getByRole("radio").all()) {
      const box = (await star.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }

  const section = page.locator(".page-feedback");
  await section.getByRole("radio", { name: "5 stars" }).click();
  await section.getByLabel("Anything you’d like to add? Optional").fill("Clear and easy to use.");
  await section.getByRole("button", { name: "Submit feedback →" }).click();
  await expect(section.getByText("Your feedback has been received.")).toBeVisible();
});

test("destination APIs fail safely without production credentials", async ({ request }) => {
  const account = await request.get("/api/readiness-account");
  expect(account.status()).toBe(503);
  await expect(account.json()).resolves.toEqual({
    error: "The existing SORP service connection is temporarily unavailable.",
  });

  const payment = await request.post("/api/sorp-payments/checkout", {
    data: { paymentType: "voluntary_support", amountMinor: 500 },
  });
  expect(payment.status()).toBe(503);
  await expect(payment.json()).resolves.toEqual({
    error: "The existing SORP service connection is temporarily unavailable.",
  });

  const booking = await request.get("/api/booking/availability?service=initial");
  expect(booking.status()).toBe(503);
  await expect(booking.json()).resolves.toEqual({
    error: "The existing SORP service connection is temporarily unavailable.",
  });
});
