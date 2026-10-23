import { expect, test } from "@playwright/test";

test("the fictional walkthrough connects the four products and explains locked stages", async ({ page }) => {
  await page.goto("/sample-charity/");
  await expect(page.getByRole("heading", { name: /Meet Harbourlight Neighbours/ })).toBeVisible();
  for (const label of ["Are You SORP Ready?", "Ask SORP", "Charity Impact Reports", "Social Impact Excellence"]) {
    await expect(page.locator(".sample-dashboard").getByText(label)).toBeVisible();
  }
  await expect(page.getByText("Five pillar deep dives", { exact: false })).toBeVisible();
  await expect(page.getByText(/founder activation after the baseline/)).toBeVisible();
  await expect(page.getByText(/synthetic illustrations/)).toBeVisible();
});

test("demo request retains visitor email after failure and only confirms an accepted request", async ({ page }) => {
  let accepted = false;
  await page.route("**/api/demo-request/", async route => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe("visitor@example.invalid");
    expect(body.source).toBe("/sample-charity/");
    await route.fulfill({ status: accepted ? 200 : 503, contentType: "application/json", body: JSON.stringify(accepted ? { accepted: true, queued: true } : { error: "Temporary failure" }) });
  });
  await page.goto("/sample-charity/");
  await page.locator("#demo-email").fill("visitor@example.invalid");
  await page.locator(".demo-request button[type=submit]").click();
  await expect(page.locator(".demo-request [role=alert]")).toHaveText("Temporary failure");
  await expect(page.locator("#demo-email")).toHaveValue("visitor@example.invalid");
  accepted = true;
  await page.locator(".demo-request button[type=submit]").click();
  await expect(page.locator(".demo-request [role=status]")).toContainText("Marcus will reply personally");
  await expect(page.locator(".demo-request button[type=submit]")).toHaveCount(0);
});

test("signed-in demo request uses the account email without asking for more details", async ({ page }) => {
  await page.route("**/api/readiness-account/", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedIn: true, account: { email: "member@example.invalid", name: "Sample Member", organisation: "Sample Organisation" } }) }));
  await page.route("**/api/demo-request/", async route => {
    const body = route.request().postDataJSON();
    expect(body.email).toBe("member@example.invalid");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accepted: true, queued: true }) });
  });
  await page.goto("/sample-charity/");
  await expect(page.locator(".demo-request")).toContainText("member@example.invalid");
  await expect(page.locator(".demo-request input[type=email]")).toHaveCount(0);
  await page.locator(".demo-request button[type=submit]").click();
  await expect(page.locator(".demo-request [role=status]")).toContainText("member@example.invalid");
});
