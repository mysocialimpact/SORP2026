import { expect, test, type Page } from "@playwright/test";

const journeys = [
  { name: "Readiness", path: "/are-you-sorp-ready/review/?entry=intro", surface: ".scr-page" },
  { name: "Ask SORP", path: "/ask-sorp/workspace/", surface: ".ask-workspace-page" },
  { name: "Impact Reports", path: "/charity-impact-reports/review/", surface: ".review-intake-grid" },
  { name: "Social Impact Excellence", path: "/social-impact-excellence/assessment/", surface: ".sie-assessment" },
  { name: "Impact Director", path: "/my-impact-director/workspace/#assessment", surface: "#assessment [data-mode]" },
];
const account = { email: "one-login@example.invalid", password: "Synthetic-Login-Test-2026" };

async function login(page: Page) {
  await page.locator(".account-portal").getByLabel("Email address", { exact: true }).fill(account.email);
  await page.locator(".account-portal").getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: /Log in to SORP2026/ }).click();
}

async function register(page: Page) {
  await page.getByRole("button", { name: /Fill in the form yourself/ }).click();
  for (const [name, value] of Object.entries({ name: "Synthetic Account", email: account.email, role: "Trustee", organisation: "Synthetic Organisation" })) {
    await page.locator(`.onboarding-profile:visible input[name=${name}]`).fill(value);
  }
  await page.getByLabel("Charity name or registration number").fill("Synthetic Test Charity");
  await page.getByRole("button", { name: "Find →", exact: true }).click();
  await page.getByRole("button", { name: /Yes, this is the charity/ }).click();
  await page.locator(".profile-next button").click();
  await page.getByLabel("Choose a password").fill(account.password);
  await page.getByLabel("Confirm your password").fill(account.password);
  await page.locator("dialog").getByRole("button", { name: /Create my account/ }).click();
}

