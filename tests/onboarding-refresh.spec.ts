import { expect, test } from "@playwright/test";

test.describe("Conversational onboarding in isolated preview", () => {
  test.skip(process.env.SORP_ISOLATED_PREVIEW !== "true", "Never create real test accounts");

  for (const audience of ["charity", "adviser"] as const) {
    test(`${audience}: selected homepage panel personalises onboarding and populates details`, async ({ page }) => {
      await page.goto("/");
      const panel = page.locator(".homepage-audience-option").filter({ hasText: audience === "charity" ? "CHARITIES" : "ACCOUNTANTS & ADVISERS" });
      await panel.getByRole("button").click();
      await expect(panel.getByRole("region")).toBeVisible();
      await panel.getByRole("link", { name: /Let’s Get Started/ }).click();
      await expect(page).toHaveURL(/\/get-started\//);
      await expect(page.locator(".conversation-question h2").first()).toContainText(audience === "charity" ? "your charity" : "your firm");
      const answer = audience === "charity"
        ? "My name is Asha Patel. I am a trustee at Interim Spaces. My email is asha@example.com."
        : "My name is Jess Baker. I am a chartered accountant at Fluid. My email is jess@example.com.";
      await page.locator("#introduction-answer:visible").fill(answer);
      await page.locator(".onboarding-send").click();
      await expect(page.locator('.onboarding-profile:visible input[name="name"]')).toHaveValue(audience === "charity" ? "Asha Patel" : "Jess Baker");
      await expect(page.locator('.onboarding-profile:visible input[name="email"]')).toHaveValue(audience === "charity" ? "asha@example.com" : "jess@example.com");
      await expect(page.locator('.onboarding-profile:visible input[name="organisation"]')).toHaveValue(audience === "charity" ? "Interim Spaces" : "Fluid");
      await expect(page.locator(".onboarding-choice")).toBeVisible();
      await page.locator(".onboarding-choice").getByRole("button", { name: /Keep chatting/ }).click();
      await expect(page.locator(".conversation-question h2")).toContainText("hoping to achieve");
      await page.locator("#introduction-answer:visible").fill("I manage our reporting and hope to make better decisions from impact evidence.");
      await page.locator(".onboarding-send").click();
      await expect(page.locator(".conversation-question h2")).toContainText("keeps you up at night");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }

  test("can correct details and create a free platform account without selecting a charity", async ({ page }) => {
    await page.goto("/get-started/?next=%2Fask-sorp%2Fworkspace%2F");
    await page.locator("#introduction-answer:visible").fill("My name is Alex Green. I am an accountant at Fluid. My email is alex@example.com.");
    await page.locator(".onboarding-send").click();
    await expect(page.locator(".onboarding-choice")).toBeVisible();
    await page.locator('.onboarding-profile:visible input[name="name"]').fill("Alex Greene");
    await page.locator(".onboarding-choice").getByRole("button", { name: /Get started/ }).click();
    await page.getByLabel("Choose a password").fill("Synthetic-Account-Test-2026");
    await page.getByLabel("Confirm your password").fill("Synthetic-Account-Test-2026");
    await page.locator("dialog").getByRole("button", { name: /Create my account/ }).click();
    await expect(page).toHaveURL(/\/ask-sorp\/workspace\//);
    await expect(page.locator(".ask-workspace-page")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
