import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sendSorpAuthEmail, sendSorpInvitationEmail } from "../src/lib/sorp-auth/email";

const previousFetch = globalThis.fetch;
const previousKey = process.env.RESEND_API_KEY;
const previousBase = process.env.SORP_AUTH_BASE_URL;

after(() => {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previousKey;
  if (previousBase === undefined) delete process.env.SORP_AUTH_BASE_URL;
  else process.env.SORP_AUTH_BASE_URL = previousBase;
});

test("auth links use the intended SORP sender and reject a foreign destination", async () => {
  process.env.RESEND_API_KEY = "synthetic-test-key";
  process.env.SORP_AUTH_BASE_URL = "https://sorp2026.org";
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls += 1;
    assert.equal(input, "https://api.resend.com/emails");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer synthetic-test-key");
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.equal(body.from, "SORP 2026 <accounts@sorp2026.org>");
    assert.equal(body.reply_to, "marcus@mysocialimpact.org");
    assert.deepEqual(body.to, ["customer@example.invalid"]);
    if (String(body.subject).startsWith("Reset")) {
      assert.match(String(body.text), /https:\/\/sorp2026\.org\/reset-password\/#sorp-auth=1&token=a{64}/);
    }
    return new Response(JSON.stringify({ id: "synthetic" }), { status: 200 });
  };
  await sendSorpAuthEmail("verify", "customer@example.invalid", "https://sorp2026.org/api/sorp-auth/verify-email?token=synthetic");
  await sendSorpAuthEmail("reset", "customer@example.invalid", `https://sorp2026.org/api/sorp-auth/reset-password/${"a".repeat(64)}?callbackURL=`);
  await assert.rejects(sendSorpAuthEmail("reset", "customer@example.invalid", "https://other.example/api/sorp-auth/reset-password?token=synthetic"), /unexpected destination/);
  assert.equal(calls, 2);
  await assert.rejects(sendSorpAuthEmail("verify", "will@brainstrust.org.uk",
    "https://sorp2026.org/api/sorp-auth/verify-email?token=synthetic"), /explicit approval/);
  await assert.rejects(sendSorpInvitationEmail("WILL@BRAINSTRUST.ORG.UK",
    `https://sorp2026.org/invitation/${"a".repeat(64)}/`), /explicit approval/);
  assert.equal(calls, 2, "a configured sender must not email Brainstrust before release");
});
