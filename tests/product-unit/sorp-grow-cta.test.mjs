import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const actions = readFileSync(new URL("../../src/app/sorp-result-actions.tsx", import.meta.url), "utf8");
const conversation = readFileSync(new URL("../../src/app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../../src/app/api/growth-event/route.ts", import.meta.url), "utf8");

test("conversation CTA uses the requested address, organisation subject, and distinct Grow events", () => {
  assert.match(actions, /mailto:marcus@marcuswarry\.com\?subject=/);
  assert.match(actions, /SORP readiness conversation — \$\{organisation/);
  assert.match(actions, />marcus@marcuswarry\.com<\/a>/);
  assert.match(actions, /returnOrigin: window\.location\.origin/);
  for (const event of ["book_conversation_clicked", "contact_email_clicked", "report_emailed", "free_report_selected", "human_review_selected", "support_selected"])
    assert.match(actions, new RegExp(event));
});

test("assessment milestones and best-effort Grow submission stay separate from core workflow", () => {
  for (const event of ["assessment_started", "organisation_found", "organisation_confirmed", "quick_review_reached", "deep_dive_started", "assessment_completed", "full_review_viewed", "impact_report_found", "impact_report_uploaded", "save_and_exit", "assessment_resumed", "last_stage_reached"])
    assert.match(conversation, new RegExp(event));
  assert.match(route, /proxyExistingSorpBackend\(request, "\/api\/growth-event"\)/);
  assert.match(readFileSync(new URL("../../src/app/sorp-growth.ts", import.meta.url), "utf8"), /catch \{ \/\* Grow outages/);
});

test("a Grow outage cannot reject or hold up the customer journey", async () => {
  const ts = require("typescript"), { Module } = require("node:module");
  const path = fileURLToPath(new URL("../../src/app/sorp-growth.ts", import.meta.url));
  const compiled = new Module(path);
  compiled.filename = path;
  compiled.paths = Module._nodeModulePaths(require("node:path").dirname(path));
  compiled._compile(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, path);
  const originalWindow = globalThis.window, originalFetch = globalThis.fetch;
  const storage = new Map();
  globalThis.window = { location: { search: "?utm_source=test" }, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } };
  globalThis.fetch = async () => { throw new Error("Grow is offline"); };
  try { await assert.doesNotReject(compiled.exports.trackSorpEvent("failure-test-session", "book_conversation_clicked")); }
  finally { globalThis.window = originalWindow; globalThis.fetch = originalFetch; }
});
