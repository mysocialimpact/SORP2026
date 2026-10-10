// Opt-in: creates one clearly named QA account with an undeliverable .invalid email.
// Does not call email delivery, checkout creation, Google OAuth or booking creation.
import { request } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
if (process.env.SORP_LIVE_ACCOUNT_TEST !== "true")
  throw new Error(
    "Set SORP_LIVE_ACCOUNT_TEST=true to explicitly run the live account check.",
  );
const origin = process.env.SORP_TEST_URL || "https://sorp2026.org";
const api = await request.newContext({
  baseURL: origin,
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const sessionId = randomUUID();
const email = `sorp-qa-${sessionId}@example.invalid`;
const password = randomBytes(24).toString("base64url");
let created = false;
const accountPath = "/api/readiness-account/";
async function post(body) {
  const response = await api.post(accountPath, {
    data: body,
    headers: { origin },
  });
  const data = await response.json();
  assert.ok(
    response.ok(),
    `${body.action}: HTTP ${response.status()} ${data.error || ""}`,
  );
  return data;
}
try {
  for (const service of ["free", "readiness", "wider"]) {
    const r = await api.get(`/api/booking/availability/?service=${service}`);
    const d = await r.json();
    assert.equal(r.status(), 200);
    assert.ok(Array.isArray(d.slots));
    console.log(
      `LIVE availability ${service}: ${d.slots.length} slots, ${d.timeZone}`,
    );
  }
  const before = await (await api.get(accountPath)).json();
  assert.equal(before.signedIn, false);
  const progress = {
    sessionId,
    step: "find",
    query: "QA verification — no real charity",
    name: "SORP QA verification",
    email,
    emailConfirm: email,
    role: "TRUSTEE",
    criterion: 0,
    corrections: {},
  };
  console.log("QA account identifier:", email);
  const signup = await post({
    action: "signup",
    name: "SORP QA verification — automated test",
    position: "TRUSTEE",
    email,
    password,
    progress,
  });
  created = true;
  assert.equal(signup.account?.email, email);
  console.log("LIVE signup passed");
  let loaded = await (await api.get(accountPath)).json();
  assert.equal(loaded.signedIn, true);
  assert.equal(loaded.progress?.sessionId, sessionId);
  console.log("LIVE session cookie restoration passed");
  const updated = {
    ...progress,
    query: "QA saved progress checkpoint",
    criterion: 3,
    corrections: {
      1: { answer: "partly", context: "Synthetic QA answer", reviewed: true },
    },
  };
  await post({ action: "save", progress: updated });
  loaded = await (await api.get(accountPath)).json();
  assert.equal(loaded.progress?.criterion, 3);
  assert.equal(loaded.progress?.corrections?.["1"]?.answer, "partly");
  console.log("LIVE save/load passed");
  await post({ action: "logout" });
  assert.equal((await (await api.get(accountPath)).json()).signedIn, false);
  console.log("LIVE logout passed");
  const login = await post({ action: "login", email, password });
  assert.equal(login.account?.email, email);
  assert.equal(login.progress?.criterion, 3);
  console.log("LIVE email/password login and return to saved work passed");
} finally {
  if (created) {
    await post({ action: "logout" });
    console.log(
      "QA session logged out. No email, payment or booking was requested.",
    );
  }
  await api.dispose();
}
