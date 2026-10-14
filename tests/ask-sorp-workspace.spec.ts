import { expect, test } from "@playwright/test";

const answer = {
  short_answer: "Tier 1 applies to charities with gross income up to £500,000.",
  citations: [{ reference: "1.8", module: "Introduction", page: 12, extract: "Tier 1 applies to charities with gross income up to £500,000." }],
  requirement: "MUST",
  tier_scope: "All charities",
  applicability: "applies",
  interpretation: "Check annual gross income at each reporting date before applying the tier requirements.",
  ambiguity: "",
  missing_information: [],
  human_judgement: "Confirm the charity's gross income for the reporting period.",
  follow_up_suggestions: ["What must Tier 1 charities report?"],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ status: 401, json: { signedIn: false } }));
});

test("the marketing page launches a focused workspace from every Ask SORP action", async ({ page }) => {
  await page.goto("/ask-sorp/");
  await expect(page.getByRole("heading", { name: /Ask SORP 2026/ })).toBeVisible();
  await expect(page.locator(".platform-sticky-navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ask SORP a question/ })).toHaveAttribute("href", "/ask-sorp/workspace/");
  await expect(page.locator(".folder-action-bar").getByRole("link", { name: /Ask a question/ })).toHaveAttribute("href", "/ask-sorp/workspace/");

  await page.getByRole("button", { name: /What changes under SORP 2026/ }).click();
  await expect(page).toHaveURL(/\/ask-sorp\/workspace\/\?question=What(?:%20|\+)changes/);
  await expect(page.getByLabel("Your SORP 2026 question")).toHaveValue("What changes under SORP 2026?");
  await expect(page.locator(".platform-sticky-navigation")).toBeHidden();
  await expect(page.locator(".folder-action-bar")).toBeHidden();
  await expect(page.locator(".shared-hello")).toBeHidden();
  await expect(page.locator(".gateway-footer")).toBeHidden();
  await expect(page.getByRole("link", { name: "Back to website" })).toHaveAttribute("href", "/ask-sorp/");
});

test("questions, citations, follow-ups and the saved conversation work inside the viewport", async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/ask-sorp/", async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: answer });
  });
  await page.goto("/ask-sorp/workspace/");
  const question = page.getByLabel("Your SORP 2026 question");
  await question.fill("What are the new income thresholds?");
  await page.getByRole("button", { name: "Ask SORP →" }).click();
  await expect(page.locator(".ask-answer-copy").getByText(answer.short_answer)).toBeVisible();
  await expect(page.getByText("SORP 1.8")).toBeVisible();
  await expect(page.locator(".ask-citations").getByText(answer.citations[0].extract)).toBeVisible();
  expect(requests[0]).toMatchObject({ question: "What are the new income thresholds?", round: 1 });

  const geometry = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>(".ask-workspace-page")!;
    const scroll = document.querySelector<HTMLElement>(".ask-assistant-scroll")!;
    const composer = document.querySelector<HTMLElement>(".ask-composer")!;
    return {
      bodyScroll: document.documentElement.scrollHeight > innerHeight + 1,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      mainHeight: Math.round(main.getBoundingClientRect().height),
      viewportHeight: innerHeight,
      internalScroll: scroll.scrollHeight >= scroll.clientHeight,
      composerBottom: Math.round(composer.getBoundingClientRect().bottom),
    };
  });
  expect(geometry.bodyScroll).toBe(false);
  expect(geometry.horizontalOverflow).toBe(false);
  expect(geometry.mainHeight).toBe(geometry.viewportHeight);
  expect(geometry.internalScroll).toBe(true);
  expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.viewportHeight);

  await page.getByRole("link", { name: "Back to website" }).click();
  await expect(page).toHaveURL(/\/ask-sorp\/$/);
  await page.getByRole("link", { name: /Ask SORP a question/ }).click();
  await expect(page.locator(".ask-answer-copy").getByText(answer.short_answer)).toBeVisible();
});

test("direct workspace, refresh and browser navigation remain predictable", async ({ page }) => {
  await page.goto("/ask-sorp/workspace/");
  await expect(page.getByRole("heading", { name: "What do you need to know?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "What do you need to know?" })).toBeVisible();
  await page.getByRole("link", { name: "Back to website" }).click();
  await expect(page).toHaveURL(/\/ask-sorp\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/ask-sorp\/workspace\/$/);
  await expect(page.getByRole("link", { name: "Back to website" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/ask-sorp\/$/);
});
