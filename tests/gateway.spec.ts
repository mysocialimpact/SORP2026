import { test, expect } from "@playwright/test";
test("Ask SORP presentation supports chapters and keyboard navigation without a pretend assistant", async ({
  page,
}) => {
  await page.goto("/ask-sorp/");
  const deck = page.getByRole("region", { name: /Ask SORP presentation/ });
  await deck.focus();
  await page.keyboard.press("ArrowRight");
  await expect(deck.getByRole("heading")).toContainText("behind the numbers");
  await page.getByRole("button", { name: "3. The questions" }).click();
  await expect(deck.getByRole("heading")).toContainText("From accounting");
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(deck).toContainText("The assistant is not available yet");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Next →", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "← Previous", exact: true }).click();
  await expect(deck.getByRole("heading")).toContainText("From accounting");
});
test("all nine original slides and review links are preserved", async ({
  page,
}, info) => {
  await page.goto("/are-you-sorp-ready/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Lora"'))).toBe(
    true,
  );
  const deck = page.locator(".sorp-film");
  for (let i = 0; i < 9; i++) {
    await deck.locator(".sf-chapters button").nth(i).click();
    await expect(deck).toHaveAttribute("data-slide", String(i));
    await expect(deck.locator(".sf-scene")).toBeVisible();
    const cta = page.locator(".sr-hero .sr-start");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      "href",
      "/are-you-sorp-ready/review/?entry=intro",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `test-results/slides-${info.project.name}.png`,
    fullPage: false,
  });
});
