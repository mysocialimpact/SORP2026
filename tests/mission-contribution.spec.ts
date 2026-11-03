import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage presents the social enterprise mission and agreed vision", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("UK-based social enterprise initiative", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Imagine a world where social impact was taken as seriously as financial performance." })).toBeVisible();
  await expect(page.getByText("We’ve built this for")).toBeVisible();
  await expect(page.locator("#ambition-title")).toBeVisible();
  const contribution = page.locator(".gateway-contribution");
  await expect(contribution.getByRole("heading", { name: "Help the next charity." })).toHaveCount(1);
  await expect(contribution.locator(".gateway-contribution-copy")).toContainText("We're a social enterprise making useful technology accessible to charities of every size.");
  await expect(contribution.locator(".gateway-contribution-copy")).toContainText("If you've found SORP 2026 helpful, please consider making a contribution. Your support helps us keep our tools free, particularly for smaller charities.");
  await expect(contribution.getByRole("heading", { name: "Make a contribution" })).toBeVisible();
  await expect(contribution.getByRole("button", { name: "Contribute →" })).toBeVisible();
  await expect(contribution.getByRole("link", { name: "New here? Discover our mission →" })).toHaveCount(0);
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "See what else is in the Shed", exact: false })).toHaveAttribute("href", "https://www.theideasshed.com/");
  await expect(footer.getByRole("heading", { name: "Strategy for Social Impact Excellence." })).toBeVisible();
  await expect(footer.getByRole("link", { name: "See what else we do", exact: false })).toHaveAttribute("href", "https://mysocialimpact.org");
  await expect(footer.getByRole("img", { name: /Cowminator/ })).toBeVisible();
  await expect(footer).not.toContainText("Independent tools");
  await expect(page.getByRole("banner").getByRole("link", { name: "Our Mission" })).toHaveAttribute("href", "/our-mission/");
  await expect(footer.getByRole("link", { name: "Privacy & accessibility", exact: true })).toHaveAttribute("href", "/privacy/");
});

test("mission page is concise, partner-friendly and accessible", async ({ page }) => {
  await page.goto("/our-mission/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We’re on a mission to help solve more social and environmental problems.");
  await expect(page.getByRole("heading", { name: "Use technology wherever it helps. Bring in people wherever they matter." })).toBeVisible();
  await expect(page.getByText("judgement, perspective or care", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free wherever possible" })).toBeVisible();
  await expect(page.getByText("Our tools are designed to work alongside your existing advisers, not replace them.", { exact: false })).toBeVisible();
  await expect(page.getByRole("main").getByAltText("My Social Impact")).toHaveCount(0);
  await expect(page.getByRole("main").getByAltText("The Ideas Shed")).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByAltText("My Social Impact")).toBeVisible();
  await expect(page.getByRole("contentinfo").getByAltText("The Ideas Shed", { exact: true })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

for (const path of ["/", "/our-mission/"]) {
test(`guest contribution at ${path} reuses inline checkout and verifies payment before thanking`, async ({ page }) => {
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
  await page.goto(path);
  const section = page.locator(".gateway-contribution");
  await section.getByRole("button", { name: "£10" }).click();
  await section.getByRole("button", { name: path === "/" ? "Contribute →" : "Make a voluntary contribution →" }).click();
  await section.getByRole("button", { name: "Simulate safe contribution" }).click();
  await expect(section.getByText("Thank you. That genuinely helps")).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ paymentType: "voluntary_support", presentation: "embedded", amountMinor: 1000, band: null });
  expect(typeof writes[0].sessionId).toBe("string");
  expect(String(writes[0].sessionId).length).toBeGreaterThan(20);
});
}

test("homepage custom contribution keeps the existing Stripe amount flow", async ({ page }) => {
  let amountMinor = 0;
  await page.route("**/api/sorp-payments/checkout", async route => {
    amountMinor = route.request().postDataJSON().amountMinor;
    await route.fulfill({ json: { presentation: "embedded", id: "cs_test_custom", clientSecret: "test_fixture_secret" } });
  });
  await page.goto("/");
  const section = page.locator(".gateway-contribution");
  for (const amount of ["£5", "£10", "£20", "Other"]) {
    await section.getByRole("button", { name: amount, exact: true }).click();
    await expect(section.getByRole("button", { name: amount, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await section.getByRole("textbox", { name: "Custom contribution amount in pounds" }).fill("12.50");
  await section.getByRole("button", { name: "Contribute →" }).click();
  expect(amountMinor).toBe(1250);
  await expect(section.getByRole("button", { name: "Close payment and stay here" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
