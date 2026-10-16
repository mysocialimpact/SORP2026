import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.skip(
  process.env.ONBOARDING_FIXTURE_TESTS !== "true",
  "Requires isolated onboarding fixture services.",
);
const intro =
  "I’m Sarah Jones, a chartered accountant at Burton Sweet. My email is sarah@example.com. I work with about 20 charities, including Brainstrust. I found you on LinkedIn.";
// Requires the isolated test server described in docs/conversational-onboarding.md.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/growth-*", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
});
test("A/D: first answer reward, adaptive conversation, charity and completion", async ({
  page,
}, info) => {
  await page.goto("/get-started/?next=/ask-sorp/workspace/");
  await expect(
    page.getByRole("heading", { name: "Let’s get you started." }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/onboarding-${info.project.name}-intro.png`,
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).include(".onboarding-page").analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your answer", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill(
      intro +
        " I prepare accounts and advise trustees. My biggest challenge is inconsistent data.",
    );
  await page.getByRole("button", { name: "Send", exact: false }).click();
  await expect(
    page.locator(".onboarding-profile input[name=name]"),
  ).toHaveValue("Sarah Jones");
  await expect(
    page.locator(".onboarding-profile input[name=email]"),
  ).toHaveValue("sarah@example.com");
  await expect(
    page.locator(".onboarding-profile input[name=role]"),
  ).toHaveValue("Chartered accountant");
  await expect(
    page.locator(".onboarding-profile input[name=organisation]"),
  ).toHaveValue("Burton Sweet");
  await expect(page.locator(".profile-reward")).toContainText("details added");
  await expect(page.locator(".conversation-question")).toContainText(
    "You mentioned Brainstrust",
  );
  if (info.project.name === "mobile") {
    await expect.poll(async () => page.evaluate(() => {
      const profile = document.querySelector(".onboarding-profile")!.getBoundingClientRect();
      const question = document.querySelector(".conversation-question")!.getBoundingClientRect();
      return question.top >= profile.bottom && question.bottom < innerHeight;
    })).toBe(true);
    await page.getByRole("textbox", { name: "Your answer", exact: true }).fill("Yes please");
    await page.getByRole("button", { name: "Send", exact: false }).click();
  } else {
    await page.getByRole("button", { name: "Find Brainstrust" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Brainstrust (synthetic fixture)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".conversation-question")).toContainText(
    "A lovely place to start, Sarah",
  );
  await expect(page.locator(".conversation-question")).not.toContainText(
    "up at night",
  );
  await page.evaluate(() => window.scrollTo({top: 0, behavior: "instant"}));
  await page.screenshot({
    path: `test-results/onboarding-${info.project.name}-complete.png`,
    fullPage: true,
  });
  await page
    .locator(".onboarding-finish")
    .getByRole("button", { name: "Create my account" })
    .click();
  await page
    .getByLabel("Choose a password")
    .fill("Synthetic-Test-Password-123");
  await page
    .getByLabel("Confirm your password")
    .fill("Synthetic-Test-Password-123");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Create my account" })
    .click();
  await page.waitForURL("**/ask-sorp/workspace/");
  await expect(page.getByLabel("Your shared charity context")).toContainText(
    "Sarah",
  );
  await page.goto("/get-started/?next=/charity-impact-reports/review/");
  await page.waitForURL("**/charity-impact-reports/review/");
  await expect(
    page.getByText("Choose the PDF you want us to review."),
  ).toBeVisible();
});
test("B: partial details, editable fields, no invented email and early exit", async ({
  page,
}) => {
  await page.goto("/get-started/?next=/my-impact-director/");
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("Hello, I’m David. I work for a small charity.");
  await page.getByRole("button", { name: "Send", exact: false }).click();
  await expect(
    page.locator(".onboarding-profile input[name=name]"),
  ).toHaveValue("David");
  await expect(
    page.locator(".onboarding-profile input[name=email]"),
  ).toHaveValue("");
  await expect(page.locator(".conversation-question")).toContainText(
    "email address and what you do",
  );
  await page
    .locator(".onboarding-profile input[name=email]")
    .fill("david@example.com");
  await page
    .locator(".onboarding-profile input[name=role]")
    .fill("Finance manager");
  await page
    .locator(".onboarding-profile input[name=name]")
    .fill("David Smith");
  await expect(
    page
      .getByRole("button", { name: "Continue with these details" })
      .filter({ visible: true })
      .first(),
  ).toBeEnabled();
});
test("C: several charities require an explicit choice", async ({ page }) => {
  await page.goto("/get-started/");
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill(intro.replace("Brainstrust", "Brainstrust, Shelter and Mind"));
  await page.getByRole("button", { name: "Send", exact: false }).click();
  await expect(page.locator(".conversation-question")).toContainText(
    "Which one",
  );
  await expect(page.locator(".charity-mentions button")).toHaveCount(3);
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
});
test("traditional form, secure validation and verification handoff", async ({
  page,
}) => {
  await page.goto("/get-started/?next=/social-impact-excellence/assessment/");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page
    .locator(".onboarding-profile input[name=name]")
    .fill("Alex Verify");
  await page
    .locator(".onboarding-profile input[name=email]")
    .fill("alex-verify@example.com");
  await page.locator(".onboarding-profile input[name=role]").fill("Trustee");
  await page
    .locator(".profile-next")
    .getByRole("button", { name: /Create my account/ })
    .click();
  await page.getByLabel("Choose a password").fill("Synthetic-Password-123");
  await page.getByLabel("Confirm your password").fill("Does-Not-Match-123");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Create my account" })
    .click();
  await expect(
    page.locator(".onboarding-page").getByRole("alert"),
  ).toContainText("do not match");
  await page.getByLabel("Confirm your password").fill("Synthetic-Password-123");
  await page
    .locator("dialog")
    .getByRole("button", { name: "Create my account" })
    .click();
  await expect(page.locator("dialog")).toContainText("Check your inbox");
  await expect(page.locator("dialog")).toContainText(
    "Social Impact Excellence",
  );
});
test("failed assistance keeps form usable; keyboard and reduced motion are accessible", async ({
  page,
}, info) => {
  await page.route("**/api/onboarding/start/", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/get-started/");
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("Sarah");
  await page.getByRole("button", { name: "Send", exact: false }).click();
  await expect(
    page.locator(".onboarding-profile input[name=name]"),
  ).toHaveValue("Sarah");
  await expect(page.locator(".onboarding-notice")).toContainText("unavailable");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  const violations = (
    await new AxeBuilder({ page }).include(".onboarding-page").analyze()
  ).violations;
  expect(violations).toEqual([]);
  await page.screenshot({
    path: `test-results/onboarding-${info.project.name}-partial.png`,
    fullPage: true,
  });
});
test("E: microphone denial provides a useful recovery", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto("/get-started/");
  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page.getByRole("button", { name: "Record your answer" }).click();
  await expect(
    page.locator(".onboarding-page").getByRole("alert"),
  ).toContainText("Microphone access was declined");
  await expect(
    page.getByRole("textbox", { name: "Your answer", exact: true }),
  ).toBeEnabled();
});
test("API rejects cross-site mutations and unauthenticated shared context", async ({
  request,
}) => {
  const cross = await request.post("/api/onboarding/start/", {
    headers: { origin: "https://evil.example" },
    data: {},
  });
  expect(cross.status()).toBe(403);
  const context = await request.get("/api/onboarding/context/");
  expect(context.status()).toBe(401);
});
