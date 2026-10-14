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
  await page.getByRole("link", { name: /Organisations & Users/ }).click();
  await page.getByRole("button", { name: /New organisation/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Organisation name").fill(name);
  await dialog.getByLabel("Organisation type").selectOption(type);
  await dialog.getByRole("button", { name: /Create live organisation/ }).click();
  await expect(page.getByRole("status")).toContainText("Organisation created");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
}

async function manage(page: Page, name: string) {
  const existing = page.getByRole("dialog");
  if (await existing.isVisible().catch(() => false)) await existing.getByRole("button", { name: "Close" }).click();
  await page.getByRole("link", { name: /Organisations & Users/ }).click();
  await page.getByPlaceholder("Name, type or email").fill(name);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Open/ }).click();
  return page.getByRole("dialog");
}

async function setPlan(page: Page, name: string, plan: string, duration: string, reason: string) {
  const dialog = await manage(page, name);
  const form = dialog.getByRole("heading", { name: "Plan and access" }).locator("..").locator("form");
  await form.getByLabel("Plan").selectOption(plan);
  await form.getByLabel("Complimentary access").check();
  await form.getByLabel("Duration").selectOption(duration);
  await form.getByLabel("Internal reason").fill(reason);
  await form.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Plan and entitlement updated");
  await dialog.getByRole("button", { name: "Close" }).click();
}

