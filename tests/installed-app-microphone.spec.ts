import { expect, test } from "@playwright/test";

test("onboarding permits its own microphone while the rest of the site stays restricted", async ({ request }) => {
  const onboarding = await request.get("/get-started/");
  expect(onboarding.ok()).toBeTruthy();
  expect(onboarding.headers()["permissions-policy"]).toContain("microphone=(self)");
  const home = await request.get("/");
  expect(home.headers()["permissions-policy"]).toContain("microphone=()");
});

test("a denied microphone in the installed Mac app offers specific recovery and retry", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => query === "(display-mode: standalone)"
      ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList
      : nativeMatchMedia(query);
    Object.defineProperty(navigator, "userAgent", { configurable: true, get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36" });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const app = window as Window & { __microphoneAttempts?: number };
        app.__microphoneAttempts = (app.__microphoneAttempts || 0) + 1;
        throw new DOMException("Permission denied", "NotAllowedError");
      },
    });
  });
  await page.goto("/get-started/");
  await page.getByRole("button", { name: "Record your answer" }).click();
  const alert = page.locator(".onboarding-voice").getByRole("alert");
  await expect(alert).toContainText("App info or Site settings");
  await expect(alert).toContainText("Privacy & Security → Microphone");
  await expect(page.getByRole("textbox", { name: "Your answer", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Try microphone again" }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __microphoneAttempts?: number }).__microphoneAttempts)).toBe(2);
});
