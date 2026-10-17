import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const path = fileURLToPath(new URL("../../src/app/api/growth-event/route.ts", import.meta.url));

test("a homepage audience selection maps to an existing Growth event with an identifiable tag", async () => {
  let forwarded, backendPath;
  const compiled = new Module(path);
  compiled.filename = path;
  compiled.require = id => id === "../../backend-proxy"
    ? { proxyExistingSorpBackend: async (request, pathname) => {
      forwarded = await request.json();
      backendPath = pathname;
      return Response.json({ accepted: true });
    } }
    : require(id);
  compiled._compile(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, path);
  const { POST } = compiled.exports;
  const response = await POST(new Request("https://sorp2026.org/api/growth-event", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "test-audience-event", sessionId: "anonymous-session", eventType: "homepage_audience_selected", audience: "charity", page: "/", occurredAt: "2026-10-17T11:00:00.000Z", campaign: "existing-campaign" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(backendPath, "/api/growth-event");
  assert.equal(forwarded.eventType, "stage_viewed");
  assert.equal(forwarded.campaign, "homepage_audience_charity|existing-campaign");
  assert.equal(forwarded.sessionId, "anonymous-session");
  assert.equal(forwarded.occurredAt, "2026-10-17T11:00:00.000Z");
  const adviser = await POST(new Request("https://sorp2026.org/api/growth-event", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: "test-adviser-event", sessionId: "anonymous-session", eventType: "homepage_audience_selected", audience: "adviser", page: "/" }),
  }));
  assert.equal(adviser.status, 200);
  assert.equal(forwarded.campaign, "homepage_audience_adviser");
  const invalid = await POST(new Request("https://sorp2026.org/api/growth-event", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType: "homepage_audience_selected", audience: "invalid", page: "/" }),
  }));
  assert.equal(invalid.status, 400);
});
