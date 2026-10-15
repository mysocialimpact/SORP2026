import { expect, test } from "@playwright/test";

const publicPages = [
  "/",
  "/are-you-sorp-ready/",
  "/ask-sorp/",
  "/charity-impact-reports/",
  "/social-impact-excellence/",
  "/my-impact-director/",
  "/our-mission/",
  "/accountants-advisers/",
  "/contact/",
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ status: 401, json: { signedIn: false } }));
});

test("every public page finishes with Feedback, Talk to us, then the shared footer", async ({ page }) => {
  for (const path of publicPages) {
    await page.goto(path);
    await expect(page.locator(".page-feedback"), `feedback on ${path}`).toHaveCount(1);
    await expect(page.locator(".shared-hello"), `Talk to us on ${path}`).toHaveCount(1);
    await expect(page.locator(".gateway-footer"), `footer on ${path}`).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Help us make this better." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Talk to us." })).toBeVisible();
    const actionBar = page.locator(".folder-action-bar");
    await expect(actionBar).toHaveCount(1);
    await expect(actionBar.getByRole("link").nth(-2)).toContainText("Give feedback");
    await expect(actionBar.getByRole("link").nth(-1)).toContainText("Talk to us");
    const order = await page.locator("body > .page-feedback, body > .shared-hello, body > .gateway-footer").evaluateAll(elements => elements.map(element => element.className));
    expect(order[0]).toContain("page-feedback");
    expect(order[1]).toContain("shared-hello");
    expect(order[2]).toContain("gateway-footer");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("a visitor can rate, comment and submit the current page", async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route("**/api/continuous-improvement/**", async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { accepted: true, id: "feedback-test" } });
  });
  await page.goto("/ask-sorp/");
  const section = page.locator(".page-feedback");
  await section.getByRole("radio", { name: "5 stars" }).click();
  await expect(section.getByText("5 out of 5")).toBeVisible();
  await section.getByLabel("Anything you’d like to add? Optional").fill("The examples made this page easy to understand.");
  await section.getByLabel("Would you like us to get back to you? Leave your email address here.").fill("visitor@example.org");
  await section.getByRole("button", { name: "Submit feedback →" }).click();
  await expect(section.getByText("Brilliant! Thank you so much.")).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({
    kind: "feedback",
    rating: 5,
    category: "general",
    comment: "The examples made this page easy to understand.",
    contactEmail: "visitor@example.org",
    pagePath: "/ask-sorp/",
  });
});

test("successful submissions receive the correct rating-specific response", async ({ page }) => {
  await page.route("**/api/continuous-improvement/**", route => route.fulfill({ status: 201, json: { accepted: true, id: "feedback-rating" } }));
  const messages = [
    "We’re sorry we missed the mark.",
    "Thank you for being honest with us.",
    "Thank you — that’s really helpful.",
    "Lovely to hear. Thank you!",
    "Brilliant! Thank you so much.",
  ];
  for (let rating = 1; rating <= 5; rating += 1) {
    await page.goto("/");
    const section = page.locator(".page-feedback");
    await section.getByRole("radio", { name: `${rating} star${rating === 1 ? "" : "s"}` }).click();
    await section.getByRole("button", { name: "Submit feedback →" }).click();
    await expect(section.getByText(messages[rating - 1])).toBeVisible();
  }
});

test("failed submissions preserve the visitor’s rating and comment", async ({ page }) => {
  await page.route("**/api/continuous-improvement/**", route => route.fulfill({ status: 503, json: { error: "Please try again shortly." } }));
  await page.goto("/our-mission/");
  const section = page.locator(".page-feedback");
  await section.getByRole("radio", { name: "2 stars" }).click();
  const comment = section.getByLabel("Anything you’d like to add? Optional");
  await comment.fill("Keep this feedback available for retry.");
  await section.getByRole("button", { name: "Submit feedback →" }).click();
  await expect(section.getByRole("alert")).toContainText("Please try again shortly.");
  await expect(section.getByRole("radio", { name: "2 stars" })).toHaveAttribute("aria-checked", "true");
  await expect(comment).toHaveValue("Keep this feedback available for retry.");
});

test("focused product workspaces do not display page-ending feedback or contact sections", async ({ page }) => {
  await page.goto("/are-you-sorp-ready/review/");
  await expect(page.locator(".page-feedback")).toBeHidden();
  await expect(page.locator(".shared-hello")).toBeHidden();
});
