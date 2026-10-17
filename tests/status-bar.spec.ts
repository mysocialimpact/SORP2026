import { expect, test } from "@playwright/test";

test("status bar updates from visitor to a verified founder and plan without overflowing", async ({ page }) => {
  let founder = false;
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: founder ? {
    signedIn: true,
    platformAccess: { founder: true, memberships: [{
      type: "Adviser", role: "owner",
      entitlement: { plan: "Adviser", status: "complimentary_partner", complimentaryEnd: null },
    }] },
  } : { signedIn: false } }));
  await page.goto("/");
  const bar = page.getByLabel("Website build information and account status");
  await expect(bar).toContainText("BETA");
  await expect(bar).toContainText("v1");
  await expect(bar).toContainText(/PRODUCTION|PREVIEW|DEVELOPMENT/);
  await expect(bar).toContainText("VISITOR");
  founder = true;
  await page.evaluate(() => window.dispatchEvent(new Event("sorp2026:account-changed")));
  await expect(bar).toContainText("FOUNDER");
  await expect(bar).toContainText("ADVISER PLAN");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the compact iPhone status remains legible and does not wrap or overlap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: {
    signedIn: true,
    platformAccess: { founder: false, memberships: [{ entitlement: { plan: "Plus", status: "standard" } }] },
  } }));
  await page.goto("/");
  const bar = page.getByLabel("Website build information and account status");
  await expect(bar).toBeVisible();
  await expect(bar.locator(".build-account-compact")).toHaveText("PLUS · 3 AI Qs");
  const boxes = await Promise.all([bar.locator(".build-release"), bar.locator(".build-account")].map(async locator => locator.boundingBox()));
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("an isolated preview identifies the environment separately from the account", async ({ page }) => {
  test.skip(process.env.EXPECT_ISOLATED_PREVIEW !== "true", "Runs against the isolated preview build");
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: { signedIn: false } }));
  await page.goto("/");
  const bar = page.getByLabel("Website build information and account status");
  await expect(bar.locator(".build-isolation-note")).toHaveText("PREVIEW · Synthetic services · AI & payments off");
  await expect(bar.locator(".build-account-full")).toHaveText("VISITOR · 3 free AI questions");
});
