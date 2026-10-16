import { spawnSync } from "node:child_process";
// Opt-in preview build only: does not mutate production sessions or change app auth.
if (process.env.VERCEL_ENV !== "preview")
  throw new Error("Live evaluation build is preview-only");
let failed = false;
for (const [cmd, args, extra] of [
  [
    "node",
    ["--experimental-strip-types", "tests/onboarding-evals/run-live.mjs"],
    { SORP_LIVE_EVAL: "true" },
  ],
  ["npm", ["run", "build"], {}],
  ["npm", ["ci", "--prefix", "tests/live-runtime"], {}],
  [
    "node",
    ["--experimental-strip-types", "tests/live-runtime/browser.mjs"],
    { SORP_LIVE_EVAL: "true" },
  ],
]) {
  if (
    process.env.SORP_EVAL_BROWSER_ONLY === "true" &&
    args.includes("tests/onboarding-evals/run-live.mjs")
  )
    continue;
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extra },
  });
  if (result.status !== 0) failed = true;
}

if (failed) process.exitCode = 1;
