import { spawn, execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  mkdir,
  writeFile,
  cp,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import chromiumBinary from "./node_modules/@sparticuz/chromium/build/index.js";
import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import { blueCross } from "../onboarding-evals/journeys.mjs";
if (
  process.env.SORP_LIVE_EVAL !== "true" ||
  (!process.env.OPEN_API_KEY && !process.env.OPENAI_API_KEY)
)
  throw new Error("Opt-in and real model credential required");
const dir = await mkdtemp(path.join(tmpdir(), "sorp-live-eval-"));
// The database service user cannot traverse Vercel's private checkout directory.
// Only public test dependencies are copied; credentials/application files stay put.
await chmod(dir, 0o755);
await cp("tests/live-runtime/node_modules", path.join(dir, "node_modules"), {
  recursive: true,
  verbatimSymlinks: true,
});
// Build policy can omit npm symlink hydration. These are public test binaries;
// never relax permissions on the private checkout or the database itself.
const binaryPackage = path.join(dir, "node_modules/@embedded-postgres/linux-x64");
execFileSync(process.execPath, ["scripts/hydrate-symlinks.js"], { cwd: binaryPackage });
execFileSync("chmod", ["-R", "a+rX", path.join(dir, "node_modules")]);
const { default: EmbeddedPostgres } = await import(
  path.join(dir, "node_modules/embedded-postgres/dist/index.js")
);
const pg = new EmbeddedPostgres({
  databaseDir: path.join(dir, "pg"),
  user: "postgres",
  password: "isolated-eval",
  port: 55434,
  persistent: false,
  createPostgresUser: process.getuid?.() === 0,
  onLog: () => {},
  onError: () => {},
});
const processes = [];
let browser, db;
const reports = [];
function start(command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  processes.push(child);
  return child;
}
async function until(check, ms = 30000) {
  const end = Date.now() + ms;
  let error;
  while (Date.now() < end) {
    try {
      const value = await check();
      if (value) return value;
    } catch (e) {
      error = e;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw error || new Error("Timed out");
}
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("onboarding_live");
  const url =
    "postgresql://postgres:isolated-eval@127.0.0.1:55434/onboarding_live";
  db = new Pool({ connectionString: url });
  await db.query("CREATE SCHEMA research_console");
  await db.query(
    await readFile("migrations/012_conversational_onboarding.sql", "utf8"),
  );
  start("node", ["tests/onboarding-services.fixture.mjs"], {
    ONBOARDING_FIXTURE_TRANSCRIPT: blueCross,
  });
  start(
    "node",
    ["node_modules/next/dist/bin/next", "start", "--port", "3100"],
    {
      CONSOLE_DATABASE_URL: url,
      SORP_ONBOARDING_ENABLED: "true",
      SORP_BACKEND_ORIGIN: "http://127.0.0.1:4311",
      SORP_READINESS_API_URL: "http://127.0.0.1:4311/api/readiness",
      SORP_TRANSCRIBE_API_URL: "http://127.0.0.1:4311/api/transcribe",
      SORP_ONBOARDING_DAILY_USD: "0.50",
      SORP_ONBOARDING_MONTHLY_USD: "0.50",
    },
  );
  await until(async () => {
    const r = await fetch("http://127.0.0.1:3100/get-started/");
    return r.ok;
  });
  const wav = Buffer.alloc(44 + 48000 * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(48000, 24);
  wav.writeUInt32LE(96000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < 48000; i++)
    wav.writeInt16LE(
      Math.sin((i * 2 * Math.PI * 440) / 48000) * 15000,
      44 + i * 2,
    );
  const audioFile = path.join(dir, "audio.wav");
  await writeFile(audioFile, wav);
  browser = await chromium.launch({
    executablePath: await chromiumBinary.executablePath(),
    args: [
      ...chromiumBinary.args,
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      `--use-file-for-fake-audio-capture=${audioFile}`,
    ],
    headless: true,
  });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const questions = [];
    await page.goto(
      "http://127.0.0.1:3100/get-started/?next=/ask-sorp/workspace/",
    );
    await page.getByRole("button", { name: "Start a conversation" }).click();
    const input = page.getByRole("textbox", {
      name: "Your answer",
      exact: true,
    });
    async function send(text) {
      await input.fill(text);
      const pending = page.waitForResponse(
        (r) =>
          r.url().includes("/api/onboarding/turn/") &&
          r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /Send/ }).click();
      const response = await pending;
      assert.equal(response.status(), 200);
      const data = await response.json();
      assert.equal(
        data.notice,
        "",
        "Live model failure cannot pass as fallback",
      );
      assert.ok(data.state);
      await until(async () => !(await input.isDisabled()));
      questions.push(data.question);
      return data;
    }
    if (viewport.width > 1000) {
      await page.getByRole("button", { name: "Record your answer" }).click();
      await expect(page.locator(".voice-recording")).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator(".voice-wave i")
            .evaluateAll((bars) =>
              bars.some((b) => parseFloat(b.style.height) > 4),
            ),
        )
        .toBe(true);
      await page.getByRole("button", { name: "Stop recording" }).click();
      await expect(page.locator(".voice-transcript")).toBeVisible();
      await expect(input).toHaveValue(blueCross);
    }
    const first = await send(blueCross);
    assert.equal(first.state.facts.organisation, "");
    assert.ok(
      first.state.professional.some(
        (r) => /Blue Cross/i.test(r.entity) && r.period === "past",
      ),
    );
    assert.match(first.question, /Blue Cross/);
    assert.match(first.question, /current|now|today/i);
    const name = page.locator("input[name=name]");
    const edited = page.waitForResponse(
      (r) =>
        r.url().includes("/api/onboarding/edit/") &&
        r.request().postDataJSON()?.fields?.name === "Marcus Warry",
    );
    await name.fill("Marcus Warry");
    assert.equal((await edited).status(), 200);
    await page.reload();
    await until(async () => (await name.inputValue()) === "Marcus Warry");
    assert.match(
      await page.locator(".conversation-question").innerText(),
      /Blue Cross/,
    );
    const second = await send(
      "I now work as an independent consultant, advising charity boards. I found you on LinkedIn. I'm concerned about funding.",
    );
    assert.equal(second.state.facts.name, "Marcus Warry");
    assert.equal(second.state.facts.organisation, "");
    assert.equal(second.state.charity.confirmed, null);
    assert.match(second.question, /Blue Cross/);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const state = await (
      await page.request.get("http://127.0.0.1:3100/api/onboarding/session/")
    ).json();
    assert.equal(state.state.facts.name, "Marcus Warry");
    await page
      .getByRole("button", { name: /Find (?:The )?Blue Cross/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Blue Cross (synthetic fixture)" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Yes, this is the charity" })
      .click();
    await expect(page.locator(".conversation-question")).toContainText(
      "Marcus",
    );
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
    const stored = await db.query(
      "SELECT facts FROM research_console.onboarding_profiles ORDER BY updated_at DESC LIMIT 1",
    );
    assert.equal(stored.rows[0].facts.name, "Marcus Warry");
    assert.ok(
      stored.rows[0].facts.professionalContext.relationships.some(
        (r) => /Blue Cross/.test(r.entity) && r.period === "past",
      ),
    );
    reports.push({
      viewport,
      passed: true,
      voice: viewport.width > 1000,
      questions,
      accountHandoff: true,
    });
    await context.close();
  }
  const usage = await db.query(
    "SELECT count(*)::int requests FROM research_console.onboarding_usage",
  );
  console.log(
    "LIVE_BROWSER_SUMMARY",
    JSON.stringify({
      passed: reports.length,
      modelCalls: usage.rows[0].requests,
      journeys: reports,
    }),
  );
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/onboarding-live-browser.json",
    JSON.stringify(reports, null, 2),
  );
} finally {
  await browser?.close();
  for (const p of processes) p.kill("SIGTERM");
  await db?.end();
  await pg.stop().catch(() => {});
}
