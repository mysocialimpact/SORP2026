import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type AccountFixture = { signedIn: boolean; writes: unknown[] };

async function mockAccount(page: Page, signedIn = true, onLogout?: (route: Route, state: AccountFixture) => Promise<void>) {
  const state: AccountFixture = { signedIn, writes: [] };
  // Keep every API request local to the browser fixture, including page analytics.
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, "");
    if (path === "/api/readiness-account") {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        state.writes.push(body);
        if (body.action === "logout") {
          if (onLogout) return onLogout(route, state);
          state.signedIn = false;
          return route.fulfill({ json: { signedOut: true } });
        }
        return route.fulfill({ status: 400, json: { error: "Unexpected account action in logout test." } });
      }
      return route.fulfill({ json: state.signedIn ? {
        signedIn: true,
        account: { id: "logout-qa", name: "Logout Test User", email: "logout@example.invalid", organisation: "Test Charity" },
        platformAccess: { founder: false, memberships: [] },
      } : { signedIn: false } });
    }
    return route.fulfill({ json: {} });
  });
  return state;
}

test("My Account logout is accessible, prevents repeat submission and resets account navigation", async ({ page }, testInfo) => {
  let releaseLogout!: () => void;
  const pending = new Promise<void>(resolve => { releaseLogout = resolve; });
  const state = await mockAccount(page, true, async (route, account) => {
    await pending;
    account.signedIn = false;
    await route.fulfill({ json: { signedOut: true } });
  });
  if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/settings/");
  const actions = page.locator(".settings-account-actions");
  const button = actions.getByRole("button", { name: "Log out", exact: true });
  await expect(button).toBeVisible();
  await expect(button).toBeInViewport({ ratio: 1 });
  const bounds = await button.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  // Viewport intersection alone does not detect a fixed banner covering the control.
  expect(await button.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit === element || element.contains(hit);
  }), "Log out must be unobstructed before focus or scrolling").toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include(".settings-account-actions").analyze()).violations).toEqual([]);

  await actions.getByRole("link", { name: /Back to My Dashboard/ }).focus();
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  expect(await button.evaluate(element => {
    const style = getComputedStyle(element);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  })).toBe(true);
  await page.locator(".settings-header").screenshot({ path: testInfo.outputPath("my-account-logout.png") });
  await page.keyboard.press("Enter");
  const pendingButton = actions.getByRole("button", { name: "Logging out…", exact: true });
  await expect(pendingButton).toBeDisabled();
  await expect(pendingButton).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect.poll(() => state.writes).toEqual([{ action: "logout" }]);
  releaseLogout();

  await expect(page).toHaveURL(new URL("/", page.url()).href);
  await expect(page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Your account" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "SORP2026 products" })).toContainText("Let’s Get Started");
  await page.goto("/settings/");
  await expect(page.getByRole("heading", { name: "Sign in to manage Settings." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out", exact: true })).toHaveCount(0);
  await expect(page.getByText("logout@example.invalid", { exact: true })).toHaveCount(0);
});

for (const failure of ["HTTP", "network"] as const) {
  test(`logout ${failure} failure stays on My Account and allows retry`, async ({ page }) => {
    const state = await mockAccount(page, true, async (route, account) => {
      if (account.writes.length === 1) {
        if (failure === "network") return route.abort("failed");
        return route.fulfill({ status: 503, json: { error: "Unavailable" } });
      }
      account.signedIn = false;
      await route.fulfill({ json: { signedOut: true } });
    });
    await page.goto("/settings/");
    const button = page.getByRole("button", { name: "Log out", exact: true });
    await button.click();
    await expect(page.locator(".settings-error")).toHaveAttribute("role", "alert");
    await expect(page.locator(".settings-error")).toHaveText("Log out did not complete. Please try again.");
    await expect(page).toHaveURL(/\/settings\/$/);
    await expect(page.getByRole("heading", { name: "My Account." })).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute("aria-busy", "false");
    await button.click();
    await expect(page).toHaveURL(new URL("/", page.url()).href);
    await expect(page.getByRole("navigation", { name: "Account access" })).toBeVisible();
    expect(state.writes).toEqual([{ action: "logout" }, { action: "logout" }]);
  });
}

test("signed-out visitors have no logout control", async ({ page }) => {
  const state = await mockAccount(page, false);
  await page.goto("/settings/");
  await expect(page.getByRole("heading", { name: "Sign in to manage Settings." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Log out|Logging out/ })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
