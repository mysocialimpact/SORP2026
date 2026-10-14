import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { GET } from "../src/app/api/sorp-account-export/route";
import { assessmentDigest } from "../src/lib/sorp-auth/digest";

const previousFetch = globalThis.fetch;
const previousOrigin = process.env.SORP_BACKEND_ORIGIN;
const previousFlag = process.env.SORP_AUTH_LEGACY_EXPORT_ENABLED;
const previousCutover = process.env.SORP_AUTH_CUTOVER_ENABLED;
after(() => {
  globalThis.fetch = previousFetch;
  if (previousOrigin === undefined) delete process.env.SORP_BACKEND_ORIGIN;
  else process.env.SORP_BACKEND_ORIGIN = previousOrigin;
  if (previousFlag === undefined) delete process.env.SORP_AUTH_LEGACY_EXPORT_ENABLED;
  else process.env.SORP_AUTH_LEGACY_EXPORT_ENABLED = previousFlag;
  if (previousCutover === undefined) delete process.env.SORP_AUTH_CUTOVER_ENABLED;
  else process.env.SORP_AUTH_CUTOVER_ENABLED = previousCutover;
});

test("legacy owner export returns a complete private assessment only before cutover", async () => {
  process.env.SORP_BACKEND_ORIGIN = "https://mysocialimpact.org";
  process.env.SORP_AUTH_LEGACY_EXPORT_ENABLED = "true";
  process.env.SORP_AUTH_CUTOVER_ENABLED = "false";
  const id = randomUUID();
  const progress = { started: true, state: { currentStage: 4 },
    answers: { question: "synthetic assessment value" } };
  let fetches = 0;
  globalThis.fetch = async (input, init) => {
    fetches += 1;
    assert.equal(String(input), "https://mysocialimpact.org/api/readiness-account");
    assert.equal(new Headers(init?.headers).get("cookie"), "old-session=synthetic");
    return Response.json({ signedIn: true,
      account: { id, email: "synthetic@brainstrust.org.uk", name: "Synthetic owner",
        lastSavedAt: "2026-10-14T10:00:00.000Z" }, progress });
  };
  const request = new Request("https://sorp2026.org/api/sorp-account-export", {
    headers: { cookie: "old-session=synthetic" },
  });
  const response = await GET(request);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition") || "", /attachment/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json() as { account: { id: string }; progress: unknown; sha256: string };
  assert.equal(data.account.id, id);
  assert.deepEqual(data.progress, progress);
  assert.equal(data.sha256, assessmentDigest(progress));
  process.env.SORP_AUTH_CUTOVER_ENABLED = "true";
  assert.equal((await GET(request)).status, 404);
  assert.equal(fetches, 1, "cutover must not consult the old service");
});
