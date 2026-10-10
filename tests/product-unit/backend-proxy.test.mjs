import test from "node:test";
import assert from "node:assert/strict";
import { proxyExistingSorpBackend } from "../../src/app/backend-proxy.ts";

test("the destination reuses the existing SORP backend without receiving its secrets", async () => {
  const previous = process.env.SORP_BACKEND_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.SORP_BACKEND_ORIGIN = "https://mysocialimpact.example";
  let forwarded;
  globalThis.fetch = async (input, init) => {
    forwarded = { url: String(input), init };
    return new Response(JSON.stringify({ signedIn: true }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": "msi_sorp_session=test; Path=/; HttpOnly; Secure; SameSite=Lax" },
    });
  };
  try {
    const response = await proxyExistingSorpBackend(new Request("https://sorp2026.org/api/readiness-account?mode=load", { method: "POST", headers: { "content-type": "application/json", cookie: "msi_sorp_session=existing" }, body: JSON.stringify({ action: "load" }) }), "/api/readiness-account");
    assert.equal(forwarded.url, "https://mysocialimpact.example/api/readiness-account?mode=load");
    assert.equal(forwarded.init.method, "POST");
    assert.equal(forwarded.init.headers.get("cookie"), "msi_sorp_session=existing");
    assert.equal(forwarded.init.headers.get("x-sorp-destination"), "sorp2026.org");
    assert.equal(response.headers.get("set-cookie"), "msi_sorp_session=test; Path=/; HttpOnly; Secure; SameSite=Lax");
    assert.deepEqual(await response.json(), { signedIn: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.SORP_BACKEND_ORIGIN; else process.env.SORP_BACKEND_ORIGIN = previous;
  }
});

test("the destination fails closed when no existing backend is configured", async () => {
  const previous = process.env.SORP_BACKEND_ORIGIN;
  delete process.env.SORP_BACKEND_ORIGIN;
  try {
    const response = await proxyExistingSorpBackend(new Request("https://sorp2026.org/api/readiness-account"), "/api/readiness-account");
    assert.equal(response.status, 503);
  } finally {
    if (previous !== undefined) process.env.SORP_BACKEND_ORIGIN = previous;
  }
});

test("the destination rejects browser mutations from another origin before contacting the backend", async () => {
  const previous = process.env.SORP_BACKEND_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.SORP_BACKEND_ORIGIN = "https://mysocialimpact.example";
  let contacted = false;
  globalThis.fetch = async () => { contacted = true; return new Response(); };
  try {
    const response = await proxyExistingSorpBackend(new Request("https://sorp2026.org/api/sorp-payments/checkout", { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: "{}" }), "/api/sorp-payments/checkout");
    assert.equal(response.status, 403);
    assert.equal(contacted, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.SORP_BACKEND_ORIGIN; else process.env.SORP_BACKEND_ORIGIN = previous;
  }
});
