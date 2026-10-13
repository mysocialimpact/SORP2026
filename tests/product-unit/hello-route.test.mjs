import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../../src/app/api/hello/route.ts";

test("hello forwards contact and separate consent to the established message service", async t => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "https://sorp2026.mysocialimpact.org/api/public-homework-message");
    const body = JSON.parse(options.body);
    assert.equal(body.email, "person@example.org");
    assert.equal(body.message, "An idea for you");
    assert.match(body.diagnostic, /Audience: charity/);
    assert.match(body.diagnostic, /Newsletter consent: YES — explicitly selected/);
    assert.match(body.diagnostic, /Consent timestamp:/);
    return Response.json({ accepted: true, queued: true, emailSent: true, cowLogged: true });
  });
  const response = await POST(new Request("https://sorp2026.org/api/hello", {
    method: "POST",
    headers: { origin: "https://sorp2026.org" },
    body: JSON.stringify({ email: "Person@Example.org", message: "An idea for you", audience: "charity", newsletter: true, submissionId: "hello-test-123" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, queued: true, emailSent: true, logged: true });
});

test("hello rejects invalid addresses before making a backend request", async t => {
  const backend = t.mock.method(globalThis, "fetch", async () => Response.json({ accepted: true }));
  const response = await POST(new Request("https://sorp2026.org/api/hello", {
    method: "POST",
    body: JSON.stringify({ email: "not-an-email", message: "A real message" }),
  }));
  assert.equal(response.status, 400);
  assert.equal(backend.mock.callCount(), 0);
});

test("hello requires a non-empty message before making a backend request", async t => {
  const backend = t.mock.method(globalThis, "fetch", async () => Response.json({ accepted: true }));
  const response = await POST(new Request("https://sorp2026.org/api/hello", {
    method: "POST",
    body: JSON.stringify({ email: "person@example.org", message: "   " }),
  }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Please enter a message." });
  assert.equal(backend.mock.callCount(), 0);
});

test("hello never invents success when the message service refuses a submission", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ accepted: false, error: "Not accepted" }, { status: 503 }));
  const response = await POST(new Request("https://sorp2026.org/api/hello", {
    method: "POST",
    body: JSON.stringify({ email: "person@example.org", message: "Please reply", submissionId: "hello-test-456" }),
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Not accepted" });
});
