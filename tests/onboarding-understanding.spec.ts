import { test, expect, type Page } from "@playwright/test";
test.skip(
  process.env.ONBOARDING_FIXTURE_TESTS !== "true",
  "Requires isolated services",
);
const intro =
  "I’m Alex Jones, a trustee at Interim Spaces. My email is alex@example.com.";
async function start(page: Page) {
  await page.goto("/get-started/");
  await page.getByRole("button", { name: "Start a conversation" }).click();
}
async function answer(page: Page, text: string) {
  const input = page.getByRole("textbox", { name: "Your answer", exact: true });
  await expect(input).toBeEnabled();
  await input.fill(text);
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/onboarding/turn/") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Send/ }).click();
  expect((await response).ok()).toBe(true);
  await expect(input).toBeEnabled();
}
const question = (p: Page) => p.locator(".conversation-question");
const field = (p: Page, name: string) =>
  p.locator(`.onboarding-profile input[name=${name}]`);
test("exact trustee/reminder journey: clean entity, aware question, genuine confirmation and resume", async ({
  page,
}) => {
  const searches: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/onboarding/search/"))
      searches.push(r.postDataJSON().query);
  });
  await start(page);
  await answer(page, intro);
  await expect(field(page, "role")).toHaveValue("Trustee");
  await expect(field(page, "organisation")).toHaveValue("Interim Spaces");
  await expect(question(page)).toContainText(
    "You mentioned Interim Spaces. Shall we",
  );
  await expect(page.locator(".onboarding-profile")).toContainText(
    "charity not confirmed",
  );
  await answer(page, "I already told you Interim Spaces.");
  await expect(question(page)).toContainText("You’re right — Interim Spaces");
  await expect(page.locator("#charity-lookup")).not.toHaveValue(/already told/);
  expect(searches).toEqual([]);
  await page.reload();
  await expect(question(page)).toContainText("You’re right — Interim Spaces");
  await expect(field(page, "organisation")).toHaveValue("Interim Spaces");
  await answer(page, "Yes please");
  await expect(
    page.getByRole("heading", { name: "Interim Spaces (synthetic fixture)" }),
  ).toBeVisible();
  expect(searches).toEqual(["Interim Spaces"]);
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".confirmed-charity")).toContainText(
    "Interim Spaces",
  );
  await expect(question(page)).toContainText("governance, financial oversight");
  await page.reload();
  await expect(page.locator(".confirmed-charity")).toContainText(
    "Interim Spaces",
  );
  await expect(question(page)).toContainText("governance");
});
test("limited details remember the charity and never repeat role or fabricate email", async ({
  page,
}) => {
  await start(page);
  await answer(page, "I’m a trustee at Interim Spaces.");
  await expect(field(page, "email")).toHaveValue("");
  await expect(question(page)).toContainText("noted Interim Spaces");
  await expect(question(page)).not.toContainText("what you do");
  await answer(page, "I’m Alex Jones. My email is alex@example.com.");
  await expect(question(page)).toContainText("Interim Spaces. Shall we");
});
test("early referral and concern survive correction and suppress redundant questions", async ({
  page,
}) => {
  await start(page);
  await answer(
    page,
    intro +
      " I found you through LinkedIn. I prepare accounts. I’m worried about getting our charity accounts ready for SORP 2026.",
  );
  await answer(page, "I already told you.");
  await expect(question(page)).toContainText("You’re right — Interim Spaces");
  await page.getByRole("button", { name: "Find Interim Spaces" }).click();
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(question(page)).toContainText("A lovely place to start, Alex");
  await expect(question(page)).not.toContainText("up at night");
  await expect(question(page)).not.toContainText("come across");
});
test("ambiguous correction retains valid fields; employer rejection and explicit replacement work", async ({
  page,
}) => {
  await start(page);
  await answer(page, intro);
  await answer(page, "That’s not what I meant.");
  await expect(question(page)).toContainText("Which detail should I correct");
  await expect(field(page, "organisation")).toHaveValue("Interim Spaces");
  await answer(
    page,
    "I work there, but that’s not the charity I want to review.",
  );
  await expect(question(page)).toContainText("Which charity");
  await expect(
    page.getByRole("button", { name: "Find Interim Spaces" }),
  ).toHaveCount(0);
  await expect(field(page, "organisation")).toHaveValue("Interim Spaces");
  await answer(page, "Actually, let’s use Brainstrust instead.");
  await expect(
    page.getByRole("heading", { name: "Brainstrust (synthetic fixture)" }),
  ).toBeVisible();
  await expect(page.locator("#charity-lookup")).toHaveValue("Brainstrust");
});
test("multiple clients, other-charity ambiguity and change after confirmation", async ({
  page,
}) => {
  await start(page);
  await answer(
    page,
    "I’m Sarah Jones, an accountant at Burton Sweet working with around 20 charities. My email is sarah@example.com. I work with Interim Spaces, Brainstrust and another charity.",
  );
  await expect(question(page)).toContainText("Which one");
  await expect(page.locator(".charity-mentions button")).toHaveCount(2);
  await answer(page, "No, the other charity.");
  await expect(question(page)).toContainText(
    "Which did you mean: Interim Spaces, Brainstrust",
  );
  await expect(page.locator(".charity-match")).toHaveCount(0);
  await answer(page, "Let’s use Interim Spaces");
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".confirmed-charity")).toContainText(
    "Interim Spaces",
  );
  await answer(page, "Actually, let’s use Brainstrust instead.");
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Brainstrust (synthetic fixture)" }),
  ).toBeVisible();
  await expect(page.locator("#charity-lookup")).toHaveValue("Brainstrust");
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".confirmed-charity")).toContainText("Brainstrust");
  await expect(question(page)).toContainText("prepare accounts");
});
test("direct form edits persist without a conversational turn and drive the next question", async ({
  page,
}) => {
  await start(page);
  await answer(page, "Hello, I’m David. I work for a small charity.");
  await field(page, "name").press("End");
  await field(page, "name").pressSequentially(" Smith", { delay: 20 });
  await expect(field(page, "name")).toHaveValue("David Smith");
  await field(page, "email").fill("david@example.com");
  await field(page, "role").fill("Trustee");
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes("/api/onboarding/edit/") &&
      r.request().postDataJSON()?.fields?.organisation === "Interim Spaces",
  );
  await field(page, "organisation").fill("Interim Spaces");
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await expect(field(page, "email")).toHaveValue("david@example.com");
  await expect(field(page, "role")).toHaveValue("Trustee");
  await expect(question(page)).toContainText("Interim Spaces. Shall we");
});
test("search boundary rejects conversation text; stale revision cannot replace current fields", async ({
  page,
}) => {
  await start(page);
  await answer(page, intro);
  const first = await (
    await page.request.get("/api/onboarding/session/")
  ).json();
  const post = (action: string, data: unknown) =>
    page.request.post(`/api/onboarding/${action}/`, {
      headers: { origin: "http://127.0.0.1:3000" },
      data,
    });
  const invalid = await post("search", {
    query: "I already told you interim spaces",
    revision: first.state.revision,
  });
  expect(invalid.status()).toBe(400);
  const edited = await post("edit", {
    fields: { name: "Alexandra Jones" },
    revision: first.state.revision,
  });
  expect(edited.ok()).toBe(true);
  const stale = await post("turn", {
    message: "Actually, let’s use Brainstrust instead.",
    revision: first.state.revision,
  });
  expect(stale.status()).toBe(409);
  const data = await stale.json();
  expect(data.state.facts.name).toBe("Alexandra Jones");
  expect(data.state.charity.proposed).toBe("Interim Spaces");
});
test("failed replacement lookup cannot resurrect the old confirmed charity", async ({
  page,
}) => {
  await start(page);
  await answer(page, intro);
  await page.getByRole("button", { name: "Find Interim Spaces" }).click();
  await page.getByRole("button", { name: "Yes, this is the charity" }).click();
  await expect(page.locator(".confirmed-charity")).toBeVisible();
  await answer(page, "Actually, let’s use Unavailable Charity instead.");
  await expect(page.locator(".onboarding-notice")).toContainText("retry");
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
  await expect(page.locator("#charity-lookup")).toHaveValue(
    "Unavailable Charity",
  );
  await page.reload();
  await expect(page.locator(".confirmed-charity")).toHaveCount(0);
  await expect(question(page)).toContainText("Unavailable Charity");
});
