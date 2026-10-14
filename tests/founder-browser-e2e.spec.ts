import { expect, test, type BrowserContext, type Page } from "@playwright/test";

test.skip(process.env.FOUNDER_E2E !== "true", "Requires the isolated Founder E2E auth, mail and database services.");

const founder = { email: "founder-e2e@sorp2026.test", password: "IsolatedFounder!2026" };
const run = Date.now();
const adviser = { email: `adviser-${run}@sorp2026.test`, password: "IsolatedAdviser!2026", name: "Alex Test" };
const charity = { email: `charity-${run}@sorp2026.test`, password: "IsolatedCharity!2026", name: "Casey Test" };

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login/");
  const portal = page.locator(".account-portal");
  await expect(portal.getByRole("status", { name: /Checking your account/ })).toBeHidden();
  await portal.getByLabel("Email address").fill(account.email);
  await portal.getByLabel("Password").fill(account.password);
  await portal.getByRole("button", { name: /Log in to SORP2026/ }).click();
}

async function createOrganisation(page: Page, name: string, type: "Charity" | "Adviser") {
  const answers = [name, type];
  page.on("dialog", async dialog => dialog.accept(answers.shift() || ""));
  await page.getByRole("button", { name: /New organisation/ }).click();
  await expect(page.getByRole("status")).toContainText("Organisation created");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  page.removeAllListeners("dialog");
}

async function manage(page: Page, name: string) {
  await page.getByPlaceholder("Search organisations").fill(name);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Manage/ }).click();
  return page.getByRole("dialog");
}

async function setPlan(page: Page, name: string, plan: string, duration: string, reason: string) {
  const dialog = await manage(page, name);
  const form = dialog.getByRole("heading", { name: "Plan and complimentary access" }).locator("..").locator("form");
  await form.getByLabel("Plan").selectOption(plan);
  await form.getByLabel("Complimentary access").check();
  await form.getByLabel("Duration").selectOption(duration);
  await form.getByLabel("Reason").fill(reason);
  await form.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Entitlement updated");
}

async function inviteFromFounder(page: Page, organisation: string, email: string) {
  const dialog = await manage(page, organisation);
  const form = dialog.getByRole("heading", { name: "Invite a person" }).locator("..").locator("form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Role").selectOption("owner");
  await form.getByRole("button", { name: /Send invitation email/ }).click();
  await expect(page.getByRole("status")).toContainText(`Invitation email sent to ${email}`);
  const message = await page.request.get("http://127.0.0.1:4181/mail/latest").then(r => r.json());
  expect(message.email).toBe(email);
  expect(message.link).toContain("/invitation/");
  await dialog.getByRole("button", { name: "Close" }).click();
  return message.link as string;
}

async function signupAndAccept(context: BrowserContext, invitationLink: string, account: { email: string; password: string; name: string }) {
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  await page.goto(new URL(invitationLink).pathname);
  await expect(page.getByRole("heading", { name: "You’re invited." })).toBeVisible();
  await page.getByRole("link", { name: /Sign in to accept/ }).click();
  const portal = page.locator(".account-portal");
  await portal.getByRole("tab", { name: "Create account" }).click();
  await portal.getByLabel("Your name").fill(account.name);
  await portal.getByLabel("Your role").selectOption({ index: 1 });
  await portal.getByLabel("Email address").fill(account.email);
  await portal.getByLabel("Password", { exact: true }).fill(account.password);
  await portal.getByLabel("Confirm password").fill(account.password);
  await portal.getByRole("button", { name: /Create my SORP2026 account/ }).click();
  await expect(page.getByRole("heading", { name: "You’re invited." })).toBeVisible();
  await page.getByRole("button", { name: /Accept invitation/ }).click();
  await expect(page.getByRole("status")).toContainText("accepted");
  return page;
}

