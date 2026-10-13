import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  { path: "/", title: "Home", sections: ["home-overview", "home-audience", "products", "home-experience", "home-team", "home-support", "say-hello"] },
  { path: "/are-you-sorp-ready/", title: "Are You SORP Ready?", sections: ["top", "sr-audiences", "sr-benefits", "presentation", "sr-more"] },
  { path: "/ask-sorp/", title: "Ask SORP", sections: ["ask-overview", "ask-sorp-live", "ask-how"] },
  { path: "/charity-impact-reports/", title: "Charity Impact Reports", sections: ["reports-overview", "reports-why", "reports-review", "reports-full"] },
  { path: "/social-impact-excellence/", title: "Social Impact Excellence", sections: ["excellence-overview", "excellence-start", "excellence-pillars", "excellence-account"] },
  { path: "/my-impact-director/", title: "My Impact Director", sections: ["director-overview", "director-ambition", "assessment", "director-support", "director-measurement", "director-future", "director-conversation"] },
] as const;

test("the shared section index stays visible and tracks all six folder pages", async ({ page }, testInfo) => {
  await page.route("**/api/readiness-account/**", route => route.fulfill({ status: 401, json: { signedIn: false } }));

  for (const entry of pages) {
    await page.goto(entry.path);
    const navigation = page.getByRole("navigation", { name: "On this page" });
    const track = navigation.locator(".product-section-navigation-track");

    await expect(navigation).toBeVisible();
    await expect(navigation.locator(".product-section-context strong")).toHaveText(entry.title);
    await expect(track.getByRole("link")).toHaveCount(entry.sections.length);
    await expect(track.getByRole("link").first()).toHaveAttribute("aria-current", "location");

    for (const section of entry.sections) {
      await expect(page.locator(`[id="${section}"]`)).toHaveCount(1);
      await expect(track.locator(`a[href="#${section}"]`)).toHaveCount(1);
    }

    const lastSection = entry.sections.at(-1)!;
    const lastLink = track.locator(`a[href="#${lastSection}"]`);
    await lastLink.click();
    await expect(lastLink).toHaveAttribute("aria-current", "location");
    await expect(page).toHaveURL(new RegExp(`#${lastSection}$`));
    expect(await navigation.evaluate(element => getComputedStyle(element).position)).toBe("sticky");
    expect((await navigation.boundingBox())!.y).toBeGreaterThanOrEqual(-1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (testInfo.project.name === "mobile") {
      await expect.poll(async () => {
        const [activeBox, trackBox] = await Promise.all([lastLink.boundingBox(), track.boundingBox()]);
        return activeBox!.x >= trackBox!.x - 1 && activeBox!.x + activeBox!.width <= trackBox!.x + trackBox!.width + 1;
      }).toBe(true);
    }
  }

  await page.goto("/");
  const accessibility = await new AxeBuilder({ page }).include(".product-section-navigation").analyze();
  expect(accessibility.violations).toEqual([]);
});

test("the section index is limited to the seven public folder landing pages", async ({ page }) => {
  await page.goto("/are-you-sorp-ready/review/?entry=intro");
  await expect(page.getByRole("navigation", { name: "On this page" })).toHaveCount(0);
});
