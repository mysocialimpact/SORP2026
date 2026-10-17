import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip(process.env.FOUNDER_SHELL_E2E !== "true", "Requires the disposable local founder-auth responder.");

const dashboard = {
  founder: { email: "founder-shell@sorp2026.test", name: "Founder Test" },
  metrics: {
    organisations: 1, activeUsers: 1, registeredUsers: 1, newOrganisationsThisWeek: 0,
    recentlyActiveOrganisations: 1, organisationsAssessing: 1, complimentaryAccounts: 0,
    pendingInvitations: 1, activeSubscriptions: 0,
    planCounts: { Free: 1, Plus: 0, Adviser: 0, Enterprise: 0 }, source: "isolated-shell-fixture",
  },
  organisations: [{
    id: "brainstrust", platform_organisation_id: "brainstrust", name: "Brainstrust", type: "Charity",
    plan: "Free", published_price: 0, payable_price: 0, complimentary: false, primary_email: "will@example.invalid",
    member_count: 1, progress: 42, last_activity: "2026-10-14T10:00:00Z", products: { readiness: "in_progress" },
  }],
  users: [{ id: "will", name: "Will Jones", email: "will@example.invalid", organisationId: "brainstrust", organisationName: "Brainstrust", role: "owner" }],
  invitations: [
    { id:"invite-pending", organisation_id:"brainstrust", email:"gareth@example.invalid", role:"member", status:"sent", created_at:"2026-10-14T09:00:00Z", last_sent_at:"2026-10-14T09:01:00Z", delivery_id:"resend-test" },
    { id:"invite-failed", organisation_id:"brainstrust", email:"jess@example.invalid", role:"admin", status:"failed", created_at:"2026-10-13T09:00:00Z", last_sent_at:"2026-10-13T09:01:00Z", delivery_error:"Provider rejected recipient" },
    { id:"invite-accepted", organisation_id:"brainstrust", email:"will@example.invalid", role:"owner", status:"accepted", created_at:"2026-10-12T09:00:00Z", accepted_at:"2026-10-12T10:00:00Z" },
  ], clientAccess: [], activity: [], audit: [], attention: [], unavailable: [],
  products: {
    readiness: [{ id: "ready-1", accountId: "will", user: "Will Jones", organisationId: "brainstrust", organisation: "Brainstrust", status: "in_progress", percentage: 42, updatedAt: "2026-10-14T10:00:00Z" }],
    askSorp: { metrics: { users: 0, conversations: 0, questions: 0, completed: 0 }, users: [], topics: [], note: "No usage recorded." },
    impactReports: [], excellence: [], impactDirector: [],
  },
};

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: "founder-shell", value: "authorised", url: "http://127.0.0.1:3000" }]);
  await page.route("**/api/founder/**", async route => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, "");
    if (path.endsWith("/dashboard")) return route.fulfill({ json: dashboard });
    if (path.endsWith("/organisation/brainstrust")) return route.fulfill({ json: { organisation:dashboard.organisations[0], memberships:[], users:dashboard.users, clients:[], history:[], activity:[], products:dashboard.products } });
    if (path.endsWith("/plans")) return route.fulfill({ json: { plans: [], billingConnected: false, discountsConnected: false } });
    if (path.endsWith("/accountants")) return route.fulfill({ json: { firms: [], metrics: { total: 0, researched: 0, humanReviewed: 0, publicListings: 0, featured: 0 } } });
    if (path.includes("/feedback-metrics")) return route.fulfill({ json: { summary: {}, trends: [], recurring: [] } });
    if (path.includes("/feedback") || path.includes("/enquiries")) return route.fulfill({ json: { rows: [], total: 0, limit: 50, offset: 0 } });
    if (path.includes("/improvements")) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { error: "Unhandled isolated shell route" } });
  });
});