async function inviteFromFounder(page: Page, organisation: string, email: string) {
  const dialog = await manage(page, organisation);
  const form = dialog.getByRole("heading", { name: "People" }).locator("..").locator("form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel("Role").selectOption("owner");
  await form.getByRole("button", { name: /Send invitation email/ }).click();
  await expect(page.getByRole("status")).toContainText(`Invitation sent to ${email}`);
  const message = await page.request.get("http://localhost:4181/mail/latest").then(r => r.json());
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
  await expect(page.getByRole("heading", { name: "FOUNDER CONTROL CENTRE" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "SORP2026 products" }).getByRole("link")).toHaveCount(6);
  await expect(page.getByRole("navigation", { name: "Founder administration" }).getByRole("link")).toHaveCount(5);
  await expect(page.getByText("Where you are.")).toHaveCount(0);
  await expect(page.locator(".shared-hello,.gateway-footer,.folder-action-bar")).toHaveCount(0);
  await page.getByRole("link", { name: /View My Dashboard/ }).click();
  await expect(page.getByRole("link", { name: /^Founder/ })).toBeVisible();
  await page.getByRole("link", { name: /^Founder/ }).click();

  await createOrganisation(page, "Test Adviser Ltd", "Adviser");
  await createOrganisation(page, "Test Charity Ltd", "Charity");
  await createOrganisation(page, "Unrelated Charity Ltd", "Charity");

  await setPlan(page, "Test Adviser Ltd", "Adviser", "30", "30-day isolated browser test");
  await setPlan(page, "Test Charity Ltd", "Plus", "90", "90-day isolated browser test");
  await page.getByPlaceholder("Name, type or email").fill("");
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
  const relationForm = relationDialog.getByRole("heading", { name: "Authorised clients" }).locator("..").locator("form");
  await relationForm.getByLabel("Charity").selectOption(testCharity.id);
  await relationForm.getByLabel("View individual answers").check();
  await relationForm.getByRole("button", { name: /Request charity approval/ }).click();
  await expect(page.getByRole("status")).toContainText("charity owner approves");
  await relationDialog.getByRole("button", { name: "Close" }).click();

  await charityPage.goto("/settings/#access");
  await expect(charityPage.getByRole("heading", { name: "Test Adviser Ltd → Test Charity Ltd" })).toBeVisible();
  await charityPage.getByRole("button", { name: "Approve", exact: true }).click();
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

  await charityPage.goto("/settings/#access");
  await expect(charityPage.getByRole("heading", { name: "Test Adviser Ltd → Test Charity Ltd" })).toBeVisible();
  charityPage.once("dialog", dialog => dialog.accept());
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
  const customForm = customDialog.getByRole("heading", { name: "Plan and access" }).locator("..").locator("form");
  await customForm.getByLabel("Plan").selectOption("Adviser");
  await customForm.getByLabel("Complimentary access").check();
  await customForm.getByLabel("Duration").selectOption("custom");
  await customForm.getByLabel("Custom expiry", { exact: true }).fill("2027-06-30");
  await customForm.getByLabel("Internal reason").fill("Custom isolated browser test");
  await customForm.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Plan and entitlement updated");
  await customDialog.getByRole("button", { name: "Close" }).click();
  const enterpriseDialog = await manage(page, "Test Adviser Ltd");
  const enterpriseForm = enterpriseDialog.getByRole("heading", { name: "Plan and access" }).locator("..").locator("form");
  await enterpriseForm.getByLabel("Plan").selectOption("Enterprise");
  await enterpriseForm.getByLabel("Complimentary access").uncheck();
  await enterpriseForm.getByRole("button", { name: /Save entitlement/ }).click();
  await expect(page.getByRole("status")).toContainText("Plan and entitlement updated");
  await enterpriseDialog.getByRole("button", { name: "Close" }).click();
  await page.getByPlaceholder("Name, type or email").fill("");
  await expect(page.getByRole("row", { name: /Test Adviser Ltd/ })).toContainText("Enterprise");

  await page.getByRole("link", { name: /Platform Management/ }).click();
  await expect(page.getByText("complimentary_access_revoked", { exact: true })).toBeVisible();
  await expect(page.getByText("client_access_changed", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: /Accountants & Advisers/ }).click();
  await page.getByPlaceholder("Firm, town or domain").fill("Burton Sweet");
  const firmRow = page.getByRole("row", { name: /Burton Sweet/ });
  const scoreBefore = await firmRow.locator("td").nth(2).textContent();
  await firmRow.getByRole("button", { name: /Manage/ }).click();
  const firmDialog = page.getByRole("dialog");
  await firmDialog.getByLabel("Human Reviewed").check();
  await firmDialog.getByLabel("Review note").fill("Evidence report checked in the isolated founder browser test.");
  await firmDialog.getByLabel("Visible in public directory").check();
  await firmDialog.getByLabel("Featured placement").check();
  await firmDialog.getByLabel("Featured priority").fill("90");
  await firmDialog.getByLabel("Public placement label").fill("Featured — isolated test");
  await firmDialog.getByRole("button", { name: /Save directory controls/ }).click();
  await expect(page.getByRole("status")).toContainText("Independent research scores were not changed");
  await firmDialog.getByRole("button", { name: "Close" }).click();
  await expect(firmRow).toContainText("Reviewed");
  await expect(firmRow).toContainText("Featured 90");
  expect(await firmRow.locator("td").nth(2).textContent()).toBe(scoreBefore);
  const directoryHtml = await page.request.get("/accountants-advisers/").then(response => response.text());
  expect(directoryHtml).toContain("Featured — isolated test");
  expect(directoryHtml).toContain("Research reviewed by a human");

  await firmRow.getByRole("button", { name: /Manage/ }).click();
  await firmDialog.getByLabel("Human Reviewed").uncheck();
  // Restore the curated launch feature after exercising founder placement.
  await firmDialog.getByLabel("Featured placement").check();
  await firmDialog.getByLabel("Featured priority").fill("0");
  await firmDialog.getByLabel("Public placement label").fill("Editorial launch feature");
  await firmDialog.getByRole("button", { name: /Save directory controls/ }).click();
  await expect(page.getByRole("status")).toContainText("Directory controls saved");
  await adviserContext.close();
  await charityContext.close();
});

test("founder interface remains usable at iPhone width", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, founder);
  await expect(page).toHaveURL(/\/founder\//);
  await expect(page.getByRole("heading", { name: "FOUNDER CONTROL CENTRE" })).toBeVisible();
  const adminNavigation = page.getByRole("navigation", { name: "Founder administration" });
  await expect(adminNavigation).toBeVisible();
  expect(await adminNavigation.locator(".founder-admin-navigation-track").evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await adminNavigation.getByRole("link", { name: /Organisations & Users/ }).click();
  await page.getByPlaceholder("Name, type or email").fill("Test Adviser Ltd");
  await page.getByRole("row", { name: /Test Adviser Ltd/ }).getByRole("button", { name: /Open/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /Save entitlement/ })).toBeVisible();
});
