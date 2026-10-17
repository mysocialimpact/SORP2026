import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const productPages = [
  ["/my-impact-director/", "Your Impact Director.Without thefull-time salary."],
  ["/social-impact-excellence/", "Social Impact Excellence"],
  ["/charity-impact-reports/", "Go beyond SORP.Tell the full story of your impact."],
] as const;

test("public Social Impact Excellence is transparent, concise and starts with SORP readiness", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ status: 401, json: { signedIn: false } }));
  await page.goto("/social-impact-excellence/");
  const publicPage = page.locator(".excellence-public");
  await expect(publicPage.getByRole("img", { name: "My Social Impact" })).toBeVisible();
  await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText("Social Impact Excellence");
  await expect(publicPage).toContainText("embedded as a management discipline");
  await expect(publicPage.locator(".excellence-public-pillars li h3")).toHaveText(["Purpose", "Leadership", "Data", "Delivery", "Communications"]);
  await expect(publicPage.locator(".excellence-public-journey li h3")).toHaveText(["Maturity Assessment", "Diagnostic", "Blueprint", "Roadmap"]);
  await expect(publicPage.getByRole("heading", { name: "Compliance first. Excellence next." })).toBeVisible();
  await expect(publicPage.getByRole("link", { name: /Start with Are You SORP Ready/ })).toHaveAttribute("href", "/are-you-sorp-ready/");
  await expect(publicPage.getByRole("link", { name: /Already registered/ })).toHaveAttribute("href", "/login/?return=/social-impact-excellence/");
  await expect(publicPage.locator('a[href="/social-impact-excellence/assessment/"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

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

test("global registration uses central onboarding and the existing account service", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: false } });
    writes.push(route.request().postDataJSON());
    return route.fulfill({ status: 202, json: { verificationRequired: true } });
  });
  await page.route("**/api/onboarding/start/", route => route.fulfill({status:503,json:{error:"Fixture has no conversation service"}}));
  await page.goto("/login/?mode=signup&return=/dashboard/");
  await expect(page).toHaveURL(/get-started/);
  await expect(page.getByRole("link", { name: /Google/i })).toHaveCount(0);
  await page.getByRole("button",{name:"Fill in the form yourself"}).click();
  await page.locator(".onboarding-profile input[name=name]").fill("QA Person");
  await page.locator(".onboarding-profile input[name=role]").fill("TRUSTEE / CHAIR");
  await page.locator(".onboarding-profile input[name=email]").fill("qa@example.invalid");
  await page.locator(".profile-next").getByRole("button",{name:/Create my account/}).click();
  await page.getByLabel("Choose a password").fill("Safe password 123");
  await page.getByLabel("Confirm your password").fill("Safe password 123");
  await page.locator("dialog").getByRole("button", { name: /Create my account/ }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ action: "signup", email: "qa@example.invalid", position: "TRUSTEE / CHAIR" });
  expect((writes[0].progress as Record<string, unknown>).step).toBe("scope");
});

test("a new invitee sees the organisation and returns through the existing signup", async ({ page }) => {
  const token = "a".repeat(64);
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: false } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "invitation-preview") return route.fulfill({ json: { invitation: { email:"invitee@example.org",role:"owner",status:"sent",organisationId:"fluid-adviser",organisationName:"FLUID",organisationType:"Adviser",expiresAt:"2026-10-28T12:00:00Z" } } });
    writes.push(input);
    return route.fulfill({ status: 201, json: { account: { email:"invitee@example.org" } } });
  });
  await page.goto(`/invitation/${token}/`);
  await expect(page.getByRole("heading", { name:"You’re invited to join FLUID." })).toBeVisible();
  await expect(page.getByRole("link", { name:"Sign up to accept invitation →" })).toBeVisible();
  await expect(page.getByRole("link", { name:"Already have an account? Log in" })).toBeVisible();
  await page.getByRole("link", { name:"Sign up to accept invitation →" }).click();
  await expect(page).toHaveURL(new RegExp(`/login/.*mode=signup`));
  await expect(page.getByRole("main").getByLabel("Email address")).toHaveValue("invitee@example.org");
  await expect(page.getByRole("main").getByLabel("Email address")).toHaveAttribute("readonly", "");
  await page.getByLabel("Your name").fill("Invited Person");
  await page.getByLabel("Your role").selectOption("ACCOUNTANT / AUDITOR / ADVISER");
  await page.getByLabel("Password", { exact:true }).fill("Safe password 123");
  await page.getByLabel("Confirm password").fill("Safe password 123");
  await page.getByRole("button", { name:"Create my SORP2026 account →" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ action:"signup",email:"invitee@example.org",invitationToken:token });
});

