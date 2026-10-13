import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const productPages = [
  ["/my-impact-director/", "What if everyorganisation hadan Impact Director?"],
  ["/social-impact-excellence/", "Make social impact part of how your charity is run."],
  ["/charity-impact-reports/", "Is your impact report telling the whole story?"],
] as const;

test("all five products have distinct working destinations", async ({ page }) => {
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
  await page.route("**/api/impact-director/**", route => route.fulfill({ json: { signedIn: true, progress: null } }));
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: {
    signedIn: true,
    account: { name: "QA Person", email: "qa@example.invalid", position: "TRUSTEE / CHAIR", organisation: "QA Charity" },
    progress: { sessionId: "qa-saved", step: "criterion", candidate: { name: "QA Charity" } },
  } }));
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("QA");
  const progressOverview = page.getByRole("region", { name: "Where you are." });
  await expect(progressOverview).toBeVisible();
  await expect(progressOverview.getByText("Are You SORP Ready?", { exact: true })).toBeVisible();
  const readinessProgress = progressOverview.getByRole("progressbar", { name: "Are You SORP Ready?: In progress" });
  await expect(readinessProgress).toHaveAttribute("aria-valuenow", "63");
  await expect(readinessProgress.locator("xpath=..")).toContainText("In progress63%");
  await expect(progressOverview.locator("li").filter({ hasText: "Live beta · separate service" })).toHaveCount(1);
  await expect(progressOverview.locator("li").filter({ hasText: "Not started" })).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Your SORP tools." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strengthen your impact." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Continue assessment/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/");
  await expect(page.getByText("Ready to start", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start assessment" })).toHaveAttribute("href", "/social-impact-excellence/assessment/");
  const impactColumns = await page.locator(".dashboard-product-group--impact .dashboard-products").evaluate(
    grid => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
  );
  expect(impactColumns).toBe(page.viewportSize()!.width > 700 ? 2 : 1);
});

test("Purpose Works has no public route or navigation entry", async ({ page }) => {
  const response = await page.goto("/purpose-works/");
  expect(response?.status()).toBe(404);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "SORP2026 products" }).getByRole("link")).toHaveCount(6);
  await expect(page.locator('a[href="/purpose-works/"]')).toHaveCount(0);
  await expect(page.getByText("Purpose Works", { exact: true })).toHaveCount(0);
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