test("founder can administer plans, invitations and consent-based adviser access", async ({ browser, page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(10_000);
  await login(page, founder);
  await expect(page).toHaveURL(/\/founder\//);
  await expect(page.getByRole("heading", { name: "Control the platform." })).toBeVisible();
  await page.getByRole("link", { name: /Back to My Dashboard/ }).click();
  await expect(page.getByRole("link", { name: /Open Founder Control Centre/ })).toBeVisible();
  await page.getByRole("link", { name: /Open Founder Control Centre/ }).click();

  await createOrganisation(page, "Test Adviser Ltd", "Adviser");
  await createOrganisation(page, "Test Charity Ltd", "Charity");
  await createOrganisation(page, "Unrelated Charity Ltd", "Charity");

  await setPlan(page, "Test Adviser Ltd", "Adviser", "30", "30-day isolated browser test");
  await setPlan(page, "Test Charity Ltd", "Plus", "90", "90-day isolated browser test");
  await page.getByPlaceholder("Search organisations").fill("");
  const adviserRow = page.getByRole("row", { name: /Test Adviser Ltd/ });
  await expect(adviserRow).toContainText("Adviser");
  await expect(adviserRow).toContainText("£99/month");
  await expect(adviserRow).toContainText("Complimentary");
  const charityRow = page.getByRole("row", { name: /Test Charity Ltd/ });
  await expect(charityRow).toContainText("Plus");
  await expect(charityRow).toContainText("£29/month");

  const adviserLink = await inviteFromFounder(page, "Test Adviser Ltd", adviser.email);
  const adviserContext = await browser.newContext();
  const adviserPage = await signupAndAccept(adviserContext, adviserLink, adviser);
  const charityLink = await inviteFromFounder(page, "Test Charity Ltd", charity.email);
  const charityContext = await browser.newContext();
  const charityPage = await signupAndAccept(charityContext, charityLink, charity);

  const founderDashboard = await page.request.get("/api/founder/dashboard").then(r => r.json());
  const testAdviser = founderDashboard.organisations.find((o: { name: string }) => o.name === "Test Adviser Ltd");
  const testCharity = founderDashboard.organisations.find((o: { name: string }) => o.name === "Test Charity Ltd");
  const unrelated = founderDashboard.organisations.find((o: { name: string }) => o.name === "Unrelated Charity Ltd");
  expect(testAdviser.platform_organisation_id).toBeTruthy();
  expect(testCharity.platform_organisation_id).toBeTruthy();

  await charityPage.request.post("/api/readiness-account/", { data: { action: "save", progress: { state: { charityName: "Test Charity Ltd", currentStage: 3, completedStages: [1, 2] }, answers: { charity_name: "Test Charity Ltd", threshold: "above-500k" } } } });

  const relationDialog = await manage(page, "Test Adviser Ltd");
  const relationForm = relationDialog.getByRole("heading", { name: "Request client access" }).locator("..").locator("form");
  await relationForm.getByLabel("Charity").selectOption(testCharity.id);
  await relationForm.getByLabel("View individual answers").check();
  await relationForm.getByRole("button", { name: /Request charity approval/ }).click();
  await expect(page.getByRole("status")).toContainText("charity owner must approve");
  await relationDialog.getByRole("button", { name: "Close" }).click();

  await charityPage.goto("/dashboard/");
  await expect(charityPage.getByText("Test Adviser Ltd has requested access.")).toBeVisible();
  await charityPage.getByRole("button", { name: "Approve access" }).click();
  await expect(charityPage.getByRole("status")).toContainText("approved");

  await adviserPage.goto("/adviser/");
  await expect(adviserPage.getByRole("heading", { name: "Test Adviser Ltd" })).toBeVisible();
  await expect(adviserPage.getByText("Complimentary Partner")).toBeVisible();
  await expect(adviserPage.getByText("£0/month")).toBeVisible();
  await expect(adviserPage.getByText("Published value £99/month")).toBeVisible();
  const clientCard = adviserPage.locator("article", { hasText: "Test Charity Ltd" });
  await expect(clientCard).toContainText("Authorised");
  await clientCard.getByRole("button", { name: /Open client workspace/ }).click();
  await expect(adviserPage.getByRole("dialog")).toContainText("Stage 3");
  await expect(adviserPage.getByRole("dialog")).toContainText("charity_name");

  const denied = await adviserPage.request.post("/api/readiness-account/", { data: { action: "adviser-client", adviserOrganisationId: testAdviser.platform_organisation_id, charityOrganisationId: unrelated.platform_organisation_id } });
  expect(denied.status()).toBe(403);

  await charityPage.goto("/dashboard/");
  await expect(charityPage.getByText("Test Adviser Ltd can access Test Charity Ltd.")).toBeVisible();
  await charityPage.getByRole("button", { name: "Revoke access" }).click();
  await expect(charityPage.getByRole("status")).toContainText("revoked");
  const revoked = await adviserPage.request.post("/api/readiness-account/", { data: { action: "adviser-client", adviserOrganisationId: testAdviser.platform_organisation_id, charityOrganisationId: testCharity.platform_organisation_id } });
  expect(revoked.status()).toBe(403);

  await page.bringToFront();
  await setPlan(page, "Test Charity Ltd", "Plus", "indefinite", "Extended in isolated browser test");
  let row = page.getByRole("row", { name: /Test Charity Ltd/ });
  await expect(row).toContainText("Complimentary");
  const revokeDialog = await manage(page, "Test Charity Ltd");
  page.once("dialog", dialog => dialog.accept());
  await revokeDialog.getByRole("button", { name: /Revoke and move to Free/ }).click();
  await expect(page.getByRole("status")).toContainText("no payment was initiated");
  row = page.getByRole("row", { name: /Test Charity Ltd/ });
  await expect(row).toContainText("Free");
  await expect(row).toContainText("£0/month");
  const saved = await charityPage.request.get("/api/readiness-account/").then(r => r.json());
  expect(saved.progress.state.currentStage).toBe(3);
  expect(saved.progress.answers.charity_name).toBe("Test Charity Ltd");

  const customDialog = await manage(page, "Test Adviser Ltd");
  const customForm = customDialog.getByRole("heading", { name: "Plan and complimentary access" }).locator("..").locator("form");
  await customForm.getByLabel("Plan").selectOption("Adviser");
  await customForm.getByLabel("Complimentary access").check();
  await customForm.getByLabel("Duration").selectOption("custom");
  await customForm.getByLabel("Custom expiry (optional)").fill("2027-06-30");
  await customForm.getByLabel("Reason").fill("Custom isolated browser test");
  await customForm.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Entitlement updated");
  const enterpriseDialog = await manage(page, "Test Adviser Ltd");
  const enterpriseForm = enterpriseDialog.getByRole("heading", { name: "Plan and complimentary access" }).locator("..").locator("form");
  await enterpriseForm.getByLabel("Plan").selectOption("Enterprise");
  await enterpriseForm.getByLabel("Complimentary access").uncheck();
  await enterpriseForm.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Entitlement updated");
  await page.getByPlaceholder("Search organisations").fill("");
  await expect(page.getByRole("row", { name: /Test Adviser Ltd/ })).toContainText("Enterprise");

  await page.getByPlaceholder("Search organisations").fill("");
  await expect(page.getByText("complimentary_access_revoked", { exact: true })).toBeVisible();
  await expect(page.getByText("client_access_changed", { exact: true })).toBeVisible();
  await adviserContext.close();
  await charityContext.close();
});

test("founder interface remains usable at iPhone width", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, founder);
  await expect(page).toHaveURL(/\/founder\//);
  await expect(page.getByRole("heading", { name: "Control the platform." })).toBeVisible();
  await page.getByPlaceholder("Search organisations").fill("Test Adviser Ltd");
  await page.getByRole("row", { name: /Test Adviser Ltd/ }).getByRole("button", { name: /Manage/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /Save entitlement/ })).toBeVisible();
});
