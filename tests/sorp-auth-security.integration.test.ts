import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { independentAccountGET, independentAccountPOST } from "../src/lib/sorp-auth/compat";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url))
  throw new Error("Use the isolated local sorp_test database.");
const db = new Pool({ connectionString: url });
const id = randomUUID();
const email = `security-${id}@example.invalid`;
const password = "synthetic-security-password-2026";
const origin = "http://localhost:3000";
const ip = `192.0.2.${Math.floor(Math.random() * 100) + 100}`;

after(async () => {
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [id]);
  await db.end();
});

async function login(originHeader = origin) {
  return independentAccountPOST(new Request(`${origin}/api/readiness-account`, {
    method: "POST", headers: { "content-type": "application/json", origin: originHeader,
      "x-forwarded-for": ip }, body: JSON.stringify({ action: "login", email, password }),
  }));
}

test("account origin checks, durable rate limits and expired sessions deny access", async () => {
  await db.query('INSERT INTO sorp_auth."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [id, "Synthetic security user", email]);
  await db.query('INSERT INTO sorp_auth."account"(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$4,$5,now())',
    [randomUUID(), id, "credential", id, await hashPassword(password)]);
  assert.equal((await login("https://attacker.example")).status, 403);
  const signed = await login();
  assert.equal(signed.status, 200, await signed.clone().text());
  const cookie = signed.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(cookie);
  assert.equal((await independentAccountGET(new Request(`${origin}/api/readiness-account`,
    { headers: { cookie } }))).status, 200);
  const before = await independentAccountGET(new Request(`${origin}/api/readiness-account`, { headers: { cookie } }));
  assert.equal((await before.json() as { signedIn: boolean }).signedIn, true);
  await db.query('UPDATE sorp_auth."session" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1', [id]);
  const expired = await independentAccountGET(new Request(`${origin}/api/readiness-account`, { headers: { cookie } }));
  assert.equal((await expired.json() as { signedIn: boolean }).signedIn, false);
  const wrong = `bad-${randomUUID()}@example.invalid`;
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await independentAccountPOST(new Request(`${origin}/api/readiness-account`, {
      method: "POST", headers: { "content-type": "application/json", origin,
        "x-forwarded-for": ip }, body: JSON.stringify({ action: "login", email: wrong, password }),
    }));
    statuses.push(result.status);
  }
  assert.ok(statuses.includes(429), `Expected durable login limiting; saw ${statuses.join(",")}`);
  const persisted = await db.query('SELECT count(*)::int n FROM sorp_auth."rateLimit"');
  assert.ok(persisted.rows[0].n > 0);
});