test("an existing invitee keeps invitation context through login", async ({ page }) => {
  const token = "b".repeat(64);
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json:{ signedIn:false } });
    return route.fulfill({ json:{ invitation:{ email:"member@example.org",role:"member",status:"sent",organisationId:"fluid-adviser",organisationName:"FLUID",organisationType:"Adviser",expiresAt:"2026-10-28T12:00:00Z" } } });
  });
  await page.goto(`/invitation/${token}/`);
  const login = page.getByRole("link", { name:"Already have an account? Log in" });
  await expect(login).toHaveAttribute("href", new RegExp(`mode=login.*${token}`));
  await login.click();
  await expect(page.getByRole("tab", { name:"Log in" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("main").getByLabel("Email address")).toHaveValue("member@example.org");
});

test("the wrong signed-in email cannot accept an invitation", async ({ page }) => {
  const token = "c".repeat(64);
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json:{ signedIn:true,account:{ email:"wrong@example.org" } } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "invitation-preview") return route.fulfill({ json:{ invitation:{ email:"member@example.org",role:"member",status:"sent",organisationId:"fluid-adviser",organisationName:"FLUID",organisationType:"Adviser",expiresAt:"2026-10-28T12:00:00Z" } } });
    writes.push(input);
    return route.fulfill({ json:{ ok:true } });
  });
  await page.goto(`/invitation/${token}/`);
  await expect(page.getByText(/signed in with a different account/)).toBeVisible();
  await expect(page.getByRole("button", { name:/Accept invitation/ })).toHaveCount(0);
  await page.getByRole("button", { name:"Switch account securely →" }).click();
  await expect.poll(() => writes).toContainEqual({ action:"logout" });
});

for (const inviteStatus of ["expired", "revoked"] as const) {
  test(`${inviteStatus} invitations cannot continue`, async ({ page }) => {
    const token = (inviteStatus === "expired" ? "d" : "e").repeat(64);
    await page.route("**/api/readiness-account/**", async route => {
      if (route.request().method() === "GET") return route.fulfill({ json:{ signedIn:false } });
      return route.fulfill({ json:{ invitation:{ email:"member@example.org",role:"member",status:inviteStatus,organisationId:"fluid-adviser",organisationName:"FLUID",organisationType:"Adviser",expiresAt:"2026-10-01T12:00:00Z" } } });
    });
    await page.goto(`/invitation/${token}/`);
    await expect(page.getByText(`This invitation is ${inviteStatus}.`, { exact:false })).toBeVisible();
    await expect(page.getByRole("link", { name:/Sign up to accept/ })).toHaveCount(0);
  });
}

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
  await expect(progressOverview.getByText("SORP Readiness", { exact: true })).toBeVisible();
  const readinessProgress = progressOverview.getByRole("progressbar", { name: "SORP Readiness: In progress" });
  await expect(readinessProgress).toHaveAttribute("aria-valuenow", "63");
  await expect(progressOverview.locator("li").filter({ hasText: "Not yet started" })).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "You’re partway through your SORP assessment." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue assessment →" }).first()).toHaveAttribute("href", "/are-you-sorp-ready/review/");
  await expect(page.getByRole("heading", { name: "Focus here." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What changed." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings/");
  await expect(page.locator(".dashboard-card,.dashboard-products")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("account settings keeps delegated access out of the dashboard and confirms revocation", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "POST") { writes.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); }
    return route.fulfill({ json: { signedIn: true, account: { name: "Will Jones", email: "will@example.invalid", position: "CEO", organisation: "Brainstrust" }, platformAccess: { memberships: [{ organisationId: "brainstrust", name: "Brainstrust", type: "Charity", role: "owner", entitlement: { plan: "Free", payablePrice: 0 } }], activeClientAccess: [{ id: "access-1", adviserName: "FLUID", charityName: "Brainstrust", permissions: { progress: true, answers: true, edit: false, invitations: false } }] } } });
  });
  await page.goto("/settings/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Account settings.");
  const accessSettings = page.locator("#access");
  await expect(accessSettings.getByRole("heading", { name: "FLUID → Brainstrust" })).toBeVisible();
  await expect(accessSettings.getByText("Progress · Individual answers")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(page.getByRole("status")).toContainText("revoked");
  expect(writes).toContainEqual({ action: "client-access-decide", accessId: "access-1", decision: "deny" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("settings does not offer relationship controls for a charity the user cannot administer", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: {
    signedIn: true,
    account: { name: "Mixed Role", email: "mixed@example.invalid", organisation: "Member Charity" },
    platformAccess: {
      memberships: [
        { organisationId: "owned", name: "Owned Charity", type: "Charity", role: "owner" },
        { organisationId: "member", name: "Member Charity", type: "Charity", role: "member" },
      ],
      activeClientAccess: [{ id: "access-member", adviserName: "Careful Adviser", charityName: "Member Charity", charityOrganisationId: "member", permissions: { progress: true, answers: false, edit: false, invitations: false } }],
    },
  } }));
  await page.goto("/settings/#access");
  const accessSettings = page.locator("#access");
  await expect(accessSettings.getByText("View only · ask an organisation administrator to make changes.")).toBeVisible();
  await expect(accessSettings.getByRole("button", { name: "Revoke access" })).toHaveCount(0);
});

