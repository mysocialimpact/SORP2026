import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const answer = {
  short_answer: "The answer depends on your charity’s SORP tier. Tier 1 must summarise its main achievements, while Tiers 2 and 3 have additional impact-reporting requirements.",
  citations: [{ reference: "1.27", module: "Trustees’ annual report", page: 22, extract: "The report must provide a summary of the main achievements of the charity." }],
  requirement: "MIXED",
  tier_scope: "Tier 1 baseline; additional requirements for Tiers 2 and 3",
  applicability: "depends",
  interpretation: "Confirm the charity’s tier first, then apply the reporting requirements proportionately.",
  ambiguity: "",
  missing_information: ["The charity’s SORP tier is needed."],
  human_judgement: "Trustees and their advisers decide what evidence gives a fair account of performance.",
  follow_up_suggestions: ["What changes for a Tier 2 charity?"],
};

test("Ask SORP is a native, evidence-led product experience", async ({ page }) => {
  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/api/ask-sorp/", async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(answer) });
  });

  await page.goto("/ask-sorp/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ask SORP 2026.Get the answers you need.");
  await expect(page.getByText("Charity leaders", { exact: true })).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);

  await page.getByRole("button", { name: "What changes under SORP 2026?" }).click();
  await expect(page.getByText("SORP 1.27", { exact: true })).toBeVisible();
  await expect(page.getByText("Trustees’ annual report · PDF page 22")).toBeVisible();
  expect(requestBody?.question).toBe("What changes under SORP 2026?");
  expect(requestBody?.round).toBe(1);
  expect(requestBody?.sessionId).toMatch(/^[a-f0-9-]{36}$/i);

  const sticky = page.getByRole("complementary", { name: "Page actions" });
  await expect(sticky).toBeVisible();
  expect(await sticky.evaluate(element => getComputedStyle(element).position)).toBe("fixed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();

  const accessibility = await new AxeBuilder({ page }).include(".ask-page").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});
