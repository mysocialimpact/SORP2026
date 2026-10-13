import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("sticky navigation and compact homepage retain access and team order", async ({ page }, info) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 1800));
  const nav = page.locator(".platform-sticky-navigation");
  expect((await nav.boundingBox())!.y).toBe(0);
  expect((await nav.boundingBox())!.height).toBeLessThan(190);
  await expect(nav.getByRole("link", { name: "Our Mission" })).toBeVisible();
  await expect(nav.locator(".product-folder-tab")).toHaveCount(7);
  await expect(page.locator(".homepage-audience-options button").first()).toContainText("Trustees · CEOs · Finance teams · Staff · Volunteers");
  await expect(page.locator(".homepage-audience-options button").nth(1)).toContainText("Accountants · Auditors · Lawyers · Consultants · Funders");
  await expect(page.locator(".gateway-portraits h3")).toHaveText(["Marcus Warry ACA", "Dr Chris Arnold", "Gareth Murphy", "Nicholas Demeter"]);
  const portraits = page.locator(".gateway-portraits");
  const sizes = await portraits.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, ys: [...el.children].map(child => child.getBoundingClientRect().y) }));
  expect(new Set(sizes.ys).size).toBe(1);
  if (info.project.name === "mobile") expect(sizes.scroll).toBeGreaterThan(sizes.width);
  await expect(page.locator(".experience-lane").getByText("Starbucks", { exact: true })).toHaveCount(0);
  await page.locator(".experience-explore summary").click();
  await expect(page.locator(".experience-explore li")).toHaveCount(62);
  await expect(page.locator(".experience-explore li").filter({ hasText: "Starbucks" })).toBeVisible();
  await page.locator(".experience-explore summary").click();
  await expect(page.locator(".gateway-contribution-amounts").getByRole("button", { name: "£5", exact: true })).toHaveAttribute("aria-pressed", "true");
  const hello = page.locator(".homepage-hello");
  await expect(hello.getByRole("heading", { name: "Say hello!" })).toBeVisible();
  await expect(hello).toContainText("We’d love to hear from you. A question, an idea, some feedback — or just hello.");
  await expect(hello).not.toContainText("Just looking around?");
  await expect(hello).not.toContainText("occasional updates");
  expect((await hello.boundingBox())!.height).toBeLessThan(info.project.name === "mobile" ? 680 : 560);
  await hello.screenshot({ path: info.outputPath("say-hello.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("homepage.png"), fullPage: true });
  await page.locator(".gateway-footer").screenshot({ path: info.outputPath("footer.png") });
  const results = await new AxeBuilder({ page }).include(".platform-sticky-navigation").include(".homepage-hello").include(".gateway-footer").analyze();
  expect(results.violations).toEqual([]);
});

test("assessment sticky controls clear the platform navigation", async ({ page }) => {
  await page.goto("/are-you-sorp-ready/review/?entry=intro");
  await page.evaluate(() => window.scrollTo(0, 600));
  const nav = (await page.locator(".platform-sticky-navigation").boundingBox())!;
  const brand = page.locator(".scr-page .sorp-workspace-brand");
  if (await brand.count()) expect((await brand.boundingBox())!.y).toBeGreaterThanOrEqual(nav.height - 1);
  await expect(page.locator(".platform-sticky-navigation").getByRole("link", { name: "Our Mission" })).toBeVisible();
});
