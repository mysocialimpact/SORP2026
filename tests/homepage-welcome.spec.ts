import { test, expect } from "@playwright/test";

test("audience choice is optional, reversible and retained without tracking", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST") writes.push(request.url()); });
  await page.goto("/");
  await expect(page.getByText("We’ve built this for")).toBeVisible();
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
    const sectionNavigation = document.querySelector(".product-section-navigation")!;
    const cover = document.querySelector(".gateway-home-cover")!;
    return {
      edge: getComputedStyle(edge).backgroundColor,
      cover: getComputedStyle(cover).backgroundColor,
      edgeBorder: getComputedStyle(edge).borderTopWidth,
      gaps: [
        sectionNavigation.getBoundingClientRect().top - edge.getBoundingClientRect().bottom,
        cover.getBoundingClientRect().top - sectionNavigation.getBoundingClientRect().bottom,
      ],
      sequence: [".gateway-opening", ".homepage-audience", ".homepage-ambition", ".gateway-home-vision", ".gateway-sorp-section"].map(selector => document.querySelector(selector)!.getBoundingClientRect().top),
    };
  });
  expect(surfaces.edge).toBe(surfaces.cover);
  expect(surfaces.edgeBorder).toBe("0px");
  expect(surfaces.gaps).toEqual([0, 0]);
  expect(surfaces.sequence).toEqual([...surfaces.sequence].sort((a, b) => a - b));
});

test("the middle story is one compact ambition and a distinct vision", async ({ page }, testInfo) => {
  await page.goto("/");
  const ambition = page.locator(".homepage-ambition");
  const vision = page.locator(".homepage-vision");
  await expect(ambition.getByText("Our ambition", { exact: true })).toBeVisible();
  await expect(ambition.getByRole("heading")).toHaveText("Greater impact.Accessible to everyone.");
  await expect(vision.getByRole("heading")).toHaveText("Imagine a world where social impact was taken as seriously as financial performance.");
  for (const removed of ["Too useful to leave in a filing cabinet.", "Better evidence.", "Better decisions.", "Big possibilities. Smaller barriers."]) {
    await expect(page.getByText(removed, { exact: false })).toHaveCount(0);
  }
  const ambitionBox = (await ambition.boundingBox())!;
  const visionBox = (await vision.boundingBox())!;
  expect(ambitionBox.height + visionBox.height).toBeLessThan(page.viewportSize()!.width > 700 ? 700 : 760);
  await ambition.screenshot({ path: testInfo.outputPath("ambition.png") });
  await vision.screenshot({ path: testInfo.outputPath("vision.png") });
});

test("one compact starting point links directly to the working review", async ({ page }, testInfo) => {
  await page.goto("/");
  const start = page.locator(".homepage-start");
  await expect(start.getByRole("heading")).toHaveText("Are You SORP Ready?");
  await expect(start).toContainText("A free assessment of your charity’s impact and sustainability reporting readiness.");
  const review = start.getByRole("link", { name: "Start your free review" });
  await expect(review).toHaveAttribute("href", "/are-you-sorp-ready/review/?entry=intro");
  await expect(start.getByText("Ask SORP")).toHaveCount(0);
  await expect(page.getByText("Already working with an accountant or adviser? Brilliant.")).toHaveCount(0);
  const box = (await start.boundingBox())!;
  expect(box.height).toBeLessThan(page.viewportSize()!.width > 700 ? 340 : 470);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await start.screenshot({ path: testInfo.outputPath("single-start.png") });
  await review.click();
  await expect(page).toHaveURL(/\/are-you-sorp-ready\/review\/(?:\?entry=intro)?$/);
  await expect(page.locator(".si-welcome")).toBeVisible();
});

test("hero frames SORP as the requirement and better impact as the opportunity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Free tools. Affordable expertise.");
  await expect(page.locator(".homepage-editorial")).toContainText("SORP is the requirement.");
  await expect(page.locator(".homepage-editorial")).toContainText("Better impact is the opportunity.");
  const enthusiasm = page.locator(".homepage-sorp-enthusiasm");
  await expect(enthusiasm).toHaveText("We’re excited about SORP 2026 and better charity reporting. Even more so about what charities can achieve with the insight it brings.");
  const positions = await page.locator(".gateway-home-cover, .homepage-sorp-enthusiasm, .homepage-audience").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
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
  await expect(form.getByRole("checkbox")).toHaveCount(0);
  await form.getByRole("button", { name: "Say hello" }).click();
  await expect(form).toContainText("has been emailed to My Social Impact");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ email: "preview@example.org", newsletter: false });
});

test("Say hello provides Marcus’s email as a working copy action", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const hello = page.locator(".homepage-hello");
  const copy = hello.locator(".homepage-copy-email");
  await expect(copy).toBeVisible();
  await expect(copy).toHaveAccessibleName("Copy marcus@mysocialimpact.org");
  await copy.click();
  await expect(copy).toHaveText("Email copied ✓");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("marcus@mysocialimpact.org");
});