test("founder shell has one product navigation, one persistent administration row and no customer chrome", async ({ page }) => {
  await page.goto("/founder/");
  await expect(page.getByText("FOUNDER CONTROL CENTRE", { exact: true })).toBeVisible();
  await expect(page.locator(".founder-header")).toHaveCount(0);
  const wordmarkBox = await page.locator(".founder-mode-header .gateway-wordmark").boundingBox();
  const controlTitleBox = await page.locator(".founder-control-title").boundingBox();
  expect(wordmarkBox).not.toBeNull();
  expect(controlTitleBox).not.toBeNull();
  expect(controlTitleBox!.x).toBeGreaterThan(wordmarkBox!.x + wordmarkBox!.width);
  expect(Math.abs((controlTitleBox!.y + controlTitleBox!.height / 2) - (wordmarkBox!.y + wordmarkBox!.height / 2))).toBeLessThan(8);

  const productNavigation = page.getByRole("navigation", { name: "SORP2026 products" });
  const administration = page.getByRole("navigation", { name: "Founder administration" });
  await expect(productNavigation).toHaveCount(1);
  await expect(productNavigation.getByRole("link")).toHaveCount(6);
  await expect(administration).toHaveCount(1);
  await expect(administration.getByRole("link")).toHaveCount(5);
  expect(await page.locator(".platform-sticky-navigation").evaluate(element => getComputedStyle(element).position)).toBe("sticky");

  await expect(page.getByRole("link", { name: /View My Dashboard/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Our Mission|Find Accountants/ })).toHaveCount(0);
  await expect(page.getByText("Where you are.")).toHaveCount(0);
  await expect(page.locator(".shared-hello,.gateway-footer,.folder-action-bar")).toHaveCount(0);

  const productViews = [
    ["Are You SORP Ready?", "Readiness assessments"], ["Ask SORP", "Usage overview"],
    ["Charity Impact Reports", "Report workflow"], ["Social Impact Excellence", "Assessment progress"],
    ["My Impact Director", "Engagement overview"],
  ] as const;
  for (const [link, heading] of productViews) {
    await productNavigation.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  const adminViews = [
    ["Organisations & Users", "Account directory"], ["Accounts & Billing", "Plans and entitlements"],
    ["Accountants & Advisers", "Research and directory controls"], ["Feedback & Enquiries", "Errors & Feedback"],
    ["Platform Management", "Administration and audit"],
  ] as const;
  for (const [link, heading] of adminViews) {
    await administration.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
});

test("founder administration remains horizontally usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/founder/");
  const track = page.locator(".founder-admin-navigation-track");
  await expect(track).toBeVisible();
  expect(await track.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await track.getByRole("link", { name: "Platform Management" }).click();
  await expect(page.getByRole("heading", { name: "Administration and audit" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("organisation people shows invitation history, evidence and actions beneath the form", async ({ page }) => {
  await page.goto("/founder/");
  await page.getByRole("button", { name:/Brainstrust/ }).first().click();
  const drawer = page.getByRole("dialog", { name:"Brainstrust" });
  await expect(drawer.getByRole("heading", { name:"Registered people" })).toBeVisible();
  await expect(drawer.getByRole("heading", { name:"Invite someone" })).toBeVisible();
  await expect(drawer.getByRole("heading", { name:"Invitation tracker" })).toBeVisible();
  await expect(drawer.getByText("1 Accepted · 1 Awaiting acceptance · 1 Failed")).toBeVisible();
  await expect(drawer.getByText("gareth@example.invalid")).toBeVisible();
  await expect(drawer.getByText("Provider rejected recipient")).not.toBeVisible();
  await drawer.getByText("View failure details").click();
  await expect(drawer.getByText("Provider rejected recipient")).toBeVisible();
  await expect(drawer.getByRole("button", { name:"Resend invitation" })).toBeVisible();
  await expect(drawer.getByRole("button", { name:"Retry sending" })).toBeVisible();
  await expect(drawer.getByRole("button", { name:"View user" }).first()).toBeVisible();
});

test("founder chooses a complimentary plan for any number of days, weeks or months", async ({ page }) => {
  await page.goto("/founder/");
  await page.getByRole("button", { name:/Brainstrust/ }).first().click();
  const drawer = page.getByRole("dialog", { name:"Brainstrust" });
  const form = drawer.getByRole("heading", { name:"Subscription and access" }).locator("..").locator("form");
  await form.getByLabel("Plan").selectOption("Plus");
  await form.getByLabel("Complimentary access").check();
  await form.getByLabel("Duration").selectOption("period");
  await form.getByLabel("Length").fill("6");
  await form.getByLabel("Unit").selectOption("weeks");
  const request = page.waitForRequest(value => value.url().endsWith("/organisation/brainstrust/plan"));
  await form.getByRole("button", { name:"Save entitlement" }).click();
  expect((await request).postDataJSON()).toMatchObject({ plan:"Plus", complimentary:true, duration:"period", durationAmount:"6", durationUnit:"weeks" });
});
