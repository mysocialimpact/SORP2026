import { expect, test } from "@playwright/test";

test("visitors see one onboarding tab and distinct sign-in and registration actions", async ({ page }, testInfo) => {
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  await expect(tabs.getByRole("link")).toHaveCount(7);
  await expect(tabs.locator("a").nth(1)).toContainText("Let’s Get Started");
  await expect(tabs.locator("a").nth(1)).toHaveAttribute("href", "/get-started/");
  const account = page.getByRole("navigation", { name: "Account access" });
  await expect(account.getByRole("link", { name: "Log in" })).toBeVisible();
  await expect(account.getByRole("link", { name: /Let’s Get Started/ })).toBeVisible();
  await expect(page.locator(".build-information-bar")).toBeVisible();
  await expect(page.locator(".build-information-bar")).toContainText("VISITOR");
  await expect(page.locator(".build-information-bar")).toContainText("3 free AI questions");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".platform-sticky-navigation").screenshot({ path: testInfo.outputPath("logged-out-navigation.png") });
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(account.getByRole("link", { name: "Log in" })).toBeVisible();
  }
  await tabs.locator("a").nth(1).click();
  await expect(page).toHaveURL(/\/get-started\//);
  await expect(page.locator(".build-information-bar")).toBeVisible();
});

test("sign-in returns to the originating product, then My Account shows saved profile", async ({ page }, testInfo) => {
  await page.goto("/ask-sorp/?topic=charity#questions");
  const access = page.getByRole("navigation", { name: "Account access" });
  await access.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login\//);
  expect(new URL(page.url()).searchParams.get("return")).toBe("/ask-sorp/?topic=charity#questions");
  await page.locator(".account-portal").getByLabel("Email address").fill("navigation@example.invalid");
  await page.locator(".account-portal").getByLabel("Password").fill("Synthetic-Test-Password-123");
  await page.getByRole("button", { name: /Log in to SORP2026/ }).click();
  await expect(page).toHaveURL(/\/ask-sorp\/\?topic=charity#questions/);
  const tabs = page.getByRole("navigation", { name: "SORP2026 products" });
  await expect(tabs.locator("a").nth(1)).toContainText("My Account");
  await expect(tabs.locator("a").nth(1)).toHaveAttribute("href", "/settings/");
  await expect(page.getByRole("navigation", { name: "Your account" }).getByRole("link", { name: "My Dashboard" })).toBeVisible();
  await expect(page.locator(".build-information-bar")).toContainText("FREE");
  await page.locator(".platform-sticky-navigation").screenshot({ path: testInfo.outputPath("logged-in-navigation.png") });
  await tabs.locator("a").nth(1).click();
  await expect(page).toHaveURL(/\/settings\//);
  await expect(page.getByRole("heading", { name: "My Account." })).toBeVisible();
  await expect(page.locator("#organisation")).toContainText("navigation@example.invalid");
  await page.getByRole("textbox", { name: "Professional role" }).fill("Charity finance director");
  await page.getByRole("textbox", { name: "Organisation or firm" }).fill("Navigation Test Charity");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByRole("status")).toContainText("Your role and organisation have been saved.");
  await page.reload();
  await expect(page.locator("#organisation")).toContainText("Charity finance director");
  await expect(page.locator("#organisation")).toContainText("Navigation Test Charity");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".settings-shell").screenshot({ path: testInfo.outputPath("my-account.png") });
});

test("an existing user can switch from onboarding to login without losing the product destination", async ({ page }) => {
  await page.goto("/social-impact-excellence/?pillar=purpose#journey");
  await page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: /Let’s Get Started/ }).click();
  await expect(page).toHaveURL(/\/get-started\//);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/social-impact-excellence/?pillar=purpose#journey");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("next")).toBe("/social-impact-excellence/?pillar=purpose#journey");
});

test("account profile changes require an authenticated session", async ({ request }) => {
  const response = await request.post("/api/readiness-account/", {
    data: { action: "update-profile", position: "Trustee", organisation: "Unclaimed Charity" },
  });
  expect([401, 403]).toContain(response.status());
});
