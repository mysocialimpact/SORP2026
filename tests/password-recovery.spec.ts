import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const KEY = "msi-sorp-canonical-methodology-v1";
const token = "a".repeat(64);
const saved = { sessionId: "preserved-review", email: "person@example.org", step: "account", comments: { purpose: "Keep this evidence" }, candidate: { name: "Example Charity", registrationNumber: "1234567", entityType: "registered_charity" } };

test("forgot-password link is present on direct sign-in, request acknowledgement does not disclose account existence", async ({ page }) => {
  const sent: unknown[] = [];
  await page.addInitScript(({ KEY, saved }) => localStorage.setItem(KEY, JSON.stringify(saved)), { KEY, saved });
  await page.route("**/api/**", async route => {
    const r = route.request();
    if (r.url().includes("feature=password-reset")) return route.fulfill({ json: { available: true } });
    if (r.url().includes("readiness-account") && r.method() === "POST") {
      sent.push(r.postDataJSON()); return route.fulfill({ status: 202, json: { ok: true } });
    }
    return route.fulfill({ json: { signedIn: false } });
  });
  await page.goto("/are-you-sorp-ready/review/?entry=login");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WELCOME BACK.");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByLabel("Email address")).toHaveValue(saved.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Request received.");
  await expect(page.getByRole("status")).toContainText("If this address has an account");
  expect(sent).toEqual([{ action: "request-reset", email: saved.email }]);
  expect(await page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!).comments, KEY)).toEqual(saved.comments);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("reset uses the fragment token once, requires matching passwords and leaves local assessment unchanged", async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  await page.addInitScript(({ KEY, saved }) => localStorage.setItem(KEY, JSON.stringify(saved)), { KEY, saved });
  await page.route("**/api/**", async route => {
    expect(route.request().url()).not.toContain(token);
    if (route.request().method() === "POST") { sent.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ json: { available: true } });
  });
  await page.goto(`/reset-password/#token=${token}`);
  await expect(page).toHaveURL(/\/reset-password\/$/);
  await page.getByLabel("New password", { exact: true }).fill("New secure password");
  await page.getByLabel("Confirm new password").fill("Different secure password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("do not match"); expect(sent).toHaveLength(0);
  await page.getByLabel("Confirm new password").fill("New secure password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Password changed.");
  expect(sent).toEqual([{ action: "reset-password", token, password: "New secure password" }]);
  expect(await page.evaluate(KEY => localStorage.getItem(KEY), KEY)).toBe(JSON.stringify(saved));
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("expired/reused links show recovery action and never claim success", async ({ page }) => {
  await page.route("**/api/**", route => route.request().method() === "POST" ? route.fulfill({ status: 400, json: { error: "This reset link is invalid or has expired. Please request a new one." } }) : route.fulfill({ json: { available: true } }));
  await page.goto(`/reset-password/#token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill("New secure password");
  await page.getByLabel("Confirm new password").fill("New secure password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("expired");
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
  await expect(page.getByText("Password changed.", { exact: true })).toHaveCount(0);
});

test("unconfigured backend fails closed without offering a pretend email send", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ json: { available: false } }));
  await page.goto("/forgot-password/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: "Send reset link" })).toHaveCount(0);
});

test("fresh-device sign-in can restore saved work after a reset without repeating charity selection", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/**", route => {
    const r = route.request();
    if (r.url().includes("readiness-account") && r.method() === "POST" && r.postDataJSON().action === "login") {
      signedIn = true;
      return route.fulfill({ json: { account: { name: "Person", email: saved.email, position: "Trustee" }, progress: { ...saved, step: "find" } } });
    }
    if (r.url().includes("readiness-account") && signedIn) return route.fulfill({ json: { signedIn: true, account: { name: "Person", email: saved.email, position: "Trustee", organisation: "Example Charity" }, progress: { ...saved, step: "find" } } });
    return route.fulfill({ json: { signedIn: false } });
  });
  await page.goto("/are-you-sorp-ready/review/?entry=login");
  await page.getByLabel("Email address", { exact: true }).fill(saved.email);
  await page.getByLabel("Password", { exact: true }).fill("New secure password");
  await page.getByRole("button", { name: "SIGN IN AND CONTINUE" }).click();
  await expect(page).toHaveURL(/\/dashboard\/$/);
  await expect(page.getByRole("status")).toContainText("You’re in, Person.");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back, Person");
  await expect.poll(() => page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY) || "{}").sessionId, KEY)).toBe(saved.sessionId);
  expect(await page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!).comments, KEY)).toEqual(saved.comments);
});
