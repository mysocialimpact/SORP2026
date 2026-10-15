import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/are-you-sorp-ready/", "/ask-sorp/", "/charity-impact-reports/", "/social-impact-excellence/", "/my-impact-director/"];

test("switching folder tabs retains the account control and keeps the selected tab in view", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Visitor", email: "qa@example.invalid" }, progress: {} } }));
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  for (const path of ["/ask-sorp/", "/charity-impact-reports/", "/my-impact-director/", "/"]) {
    const tab = tabs.locator(`a[href="${path}"]`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await expect(tab).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "My Dashboard", exact: true })).toBeVisible();
    const box = (await tab.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});

for (const path of routes) test(`folder continuity and actions: ${path}`, async ({ page }, info) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ status: 401, json: { signedIn: false } }));
  await page.goto(path);
  const hero = page.locator("[data-folder-surface]");
  await expect(hero).toBeVisible();
  await expect(page.locator(".platform-sticky-navigation")).toHaveAttribute("data-beyond-hero", "false");
  await expect(page.locator(".product-folder-sheet-edge")).toHaveCSS("background-color", await hero.evaluate(el => getComputedStyle(el).backgroundColor));
  await expect(page.getByRole("navigation", { name: "On this page" })).toHaveCount(0);
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  await expect(tabs.getByRole("link")).toHaveCount(6);
  await expect(tabs.locator('[aria-current="page"]')).toHaveAttribute("href", path);
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>("[data-folder-surface]")!;
    const edge = document.querySelector<HTMLElement>(".product-folder-sheet-edge")!;
    return { gap: hero.getBoundingClientRect().top - edge.getBoundingClientRect().bottom,
      colour: getComputedStyle(hero).backgroundColor, edge: getComputedStyle(edge).backgroundColor,
      border: getComputedStyle(edge).borderTopWidth, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(geometry.gap).toBeCloseTo(0, 0);
  expect(geometry.colour).toBe(geometry.edge);
  expect(geometry.border).toBe("0px");
  expect(geometry.overflow).toBe(false);
  await page.screenshot({ path: info.outputPath("top.png") });
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: "instant" }));
  const sticky = page.locator(".platform-sticky-navigation");
  await expect(sticky).toHaveAttribute("data-compact", "true");
  await expect(sticky).toHaveAttribute("data-beyond-hero", "true");
  expect((await sticky.boundingBox())!.y).toBe(0);
  expect((await sticky.boundingBox())!.height).toBeLessThan(190);
  await expect(sticky.getByRole("link", { name: "Our Mission" })).toBeVisible();
  const bar = page.locator(".folder-action-bar");
  await expect(bar).toHaveCount(1);
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("link", { name: "Give feedback" })).toHaveAttribute("href", "#page-feedback");
  await expect(bar.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "#say-hello");
  const labels = await bar.getByRole("link").allTextContents();
  expect(labels.at(-2)).toContain("Give feedback");
  expect(labels.at(-1)).toContain("Talk to us");
  const box = (await bar.boundingBox())!;
  expect(box.y + box.height).toBeCloseTo(await page.evaluate(() => innerHeight), 0);
  await page.screenshot({ path: info.outputPath("scrolled.png") });
  if (info.project.name === "mobile") {
    const current = (await tabs.locator('[aria-current="page"]').boundingBox())!;
    expect(current.x).toBeGreaterThanOrEqual(-1);
    expect(current.x + current.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});

test("Home actions, keyboard access, reduced motion and non-product pages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const bar = page.getByRole("complementary", { name: "Page actions" });
  await expect(bar.getByRole("link", { name: /Start your free SORP review/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  const talk = bar.getByRole("link", { name: /Talk to us/ });
  await talk.focus();
  await expect(talk).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#say-hello/);
  await expect(page.locator("#say-hello")).toBeInViewport();
  const scan = await new AxeBuilder({ page }).include(".platform-sticky-navigation").include(".folder-action-bar").include(".shared-hello").analyze();
  expect(scan.violations).toEqual([]);
  await page.goto("/our-mission/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".folder-action-bar")).toHaveCount(1);
  await page.goto("/are-you-sorp-ready/review/?entry=intro");
  await expect(page.locator(".folder-action-bar")).toBeHidden();
});

test("the universal action follows real readiness progress and Say hello is shared once", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: true, account: { email: "qa@example.invalid" }, progress: { sessionId: "qa", step: "criterion" } } }));
  await page.goto("/");
  await expect(page.locator(".folder-action-bar").getByRole("link", { name: /Continue your SORP review/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/");
  await expect(page.locator(".shared-hello")).toHaveCount(1);
  await page.unroute("**/api/readiness-account/**");
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: true, account: { email: "qa@example.invalid" }, progress: { sessionId: "qa", step: "report" } } }));
  await page.reload();
  await expect(page.locator(".folder-action-bar").getByRole("link", { name: /View your SORP report/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/");
});
