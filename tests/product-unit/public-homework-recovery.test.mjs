import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { POST } from "../../src/app/api/readiness/problem/route.ts";

test("the recovery message proxy preserves the backend receipt", async t => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "https://sorp2026.mysocialimpact.org/api/public-homework-message");
    assert.equal(options.method, "POST");
    return Response.json({ accepted: true, queued: true, emailSent: true, cowLogged: true });
  });
  const response = await POST(new Request("https://mysocialimpact.org/api/readiness/problem", { method: "POST", body: JSON.stringify({ sessionId: "session-123", message: "Please help" }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, queued: true, emailSent: true, cowLogged: true });
});

test("every report-reading failure uses the actionable recovery screen", async () => {
  const review = await readFile(new URL("../../src/app/sorp-candidate-review.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../../src/app/sorp-candidate-review.css", import.meta.url), "utf8");
  assert.match(review, /step: "tar-recovery", homeworkFailure/);
  assert.match(review, /TRY AGAIN NOW/);
  assert.match(review, /trying again can often work/);
  assert.match(review, /OPEN EXACT CHARITY COMMISSION RECORD/);
  assert.match(review, /DRAG & DROP THE REPORT PDF/);
  assert.match(review, /onDrop=/);
  assert.match(review, /accept="application\/pdf,.pdf"/);
  assert.match(review, /SEND ERROR REPORT/);
  assert.match(styles, /\.scr-retry-card button\{min-height:112px/);
  assert.match(styles, /@media\(max-width:760px\).*\.scr-retry-card\{grid-template-columns:1fr/s);
  assert.doesNotMatch(review, /else setError\(cause instanceof Error \? cause\.message : "We could not read the Trustees’ Annual Report yet\."\)/);
});
