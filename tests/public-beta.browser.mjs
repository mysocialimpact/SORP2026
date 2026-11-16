import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

// Run only against the existing isolated preview. No real signup, email or AI calls.
const base = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const landings = ["/", "/are-you-sorp-ready/", "/ask-sorp/", "/charity-impact-reports/", "/social-impact-excellence/", "/my-impact-director/"];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of landings) {
      await page.goto(base + path);
      await expect(page.locator("main h1")).toBeVisible();
      const action = page.locator("main").getByRole("link", { name: "Get Started — Free" }).first();
      await expect(action).toBeVisible();
      await expect(action).toHaveAttribute("href", /^\/get-started\/\?next=/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} overflow at ${width}`);
      const bar = page.locator(".public-beta-bar");
      assert.ok((await bar.boundingBox()).height < 40);
      await page.screenshot({ path: `/tmp/beta-${path.replaceAll("/", "") || "home"}-${width}.png`, fullPage: false });
      await page.evaluate(() => scrollTo(0, 500));
      assert.ok((await bar.boundingBox()).y < 0);
    }
    await page.goto(base + "/accountants-advisers/");
    await expect(page.getByRole("heading", { name: /Find the right charity accountant/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Email Marcus" })).toHaveAttribute("href", /^mailto:marcus@mysocialimpact.org/);
    assert.equal(await page.locator(".adviser-founder img").evaluate(el => el.complete && el.naturalWidth > 0), true);
    await page.screenshot({ path: `/tmp/beta-directory-${width}.png`, fullPage: false });
    await page.getByRole("searchbox", { name: "Find a charity accountant" }).fill("Burton Sweet");
    await page.getByRole("button", { name: "Search ↗", exact: true }).click();
    await expect(page.locator(".directory-result")).toHaveCount(1);
    await expect(page.locator(".directory-result")).toContainText("Burton Sweet");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await page.goto(base + "/get-started/");
    await expect(page.getByRole("heading", { name: "Let’s Get Started." })).toBeVisible();
    await page.getByRole("radio", { name: "I represent a charity" }).check();
    await page.reload();
    await expect(page.getByRole("radio", { name: "I represent a charity" })).toBeChecked();
    const audience = width === 390 ? "adviser" : "charity";
    await page.getByRole("radio", { name: audience === "adviser" ? "I advise a charity" : "I represent a charity" }).check();
    await page.getByRole("button", { name: "Fill in the form" }).click();
    await page.locator('input[name="name"]').fill("Synthetic Beta Tester");
    await page.locator('input[name="email"]').fill("beta@example.invalid");
    await expect(page.locator('.profile-next button')).toBeDisabled();
    await page.getByLabel("Charity name or registration number").fill("Synthetic Test Charity");
    await page.getByRole("button", { name: "Find →", exact: true }).click();
    await page.getByRole("button", { name: /Yes, that’s my charity!/ }).click();
    await expect(page.locator('.profile-next button')).toBeEnabled();
    await expect(page.locator('input[name="role"]')).toHaveValue("");
    await expect(page.locator('input[name="organisation"]')).toHaveValue("");
    await page.screenshot({ path: `/tmp/beta-onboarding-${width}.png`, fullPage: false });
    await page.locator('.profile-next button').click();
    await page.getByLabel("Choose a password").fill("Synthetic-Beta-2026");
    await page.getByLabel("Confirm your password").fill("Synthetic-Beta-2026");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page.getByRole("heading", { name: "Brilliant! You’re ready to go!" })).toBeVisible();
    const account = await (await context.request.get(base + "/api/readiness-account/")).json();
    assert.equal(account.signedIn, true);
    assert.equal(account.progress.onboarding.audience, audience);
    assert.equal(account.progress.onboarding.selected.name, "Synthetic Test Charity");
    assert.equal(account.progress.onboarding.facts.role, "");
    assert.equal(account.progress.onboarding.facts.organisation, "");
    await page.locator("#onboarding-success").getByRole("link", { name: "Continue to SORP 2026" }).click();
    await page.waitForURL("**/are-you-sorp-ready/review/**");
    const saved = await (await context.request.get(base + "/api/readiness-account/")).json();
    assert.equal(saved.progress.onboarding.selected.registrationNumber, "0000000");
    for (const path of landings.filter(p => p !== "/social-impact-excellence/")) {
      await page.goto(base + path);
      await expect(page.locator(".gateway-account-control").first()).not.toContainText("Get Started — Free");
      await expect(page.locator("main").getByRole("link", { name: "Get Started — Free" })).toHaveCount(0);
    }
    // Saved-state CTA behavior with controlled account responses, independent of fixture persistence.
    for (const [step, expected] of [["scope", "Start Assessment"], ["questions", "Continue Assessment"], ["done", "View Assessment Results"]]) {
      await page.route("**/api/readiness-account/", route => route.fulfill({ json: { ...account, progress: { sessionId: "saved-review", step } } }));
      await page.goto(base + "/are-you-sorp-ready/");
      await expect(page.locator("main").getByRole("link", { name: expected }).first()).toBeVisible();
      await expect(page.locator("main").getByRole("link", { name: expected }).first()).toHaveAttribute("href", "/are-you-sorp-ready/review/");
      await page.unroute("**/api/readiness-account/");
    }
    await context.request.post(base + "/api/readiness-account/", { data: { action: "logout" }, headers: { origin: base } });
    await page.goto(base + "/login/?return=%2Fask-sorp%2Fworkspace%2F");
    await page.locator('.account-portal input[type="email"]').fill("beta@example.invalid");
    await page.locator('.account-portal input[type="password"]').fill("Synthetic-Beta-2026");
    await expect(page.locator('.account-portal input[type="email"]')).toHaveValue("beta@example.invalid");
    await expect(page.locator('.account-portal input[type="password"]')).toHaveValue("Synthetic-Beta-2026");
    assert.equal(await page.locator(".account-portal form").evaluate(form => form.checkValidity()), true);
    await page.locator(".account-submit").click();
    await page.waitForURL("**/ask-sorp/workspace/**");
    assert.deepEqual(errors, []);
    console.log(`${width}px: six public heroes, beta CTAs, directory search/photo/email, ${audience} registration, blank optional fields, saved charity, signed-in CTAs and login return passed. Synthetic services; not live AI or database verification.`);
    await context.close();
  }
} finally { await browser.close(); }
