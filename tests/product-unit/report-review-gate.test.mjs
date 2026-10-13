import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../src/app/api/readiness-account/route.ts";

function uploadRequest() {
  return new Request("https://sorp2026.org/api/readiness-account/", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: "msi_sorp_session=test" },
    body: JSON.stringify({ action: "create-report-upload", filename: "impact.pdf" }),
  });
}

test("report upload remains locked until the readiness review is complete", async () => {
  const previous = process.env.SORP_BACKEND_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.SORP_BACKEND_ORIGIN = "https://mysocialimpact.example";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ signedIn: true, progress: { step: "criterion", sessionId: "active" } });
  };
  try {
    const response = await POST(uploadRequest());
    assert.equal(response.status, 403);
    assert.equal(calls, 1);
    assert.match((await response.json()).error, /complete your free SORP readiness review/i);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.SORP_BACKEND_ORIGIN; else process.env.SORP_BACKEND_ORIGIN = previous;
  }
});

test("a completed readiness review can reach the established report workflow", async () => {
  const previous = process.env.SORP_BACKEND_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.SORP_BACKEND_ORIGIN = "https://mysocialimpact.example";
  const methods = [];
  globalThis.fetch = async (_input, init) => {
    methods.push(init.method);
    if (init.method === "GET") return Response.json({ signedIn: true, progress: { step: "report-ready", sessionId: "complete" } });
    return Response.json({ upload: { url: "https://upload.example", token: "secure" } });
  };
  try {
    const response = await POST(uploadRequest());
    assert.equal(response.status, 200);
    assert.deepEqual(methods, ["GET", "POST"]);
    assert.equal((await response.json()).upload.token, "secure");
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.SORP_BACKEND_ORIGIN; else process.env.SORP_BACKEND_ORIGIN = previous;
  }
});
