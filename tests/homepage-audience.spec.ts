import { expect, test } from "@playwright/test";

test("the audience hint plays once in view without choosing or tracking", async ({ page, isMobile }) => {
  const events: unknown[] = [];
  await page.route("**/api/growth-event", route => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { accepted: true } });
  });
  await page.goto("/");
  const section = page.locator("#home-audience");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveClass(/is-demonstrating/);
  const gesture = section.locator(".homepage-audience-gesture");
  await expect(gesture.locator(isMobile ? ".homepage-audience-hand" : ".homepage-audience-cursor")).toBeVisible();
  await expect(section).not.toHaveClass(/is-demonstrating/, { timeout: 5000 });
  await expect(section.getByRole("button", { name: /CHARITIES/ })).toHaveAttribute("aria-pressed", "false");
  expect(events).toHaveLength(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await section.scrollIntoViewIfNeeded();
  await expect(section).not.toHaveClass(/is-demonstrating/);
});

test("real interaction interrupts the hint and records only the chosen audience", async ({ page, isMobile }) => {
  const events: Record<string, unknown>[] = [];
  await page.route("**/api/growth-event", route => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { accepted: true } });
  });
  await page.goto("/");
  const section = page.locator("#home-audience");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveClass(/is-demonstrating/);
  await section.getByRole("button", { name: /ACCOUNTANTS & ADVISERS/ }).click();
  await expect(section).not.toHaveClass(/is-demonstrating/);
  await expect(section.getByRole("button", { name: /ACCOUNTANTS & ADVISERS/ })).toHaveAttribute("aria-pressed", "true");
  if (isMobile) {
    const panel = (await section.getByRole("button", { name: /ACCOUNTANTS & ADVISERS/ }).boundingBox())!;
    const detail = (await section.locator("#homepage-audience-adviser").boundingBox())!;
    expect(detail.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  }
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ eventType: "homepage_audience_selected", audience: "adviser", page: "/" });
  expect(Number.isFinite(Date.parse(String(events[0].occurredAt)))).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("msi-sorp-attribution:")))).toBe(false);
});

test("reduced motion removes the demonstration but leaves selection usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("#home-audience");
  await section.scrollIntoViewIfNeeded();
  await expect(section).not.toHaveClass(/is-demonstrating/);
  await expect(section.locator(".homepage-audience-gesture")).toBeHidden();
  await section.getByRole("button", { name: /CHARITIES/ }).click();
  await expect(section.getByRole("button", { name: /CHARITIES/ })).toHaveAttribute("aria-pressed", "true");
});