test("adviser dashboard prioritises its real client portfolio and links to an authorised organisation", async ({ page }) => {
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: {
      signedIn: true,
      account: { id: "fluid-user", name: "Alex Adviser", email: "alex@example.invalid", organisation: "FLUID" },
      platformAccess: { memberships: [{ organisationId: "fluid", name: "FLUID", type: "Adviser", role: "admin", entitlement: { plan: "Adviser", status: "active" } }] },
    } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "adviser-workspace") return route.fulfill({ json: {
      organisation: { name: "FLUID" },
      clients: [
        { organisationId: "brainstrust", name: "Brainstrust", status: "active", memberCount: 2, updatedAt: "2026-10-14T09:00:00Z", permissions: { progress: true, answers: true, edit: false, invitations: false } },
        { organisationId: "pending-charity", name: "Pending Charity", status: "pending", memberCount: 0, permissions: { progress: true, answers: false, edit: false, invitations: false } },
      ],
    } });
    if (input.action === "adviser-client") return route.fulfill({ json: { assessments: [{ accountId: "brain-user", currentStage: 3, completedStages: [1, 2], status: "in_progress", lastSavedAt: "2026-10-14T08:00:00Z" }] } });
    return route.fulfill({ status: 400, json: { error: "Unexpected test action" } });
  });
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { name: "Your client portfolio." })).toBeVisible();
  await expect(page.locator(".dashboard-overview dl div").filter({ hasText: "Authorised organisations" }).getByRole("definition")).toHaveText("1");
  await expect(page.locator(".dashboard-overview dl div").filter({ hasText: "Assessments in progress" }).getByRole("definition")).toHaveText("1");
  await expect(page.getByRole("heading", { name: "Continue with Brainstrust." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open organisation workspace →" })).toHaveAttribute("href", "/adviser/?client=brainstrust");
  await expect(page.getByText("SORP readiness · Stage 3 of 7")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
});

test("authenticated users can send page-attributed feedback before the shared Talk to us section", async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: {
    signedIn: true,
    account: { id: "qa-feedback", name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity", position: "TRUSTEE" },
    platformAccess: { memberships: [{ organisationId: "qa-charity", name: "QA Charity", type: "Charity", role: "admin" }] },
  } }));
  await page.route("**/api/continuous-improvement/**", async route => {
    submissions.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { accepted: true, id: `submission-${submissions.length}` } });
  });
  await page.goto("/about/");
  const feedbackHeading = page.getByRole("heading", { name: "Help us make this better." });
  const contactHeading = page.getByRole("heading", { name: "Talk to us." });
  await expect(contactHeading).toBeVisible();
  await expect(feedbackHeading).toBeVisible();
  expect(await feedbackHeading.evaluate((feedback, contact) => Boolean(feedback.compareDocumentPosition(contact as Node) & Node.DOCUMENT_POSITION_FOLLOWING), await contactHeading.elementHandle())).toBe(true);
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.getByLabel("Anything you’d like to add? Optional").fill("Clear and useful.");
  await page.getByRole("button", { name: "Submit feedback →" }).click();
  await expect(page.locator(".page-feedback-success")).toContainText("Lovely to hear. Thank you!");
  expect(submissions[0]).toMatchObject({ kind: "feedback", rating: 4, category: "general", pagePath: "/about/" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("failed beta feedback keeps the user’s words for a retry", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ json: { signedIn: true, account: { id: "qa", name: "QA Person", email: "qa@example.invalid" } } }));
  await page.route("**/api/continuous-improvement/**", route => route.request().method() === "GET" ? route.fulfill({ json: { improvements: [] } }) : route.fulfill({ status: 503, json: { error: "Temporary storage problem." } }));
  await page.goto("/about/");
  await page.getByRole("radio", { name: "2 stars" }).click();
  const comment = page.getByLabel("Anything you’d like to add? Optional");
  await comment.fill("Please keep this exact feedback after a failure.");
  await page.getByRole("button", { name: "Submit feedback →" }).click();
  await expect(page.locator(".page-feedback-error")).toContainText("Temporary storage problem");
  await expect(comment).toHaveValue("Please keep this exact feedback after a failure.");
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
  await expect(page.getByText("This deeper pathway is not yet available.")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  await page.goto("/social-impact-excellence/purpose/assessment/");
  await page.getByLabel("Role").fill("Trustee");
  await page.getByRole("button", { name: "Save and continue →" }).click();
  const sections = ["Purpose Definition", "Intended Change", "Purpose Development", "Purpose Evidence"];
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(sections[0]);
  const whyGuidance = page.locator(".sie-purpose-guidance details").filter({ hasText: "Why are we asking this?" });
  const starGuidance = page.locator(".sie-purpose-guidance details").filter({ hasText: "What do the stars mean?" });
  await expect(whyGuidance).toHaveCount(5);
  await expect(starGuidance).toHaveCount(5);
  await expect(whyGuidance.first()).not.toHaveAttribute("open", "");
  await whyGuidance.first().getByText("Why are we asking this?").click();
  await expect(whyGuidance.first()).toHaveAttribute("open", "");
  await starGuidance.first().getByText("What do the stars mean?").click();
  await expect(starGuidance.first().locator("p")).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
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

test("Leadership assessment saves a separate 20-plus-five-question draft and never claims MSI review", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  const purpose = { status: "draft", preserved: "yes" };
  const result = { overall: 3.4, maturity: "Partly established", pillarScores: ["purpose", "leadership", "data", "delivery", "communication"].map(pillar => ({ pillar, score: 3.4 })), strengths: [], opportunities: [] };
  let currentData: Record<string, unknown> = { result, purpose, answers: Array(25).fill(3) };
  await page.route("**/api/readiness-account/**", async route => {
    const input = route.request().method() === "POST" ? route.request().postDataJSON() as Record<string, unknown> : {};
    if (input.action === "load-product") return route.fulfill({ json: { account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, productProgress: { status: "complete", data: currentData } } });
    if (input.action === "save-product") { writes.push(input); currentData = input.data as Record<string, unknown>; return route.fulfill({ json: { productProgress: { status: "complete", data: input.data } } }); }
    return route.fulfill({ json: { signedIn: true } });
  });
  await page.goto("/social-impact-excellence/journey/");
  await expect(page.getByRole("link", { name: /Begin Leadership pathway/ })).toBeVisible();
  await page.goto("/social-impact-excellence/leadership/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turning commitment into accountability");
  await expect(page.getByText("Additional Participants")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add participants" })).toBeDisabled();
  await page.goto("/social-impact-excellence/leadership/assessment/");
  await page.getByLabel("Role").fill("Trustee");
  await page.getByRole("button", { name: "Save and continue →" }).click();
  const sections = ["Leadership Commitment", "Governance & Accountability", "Leadership Decision-Making", "Leadership Capability & Culture", "Leadership Review & Continuous Improvement"];
  for (let section = 0; section < sections.length; section += 1) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(sections[section]);
    const why = page.locator(".sie-purpose-guidance details").filter({ hasText: "Why are we asking this?" });
    const stars = page.locator(".sie-purpose-guidance details").filter({ hasText: "What do the stars mean?" });
    await expect(why).toHaveCount(4); await expect(stars).toHaveCount(4);
    await expect(why.first()).not.toHaveAttribute("open", "");
    await why.first().getByText("Why are we asking this?").click();
    await stars.first().getByText("What do the stars mean?").click();
    await expect(stars.first().locator("p")).toHaveCount(5);
    const ratings = page.getByRole("radio", { name: /4 star out of 5/ });
    await expect(ratings).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) await ratings.nth(index).click();
    await page.getByLabel("Additional comments or context (optional)").first().fill("Proportionate evidence for this leadership judgement.");
    await page.getByRole("button", { name: "Save and continue →" }).click();
    if (section === 0) {
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(sections[1]);
    }
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell us about leadership in your own words.");
  const reflections = page.locator(".sie-purpose-questions textarea");
  await expect(reflections).toHaveCount(5);
  for (let index = 0; index < 5; index += 1) await reflections.nth(index).fill("A useful qualitative Leadership reflection.");
  await page.getByRole("button", { name: "Complete assessment →" }).click();
  await expect(page).toHaveURL(/\/social-impact-excellence\/leadership\/evidence\//);
  const finalData = writes.at(-1)?.data as { purpose?: unknown; leadership?: { status?: string; reviewStatus?: string; score?: number; answers?: Array<{ questionId?: string }> } };
  expect(finalData.purpose).toEqual(purpose);
  expect(finalData.leadership?.status).toBe("assessment_complete");
  expect(finalData.leadership?.reviewStatus).toBe("not_submitted");
  expect(finalData.leadership?.score).toBe(4);
  expect(finalData.leadership?.answers).toHaveLength(25);
  expect(finalData.leadership?.answers?.[0].questionId).toBe("leadership-01");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("Leadership save failure is visible and does not advance the assessment", async ({ page }) => {
  const result = { overall: 3.4, pillarScores: [] };
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "load-product") return route.fulfill({ json: { account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, productProgress: { data: { result } } } });
    if (input.action === "save-product") return route.fulfill({ status: 503, json: { error: "Controlled save failure" } });
    return route.fulfill({ json: {} });
  });
  await page.goto("/social-impact-excellence/leadership/assessment/");
  await page.getByLabel("Role").fill("Trustee");
  await page.getByRole("button", { name: "Save and continue →" }).click();
  await expect(page.locator(".sie-form-error")).toContainText("Controlled save failure");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tell us who is completing this assessment.");
});

