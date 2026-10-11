import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const productPages = [
  ["/my-impact-director/", "Imagine having your own Impact Director."],
  ["/social-impact-excellence/", "Make impact part of how your charity works."],
  ["/charity-impact-reports/", "Improve your charity’s impact report."],
  ["/purpose-works/", "Purpose isn’t what you say.It’s what you make happen."],
] as const;

test("all six products have distinct working destinations", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: false } }));
  await page.goto("/");
  for (const [path] of productPages) await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
  await expect(page.locator('a[href="/are-you-sorp-ready/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/ask-sorp/"]').first()).toBeVisible();
  for (const [path, heading] of productPages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations, path).toEqual([]);
  }
});

test("global login uses the existing account service and keeps Google hidden", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: false } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { account: { name: "QA Person", email: "qa@example.invalid" } } });
  });
  await page.goto("/login/?mode=signup&return=/dashboard/");
  await expect(page.getByText(/Google sign-in remains unavailable/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Google/i })).toHaveCount(0);
  await page.getByLabel("Your name").fill("QA Person");
  await page.getByLabel("Your role").selectOption("TRUSTEE / CHAIR");
  await page.getByLabel("Email address").fill("qa@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("Safe password 123");
  await page.getByLabel("Confirm password").fill("Safe password 123");
  await page.getByRole("button", { name: "Create my SORP2026 account →" }).click();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ action: "signup", email: "qa@example.invalid", position: "TRUSTEE / CHAIR" });
  expect((writes[0].progress as Record<string, unknown>).step).toBe("scope");
});

test("dashboard shows genuine saved readiness state and honest integration boundaries", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: {
    signedIn: true,
    account: { name: "QA Person", email: "qa@example.invalid", position: "TRUSTEE / CHAIR", organisation: "QA Charity" },
    progress: { sessionId: "qa-saved", step: "criterion", candidate: { name: "QA Charity" } },
  } }));
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("QA");
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continue assessment/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/");
  await expect(page.getByText("Separate sign-in currently", { exact: true })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
});

test("report review intake requires an account and cannot fake upload or payment", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: true, account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" } } }));
  await page.goto("/charity-impact-reports/review/");
  await page.getByLabel("Choose a PDF report").setInputFiles({ name: "impact-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test") });
  await expect(page.getByText("impact-report.pdf", { exact: true })).toBeVisible();
  const checkout = page.getByRole("button", { name: "Secure checkout awaiting connection" });
  await expect(checkout).toBeDisabled();
  await expect(page.getByText(/will not transmit your PDF or take payment/)).toBeVisible();
});
