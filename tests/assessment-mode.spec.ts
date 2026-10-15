import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const viewports = [
  { label: "large desktop", width: 1920, height: 1080 },
  { label: "short laptop", width: 1366, height: 768 },
  { label: "small mobile", width: 360, height: 740 },
  { label: "mobile landscape", width: 844, height: 390 },
];

async function expectFocusedShell(page: import("@playwright/test").Page) {
  await expect(page.locator(".platform-sticky-navigation")).toBeHidden();
  await expect(page.locator(".scr-assessment-header")).toBeVisible();
  await expect(page.locator(".scr-top nav li")).toHaveCount(8);
  await expect(page.locator(".scr-bottom")).toHaveCSS("position", "fixed");
  await expect(page.getByRole("link", { name: /Back to website/ })).toHaveAttribute("href", "/are-you-sorp-ready/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const header = (await page.locator(".scr-assessment-header").boundingBox())!;
  const exit = (await page.getByRole("link", { name: /Back to website/ }).boundingBox())!;
  const progress = (await page.locator(".scr-top").boundingBox())!;
  const actions = (await page.locator(".scr-bottom").boundingBox())!;
  expect(header.height).toBeLessThanOrEqual(60);
  expect(exit.width).toBeGreaterThanOrEqual(88);
  expect(exit.height).toBeGreaterThanOrEqual(40);
  expect(progress.y).toBeLessThanOrEqual(60);
  expect(actions.y + actions.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

for (const viewport of viewports) {
  test(`assessment mode remains focused at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/are-you-sorp-ready/review/?entry=intro");
    await expectFocusedShell(page);
    await expect(page.locator(".scr-top [aria-current=step]")).toContainText("Introduction");

    for (let step = 0; step < 4; step += 1) {
      const next = page.locator(".scr-bottom > div:last-child > button:not(.is-secondary)");
      await expect(next).toBeVisible();
      await next.click();
    }

    await expect(page.locator(".scr-top [aria-current=step]")).toContainText("Find charity");
    await expect(page.getByLabel("Charity name or number")).toBeVisible();
    await page.getByLabel("Charity name or number").fill("1165694");
    await expect(page.getByRole("button", { name: /FIND MY CHARITY/ }).last()).toBeEnabled();
    await expectFocusedShell(page);
  });
}

test("long recovery content keeps progress, controls and a comfortable scroll", async ({ page }) => {
  const saved = {
    sessionId: "assessment-mode-recovery",
    step: "tar-recovery",
    query: "1234567",
    candidate: {
      name: "Example Charity",
      registrationNumber: "1234567",
      entityType: "registered_charity",
      officialUrl: "https://example.org/charity",
      reportUrl: "https://example.org/report.pdf",
      website: "https://example.org",
    },
    state: { setup: { income: "tier1_high", jurisdiction: "ew" } },
    homeworkFailure: { reason: "The public report could not be downloaded.", incidentId: "TEST-1", recovery: "upload-report" },
  };
  await page.route("**/api/readiness-account", (route) => route.fulfill({ json: { signedIn: true, account: { name: "Test User", email: "test@example.org", position: "Trustee" } } }));
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: "msi-sorp-canonical-methodology-v1", value: saved });
  await page.goto("/are-you-sorp-ready/review/");
  await expectFocusedShell(page);
  await expect(page.locator(".scr-top [aria-current=step]")).toContainText("Published report");
  await expect(page.getByRole("heading", { name: /get the report and keep going/i })).toBeVisible();
  await expect(page.getByText("Your progress is saved. Try again or add the report PDF above.")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator(".scr-assessment-header")).toBeVisible();
  await expect(page.locator(".scr-top")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(".scr-assessment-header").include(".scr-top").include(".scr-bottom").analyze();
  expect(accessibility.violations).toEqual([]);
});