test("Leadership evidence stays in its own private upload purpose and submission remains unreviewed", async ({ page }) => {
  const saved: Record<string, unknown>[] = [];
  const leadership = { assessmentId: "leadership-1", organisationName: "QA Charity", participant: { name: "QA Person", role: "Trustee", email: "qa@example.invalid" }, status: "assessment_complete", reviewStatus: "not_submitted", evidenceStatus: "not_started", score: 4, maturity: "Established", answers: Array.from({ length: 25 }, (_, index) => ({ questionId: `leadership-${String(index + 1).padStart(2, "0")}`, questionNumber: index + 1, score: index < 20 ? 4 : null, comment: "", answer: index >= 20 ? "Reflection" : "" })), evidence: [], progress: 65 };
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true } });
    const input = route.request().postDataJSON() as Record<string, unknown>;
    if (input.action === "load-product") return route.fulfill({ json: { account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, productProgress: { status: "complete", data: { result: { overall: 4 }, purpose: { preserved: true }, leadership } } } });
    if (input.action === "list-product-files") { expect(input.purpose).toBe("leadership-evidence"); return route.fulfill({ json: { files: [] } }); }
    if (input.action === "create-product-file-upload") { expect(input.purpose).toBe("leadership-evidence"); return route.fulfill({ status: 201, json: { file: { id: "leadership-file-1" }, upload: { url: "https://upload.example.test/leadership", token: "c".repeat(64) } } }); }
    if (input.action === "save-product") { saved.push(input); return route.fulfill({ json: { productProgress: { data: input.data } } }); }
    return route.fulfill({ status: 400, json: { error: "Unexpected action" } });
  });
  await page.route("https://upload.example.test/leadership", route => route.fulfill({ json: { file: { uploadedAt: "2026-10-17T10:00:00Z" } } }));
  await page.goto("/social-impact-excellence/leadership/evidence/");
  await page.getByLabel("Choose documents to upload").setInputFiles({ name: "board-minutes.txt", mimeType: "text/plain", buffer: Buffer.from("Leadership evidence") });
  await page.getByRole("button", { name: "Upload 1 document" }).click();
  await expect(page.getByText(/uploaded securely/)).toBeVisible();
  await page.getByRole("button", { name: "Submit evidence stage" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("awaiting MSI review");
  const finalData = saved.at(-1)?.data as { purpose?: unknown; leadership?: { status?: string; reviewStatus?: string; evidenceStatus?: string; evidence?: unknown[] } };
  expect(finalData.purpose).toEqual({ preserved: true });
  expect(finalData.leadership?.status).toBe("evidence_submitted");
  expect(finalData.leadership?.reviewStatus).toBe("awaiting_msi_review");
  expect(finalData.leadership?.evidenceStatus).toBe("submitted");
  expect(finalData.leadership?.evidence).toHaveLength(1);
});

test("report review intake creates a private upload record without pretending payment succeeded", async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { signedIn: true, account: { name: "QA Person", email: "qa@example.invalid", organisation: "QA Charity" }, progress: { sessionId: "qa-complete", step: "done" } } });
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
