import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("homepage, product destinations and accessible mobile navigation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "SORP 2026.Made simpler.",
  );
  for (const link of await page
    .getByRole("link", { name: "Start your free review" })
    .all()) {
    await expect(link).toHaveAttribute(
      "href",
      "/are-you-sorp-ready/review/?entry=intro",
    );
  }
  await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  for (const portrait of await page.getByRole("img").all()) {
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toHaveJSProperty("complete", true);
    expect(
      await portrait.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Contact", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Contact", exact: true })
      .click();
  }
  await expect(page).toHaveURL(/contact/);
  await expect(
    page.getByRole("link", { name: /marcus@mysocialimpact.org/ }),
  ).toHaveAttribute("href", "mailto:marcus@mysocialimpact.org");
  expect(errors).toEqual([]);
});
test("all supporting pages render accessibly, without overflow or broken internal links", async ({
  page,
}) => {
  for (const path of [
    "/understanding-sorp/",
    "/for-charities/",
    "/for-advisers/",
    "/about/",
    "/ask-sorp/",
    "/contact/",
    "/privacy/",
    "/readiness/",
    "/are-you-sorp-ready/",
    "/are-you-sorp-ready/review/?entry=intro",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, path).toEqual([]);
  }
});
test("preview stays out of search engines and unknown routes return 404", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect((await request.get("/does-not-exist/")).status()).toBe(404);
});

test("footer identifies the exact build and The Ideas Shed company", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  const build = footer.getByLabel("Website build information");
  await build.scrollIntoViewIfNeeded();
  await expect(build).toBeVisible();
  await expect(build).toHaveText(
    /^Build \d{8}\.\d{4} · \d{2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2}$/,
  );
  const timestamp = await build.locator("time").getAttribute("datetime");
  expect(Number.isNaN(Date.parse(timestamp!))).toBe(false);
  const initialText = await build.innerText();
  await expect(
    footer.getByRole("link", { name: "The Ideas Shed Limited", exact: true }),
  ).toHaveAttribute("href", "https://www.theideasshed.com/");
  await expect(footer).toContainText(
    "Registered in England and Wales · Company number 17380053",
  );
  await page.reload();
  expect(await build.innerText()).toBe(initialText);
  await page.goto("/contact/");
  expect(await build.innerText()).toBe(initialText);
});
