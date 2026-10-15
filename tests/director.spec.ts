import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const path = "/my-impact-director/";
// Browser contract tests keep records per test, independent of production accounts.
async function mockAccount(page: Page, signedIn = true) {
  let authenticated = signedIn;
  let progress: { revision: number; data: unknown } | null = null;
  const account = { id: "qa", name: "QA Visitor", organisation: "QA charity", email: "qa@example.invalid" };
  await page.route("**/api/readiness-account/**", async route => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      expect(["login", "signup"]).toContain(payload.action);
      expect(payload.email).toBe(account.email);
      if (payload.action === "signup") expect(payload.name).toBe("QA Visitor");
      authenticated = true;
    }
    await route.fulfill({ json: { signedIn: authenticated, account: authenticated ? account : null, progress: {} } });
  });
  await page.route("**/api/impact-director/**", async route => {
    if (!authenticated) return route.fulfill({ status: 401, json: { error: "Please sign in." } });
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      expect(payload.accountId).toBe(account.id);
      progress = { revision: (progress?.revision || 0) + 1, data: payload.data };
      return route.fulfill({ json: { revision: progress.revision } });
    }
    return route.fulfill({ json: { account, progress } });
  });
}

for (const mode of ["login", "signup"] as const) {
  test(`${mode} is inline and returns directly to the assessment without a SORP review`, async ({ page }) => {
    await mockAccount(page, false);
    await page.goto(path);
    await expect(page.locator("#assessment").getByRole("radio")).toHaveCount(0);
    await page.getByRole("button", { name: "Start your free assessment" }).click();
    const portal = page.locator("#assessment .account-portal");
    await expect(portal).toBeVisible();
    if (mode === "login") {
      const accessibility = await new AxeBuilder({ page }).include("#assessment").analyze();
      expect(accessibility.violations).toEqual([]);
    }
    if (mode === "signup") {
      await portal.getByRole("tab", { name: "Create account" }).click();
      await portal.getByLabel("Your name").fill("QA Visitor");
      await portal.getByLabel("Your role").selectOption("TRUSTEE / CHAIR");
      await portal.getByLabel("Confirm password").fill("QA-only-passphrase");
    }
    await portal.getByLabel("Email address").fill("qa@example.invalid");
    await portal.getByLabel("Password", { exact: true }).fill("QA-only-passphrase");
    await portal.getByRole("button", { name: mode === "signup" ? "Create my SORP2026 account" : "Log in to SORP2026" }).click();
    await expect(page).toHaveURL(/my-impact-director\/#assessment$/);
    await expect(page.getByRole("heading", { name: QUESTIONS_FIRST })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Dashboard", exact: true })).toBeVisible();
  });
}
test("dashboard shows a completed snapshot as Started without changing SIE", async ({
  page,
}) => {
  await page.route("**/api/readiness-account/**", (route) =>
    route.fulfill({
      json: {
        signedIn: true,
        account: { id: "qa", name: "QA Visitor", email: "qa@example.invalid" },
        progress: {},
        productProgress: {
          status: "complete",
          data: { answers: Array(25).fill(3), result: { overall: 3 } },
        },
      },
    }),
  );
  await page.route("**/api/impact-director/**", (route) =>
    route.fulfill({
      json: {
        signedIn: true,
        account: { id: "qa" },
        progress: {
          revision: 1,
          data: { ratings: Array(21).fill(4), completed: true },
        },
      },
    }),
  );
  await page.goto("/dashboard/");
  await expect(
    page.getByRole("progressbar", { name: "My Impact Director: Started · snapshot complete" }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(
    page.getByRole("link", { name: "Open My Impact Director" }),
  ).toHaveAttribute("href", "/my-impact-director/#assessment");
  await expect(
    page.getByRole("progressbar", {
      name: "Social Impact Excellence: Assessment completed · 3.0/5",
    }),
  ).toHaveAttribute("aria-valuenow", "100");
});
test("reduced motion and keyboard stars work; unavailable progress is not a false success", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAccount(page);
  await page.goto(path);
  await page.getByRole("button", { name: "Start your free assessment" }).click();
  const first = page.getByRole("radio", { name: "1 star: Not yet true" });
  await first.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "2 stars: True in a few places" }),
  ).toBeChecked();
  const animation = await page
    .getByRole("heading", { name: QUESTIONS_FIRST })
    .evaluate((el) => getComputedStyle(el.parentElement!).animationName);
  expect(animation).toBe("none");
  await page.route("**/api/impact-director/**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Saved progress temporarily unavailable." },
    }),
  );
  await page.reload();
  await expect(page.locator("#assessment").getByRole("alert")).toContainText(
    "Saved progress temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Start your free assessment" }),
  ).toBeDisabled();
});
const QUESTIONS_FIRST =
  "Our team feels comfortable using the digital tools needed for everyday work.";
