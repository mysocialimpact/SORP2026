import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import chromium from "../tests/live-runtime/node_modules/@sparticuz/chromium/build/index.js";

if (process.env.VERCEL_ENV !== "preview" || process.env.SORP_ISOLATED_PREVIEW !== "true")
  throw new Error("Browser release verification requires the isolated preview.");
const temporary = await mkdtemp(join(tmpdir(), "sorp-one-login-qa-"));
const output = join(temporary, "results.json");
const base = "http://127.0.0.1:4310";
const executablePath = await chromium.executablePath();
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "4310", "--hostname", "127.0.0.1"], { stdio: ["ignore", "ignore", "inherit"], env: process.env });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/build-info.json")).ok) { ready = true; break; } } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("The preview test server did not start.");
  const exitCode = await new Promise((resolve, reject) => {
    const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test",
      "tests/one-login.spec.ts", "tests/account-navigation.spec.ts", "tests/status-bar.spec.ts", "--reporter=json"], {
      stdio: ["ignore", "ignore", "inherit"],
      env: { ...process.env, CHROMIUM_PATH: executablePath, PLAYWRIGHT_BASE_URL: base,
        PLAYWRIGHT_EXTERNAL_SERVER: "true", EXPECT_ISOLATED_PREVIEW: "true", PLAYWRIGHT_JSON_OUTPUT_NAME: output },
    });
    runner.on("error", reject); runner.on("exit", resolve);
  });
  const result = JSON.parse(await readFile(output, "utf8"));
  const summary = { environment: "isolated preview", services: "synthetic; AI and payments disabled",
    passed: result.stats.expected, failed: result.stats.unexpected, skipped: result.stats.skipped,
    durationMs: result.stats.duration };
  await mkdir("public/preview-qa", { recursive: true });
  await writeFile("public/preview-qa/one-login.json", JSON.stringify(summary));
  console.log("ONE_LOGIN_BROWSER_QA " + JSON.stringify(summary));
  if (exitCode !== 0) {
    // Print bounded assertion details, never authentication state or traces.
    for (const suite of result.suites || []) console.error(JSON.stringify(suite).slice(0, 2500));
    throw new Error("Preview browser verification failed.");
  }
} finally {
  server.kill();
  await rm(temporary, { recursive: true, force: true });
}
