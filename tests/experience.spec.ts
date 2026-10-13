import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("experience can be paused, explored and expanded without losing organisations", async ({ page }, info) => {
  await page.goto("/");
  const section = page.locator(".experience-landscape");
  await section.scrollIntoViewIfNeeded();
  const lane = section.locator(".experience-lane").first();
  const start = await lane.evaluate(el => el.scrollLeft);
  await expect.poll(() => lane.evaluate(el => el.scrollLeft)).toBeGreaterThan(start + 2);
  await section.getByRole("button", { name: "Pause movement" }).click();
  const stopped = await lane.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(250);
  expect(await lane.evaluate(el => el.scrollLeft)).toBe(stopped);
  if (info.project.name === "mobile") {
    const box = (await lane.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const y = box.y + box.height / 2;
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 300, y }] });
    for (const x of [260, 210, 160, 100]) await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => lane.evaluate(el => el.scrollLeft)).toBeGreaterThan(stopped + 50);
    await client.detach();
  }
  await lane.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lane.evaluate(el => el.scrollLeft)).toBeGreaterThan(stopped);
  const images = section.locator("img");
  for (const img of await images.all()) expect(await img.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await section.boundingBox())!.height).toBeLessThan(info.project.name === "mobile" ? 800 : 900);
  await section.screenshot({ path: info.outputPath("experience.png") });
  await section.locator("summary").click();
  await expect(section.locator("li")).toHaveCount(62);
  await expect(section.getByRole("listitem").filter({ hasText: "The Wild Ones Kampala" })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(".experience-landscape").analyze();
  expect(accessibility.violations).toEqual([]);
});

test("reduced motion retains names and logos without automatic movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator(".experience-landscape");
  await section.scrollIntoViewIfNeeded();
  const lane = section.locator(".experience-lane").first();
  const start = await lane.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(350);
  expect(await lane.evaluate(el => el.scrollLeft)).toBe(start);
  expect(await section.locator(".experience-logo").first().evaluate(el => getComputedStyle(el).opacity)).toBe("1");
});