test("member completes inline, edits, reloads and downloads a useful report", async ({
  page,
}, info) => {
  await mockAccount(page);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Impact Director",
  );
  await page.screenshot({
    path: `test-results/director-${info.project.name}-page.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Start your free assessment" }).click();
  await expect(
    page.getByRole("button", { name: "Next →", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", { name: "4 stars: Mostly true", exact: true })
    .check();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "4 stars: Mostly true", exact: true }),
  ).toBeChecked();
  const nextBounds = await page.getByRole("button", { name: "Next →", exact: true }).boundingBox();
  expect(nextBounds!.y + nextBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({
    path: `test-results/director-${info.project.name}-question.png`,
    fullPage: false,
    animations: "disabled",
  });
  const accessibility = await new AxeBuilder({ page })
    .include("#assessment")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: "Continue my snapshot" }).click();
  for (let i = 0; i < 21; i++) {
    await page
      .getByRole("radio", {
        name: `${i < 4 ? 4 : 2} stars: ${i < 4 ? "Mostly true" : "True in a few places"}`,
        exact: true,
      })
      .check();
    await page.getByRole("button", { name: "Next →", exact: true }).click();
  }
  for (const answer of [
    "Excel and a shared drive",
    "Repeated copying",
    "More time for impact",
    "",
  ]) {
    if (answer)
      await page.getByRole("textbox", { name: "Your response" }).fill(answer);
    await page
      .getByRole("button", { name: /^(Next →|Skip →|See my snapshot ↗)$/ })
      .click();
  }
  await expect(
    page.getByText("Systems you mentioned: Excel and a shared drive"),
  ).toBeVisible();
  await expect(
    page.getByText("Your sticking point: Repeated copying"),
  ).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Saved to your account" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download my report & agenda" })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "my-impact-director-report.txt",
  );
  await page.reload();
  await page.getByRole("button", { name: "Open my snapshot" }).click();
  await expect(page.getByText("Systems you mentioned: Excel and a shared drive")).toBeVisible();
  await page.screenshot({
    path: `test-results/director-${info.project.name}-results.png`,
    fullPage: true,
  });
  await expect(page).toHaveURL(new RegExp("/my-impact-director/"));
});

test("real API authenticates, isolates accounts, rejects stale and forged saves", async ({
  request,
}, info) => {
  test.skip(
    !process.env.DIRECTOR_QA,
    "Requires the documented loopback QA backend and database",
  );
  const api = "/api/impact-director/";
  const headers = {
    origin: "http://127.0.0.1:3000",
    cookie: "director_qa=alice",
  };
  expect((await request.get(api)).status()).toBe(401);
  expect(
    (
      await request.post(api, {
        headers: { ...headers, origin: "https://evil.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  // Only one project mutates this shared test fixture.
  test.skip(info.project.name !== "desktop");
  const opened = await (await request.get(api, { headers })).json();
  const data = {
    version: 1,
    ratings: Array(21).fill(4),
    reflections: ["QA systems", "", "", ""],
    organisation: "QA",
    step: 25,
    completed: true,
  };
  const revision = opened.progress?.revision || 0;
  expect(
    (
      await request.post(api, {
        headers,
        data: { accountId: "director-qa-bob", revision, data },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post(api, {
        headers,
        data: {
          accountId: "director-qa-alice",
          revision,
          data: { ...data, ratings: [9] },
        },
      })
    ).status(),
  ).toBe(400);
  const result = await request.post(api, {
    headers,
    data: { accountId: "director-qa-alice", revision, data },
  });
  expect(result.status()).toBe(200);
  expect(
    (
      await request.post(api, {
        headers,
        data: { accountId: "director-qa-alice", revision, data },
      })
    ).status(),
  ).toBe(409);
  const saved = await (await request.get(api, { headers })).json();
  expect(saved.progress.data).toEqual(data);
  const other = await (
    await request.get(api, { headers: { cookie: "director_qa=bob" } })
  ).json();
  expect(other.progress).toBeNull();
});

test("legacy guest handoff is explicit and signed-in saving survives reopening", async ({
  page,
}) => {
  test.skip(!process.env.DIRECTOR_QA);
  await page.goto(path);
  await page.evaluate(() => sessionStorage.setItem("msi-director-guest-v1", JSON.stringify({
    version: 1, ratings: [3, ...Array(20).fill(0)], reflections: ["", "", "", ""],
    organisation: "Legacy QA", step: 1, completed: false,
  })));
  await page
    .context()
    .addCookies([
      { name: "director_qa", value: "alice", domain: "127.0.0.1", path: "/" },
    ]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Use my guest answers" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my guest answers" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved to your account" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continue my snapshot" }).click();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "3 stars: Partly true" }),
  ).toBeChecked();
});

test("existing free booking flow confirms only a successful response", async ({
  page,
}) => {
  await page.route("**/api/booking/availability/**", (route) =>
    route.fulfill({
      json: {
        slots: [{ start: "2026-10-20T09:00:00Z", end: "2026-10-20T09:10:00Z" }],
      },
    }),
  );
  let submitted: Record<string, unknown> = {};
  await page.route("**/api/booking/free/**", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({
      json: { ok: true, start: "2026-10-20T09:00:00Z", invitationSent: true },
    });
  });
  await page.goto(path);
  await page
    .getByRole("button", { name: "See introductory meeting times" })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("QA Visitor");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.invalid");
  await page
    .getByLabel("Organisation", { exact: true })
    .fill("QA organisation");
  await page.getByRole("combobox").selectOption("2026-10-20T09:00:00Z");
  await page.getByRole("button", { name: "Book my free introduction" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re booked." }),
  ).toBeVisible();
  expect(submitted.serviceId).toBe("free");
  expect(submitted.source).toBe("my-impact-director");
  expect(String(submitted.idempotencyKey).length).toBeGreaterThan(16);
});
