import { expect, test } from "@playwright/test";

test("publishes an installable SORP identity without offline data caching", async ({ page, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    id: "/",
    name: "SORP 2026",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
  expect((await request.get("/apple-touch-icon.png")).ok()).toBeTruthy();
  const worker = await (await request.get("/sw.js")).text();
  expect(worker).not.toContain("caches.open");
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.getByRole("button", { name: "Install SORP 2026" })).toBeVisible();
});

test("opens concise manual instructions and leaves navigation usable", async ({ page, isMobile }, testInfo) => {
  await page.goto("/");
  await page.screenshot({ path: testInfo.outputPath("install-header.png") });
  await page.getByRole("button", { name: "Install SORP 2026" }).click();
  const dialog = page.getByRole("dialog", { name: "Install SORP 2026." });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(isMobile ? "Add to Home Screen" : "Install page as app");
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("link", { name: /Are You SORP Ready/ }).first()).toBeVisible();
  const headerOverflow = await page.locator(".gateway-header").evaluate(element => element.scrollWidth > element.clientWidth + 1);
  expect(headerOverflow).toBe(false);
});

test("uses the browser's native install prompt when offered", async ({ page }) => {
  await page.goto("/");
  // First interaction ensures the hydrated component has attached its browser event listener.
  await page.getByRole("button", { name: "Install SORP 2026" }).click();
  await page.getByRole("button", { name: "Got it" }).click();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => { (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled = true; },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Install SORP 2026" }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled)).toBe(true);
  await expect(page.getByRole("button", { name: "Install SORP 2026" })).toHaveCount(0);
});

test("does not offer installation in standalone mode", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { configurable: true, get: () => true }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Install SORP 2026" })).toHaveCount(0);
});
