import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialConversation, advance, extractImmediate, applyFacts, clearCharity, confirmCharity, accountReady, nextQuestion } from "../src/lib/onboarding/state";
import type { Candidate } from "../src/app/sorp-public-model";
test.use({ launchOptions: { executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

// Browser interaction contract tests. These deliberately use isolated HTTP fixtures,
// not real AI, registry, email or account creation. Live model checks run separately.
const intro = "I’m Sarah Jones, an accountant at Burton Sweet. My email is sarah@example.com.";
const charity = { name: "Interim Spaces (synthetic fixture)", registrationNumber: "1234569", jurisdiction: "England and Wales", entityType: "registered_charity", website: "https://example.invalid", officialUrl: "https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/1234569" } as Candidate;
async function fixture(page: Page, delay = 0) {
  let state = initialConversation();
  let signedIn = false;
  let registration: Record<string, unknown> | undefined;
  const actions: string[] = [];
  const messages: { role: string; text: string }[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === "/api/readiness-account/") {
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        if (body.action === "signup") {
          if (!accountReady(state)) return route.fulfill({ status: 422, json: { error: "Confirm the charity first" } });
          registration = body; signedIn = true;
          return route.fulfill({ status: 202, json: { verificationRequired: true } });
        }
      }
      return route.fulfill({ json: { signedIn, platformAccess: { founder: false, memberships: [] } } });
    }
    if (url.pathname === "/api/onboarding/transcribe/") {
      await new Promise(resolve => setTimeout(resolve, 800));
      return route.fulfill({ json: { transcript: intro } });
    }
    if (url.pathname.startsWith("/api/onboarding/")) {
      const action = url.pathname.split("/").filter(Boolean).at(-1);
      const b = request.method() === "POST" ? request.postDataJSON() : {};
      if (request.method() === "POST") actions.push(action || "");
      if (action === "turn") {
        await new Promise(resolve => setTimeout(resolve, delay));
        if (b.fields) state = applyFacts(state, b.fields, "form");
        state = advance(state, extractImmediate(b.message, state), b.skip);
        messages.push({ role: "user", text: b.message }, { role: "assistant", text: nextQuestion(state) });
      }
      if (action === "edit") { state = applyFacts(state, b.fields, "form"); if (b.clearCharity) state = clearCharity(state); }
      if (action === "search") state = { ...state, charity: { ...state.charity, confirmed: null, candidates: [charity], phase: "confirm" } };
      if (action === "confirm") state = confirmCharity(state, charity);
      if (request.method() === "POST") state.revision++;
      return route.fulfill({ json: { state, messages, notice: "", question: nextQuestion(state) } });
    }
    return route.fulfill({ json: { ok: true, account: null } });
  });
  return { state: () => state, registration: () => registration, actions: () => actions };
}
async function open(page: Page) {
  await page.goto("/get-started/?next=/ask-sorp/workspace/");
  await expect(page.locator("#introduction-answer")).toBeEnabled();
}
async function send(page: Page, text: string) {
  await page.locator("#introduction-answer").fill(text);
  await page.locator(".onboarding-send").click();
  await expect(page.locator(".conversation-activity")).toHaveCount(0);
}
async function form(page: Page) {
  await page.getByRole("button", { name: "Fill in the form", exact: false }).click();
}
async function choose(page: Page) {
  await page.getByLabel("Charity name or registration number").fill("Interim Spaces");
  await page.getByRole("button", { name: "Find →", exact: true }).click();
  await expect(page.getByRole("link", { name: "Official register" })).toHaveAttribute("href", charity.officialUrl);
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".confirmed-charity")).toContainText(charity.name);
}
test("a slow saved-draft response does not override the visitor's manual mode", async ({ page }) => {
  await fixture(page);
  await open(page);
  await send(page, intro);
  await page.route("**/api/onboarding/session/", async route => {
    await new Promise(resolve => setTimeout(resolve, 1400));
    await route.fallback();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Fill in the form", exact: true }).click();
  await expect(page.locator('input[name=name]')).toHaveValue("Sarah Jones");
  await expect(page.getByRole("button", { name: "Fill in the form", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#onboarding-profile-form")).toBeVisible();
});
test("first answer renders immediately during a slow response; all eight fields share state", async ({ page }, info) => {
  const service = await fixture(page, 1600);
  await open(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `test-results/flagship-${info.project.name}-intro.png`, fullPage: true });
  await page.locator("#introduction-answer").fill(intro);
  await page.locator(".onboarding-send").click();
  await expect(page.locator(".history-user")).toContainText(intro, { timeout: 700 });
  await expect(page.locator("input[name=name]")).toHaveValue("Sarah Jones", { timeout: 700 });
  await expect(page.locator("input[name=organisation]")).toHaveValue("Burton Sweet", { timeout: 700 });
  await expect(page.locator(".conversation-activity")).toBeVisible();
  await expect(page.locator(".field-arrived")).toHaveCount(4);
  await expect(page.locator(".conversation-reward.has-reward")).toContainText("4 details captured");
  await expect(page.locator(".profile-milestones .achieved")).toHaveCount(4);
  if (info.project.name === "mobile") {
    await expect(page.locator(".mobile-profile-reward")).toBeVisible();
    await expect(page.locator(".onboarding-mobile-summary")).toBeInViewport();
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `test-results/flagship-${info.project.name}-population.png`, fullPage: true });
  await expect(page.locator("#introduction-answer")).toBeEnabled();
  await expect(page.locator(".conversation-question")).toContainText("Which charity");
  await form(page);
  await expect(page.locator("#onboarding-profile-form input:not([type=checkbox])")).toHaveCount(5);
  await expect(page.locator("#onboarding-profile-form textarea")).toHaveCount(3);
  await expect(page.locator(".profile-next button")).toBeDisabled();
  await page.locator("input[name=name]").fill("Sarah Jones ACA");
  await page.locator("textarea[name=responsibilities]").fill("I prepare accounts and advise trustees.");
  await page.locator("textarea[name=discovery]").fill("A colleague at a conference.");
  await page.locator("textarea[name=concerns]").fill("Making time for thoughtful advice.");
  await choose(page);
  await expect(page.locator(".profile-next button")).toBeEnabled();
  expect(service.state().facts.organisation).toBe("Burton Sweet");
  expect(service.state().charity.confirmed?.name).toBe(charity.name);
  await page.getByRole("button", { name: "Talk to us", exact: true }).click();
  await expect(page.locator("input[name=name]")).toHaveValue("Sarah Jones ACA");
  await expect(page.locator("textarea[name=discovery]")).toHaveValue("A colleague at a conference.");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `test-results/flagship-${info.project.name}-complete.png`, fullPage: true });
  await form(page);
  await page.locator(".profile-next button").click();
  const passwordField = page.getByLabel("Choose a password");
  const confirmationField = page.getByLabel("Confirm your password");
  await expect(page.locator(".onboarding-account-dialog")).toContainText("At least 8 characters");
  await passwordField.fill("Seven77");
  await confirmationField.fill("Seven77");
  expect(await passwordField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  expect(await confirmationField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
  await passwordField.fill("Eight888");
  await confirmationField.fill("Eight888");
  expect(await passwordField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  expect(await confirmationField.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.locator(".onboarding-account-dialog")).toContainText("Check your inbox");
  expect(service.registration()?.password).toBe("Eight888");
  expect(service.registration()?.name).toBe("Sarah Jones ACA");
  const onboarding = (service.registration()?.progress as {onboarding:{facts:{discovery:string};selected:Candidate}}).onboarding;
  expect(onboarding.facts.discovery).toBe("A colleague at a conference.");
  expect(onboarding.selected.name).toBe(charity.name);
  await expect(page.getByRole("link", { name: "Sign in after verifying" })).toHaveAttribute("href", /ask-sorp/);
});
test("manual corrections travel with Send without an extra save request", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "The full editable form is collapsed on mobile");
  const service = await fixture(page, 800);
  await open(page);
  await page.locator('input[name=organisation]').fill("Burton Sweet");
  await page.locator("#introduction-answer").fill("I’m Sarah Jones, an accountant. My email is sarah@example.com.");
  await page.locator(".onboarding-send").click();
  await expect(page.locator(".conversation-activity")).toBeVisible();
  await expect(page.locator("#introduction-answer")).toBeEnabled();
  expect(service.state().facts.organisation).toBe("Burton Sweet");
  expect(service.actions().filter(action => action === "edit")).toHaveLength(0);
});
test("a repeated assistant reply appears only once, as the current reply", async ({ page }) => {
  const service = await fixture(page);
  await open(page);
  await send(page, "I’m Sarah Jones, an accountant at Burton Sweet.");
  await page.route("**/api/onboarding/turn/", async route => {
    const state = advance(service.state(), extractImmediate("sarah@example.com", service.state()));
    const repeated = nextQuestion(state);
    await route.fulfill({ json: { state, messages: [
      { role: "user", text: "I’m Sarah Jones, an accountant at Burton Sweet." },
      { role: "assistant", text: repeated },
      { role: "user", text: "sarah@example.com" },
      { role: "assistant", text: repeated },
    ] } });
  });
  await send(page, "sarah@example.com");
  const question = await page.locator(".conversation-question h2").innerText();
  await expect(page.locator(".conversation-thread")).toContainText(question);
  await expect(page.locator(".conversation-thread .history-assistant")).toHaveCount(0);
});
test("manual route requires charity, allows optional blanks, preserves return route and has no overflow", async ({ page }, info) => {
  await fixture(page); await open(page); await form(page);
  for (const [key, value] of Object.entries({ name: "Alex Rowan", email: "alex@example.com", role: "Trustee", organisation: "Cedar Advisory" })) await page.locator(`#onboarding-profile-form input[name=${key}]`).fill(value);
  await expect(page.locator(".profile-next button")).toBeDisabled();
  await page.getByLabel("I work independently").check();
  await expect(page.locator("input[name=organisation]")).toHaveValue("Independent");
  await choose(page);
  await expect(page.locator(".profile-next button")).toBeEnabled();
  await expect(page.locator("textarea[name=concerns]")).toHaveValue("");
  const results = await new AxeBuilder({ page }).include(".onboarding-page").analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `test-results/flagship-${info.project.name}-manual.png`, fullPage: true });
  await page.getByRole("button", { name: "Change charity" }).click();
  await expect(page.locator(".profile-next button")).toBeDisabled();
  await page.reload();
  await form(page);
  await expect(page.locator(".profile-next button")).toBeDisabled();
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Log in", exact: true }).last()).toHaveAttribute("href", /next=.*ask-sorp/);
});
test("trustee and employer remain distinct; optional conversation answers populate the same editable boxes", async ({ page }) => {
  await fixture(page); await open(page);
  await send(page, "I’m Alex Jones, a trustee at Interim Spaces. I work for Cedar Advisory. My email is alex@example.com.");
  await expect(page.locator("input[name=organisation]")).toHaveValue("Cedar Advisory");
  await form(page); await choose(page);
  await page.getByRole("button", { name: "Talk to us", exact: true }).click();
  await send(page, "I manage reporting and advise trustees.");
  await expect(page.locator("textarea[name=responsibilities]")).toHaveValue("I manage reporting and advise trustees");
  await send(page, "I heard about you through a colleague.");
  await expect(page.locator("textarea[name=discovery]")).toHaveValue("a colleague");
  await expect(page.locator(".conversation-question")).toContainText("What’s your main challenge at the moment? Or, to put it another way, what keeps you up at night?");
  await send(page, "My biggest challenge is reporting deadlines.");
  await expect(page.locator("textarea[name=concerns]")).toHaveValue("reporting deadlines");
});
test("reduced motion keeps progress usable and service errors remain visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fixture(page, 1200); await open(page);
  await page.locator("#introduction-answer").fill(intro); await page.locator(".onboarding-send").click();
  expect(await page.locator(".activity-dots i").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.locator("#introduction-answer")).toBeEnabled();
  await page.route("**/api/onboarding/turn/", route => route.fulfill({ status: 503, json: { error: "Service temporarily unavailable. Please retry." } }));
  await send(page, "Please use Interim Spaces");
  await expect(page.locator(".onboarding-notice")).toContainText("Please retry");
  await expect(page.locator("#onboarding-profile-form input[name=email]")).toHaveValue("sarah@example.com");
  await expect(page.locator("#introduction-answer")).toHaveValue("Please use Interim Spaces");
});

test.describe("microphone browser contract", () => {
  test("actual MediaRecorder lifecycle with fixture transcription and editable text", async ({ page, context }, info) => {
    test.skip(info.project.name === "mobile", "Desktop Chromium microphone simulation, not native iPhone Safari");
    await context.grantPermissions(["microphone"]);
    await fixture(page); await open(page);
    await page.getByRole("button", { name: "Record your answer" }).click();
    await expect(page.locator(".voice-recording")).toBeVisible();
    await expect(page.locator(".voice-wave")).toBeVisible();
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: "Stop recording" }).click();
    await expect(page.locator(".voice-transcribing")).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/flagship-desktop-transcribing.png", fullPage: true });
    await expect(page.locator("#introduction-answer")).toHaveValue(intro);
    await page.locator("#introduction-answer").fill(intro.replace("Sarah Jones", "Sarah Jones ACA"));
    await page.locator(".onboarding-send").click();
    await expect(page.locator("input[name=name]")).toHaveValue("Sarah Jones ACA");
  });
});
