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
  await expect.poll(() => writes.length).toBe(1);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ action: "signup", email: "qa@example.invalid", position: "TRUSTEE / CHAIR" });
  expect((writes[0].progress as Record<string, unknown>).step).toBe("scope");
});

test("dashboard shows genuine readiness and native Social Impact Excellence state", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: {
    signedIn: true,
    account: { name: "QA Person", email: "qa@example.invalid", position: "TRUSTEE / CHAIR", organisation: "QA Charity" },
    progress: { sessionId: "qa-saved", step: "criterion", candidate: { name: "QA Charity" } },
  } }));
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("QA");
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continue assessment/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/");
  await expect(page.getByText("Ready to start", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start assessment" })).toHaveAttribute("href", "/social-impact-excellence/assessment/");
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
});

test("Social Impact Excellence uses the SORP account and saves real assessment progress", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Person", organisation: "QA Charity" } } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "load-product") return route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Person", organisation: "QA Charity" }, productProgress: null } });
    writes.push(input);
    return route.fulfill({ json: { productId: "social-impact-excellence", productProgress: { status: input.status, data: input.data } } });
  });
  await page.goto("/social-impact-excellence/assessment/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("clear about our organisation’s purpose");
  await page.getByRole("button", { name: /3 ★/ }).click();
  await expect.poll(() => writes.length).toBeGreaterThan(0);
  expect(writes[0]).toMatchObject({ action: "save-product", productId: "social-impact-excellence", status: "in_progress" });
  await page.getByRole("button", { name: /Next question/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("key stakeholders or beneficiaries");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("Social Impact Excellence returns a private scored report and downloadable PDF", async ({ page }) => {
  const result = {
    overall: 3.4, maturity: "Partly established",
    pillarScores: ["purpose", "leadership", "data", "delivery", "communication"].map((pillar, index) => ({ pillar, score: 3 + index * .2 })),
    strengths: [{ id: 1, statement: "We are clear about our purpose", meaning: "", pillar: "purpose" }],
    opportunities: [{ id: 11, statement: "We collect data to understand impact", meaning: "", pillar: "data" }],
    commentary: "This is an honest five-pillar baseline for the charity.", recommendation: "Strengthen the evidence behind the weakest pillar.",
  };
  await page.route("**/api/readiness-account/**", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Person", organisation: "QA Charity" } } });
    return route.fulfill({ json: { account: { id: "qa", name: "QA Person", organisation: "QA Charity" }, productProgress: { status: "complete", data: { result } } } });
  });
  await page.goto("/social-impact-excellence/results/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Partly established");
  await expect(page.getByText("3.4", { exact: true }).first()).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my PDF report ↓" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("social-impact-excellence-results.pdf");
});

test("report review intake creates a private upload record without pretending payment succeeded", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true, account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" } } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "list-report-reviews") return route.fulfill({ json: { reviews: [] } });
    if (input.action === "create-report-upload") return route.fulfill({ status: 201, json: { review: { id: "review-1", filename: "impact-report.pdf", sizeBytes: 13, status: "awaiting_upload", createdAt: "2026-10-11T04:00:00Z" }, upload: { url: "https://upload.example.test/report", token: "a".repeat(64) } } });
    return route.fulfill({ status: 400, json: { error: "Unexpected test action" } });
  });
  await page.route("https://upload.example.test/report", route => route.fulfill({ json: { ok: true, review: { id: "review-1", filename: "impact-report.pdf", sizeBytes: 13, status: "awaiting_payment", createdAt: "2026-10-11T04:00:00Z" } } }));
  await page.goto("/charity-impact-reports/review/");
  await page.getByLabel("Choose a PDF report").setInputFiles({ name: "impact-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 test") });
  await expect(page.getByText("impact-report.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Upload my report securely" }).click();
  await expect(page.getByText(/stored securely/)).toBeVisible();
  await expect(page.getByText("Uploaded · payment not taken", { exact: true })).toBeVisible();
  await expect(page.getByText(/Online payment remains paused/)).toBeVisible();
});
