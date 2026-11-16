import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function settledScroll(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    let last = scrollY, stable = 0;
    const check = () => { stable = scrollY === last ? stable + 1 : 0; last = scrollY; if (stable >= 8) resolve(); else requestAnimationFrame(check); };
    requestAnimationFrame(check);
  }));
}
const landing = "/my-impact-director/";
const workspace = "/my-impact-director/workspace/#assessment";
const account = { id: "director-qa-alice", name: "Alice QA", email: "alice@example.invalid", organisation: "Test organisation" };
async function accountState(page: Page, signedIn = false) {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn, account: signedIn ? account : null, progress: {} } }));
  await page.route("**/api/onboarding/context/**", route => route.fulfill({ json: { context: null } }));
}

test("public service, prices, photographs and mobile layout are accessible", async ({ page }) => {
  await accountState(page);
  await page.goto(landing);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Impact Director.Without thefull-time salary.");
  const plans = page.getByRole("list", { name: "Indicative monthly support options" });
  await expect(plans.getByRole("listitem")).toHaveCount(5);
  for (const price of ["£0", "£49", "£149", "£495", "£1,500+"]) await expect(plans.getByText(price, { exact: true })).toBeVisible();
  await expect(page.getByText(/Indicative monthly pricing/)).toBeVisible();
  await expect(page.locator("main img[src*='cow']")).toHaveCount(0);
  await expect(page.getByText(/Less “ask AI”/)).toHaveCount(0);
  for (const photo of await page.locator("main img").all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveJSProperty("complete", true);
    expect(await photo.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const accessibility = await new AxeBuilder({ page }).include("main").analyze();
  expect(accessibility.violations).toEqual([]);
});

test("free assessment keeps its destination through central registration", async ({ page }) => {
  await accountState(page);
  await page.goto(landing);
  const link = page.getByRole("link", { name: "Explore Our Free AI Assessment" });
  await expect(link).toHaveAttribute("href", `/get-started/?next=${encodeURIComponent(workspace)}`);
  await link.click();
  await expect(page).toHaveURL(/\/get-started\/\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(workspace);
});

test("existing accounts go directly to the assessment and tools dashboard", async ({ page }) => {
  await accountState(page, true);
  await page.goto(landing);
  await expect(page.getByRole("link", { name: "Explore Our Free AI Assessment" })).toHaveAttribute("href", workspace);
  await expect(page.getByRole("link", { name: "Check Your AI Readiness — Free" })).toHaveAttribute("href", workspace);
  await expect(page.getByRole("link", { name: "Explore the Free Tools" })).toHaveAttribute("href", "/dashboard/");
});

test("monthly support and human enquiries do not require registration", async ({ page }) => {
  await accountState(page);
  await page.goto(landing);
  await page.getByRole("link", { name: "See Our Monthly Support" }).click();
  await expect(page).toHaveURL(/#director-pricing$/);
  await expect(page.locator("#director-pricing")).toBeInViewport();
  for (const link of await page.getByRole("link", { name: /Talk to Marcus|Let’s Talk About Your Organisation/ }).all()) {
    expect(await link.getAttribute("href")).toMatch(/^mailto:marcus@mysocialimpact.org/);
  }
  await expect(page.getByRole("link", { name: "Explore the Free Tools" })).toHaveAttribute("href", "/get-started/?next=%2Fdashboard%2F");
  await expect(page.getByRole("link", { name: "More about the specialist service" })).toHaveAttribute("href", "https://www.myimpactdirector.com/");
});

test("existing inline booking opens, preserves edits and confirms only after success", async ({ page }) => {
  await accountState(page, true);
  const start = "2026-12-10T10:00:00.000Z";
  let requests = 0;
  await page.route("**/api/booking/availability/**", route => route.fulfill({ json: { slots: [{ start, end: "2026-12-10T10:10:00.000Z" }] } }));
  await page.route("**/api/booking/free/**", async route => {
    requests++;
    const body = route.request().postDataJSON();
    expect(body.source).toBe("my-impact-director");
    expect(body.serviceId).toBe("free");
    expect(body.email).toBe(account.email);
    expect(body.evidence).toContain("Impact priorities");
    expect(body.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
    await route.fulfill(requests === 1 ? { status: 503, json: { error: "Test calendar unavailable." } } : { json: { start, invitationSent: false } });
  });
  await page.goto(landing);
  await expect(page.locator("#director-booking-panel")).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Book a 10-minute chat", exact: false });
  await trigger.click();
  const panel = page.locator("#director-booking-panel");
  await expect(panel).toBeVisible();
  await settledScroll(page);
  await expect(panel.getByLabel("Your name")).toHaveValue(account.name);
  await panel.getByLabel("What would you like to discuss?").fill("Impact priorities");
  await panel.getByRole("button", { name: "Close ×" }).click();
  await expect(panel).toHaveCount(0);
  await trigger.click();
  await settledScroll(page);
  await expect(panel.getByLabel("What would you like to discuss?")).toHaveValue("Impact priorities");
  await panel.getByRole("combobox").selectOption(start);
  expect((await new AxeBuilder({ page }).include("#director-booking-panel").analyze()).violations).toEqual([]);
  await panel.getByRole("button", { name: "Book my free introduction" }).click();
  await expect(panel.getByRole("alert")).toContainText("Test calendar unavailable.");
  await expect(page.getByText("You’re booked.")).toHaveCount(0);
  await panel.getByRole("button", { name: "Book my free introduction" }).click();
  await expect(panel.getByText("You’re booked.")).toBeVisible();
  await expect(panel.getByText(/Email invitation delivery has not been confirmed/)).toBeVisible();
  expect(requests).toBe(2);
});

test("keyboard, reduced motion and fixed actions remain usable", async ({ page }) => {
  await accountState(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(landing);
  const support = page.getByRole("link", { name: "See Our Monthly Support" });
  await support.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#director-pricing$/);
  const button = page.getByRole("button", { name: "Book a 10-minute chat", exact: false });
  const bounds = await button.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(bounds!.height).toBeGreaterThanOrEqual(40);
});

test("direct anonymous tool URLs and API remain protected", async ({ request }) => {
  const page = await request.get("/my-impact-director/workspace/", { maxRedirects: 0 });
  expect(page.status()).toBe(307);
  expect(page.headers().location).toContain("/get-started/?next=");
  expect((await request.get("/api/impact-director/")).status()).toBe(401);
});


test("tablet tabs stay within the viewport and remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await accountState(page);
  await page.goto(landing);
  await expect(page.getByRole("link", { name: "Explore Our Free AI Assessment" })).toHaveAttribute("href", `/get-started/?next=${encodeURIComponent(workspace)}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  await expect(tabs.getByRole("link", { name: /My Impact Director/ })).toBeVisible();
});
