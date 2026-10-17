import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { NextRequest } from "next/server";
import { independentAccountPOST } from "../src/lib/sorp-auth/compat";
import { verifyToolSession } from "../src/lib/tool-access";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url))
  throw new Error("Tool login integration tests require the isolated local sorp_test database.");

test("the shared tool gate verifies real provider sessions and preserves progress through plan changes and expiry", async () => {
  const db = new Pool({ connectionString: url });
  const id = randomUUID(), organisationId = randomUUID();
  const email = `tool-${id}@example.invalid`, password = "synthetic-one-login-provider-password";
  const progress = { sessionId: "saved-provider-review", step: "criterion", corrections: { "1": { answer: "yes", context: "Saved before this release" } } };
  const origin = "http://localhost:3000";
  try {
    await db.query('INSERT INTO sorp_auth."user" (id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [id, "Synthetic tool account", email]);
    await db.query('INSERT INTO sorp_auth."account" (id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$2,$4,now())', [randomUUID(), id, "credential", await hashPassword(password)]);
    await db.query("INSERT INTO sorp_auth.account_progress(user_id,progress) VALUES($1,$2)", [id, progress]);
    await db.query("INSERT INTO sorp_auth.organisation(id,name,type) VALUES($1,'Synthetic Tool Charity','Charity')", [organisationId]);
    await db.query("INSERT INTO sorp_auth.membership(organisation_id,user_id,role) VALUES($1,$2,'owner')", [organisationId,id]);
    await db.query("INSERT INTO sorp_auth.entitlement(organisation_id) VALUES($1)", [organisationId]);
    const login = await independentAccountPOST(new Request(`${origin}/api/readiness-account`, {
      method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.73" },
      body: JSON.stringify({ action: "login", email, password }),
    }));
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
    assert.ok(cookie);
    for (const path of ["/are-you-sorp-ready/review/", "/ask-sorp/workspace/", "/charity-impact-reports/review/", "/social-impact-excellence/assessment/", "/my-impact-director/workspace/"]) {
      await verifyToolSession(new NextRequest(origin + path, { headers: { cookie } }));
    }
    for (const plan of ["Free", "Plus", "Adviser", "Enterprise"]) {
      await db.query("UPDATE sorp_auth.entitlement SET plan=$2 WHERE organisation_id=$1", [organisationId,plan]);
      await verifyToolSession(new NextRequest(`${origin}/api/ask-sorp/`, { headers: { cookie } }));
      assert.deepEqual((await db.query("SELECT progress FROM sorp_auth.account_progress WHERE user_id=$1", [id])).rows[0].progress, progress);
    }
    await assert.rejects(verifyToolSession(new NextRequest(`${origin}/api/ask-sorp/`)), (error: { status?: number }) => error.status === 401);
    await assert.rejects(verifyToolSession(new NextRequest(`${origin}/api/ask-sorp/`, { headers: { cookie: "better-auth.session_token=forged" } })), (error: { status?: number }) => error.status === 401);
    await db.query('UPDATE sorp_auth."session" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1', [id]);
    await assert.rejects(verifyToolSession(new NextRequest(`${origin}/api/ask-sorp/`, { headers: { cookie } })), (error: { status?: number }) => error.status === 401);
    assert.deepEqual((await db.query("SELECT progress FROM sorp_auth.account_progress WHERE user_id=$1", [id])).rows[0].progress, progress);
  } finally {
    await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [organisationId]);
    await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [organisationId]);
    await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [organisationId]);
    await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [id]);
    await db.end();
  }
});

test("the legacy account broker remains the identity source while cutover is disabled", async () => {
  const previousCutover = process.env.SORP_AUTH_CUTOVER_ENABLED;
  const previousOrigin = process.env.SORP_BACKEND_ORIGIN;
  const originalFetch = globalThis.fetch;
  process.env.SORP_AUTH_CUTOVER_ENABLED = "false";
  process.env.SORP_BACKEND_ORIGIN = "https://legacy-account-fixture.invalid";
  let signedIn = true;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://legacy-account-fixture.invalid/api/readiness-account");
    assert.equal(new Headers(init?.headers).get("cookie"), "legacy_session=synthetic-test-session");
    return Response.json(signedIn ? { signedIn: true, account: { id: "legacy-original-account-id", email: "legacy@example.invalid", name: "Legacy user" } } : { signedIn: false });
  };
  try {
    const request = new NextRequest("http://localhost:3000/ask-sorp/workspace/", { headers: { cookie: "legacy_session=synthetic-test-session" } });
    await verifyToolSession(request);
    signedIn = false;
    await assert.rejects(verifyToolSession(request), (error: { status?: number }) => error.status === 401);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousCutover === undefined) delete process.env.SORP_AUTH_CUTOVER_ENABLED; else process.env.SORP_AUTH_CUTOVER_ENABLED = previousCutover;
    if (previousOrigin === undefined) delete process.env.SORP_BACKEND_ORIGIN; else process.env.SORP_BACKEND_ORIGIN = previousOrigin;
  }
});
