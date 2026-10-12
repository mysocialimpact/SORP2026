import { test, expect } from "@playwright/test";

test("Ask SORP presents the established live assistant with an independent fallback", async ({ page }) => {
  await page.route("https://asksorp.mysocialimpact.org/**", route => route.abort());
  await page.goto("/ask-sorp/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SORP questions?Just ask.");
  await expect(page.getByText("Live beta · Available now", { exact: false }).first()).toBeVisible();
  const assistant = page.getByTitle("Ask SORP live assistant");
  await expect(assistant).toHaveAttribute("src", "https://asksorp.mysocialimpact.org/");
  await expect(page.getByRole("link", { name: "Open in a new window ↗" })).toHaveAttribute("href", "https://asksorp.mysocialimpact.org/");
  await expect(page.getByText(/without copying its evidence index/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
