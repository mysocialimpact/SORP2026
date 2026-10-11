import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage presents the social enterprise mission and agreed vision", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("A social enterprise initiative", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Imagine a world where nothing stood in the way of our potential to make a difference." })).toBeVisible();
  await expect(page.getByText("Already working with an accountant or adviser? Brilliant.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Help us keep these tools free." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Our mission" }).first()).toHaveAttribute("href", "/our-mission/");
});

test("mission page is concise, partner-friendly and accessible", async ({ page }) => {
  await page.goto("/our-mission/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Technology should make doing good easier");
  await expect(page.getByText("Free wherever possible. Affordable where we need to charge.", { exact: false })).toBeVisible();
  await expect(page.getByText("Our tools are designed to work alongside your existing advisers, not replace them.", { exact: false })).toBeVisible();
  await expect(page.getByAltText("My Social Impact").first()).toBeVisible();
  await expect(page.getByAltText("The Ideas Shed").first()).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("guest homepage contribution reuses inline checkout and verifies payment before thanking", async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  await page.route("https://js.stripe.com/**", route => route.fulfill({
    contentType: "application/javascript",
    body: `window.Stripe=()=>({initEmbeddedCheckout:async({onComplete})=>({mount(el){const button=document.createElement('button');button.textContent='Simulate safe contribution';button.onclick=onComplete;el.appendChild(button)},destroy(){}})});`,
  }));
  await page.route("**/api/sorp-payments/checkout", async route => {
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: { presentation: "embedded", id: "cs_test_homepage", clientSecret: "test_fixture_secret" } });
  });
  await page.route("**/api/sorp-payments/status", route => route.fulfill({ json: { status: "paid", paymentType: "voluntary_support", amountMinor: 1000 } }));
  await page.goto("/");
  const section = page.getByRole("region", { name: "Help us keep these tools free." });
  await section.getByRole("button", { name: "£10" }).click();
  await section.getByRole("button", { name: "Make a voluntary contribution →" }).click();
  await section.getByRole("button", { name: "Simulate safe contribution" }).click();
  await expect(section.getByText("Thank you. That genuinely helps")).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ paymentType: "voluntary_support", presentation: "embedded", amountMinor: 1000, band: null });
  expect(typeof writes[0].sessionId).toBe("string");
  expect(String(writes[0].sessionId).length).toBeGreaterThan(20);
});
