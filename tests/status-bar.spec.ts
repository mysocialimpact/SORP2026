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
  await expect(bar).toContainText("Control Centre");
  await expect(bar).not.toContainText("3 AI questions");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("verified founder sees management destinations from public pages, without changing customer navigation", async ({ page }) => {
  let founder = true;
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: {
    signedIn: true,
    platformAccess: { founder },
  } }));
  await page.goto("/ask-sorp/");
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  await expect(tabs.locator(".is-ask")).toHaveAttribute("href", "/founder/#askSorp");
  await expect(tabs.locator(".is-ready")).toHaveAttribute("href", "/founder/#readiness");
  await expect(tabs.locator(".is-reports")).toHaveAttribute("href", "/founder/#impactReports");
  await expect(tabs.locator(".is-excellence")).toHaveAttribute("href", "/founder/#excellence");
  await expect(tabs.locator(".is-director")).toHaveAttribute("href", "/founder/#impactDirector");
  await expect(tabs.locator(".is-account")).toContainText("Manage Accounts");
  await expect(tabs.locator(".is-account")).toHaveAttribute("href", "/founder/#organisations");
  await expect(page.getByRole("link", { name: "Founder Dashboard" })).toHaveAttribute("href", "/founder/");
  founder = false;
  await page.reload();
  await expect(tabs.locator(".is-ask")).toHaveAttribute("href", "/ask-sorp/");
  await expect(tabs.locator(".is-account")).toHaveAttribute("href", "/settings/");
});

test("founder can deliberately view the customer dashboard and return to the control centre", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => {
    if (route.request().method() === "POST") return route.fulfill({ json: {} });
    return route.fulfill({ json: {
      signedIn: true,
      account: { id: "founder-test", name: "Marcus Test", email: "founder@example.invalid", organisation: "Test CIO" },
      platformAccess: { founder: true, memberships: [] },
      progress: {},
    } });
  });
  await page.route("**/api/impact-director/**", route => route.fulfill({ json: { progress: null } }));
  await page.goto("/dashboard/?mode=customer");
  await expect(page).toHaveURL(/\/dashboard\/\?mode=customer/);
  await expect(page.getByRole("heading", { name: "Where you are." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Founder Control Centre" }).first()).toHaveAttribute("href", "/founder/");
  await expect(page.getByRole("navigation", { name: "SORP2026 products" }).locator(".is-ready")).toHaveAttribute("href", "/are-you-sorp-ready/");
  await page.goto("/dashboard/");
  await expect(page).toHaveURL(/\/founder\//);
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
