// Explicit opt-in, live public research and QA account only. Outbound emails,
// payments, tracking and booking writes are intercepted before leaving the browser.
import { chromium } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
if (process.env.SORP_LIVE_READINESS_TEST !== "true")
  throw new Error("Opt-in required: SORP_LIVE_READINESS_TEST=true");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const email = `sorp-journey-qa-${randomUUID()}@example.invalid`;
page.setDefaultTimeout(30000);
let signedIn = false;
try {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname.includes("report-email") ||
      url.pathname.includes("/booking/free") ||
      url.pathname.includes("/booking/payment") ||
      url.pathname.includes("/sorp-payments") ||
      url.pathname.includes("/readiness/problem") ||
      url.pathname.includes("/growth-")
    )
      return route.fulfill({
        status: 409,
        json: {
          error:
            "Blocked by QA: no external email, payment, booking or tracking is permitted.",
        },
      });
    if (
      url.pathname.includes("/published-review") &&
      route.request().method() === "POST" &&
      !["find", "profile", "prepare-tar", "assess-tar"].includes(
        route.request().postDataJSON()?.operation,
      )
    )
      return route.fulfill({
        status: 409,
        json: { error: "Operation outside QA scope." },
      });
    return route.continue();
  });
  await page.goto(
    "https://sorp2026.org/are-you-sorp-ready/review/?entry=intro",
    { waitUntil: "networkidle" },
  );
  for (let i = 0; i < 4; i++)
    await page
      .locator(".scr-bottom > div:last-child > button:not(.is-secondary)")
      .click();
  await page.getByLabel("Charity name or number").fill("1165694");
  await page.locator("#scr-find-form button").click();
  await page
    .getByRole("button", { name: /YES, THIS IS MY CHARITY/ })
    .click({ timeout: 120000 });
  console.log("LIVE charity search and confirmation passed");
  await page
    .getByLabel("Your name", { exact: true })
    .fill("SORP journey QA — automated test");
  const select = page.getByRole("combobox");
  await select.selectOption({ index: 1 });
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Confirm email address", { exact: true }).fill(email);
  const password = randomBytes(24).toString("base64url");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  console.log("QA account identifier:", email);
  await page.getByRole("button", { name: /CREATE MY FREE ACCOUNT/ }).click();
  await page
    .getByText("SIGNED IN", { exact: true })
    .waitFor({ timeout: 45000 });
  signedIn = true;
  console.log("LIVE browser signup passed");
  await page
    .getByRole("button", { name: /CONTINUE TO ASSESSMENT/ })
    .click({ timeout: 240000 });
  console.log("LIVE public report retrieval and preparation passed");
  await page
    .getByRole("button", {
      name: /SKIP EXPLANATION & VIEW SNAPSHOT|VIEW MY HISTORICAL SNAPSHOT/,
    })
    .click({ timeout: 300000 });
  console.log("LIVE historical report assessment and snapshot passed");
  await page
    .getByRole("button", { name: /CONTINUE TO CURRENT READINESS/ })
    .click();
  await page.getByRole("button", { name: "SKIP FOR NOW", exact: true }).click();
  await page
    .getByRole("button", { name: /START MY CURRENT READINESS REVIEW/ })
    .click();
  for (let q = 0; q < 19; q++) {
    await page
      .locator(".scr-answer-grid button")
      .filter({ hasText: "NOT SURE" })
      .click();
    await page.locator(".scr-bottom > div:last-child > button").click();
  }
  await page
    .getByRole("button", { name: /BUILD MY PERSONALISED REPORT/ })
    .click();
  await page
    .getByRole("button", { name: /VIEW MY PERSONALISED REPORT/ })
    .click();
  await page.getByRole("button", { name: /SEE MY PRIORITIES/ }).click();
  await page.screenshot({
    path: "/tmp/sorp-live-qa-report.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: /FINISH MY REVIEW/ }).waitFor();
  console.log(
    "LIVE 19 unanswered-position choices, report generation and reload passed. No email requested.",
  );
} catch (error) {
  await page.screenshot({
    path: "/tmp/sorp-live-qa-blocker.png",
    fullPage: true,
  });
  console.error("LIVE journey stopped:", error.message);
  console.error(
    "Visible status:",
    (
      await page
        .locator(".scr-account-error,.scr-error,.scr-homework-failure")
        .allTextContents()
    )
      .join(" ")
      .slice(0, 1800),
  );
  process.exitCode = 1;
} finally {
  if (signedIn)
    await page.evaluate(() =>
      fetch("/api/readiness-account/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }),
    );
  await browser.close();
}
