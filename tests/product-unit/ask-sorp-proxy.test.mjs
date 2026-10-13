import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "../../src/app/api/ask-sorp/route.ts";

const sessionId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";

test("Ask SORP proxy sends a bounded request to the established MSI service", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return Response.json({ short_answer: "Answer", citations: [{ reference: "1.27" }] });
  };
  try {
    const response = await POST(new Request("https://sorp2026.org/api/ask-sorp/", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
      body: JSON.stringify({ question: "What does SORP say about impact?", history: [{ role: "user", content: "Earlier question" }], round: 1, sessionId, requestId, ignored: "not forwarded" }),
    }));
    assert.equal(response.status, 200);
    assert.equal(captured.url, "https://sorp2026.mysocialimpact.org/api/ask");
    const body = JSON.parse(captured.init.body);
    assert.deepEqual(Object.keys(body).sort(), ["history", "question", "requestId", "round", "sessionId"]);
    assert.equal(body.question, "What does SORP say about impact?");
    assert.equal(captured.init.headers["x-forwarded-for"], "203.0.113.12");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ask SORP proxy rejects invalid sessions before contacting MSI", async () => {
  const response = await POST(new Request("https://sorp2026.org/api/ask-sorp/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What changed?", sessionId: "invalid", requestId }),
  }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /refresh/i);
});
