import { test, expect } from "@playwright/test";

test("presentation and assessment remain on SORP2026", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/are-you-sorp-ready/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("SORP ready?");
  const deck = page.locator(".sorp-film");
  await expect(deck).toHaveAttribute("data-ready", "true");
  await expect(deck.locator(".sf-chapters button")).toHaveCount(9);
  await expect(page.locator(".sr-details > details")).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();

  await deck.locator(".sf-chapters button").nth(8).click();
  const start = deck.getByRole("link", { name: "START THE FREE REVIEW" });
  await expect(start).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  await start.click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/review\/?$/);
  await expect(page.locator(".si-welcome")).toBeVisible();
  expect(errors.filter((message) => message !== "Failed to load Stripe.js")).toEqual([]);

  await page.screenshot({
    path: `test-results/product-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("destination APIs fail safely without production credentials", async ({ request }) => {
  const account = await request.get("/api/readiness-account");
  expect(account.status()).toBe(200);
  expect(await account.json()).toEqual({ signedIn: false });

  const payment = await request.post("/api/sorp-payments/checkout", {
    data: { paymentType: "voluntary_support", amountMinor: 500 },
  });
  expect(payment.status()).toBe(503);
  await expect(payment.json()).resolves.toMatchObject({
    error: "Secure checkout is temporarily unavailable.",
  });

  const booking = await request.get("/api/booking/availability?service=initial");
  expect([400, 503]).toContain(booking.status());
});
