import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage presents the social enterprise mission and agreed vision", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("A UK-based social enterprise initiative", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Imagine a world where social impact was taken as seriously as financial performance." })).toBeVisible();
  await expect(page.getByText("Already working with an accountant or adviser? Brilliant.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Help us keep these tools free." })).toBeVisible();
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("Imagine a world where curiosity and creativity were valued as highly as certainty.")).toBeVisible();
  await expect(footer.getByRole("link", { name: "See what else is in the Shed!" })).toHaveAttribute("href", "https://www.theideasshed.com/");
  await expect(footer).not.toContainText("Independent tools");
  await expect(footer.getByRole("link", { name: "Our Mission", exact: true })).toHaveAttribute("href", "/our-mission/");
  await expect(footer.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("href", "/contact/");
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
  await expect(page.getByRole("contentinfo").getByAltText("The Ideas Shed")).toBeVisible();
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
  const section = page.getByRole("region", { name: path === "/" ? "Help us keep these tools free." : "Found the tools useful? Help us make more." });
  await section.getByRole("button", { name: "£10" }).click();
  await section.getByRole("button", { name: "Make a voluntary contribution →" }).click();
  await section.getByRole("button", { name: "Simulate safe contribution" }).click();
  await expect(section.getByText("Thank you. That genuinely helps")).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ paymentType: "voluntary_support", presentation: "embedded", amountMinor: 1000, band: null });
  expect(typeof writes[0].sessionId).toBe("string");
  expect(String(writes[0].sessionId).length).toBeGreaterThan(20);
});
}
