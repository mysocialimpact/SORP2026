import { test, expect } from "@playwright/test";

test("contact has one integrated form, visible demo invitation and three working bases", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/contact/");
  await expect(page.locator("main form")).toHaveCount(1);
  await expect(page.locator(".contact-demo-invitation")).toBeVisible();
  await expect(page.locator(".contact-location-grid article")).toHaveCount(3);
  await expect(page.locator(".page-feedback, .contact-invitation, .gateway-organisations, details")).toHaveCount(0);
  await expect(page.locator(".contact-email")).toHaveAttribute("href", "mailto:marcus@mysocialimpact.org");
  await expect(page.locator(".folder-action-feedback")).toHaveAttribute("href", "/#page-feedback");
  expect(await page.locator(".contact-person img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("demo request shares contact submission and does not imply marketing consent", async ({ page }) => {
  let payload: Record<string, unknown> = {};
  await page.route("**/api/hello", async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { accepted: true, queued: true } });
  });
  await page.goto("/contact/");
  await page.getByLabel("Your email address").fill("qa@example.org");
  await page.getByLabel("Message Optional").fill("Please show me the reporting tools.");
  await page.getByLabel("I’d like a free personal demonstration.").check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("button", { name: "Message sent" })).toBeDisabled();
  expect(payload).toMatchObject({ email: "qa@example.org", newsletter: false, source: "/contact/" });
  expect(payload.message).toBe("Please arrange a free personal demonstration.\n\nPlease show me the reporting tools.");
});

test("contact retains entered text and offers a retry after service failure", async ({ page }) => {
  await page.route("**/api/hello", route => route.fulfill({ status: 503, json: { error: "Please try again." } }));
  await page.goto("/contact/?interest=beta");
  await expect(page.getByLabel("Message Optional")).toHaveValue("I’d like to request free early beta access.");
  await page.getByLabel("Your email address").fill("qa@example.org");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".contact-composer").getByRole("alert")).toHaveText("Please try again.");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await expect(page.getByLabel("Message Optional")).toHaveValue("I’d like to request free early beta access.");
});

test("public pages retain feedback and one pink invitation directly above their footer", async ({ page }) => {
  for (const path of ["/", "/ask-sorp/", "/are-you-sorp-ready/", "/charity-impact-reports/"]) {
    await page.goto(path);
    await expect(page.locator(".page-feedback")).toHaveCount(1);
    const invitation = page.locator(".contact-invitation");
    await expect(invitation).toHaveCount(1);
    await expect(invitation.locator("a")).toHaveAttribute("href", "/contact/");
    await expect(invitation).toHaveCSS("background-color", "rgb(239, 197, 212)");
    expect(await invitation.evaluate(element => element.nextElementSibling?.classList.contains("footer"))).toBe(true);
  }
});
