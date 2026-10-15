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
  await expect(page.getByRole("heading", { name: "To the charities making a difference, every day." })).toBeVisible();
  await adviser.click();
  await expect(adviser).toHaveAttribute("aria-pressed", "true");
  await expect(charity).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name: "To the accountants and advisers supporting our charities." })).toBeVisible();
  await expect(page.locator("#homepage-audience-detail")).toContainText("We’re all ears.");
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
      gaps: [
        cover.getBoundingClientRect().top - edge.getBoundingClientRect().bottom,
      ],
      sequence: [".gateway-opening", ".homepage-audience", "#our-ambition", ".gateway-sorp-section"].map(selector => document.querySelector(selector)!.getBoundingClientRect().top),
    };
  });
  expect(surfaces.edge).toBe(surfaces.cover);
  expect(surfaces.edgeBorder).toBe("0px");
  expect(surfaces.gaps).toEqual([0]);
  expect(surfaces.sequence).toEqual([...surfaces.sequence].sort((a, b) => a - b));
});

test("the middle story is one compact ambition and vision composition", async ({ page }, testInfo) => {
  await page.goto("/");
  const manifesto = page.locator("#our-ambition");
  await expect(manifesto.getByText("Our ambition", { exact: true })).toBeVisible();
  await expect(manifesto.getByRole("heading", { name: /Greater impact\.\s*Accessible to everyone\./ })).toBeVisible();
  await expect(manifesto.getByRole("heading", { name: "Imagine a world where social impact was taken as seriously as financial performance." })).toBeVisible();
  for (const removed of ["Too useful to leave in a filing cabinet.", "Better evidence.", "Better decisions.", "Big possibilities. Smaller barriers."]) {
    await expect(page.getByText(removed, { exact: false })).toHaveCount(0);
  }
  const box = (await manifesto.boundingBox())!;
  expect(box.height).toBeLessThan(page.viewportSize()!.width > 700 ? 700 : 800);
  await manifesto.screenshot({ path: testInfo.outputPath("ambition-vision.png") });
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
  await expect(page.locator(".homepage-msi-strapline")).toHaveText("Strategy for Social Impact Excellence");
  const enthusiasm = page.locator(".homepage-sorp-enthusiasm");
  await expect(enthusiasm).toHaveText("We’re excited about SORP 2026 and better charity reporting. We’re even more excited about what charities can achieve when they move beyond compliance — using better evidence to make clearer decisions, understand what works and create greater impact.");
  const positions = await page.locator(".gateway-home-cover, .homepage-sorp-enthusiasm, .homepage-audience").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});

test("Talk to us recognises accounts and confirms only an accepted server response", async ({ page }) => {
  await page.route("**/api/readiness-account/", route => route.fulfill({ json: { signedIn: true, account: { id: "preview", name: "Preview Person", email: "preview@example.org", organisation: "Preview Charity" } } }));
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/hello", async route => {
    writes.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, json: { accepted: true, emailSent: true } });
  });
  await page.goto("/");
  const section = page.locator(".shared-hello");
  await expect(section.getByLabel("Email address")).toHaveValue("preview@example.org");
  await section.getByLabel("Message Optional").fill("Please show us a demo.");
  await section.getByRole("button", { name: /Send message/ }).click();
  await expect(section).toContainText("hello is on its way");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ email: "preview@example.org", message: "Please show us a demo.", source: "/" });
});

test("pricing is free-first, honest about planned plans and leads directly into Let’s talk", async ({ page }) => {
  await page.goto("/");
  const pricing = page.locator(".homepage-pricing");
  await expect(pricing.getByRole("heading", { name: /Powerful tools/ })).toBeVisible();
  const plans = pricing.locator(".homepage-plan");
  await expect(plans).toHaveCount(4);
  await expect(plans.first()).toContainText("FREE");
  await expect(plans.first()).toContainText("£0");
  await expect(plans.first()).toContainText("Available now");
  await expect(plans.nth(1)).toContainText("Planned");
  await expect(plans.nth(2)).toContainText("Planned");
  await expect(pricing).not.toContainText("exclude VAT where applicable");
  await expect(pricing).toContainText("Free early beta access");
  await expect(pricing).toContainText("We’re testing Plus and Advisor with a small group of charities, accountants and advisers.");
  await expect(plans.getByRole("link")).toHaveCount(0);
  const track = pricing.locator(".homepage-plan-track");
  const geometry = await track.evaluate(element => ({ left: element.scrollLeft, width: element.clientWidth, scroll: element.scrollWidth }));
  expect(geometry.left).toBe(0);
  expect(geometry.scroll).toBeGreaterThan(geometry.width);
  await plans.first().getByText("See everything included").click();
  await expect(plans.first()).toContainText("No numeric allowance is currently published");
  await expect(plans.nth(1)).toContainText("Everything in Free.");
  await expect(plans.nth(2)).toContainText("Everything planned for Plus.");
  await expect(plans.locator("details[open]")).toHaveCount(4);
  await pricing.getByRole("button", { name: "Next plan" }).click();
  await expect.poll(() => track.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await expect(pricing.getByRole("link", { name: /£50/ })).toHaveCount(0);
  await expect(pricing.getByRole("link", { name: /£100\/hour/ })).toHaveAttribute("href", "/are-you-sorp-ready/review/booking/?session=60");
  await expect(pricing).toContainText("Smaller charity? We may be able to offer reduced rates. Just ask!");
  await expect(pricing).toContainText("Tier 1 covers charities preparing accruals accounts with annual gross income up to £500,000.");
  await expect(pricing.getByRole("link", { name: /Find Accountants & Advisers/ })).toHaveAttribute("href", "/accountants-advisers/");
  expect(await pricing.evaluate(element => element.closest("main")?.nextElementSibling?.id)).toBe("page-feedback");
});

test("shared Talk to us puts a clear copy-email action and offices beneath the message fields", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value: string) => { (window as typeof window & { copiedEmail?: string }).copiedEmail = value; } },
    });
  });
  await page.goto("/");
  const talk = page.locator(".shared-hello");
  await expect(talk.getByRole("heading", { name: "Talk to us." })).toBeVisible();
  await expect(talk.getByPlaceholder("Request a demo, ask a question, share an idea, give feedback, or just say hello…")).toBeVisible();
  await expect(talk.locator(".shared-hello-field > input, .shared-hello-field > textarea")).toHaveCount(2);
  await expect(talk.getByRole("checkbox")).toBeVisible();
  await expect(talk.getByRole("button", { name: /Send message/ })).toBeVisible();
  const copy = talk.getByRole("button", { name: "Copy marcus@mysocialimpact.org to clipboard" });
  await expect(copy).toContainText("Copy email address");
  await copy.click();
  await expect(copy).toContainText("Email copied");
  await expect(talk).toContainText("email address has been copied to your clipboard");
  expect(await page.evaluate(() => (window as typeof window & { copiedEmail?: string }).copiedEmail)).toBe("marcus@mysocialimpact.org");
  await expect(talk.locator(".shared-hello-details")).toContainText("10 Market Place, Shepton Mallet");
  await expect(talk.locator(".shared-hello-details")).toContainText("POPHub, Whitcomb Street, London");
  const order = await talk.locator(".shared-hello-field, .shared-hello-consent, .shared-hello-submit, .shared-hello-details").evaluateAll(elements => elements.map(element => element.className));
  expect(order).toEqual(["shared-hello-field", "shared-hello-field", "shared-hello-consent", "shared-hello-submit", "shared-hello-details"]);
});