test.describe("One login rule with the existing isolated preview account service", () => {
  test.skip(process.env.SORP_ISOLATED_PREVIEW !== "true", "Requires the isolated preview, never real customer accounts");

  test("homepage review action registers first, then opens the review without another account step", async ({ page }) => {
    const premature: string[] = [];
    let created = false;
    page.on("request", request => { if (!created && /\/api\/(readiness\/|published-review|ask-sorp\/)/.test(request.url())) premature.push(request.url()); });
    page.on("response", async response => {
      if (response.url().includes("/api/readiness-account") && response.request().method() === "POST" && response.request().postDataJSON()?.action === "signup" && response.ok()) created = true;
    });
    await page.goto("/");
    await page.locator(".homepage-start-action").getByRole("link", { name: /Let’s Get Started/ }).click();
    await expect(page).toHaveURL(/\/get-started\//);
    expect(new URL(page.url()).searchParams.get("next")).toBe(journeys[0].path);
    await register(page);
    await expect(page).toHaveURL(/\/are-you-sorp-ready\/review\//);
    await expect(page.locator(".scr-page--scope")).toBeVisible();
    await expect(page.locator(".scr-account-form")).toHaveCount(0);
    expect(premature).toEqual([]);
  });

  for (const journey of journeys) {
    test(`${journey.name}: direct access registers first and returns to the correct tool`, async ({ page }) => {
      await page.goto(journey.path);
      await expect(page).toHaveURL(/\/get-started\//);
      await expect.poll(() => new URL(page.url()).searchParams.get("next")).toBe(journey.path);
      await register(page);
      await expect(page).toHaveURL(new RegExp(journey.path.split("?")[0].split("#")[0]));
      await expect(page.locator(journey.surface)).toBeVisible();
      await expect(page.locator(".account-portal,.scr-account-form")).toHaveCount(0);
    });

    test(`${journey.name}: returning users sign in and keep their tool destination`, async ({ page }) => {
      await page.goto(`/get-started/?next=${encodeURIComponent(journey.path)}`);
      await page.getByRole("link", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/login\//);
      expect(new URL(page.url()).searchParams.get("next")).toBe(journey.path);
      await login(page);
      await expect(page).toHaveURL(new RegExp(journey.path.split("?")[0].split("#")[0]));
      await expect(page.locator(journey.surface)).toBeVisible();
    });
  }

  test("all public pages and the presentation remain open; tool and legacy APIs require real session verification", async ({ request, context }) => {
    for (const path of ["/", "/get-started/", "/are-you-sorp-ready/", "/are-you-sorp-ready/presentation/", "/ask-sorp/", "/charity-impact-reports/", "/social-impact-excellence/", "/my-impact-director/", "/our-mission/", "/understanding-sorp/"]) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    const apis = ["/api/ask-sorp/", "/api/ask-sorp/continuation/", "/api/readiness/", "/api/readiness/report/", "/api/readiness/report-email/", "/api/readiness/review-report-email/", "/api/readiness/transcribe/", "/api/published-review/", "/api/impact-director/", "/api/sorp-report-upload/", "/api/sorp-report-file/", "/api/sorp-payments/checkout/", "/api/sorp-payments/status/"];
    for (const path of apis) expect((await request.post(path, { data: {} })).status(), path).toBe(401);
    for (const path of ["/api/readiness-account/", "/api/sorp-auth-compat/"]) {
      for (const action of ["save", "save-product", "load-product", "create-report-upload", "team-response-open"]) {
        expect((await request.post(path, { data: { action } })).status(), `${path}:${action}`).toBe(401);
      }
    }
    await context.addCookies([{ name: "sorp_preview_account", value: "forged.payload", url: new URL((await request.get("/")).url()).origin }]);
    expect((await request.post("/api/ask-sorp/", { data: {} })).status()).toBe(401);
    for (const path of ["/are-you-sorp-ready/basic/", "/are-you-sorp-ready/snapshot/", "/are-you-sorp-ready/conversation/", "/are-you-sorp-ready/results/", "/social-impact-excellence/purpose/", "/social-impact-excellence/leadership/assessment/"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      expect(response.headers().location).toContain("/get-started/?next=");
    }
  });

  test("examples, query strings, fragments, navigation and build information survive the account gateway", async ({ page, request }, info) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Start", exact: false })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "SORP2026 products" }).getByRole("link")).toHaveCount(7);
    await page.goto("/my-impact-director/");
    await page.getByRole("link", { name: /Start your free assessment/ }).first().click();
    await expect(page).toHaveURL(/\/get-started\//);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/my-impact-director/workspace/#assessment");
    const question = "What does my charity need to report?";
    await page.goto(`/ask-sorp/workspace/?question=${encodeURIComponent(question)}`);
    await expect(page).toHaveURL(/\/get-started\//);
    const target = new URL(new URL(page.url()).searchParams.get("next")!, "https://sorp2026.org");
    expect(target.searchParams.get("question")).toBe(question);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await login(page);
    await expect(page.locator(".ask-workspace-page")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("question")).toBe(question);
    const composer = page.locator(".ask-composer");
    expect((await composer.boundingBox())!.y + (await composer.boundingBox())!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Your account" }).getByRole("link", { name: /My Account/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "SORP2026 products" })).toContainText("My Account");
    const metadata = await (await request.get("/build-info.json")).json();
    const bar = page.locator(".build-information-bar");
    if (metadata.deployedAt) await expect(bar.locator("time")).toHaveAttribute("datetime", metadata.deployedAt);
    else await expect(bar.locator("time")).toHaveCount(0); // Local builds have no deployment timestamp.
    expect(await bar.evaluate(element => getComputedStyle(element).position)).toBe("static");
    await page.evaluate(() => window.scrollTo({ top: 650, behavior: "instant" }));
    expect((await bar.boundingBox())!.y + (await bar.boundingBox())!.height).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await bar.screenshot({ path: info.outputPath("one-login-build-bar.png") });
  });

  test("old account checkpoints resume after charity confirmation without registration; saved answers survive", async ({ page }) => {
    await page.goto("/login/?return=%2Fare-you-sorp-ready%2Freview%2F");
    await login(page);
    await expect(page.locator(".scr-page")).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("msi-sorp-canonical-methodology-v1") || "{}").email)).toBe(account.email);
    await page.evaluate(() => localStorage.setItem("msi-sorp-canonical-methodology-v1", JSON.stringify({
      sessionId: "legacy-saved-review", step: "account", candidate: { name: "Saved Test Charity", registrationNumber: "0000000", entityType: "registered_charity" },
      corrections: { "1": { answer: "yes", context: "Existing saved answer", reviewed: true } },
    })));
    await page.reload();
    await expect(page.locator(".scr-page")).toHaveClass(/scr-discovery--homework/);
    await expect(page.locator(".scr-account-form,.account-gateway")).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("msi-sorp-canonical-methodology-v1") || "{}"));
    expect(saved.corrections["1"].context).toBe("Existing saved answer");
    expect(saved.step).toBe("homework");
  });
});
