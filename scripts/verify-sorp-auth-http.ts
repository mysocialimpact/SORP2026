import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { Pool } from "pg";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!url.includes("127.0.0.1:55432/sorp_test")) throw new Error("Local test DB required.");
const db = new Pool({ connectionString: url });
const origin = "http://localhost:3333";
const id = randomUUID();
const email = `http-${id}@example.invalid`;
const password = "synthetic-password-for-http-test";
let organisationId = "";
async function post(path: string, body: unknown, cookie = "") {
  return fetch(`${origin}${path}`, { method: "POST", headers: { origin,
    "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
async function main() {
try {
  await db.query('INSERT INTO sorp_auth."user" (id,name,email,"emailVerified","twoFactorEnabled") VALUES($1,$2,$3,true,false)',
    [id, "Synthetic HTTP founder", email]);
  await db.query('INSERT INTO sorp_auth."account" (id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$4,$5,now())',
    [randomUUID(), id, "credential", id, await hashPassword(password)]);
  assert.equal((await fetch(`${origin}/api/readiness-account`)).status, 200);
  const login = await post("/api/readiness-account", { action: "login", email, password });
  assert.equal(login.status, 200, await login.clone().text());
  const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(cookie);
  const me = await fetch(`${origin}/api/readiness-account`, { headers: { cookie } });
  assert.equal((await me.json() as { account: { id: string } }).account.id, id);
  assert.equal((await fetch(`${origin}/api/founder/dashboard`, { headers: { cookie } })).status, 403);
  assert.equal((await fetch(`${origin}/api/readiness-account/google/start`)).status, 404);
  const enabled = await post("/api/sorp-auth/two-factor/enable", { password, method: "totp" }, cookie);
  assert.equal(enabled.status, 200, await enabled.clone().text());
  const uri = (await enabled.json() as { totpURI: string }).totpURI;
  const secret = new URL(uri).searchParams.get("secret") || "";
  const totp = createOTP(new TextDecoder().decode(base32.decode(secret)));
  const confirmed = await post("/api/sorp-auth/two-factor/verify-totp", { code: await totp.totp() }, cookie);
  assert.equal(confirmed.status, 200, await confirmed.clone().text());
  const currentCookie = confirmed.headers.get("set-cookie")?.split(";")[0] || cookie;
  await db.query("INSERT INTO sorp_auth.founder_grant(user_id,granted_at,grant_reason) VALUES($1,now(),'synthetic HTTP route check')", [id]);
  assert.equal((await fetch(`${origin}/api/founder/dashboard`, { headers: { cookie: currentCookie } })).status, 403);
  await post("/api/readiness-account", { action: "logout" }, currentCookie);
  const challenged = await post("/api/sorp-auth/sign-in/email", { email, password });
  assert.equal((await challenged.json() as { twoFactorRedirect: boolean }).twoFactorRedirect, true);
  const challengeCookie = challenged.headers.getSetCookie().map(value => value.split(";")[0])
    .find(value => value.startsWith("better-auth.two_factor=")) || "";
  assert.ok(challengeCookie);
  const verified = await post("/api/sorp-auth/two-factor/verify-totp", { code: await totp.totp() }, challengeCookie);
  assert.equal(verified.status, 200, await verified.clone().text());
  const founderCookie = verified.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(founderCookie);
  const founder = await fetch(`${origin}/api/founder/dashboard`, { headers: { cookie: founderCookie } });
  assert.equal(founder.status, 200, await founder.clone().text());
  assert.equal((await founder.json() as { metrics: { source: string } }).metrics.source,
    "Independent SORP account and permission records.");
  const created = await post("/api/founder/organisations", { name: "Synthetic HTTP charity", type: "Charity" }, founderCookie);
  assert.equal(created.status, 201, await created.clone().text());
  organisationId = (await created.json() as { id: string }).id;
  const plan = await post(`/api/founder/organisation/${organisationId}/plan`, { plan: "Plus", complimentary: true,
    duration: "30", reason: "Synthetic HTTP plan test" }, founderCookie);
  assert.equal(plan.status, 200, await plan.clone().text());
  assert.equal((await plan.json() as { complimentary_reason: string }).complimentary_reason,
    "Synthetic HTTP plan test");
  process.stdout.write("HTTP auth, founder MFA, guard, organisation and plan paths passed.\n");
} finally {
  if (organisationId) {
    await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [organisationId]);
    await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [organisationId]);
  }
  await db.query("DELETE FROM sorp_auth.founder_grant WHERE user_id=$1", [id]);
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [id]);
  await db.end();
}
}

void main().catch(error => { process.stderr.write(error instanceof Error ? error.stack || error.message : String(error)); process.exitCode = 1; });
