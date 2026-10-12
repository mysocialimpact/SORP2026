import { test, expect } from "@playwright/test";

test("audience choice is optional, reversible and retained without tracking", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST") writes.push(request.url()); });
  await page.goto("/");
  const charity = page.getByRole("button", { name: /I work in a charity/ });
  const adviser = page.getByRole("button", { name: /I advise charities/ });
  await expect(charity).toHaveAttribute("aria-pressed", "false");
  await expect(adviser).toHaveAttribute("aria-pressed", "false");
  await charity.focus();
  await page.keyboard.press("Enter");
  await expect(charity).toHaveAttribute("aria-pressed", "true");
  await adviser.click();
  await expect(adviser).toHaveAttribute("aria-pressed", "true");
  await expect(charity).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(adviser).toHaveAttribute("aria-pressed", "true");
  await adviser.click();
  await expect(adviser).toHaveAttribute("aria-pressed", "false");
  expect(writes).toEqual([]);
});

test("Home divider joins the hero and products precede the vision", async ({ page }) => {
  await page.goto("/");
  const surfaces = await page.evaluate(() => {
    const edge = document.querySelector(".product-folder-sheet-edge")!;
    const cover = document.querySelector(".gateway-home-cover")!;
    return {
      edge: getComputedStyle(edge).backgroundColor,
      cover: getComputedStyle(cover).backgroundColor,
      gap: cover.getBoundingClientRect().top - edge.getBoundingClientRect().bottom,
      sequence: [".gateway-opening", ".homepage-audience", ".gateway-sorp-section", ".platform-family", ".gateway-home-vision"].map(selector => document.querySelector(selector)!.getBoundingClientRect().top),
    };
  });
  expect(surfaces.edge).toBe(surfaces.cover);
  expect(surfaces.gap).toBe(0);
  expect(surfaces.sequence).toEqual([...surfaces.sequence].sort((a, b) => a - b));
});

test("contact preview recognises accounts but never claims to send or enrol", async ({ page }) => {
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: { signedIn: true, account: { email: "preview@example.org" } } }));
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST") writes.push(request.url()); });
  await page.goto("/");
  const form = page.locator(".homepage-hello-form");
  await expect(form.getByLabel("Email address")).toHaveValue("preview@example.org");
  await expect(form.getByLabel("Email address")).toHaveAttribute("required", "");
  await expect(form.getByLabel("Anything you’d like to share?")).not.toHaveAttribute("required");
  const consent = form.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await consent.check();
  await expect(consent).toBeChecked();
  await expect(form.getByRole("button", { name: "Say hello" })).toBeDisabled();
  await expect(form).toContainText("This form won’t send or save your details.");
  await expect(form.getByRole("link", { name: /email Marcus directly/ })).toHaveAttribute("href", "mailto:marcus@mysocialimpact.org");
  expect(writes).toEqual([]);
});
