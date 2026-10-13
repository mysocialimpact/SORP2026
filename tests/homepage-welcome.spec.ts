import { test, expect } from "@playwright/test";

test("audience choice is optional, reversible and retained without tracking", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST") writes.push(request.url()); });
  await page.goto("/");
  await expect(page.getByText("Built for charities and the accountants and advisers who support them.")).toBeVisible();
  const charity = page.getByRole("button", { name: /CHARITIES/ });
  const adviser = page.getByRole("button", { name: /ACCOUNTANTS & ADVISERS/ });
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
      edgeBorder: getComputedStyle(edge).borderTopWidth,
      gap: cover.getBoundingClientRect().top - edge.getBoundingClientRect().bottom,
      sequence: [".gateway-opening", ".homepage-audience", ".gateway-sorp-section", ".homepage-impact", ".gateway-home-vision"].map(selector => document.querySelector(selector)!.getBoundingClientRect().top),
    };
  });
  expect(surfaces.edge).toBe(surfaces.cover);
  expect(surfaces.edgeBorder).toBe("0px");
  expect(surfaces.gap).toBe(0);
  expect(surfaces.sequence).toEqual([...surfaces.sequence].sort((a, b) => a - b));
});

test("one compact starting point links directly to the working review", async ({ page }, testInfo) => {
  await page.goto("/");
  const start = page.locator(".homepage-start");
  await expect(start.getByRole("heading")).toHaveText("Are You SORP Ready?");
  await expect(start).toContainText("Discover how prepared your charity is for impact and sustainability reporting under SORP 2026.");
  const review = start.getByRole("link", { name: "Start your free review" });
  await expect(review).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  await expect(start.getByText("Ask SORP")).toHaveCount(0);
  await expect(page.getByText("Already working with an accountant or adviser? Brilliant.")).toHaveCount(0);
  const box = (await start.boundingBox())!;
  expect(box.height).toBeLessThan(page.viewportSize()!.width > 700 ? 340 : 470);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await start.screenshot({ path: testInfo.outputPath("single-start.png") });
  await review.click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/review\/\?entry=intro$/);
  await expect(page.locator(".si-welcome")).toBeVisible();
});

test("hero frames SORP as the requirement and better impact as the opportunity", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("SORP is the requirement.");
  await expect(heading).toContainText("Better impact is the opportunity.");
  const sizes = await heading.evaluate(element => ({
    context: parseFloat(getComputedStyle(element.querySelector(".gateway-hero-context")!).fontSize),
    opportunity: parseFloat(getComputedStyle(element.querySelector(".gateway-hero-opportunity")!).fontSize),
  }));
  expect(sizes.opportunity).toBeGreaterThan(sizes.context);
});

test("contact form recognises accounts and confirms only an accepted server response", async ({ page }) => {
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: { signedIn: true, account: { email: "preview@example.org" } } }));
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/hello", async route => {
    writes.push(route.request().postDataJSON());
    await route.fulfill({ json: { accepted: true, emailSent: true } });
  });
  await page.goto("/");
  const form = page.locator(".homepage-hello-form");
  await expect(form.getByLabel("Email address")).toHaveValue("preview@example.org");
  await expect(form.getByLabel("Email address")).toHaveAttribute("required", "");
  await expect(form.getByLabel("Anything you’d like to share?")).not.toHaveAttribute("required");
  const consent = form.getByRole("checkbox");
  await expect(consent).not.toBeChecked();
  await consent.check();
  await expect(consent).toBeChecked();
  await form.getByRole("button", { name: "Say hello" }).click();
  await expect(form).toContainText("has been emailed to My Social Impact");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ email: "preview@example.org", newsletter: true });
});
