import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("homepage, product destinations and accessible mobile navigation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Brainstrust", { exact: true })).toHaveCount(0);
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
  const sorpSection = page.locator("section.gateway-sorp-section");
  await expect(sorpSection.getByText("Coming soon", { exact: true })).toBeVisible();
  await expect(
    sorpSection.getByRole("heading", { name: "Start here. Get SORP ready." }),
  ).toBeVisible();
  await expect(
    sorpSection.getByText("Already working with an accountant or adviser? Brilliant."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The people behind the tools." }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Gareth Murphy" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Nicholas Demeter" })).toBeVisible();
  const nicholasProfile = page.getByRole("figure").filter({
    has: page.getByRole("heading", { name: "Nicholas Demeter" }),
  });
  await expect(nicholasProfile).toContainText("Monitoring & evaluation");
  await expect(nicholasProfile).toContainText("USAID & international development");
  const sectionHierarchy = await page.locator(".platform-family-head").evaluate((header) => {
    const heading = header.querySelector("h2");
    const introduction = header.querySelector("p:last-child");
    return {
      heading: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : 0,
      introduction: introduction ? Number.parseFloat(getComputedStyle(introduction).fontSize) : 0,
    };
  });
  expect(sectionHierarchy.heading).toBeGreaterThan(sectionHierarchy.introduction * 2.5);
  if (testInfo.project.name === "mobile") {
    const productColumns = await page.locator(".platform-family-grid").evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    );
    expect(productColumns).toBe(2);
  }
  await expect(
    page.getByRole("img", { name: "Social Impact Excellence" }).first(),
  ).toHaveAttribute("src", /social-impact-excellence-transparent\.png/);
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
  await page
    .getByRole("navigation", { name: "Information" })
    .getByRole("link", { name: "Contact", exact: true })
    .click();
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

test("the digital filing folder keeps all six products in one accessible sequence", async ({
  page,
}, testInfo) => {
  const products = [
    ["Home", "/"],
    ["Are You SORP Ready?", "/are-you-sorp-ready/"],
    ["Ask SORP", "/ask-sorp/"],
    ["Charity Impact Reports", "/charity-impact-reports/"],
    ["Social Impact Excellence", "/social-impact-excellence/"],
    ["Purpose Works", "/purpose-works/"],
    ["My Impact Director", "/my-impact-director/"],
  ] as const;

  for (const [name, path] of products) {
    await page.goto(path);
    const folder = page.getByRole("navigation", { name: "SORP2026 products" });
    await expect(folder).toBeVisible();
    await expect(folder.getByRole("link")).toHaveCount(7);
    await expect(page.locator(".gateway-header .gateway-account-control")).toHaveCount(1);
    await expect(folder.getByRole("link").allTextContents()).resolves.toEqual(
      products.map(([productName], index) =>
        `${index === 0 ? "Index" : String(index).padStart(2, "0")}${productName}${productName === name ? "Current section" : index === 0 ? "Platform index" : index === 1 ? "Live beta" : index === 2 ? "Coming soon" : index === 3 || index === 4 ? "Available" : "Explore"}`,
      ),
    );
    await expect(folder.getByRole("link", { name: new RegExp(name) })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }

  if (testInfo.project.name === "mobile") {
    await page.goto("/are-you-sorp-ready/");
    const folder = page.getByRole("navigation", { name: "SORP2026 products" });
    const touchTarget = await folder.getByRole("link").first().evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(touchTarget.width).toBeGreaterThanOrEqual(160);
    expect(touchTarget.height).toBeGreaterThanOrEqual(60);
    await folder.getByRole("link", { name: /My Impact Director/ }).click();
    await expect(page).toHaveURL(/my-impact-director/);
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("supporting pages remain inside the Home folder section", async ({ page }) => {
  for (const [path, title] of [["/our-mission/", "Our Mission"], ["/contact/", "Contact"]] as const) {
    await page.goto(path);
    const folder = page.getByRole("navigation", { name: "SORP2026 products" });
    await expect(folder.getByRole("link")).toHaveCount(7);
    await expect(folder.getByRole("link", { name: /Home/ })).toHaveAttribute("aria-current", "location");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(`Home/${title}`);
  }

  await page.goto("/are-you-sorp-ready/review/?entry=intro");
  await expect(page.getByRole("navigation", { name: "SORP2026 products" }).getByRole("link", { name: /Are You SORP Ready/ })).toHaveAttribute("aria-current", "location");
  await expect(page.locator(".gateway-header .gateway-account-control")).toHaveCount(1);
});

test("the compact header uses the folder as primary navigation", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: /SORP 2026 home/ })).toContainText("Reporting for greater impact.");
  await expect(header.getByRole("link", { name: /SORP 2026 home/ })).toHaveAttribute("href", "/");
  await expect(header.getByRole("navigation")).toHaveCount(0);
  await expect(header.getByRole("link", { name: /Log in|My Dashboard|Account/ })).toHaveCount(1);
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
    /^Build \d+ · \d{2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2}$/,
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
