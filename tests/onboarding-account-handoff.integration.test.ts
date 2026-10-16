import test, { after } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/readiness-account/route";
import {
  createSession,
  getSession,
  saveSession,
} from "../src/lib/onboarding/server";
import { applyFacts } from "../src/lib/onboarding/state";
import { database } from "../src/lib/console/db";
if (
  !process.env.CONSOLE_DATABASE_URL?.includes(
    "@127.0.0.1:55432/onboarding_test",
  )
)
  throw new Error("Isolated local test database only");
process.env.SORP_BACKEND_ORIGIN = "http://synthetic-account.invalid";
const original = globalThis.fetch;
const sent: Record<string, unknown>[] = [];
globalThis.fetch = async (input, init) => {
  assert.ok(
    String(input).startsWith(
      "http://synthetic-account.invalid/api/readiness-account",
    ),
  );
  sent.push(JSON.parse(Buffer.from(init!.body as ArrayBuffer).toString()));
  return Response.json({ verificationRequired: true });
};
after(async () => {
  globalThis.fetch = original;
  await database().end();
});
const signup = (id: string, onboarding = true) =>
  new Request("https://preview.invalid/api/readiness-account/", {
    method: "POST",
    headers: {
      origin: "https://preview.invalid",
      cookie: `sorp_onboarding=${id}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "signup",
      name: "Forged Name",
      email: "forged@preview.invalid",
      password: "Test password 123!",
      ...(onboarding
        ? {
            progress: {
              onboarding: {
                facts: { name: "Forged Name" },
                selected: { name: "Forged Charity" },
              },
            },
          }
        : {}),
    }),
  });
test("central signup is blocked before all five requirements, then forwards only authoritative state", async () => {
  const id = await createSession({});
  let session = (await getSession(signup(id)))!;
  assert.equal((await POST(signup(id))).status, 400);
  assert.equal(sent.length, 0);
  const state = applyFacts(
    session.state,
    {
      name: "Sarah Jones",
      email: "sarah@preview.invalid",
      role: "Accountant",
      organisation: "Burton Sweet",
    },
    "form",
  );
  session = await saveSession(session, state);
  assert.equal((await POST(signup(id))).status, 400);
  assert.equal(sent.length, 0);
  session.state.charity.confirmed = {
    name: "Verified test charity",
    registrationNumber: "1234567",
    officialUrl:
      "https://register-of-charities.charitycommission.gov.uk/charity-search/-/charity-details/1234567",
  } as typeof session.state.charity.confirmed;
  await saveSession(session, session.state);
  assert.equal((await POST(signup(id))).status, 200);
  assert.equal(sent.length, 1);
  const forwarded = sent[0] as {
    name: string;
    email: string;
    password: string;
    progress: {
      onboarding: {
        facts: { name: string };
        selected: { name: string };
        messages: unknown[];
      };
    };
  };
  assert.equal(forwarded.name, "Sarah Jones");
  assert.equal(forwarded.email, "sarah@preview.invalid");
  assert.equal(
    forwarded.progress.onboarding.selected.name,
    "Verified test charity",
  );
  assert.equal(forwarded.progress.onboarding.facts.name, "Sarah Jones");
  assert.equal(forwarded.password, "Test password 123!");
  assert.equal(
    JSON.stringify(forwarded.progress).includes("Test password"),
    false,
  );
});
test("standalone account registration retains its existing backend path", async () => {
  const before = sent.length;
  assert.equal((await POST(signup("", false))).status, 200);
  assert.equal(sent.length, before + 1);
});
