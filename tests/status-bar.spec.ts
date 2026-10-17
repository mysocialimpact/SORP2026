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
  await expect(bar).toContainText("Build");
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
  expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(boxes[1]!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("an isolated preview identifies the environment separately from the account", async ({ page }) => {
  test.skip(process.env.EXPECT_ISOLATED_PREVIEW !== "true", "Runs against the isolated preview build");
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: { signedIn: false } }));
  await page.goto("/");
  const bar = page.getByLabel("Website build information and account status");
  await expect(bar.locator(".build-isolation-note")).toHaveText("PREVIEW · Synthetic services · AI & payments off");
  await expect(bar.locator(".build-account-full")).toHaveText("VISITOR · Register to use tools");
});