test("signed-in Social Impact Excellence is a personal workspace with saved answers and team progress", async ({ page }) => {
  const answers = Array.from({ length: 25 }, (_, index) => index % 5 + 1);
  const result = {
    overall: 3, maturity: "Partly established",
    pillarScores: ["purpose", "leadership", "data", "delivery", "communication"].map(pillar => ({ pillar, score: 3 })),
    strengths: [], opportunities: [], recommendation: "Build on the baseline.",
  };
  await page.route("**/api/readiness-account/**", async route => {
    const input = route.request().method() === "POST" ? route.request().postDataJSON() as Record<string, unknown> : {};
    if (input.action === "load-product") return route.fulfill({ json: { signedIn: true, account: { id: "will", name: "Will Example", organisation: "Brainstrust" }, productProgress: { status: "complete", data: { answers, result, migration: { source: "legacy-social-impact-excellence" } } } } });
    if (input.action === "team-workspace") return route.fulfill({ json: { organisation: { name: "Brainstrust", programme: "team", seatLimit: 15 }, invitations: [{ status: "completed" }, { status: "started" }, { status: "invited" }], aggregate: { available: false, completed: 1, required: 3 } } });
    return route.fulfill({ json: { signedIn: true, account: { id: "will", name: "Will Example", organisation: "Brainstrust" } } });
  });
  await page.goto("/social-impact-excellence/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back, Will");
  await expect(page.getByText("Brainstrust’s place to see what you have completed")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Brainstrust’s Team Perspective/ }).first()).toHaveAttribute("href", "/social-impact-excellence/team/");
  await expect(page.getByText("Your previous MSI assessment is safely connected")).toBeVisible();
  await expect(page.locator(".excellence-answer-pillars details")).toHaveCount(5);
  await expect(page.locator(".excellence-answer-pillars li")).toHaveCount(25);
  await page.locator(".excellence-answer-pillars details").nth(1).locator("summary").click();
  await expect(page.locator(".excellence-answer-pillars details").nth(1).locator("li")).toHaveCount(5);
  await expect(page.getByText("Completed", { exact: true }).last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("a saved answer opens on the selected assessment question", async ({ page }) => {
  const answers = Array<number | null>(25).fill(3);
  await page.route("**/api/readiness-account/**", async route => {
    const input = route.request().method() === "POST" ? route.request().postDataJSON() as Record<string, unknown> : {};
    if (input.action === "load-product") return route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Person", organisation: "QA Charity" }, productProgress: { status: "in_progress", data: { answers, index: 0, requestId: "qa", route: "assessment", startedAt: "2026-10-12T10:00:00Z" } } } });
    return route.fulfill({ json: { signedIn: true } });
  });
  await page.goto("/social-impact-excellence/assessment/?question=11");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("collect data to understand and track our impact");
  await expect(page.getByText("11", { exact: true })).toBeVisible();
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

test("Social Impact Excellence preserves the established Purpose pathway inside the SORP account", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  const result = { overall: 3.4, maturity: "Partly established", pillarScores: ["purpose", "leadership", "data", "delivery", "communication"].map(pillar => ({ pillar, score: 3.4 })), strengths: [], opportunities: [], commentary: "Baseline", recommendation: "Continue" };
  let currentData: Record<string, unknown> = { result };
  await page.route("**/api/readiness-account/**", async route => {
    const input = route.request().method() === "POST" ? route.request().postDataJSON() as Record<string, unknown> : {};
    if (input.action === "load-product") return route.fulfill({ json: { account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, productProgress: { status: "complete", data: currentData } } });
    if (input.action === "save-product") { writes.push(input); currentData = input.data as Record<string, unknown>; return route.fulfill({ json: { productProgress: { status: "complete", data: input.data } } }); }
    if (input.action === "list-product-files") return route.fulfill({ json: { files: [] } });
    return route.fulfill({ json: { signedIn: true } });
  });
  await page.goto("/social-impact-excellence/journey/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your path to excellence");
  await expect(page.getByRole("link", { name: /Begin Purpose pathway/ })).toBeVisible();
  await expect(page.getByText("The original platform has not released this deeper pathway yet.")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  await page.goto("/social-impact-excellence/purpose/assessment/");
  await page.getByLabel("Role").fill("Trustee");
  await page.getByRole("button", { name: "Save and continue →" }).click();
  const sections = ["Purpose Definition", "Intended Change", "Purpose Development", "Purpose Evidence"];
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(sections[0]);
  for (let section = 0; section < sections.length; section += 1) {
    const ratings = page.getByRole("radio", { name: /4 ★/ });
    await expect(ratings).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) await ratings.nth(index).click();
    for (let index = 0; index < 5; index += 1) await expect(ratings.nth(index)).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Save and continue →" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(section < 3 ? sections[section + 1] : "Tell us about your purpose in your own words.");
  }
  const reflections = page.locator(".sie-purpose-questions textarea");
  await expect(reflections).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await reflections.nth(index).fill("A useful charity-specific reflection.");
  await page.getByRole("button", { name: "Complete assessment →" }).click();
  await expect(page).toHaveURL(/\/social-impact-excellence\/purpose\/evidence\//);
  await expect.poll(() => writes.length).toBe(6);
  const finalData = writes.at(-1)?.data as { purpose?: { status?: string; score?: number; answers?: unknown[] } };
  expect(finalData.purpose?.status).toBe("assessment_complete");
  expect(finalData.purpose?.score).toBe(4);
  expect(finalData.purpose?.answers).toHaveLength(25);
});

test("Purpose evidence uses the private product upload flow and records real completion", async ({ page }) => {
  const saved: Record<string, unknown>[] = [];
  const purpose = { assessmentId: "purpose-1", organisationName: "QA Charity", participant: { name: "QA Person", role: "Trustee", email: "qa@example.invalid" }, status: "assessment_complete", evidenceStatus: "not_started", score: 4, maturity: "Established", answers: Array.from({ length: 25 }, (_, index) => ({ questionNumber: index + 1, score: index < 20 ? 4 : null, comment: "", answer: index >= 20 ? "Reflection" : "" })), evidence: [], progress: 65 };
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "load-product") return route.fulfill({ json: { account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, productProgress: { status: "complete", data: { result: { overall: 4 }, purpose } } } });
    if (input.action === "list-product-files") return route.fulfill({ json: { files: [] } });
    if (input.action === "create-product-file-upload") return route.fulfill({ status: 201, json: { file: { id: "file-1" }, upload: { url: "https://upload.example.test/evidence", token: "b".repeat(64) } } });
    if (input.action === "save-product") { saved.push(input); return route.fulfill({ json: { productProgress: { status: "complete", data: input.data } } }); }
    return route.fulfill({ status: 400, json: { error: "Unexpected action" } });
  });
  await page.route("https://upload.example.test/evidence", route => route.fulfill({ json: { ok: true, file: { id: "file-1", uploadedAt: "2026-10-11T05:00:00Z" } } }));
  await page.goto("/social-impact-excellence/purpose/evidence/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByLabel("Choose documents to upload").setInputFiles({ name: "purpose.txt", mimeType: "text/plain", buffer: Buffer.from("Purpose evidence") });
  await page.getByRole("button", { name: "Upload 1 document" }).click();
  await expect(page.getByText(/uploaded securely/)).toBeVisible();
  await page.getByRole("button", { name: "Finish evidence stage" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ready for MSI review");
  const finalData = saved.at(-1)?.data as { purpose?: { status?: string; evidence?: unknown[] } };
  expect(finalData.purpose?.status).toBe("complete");
  expect(finalData.purpose?.evidence).toHaveLength(1);
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
