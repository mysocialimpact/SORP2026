import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { sorpAuth } from "../src/lib/sorp-auth/auth";
import { independentAccountPOST } from "../src/lib/sorp-auth/compat";
import { uploadReportChunk } from "../src/lib/sorp-auth/report-review";
import { GET as downloadReport } from "../src/app/api/sorp-report-download/[id]/route";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url))
  throw new Error("Use the isolated local sorp_test database.");
const db = new Pool({ connectionString: url });
const ownerId = randomUUID();
const otherId = randomUUID();
const password = "synthetic-report-password-2026";
const origin = "http://localhost:3000";

after(async () => {
  await db.query("DELETE FROM sorp_auth.report_review WHERE user_id IN ($1,$2)", [ownerId, otherId]);
  await db.query('DELETE FROM sorp_auth."user" WHERE id IN ($1,$2)', [ownerId, otherId]);
  await db.end();
});

async function createUser(id: string) {
  const email = `${id}@example.invalid`;
  await db.query('INSERT INTO sorp_auth."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
    [id, "Synthetic report owner", email]);
  await db.query('INSERT INTO sorp_auth."account"(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$4,$5,now())',
    [randomUUID(), id, "credential", id, await hashPassword(password)]);
  const signed = await sorpAuth().handler(new Request(`${origin}/api/sorp-auth/sign-in/email`, {
    method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.31" },
    body: JSON.stringify({ email, password }),
  }));
  assert.equal(signed.status, 200, await signed.clone().text());
  const cookie = signed.headers.get("set-cookie")?.split(";")[0] || "";
  assert.ok(cookie);
  return cookie;
}

async function account(action: string, cookie: string, body: Record<string, unknown> = {}) {
  return independentAccountPOST(new Request(`${origin}/api/readiness-account`, {
    method: "POST", headers: { origin, cookie, "content-type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  }));
}

async function chunk(token: string, index: number, bytes: Uint8Array, cookie: string) {
  const form = new FormData();
  form.set("token", token);
  form.set("index", String(index));
  form.set("file", new File([Uint8Array.from(bytes)], "synthetic.pdf", { type: "application/pdf" }));
  return uploadReportChunk(new Request(`${origin}/api/sorp-report-upload`, {
    method: "POST", headers: { origin, cookie }, body: form,
  }));
}

test("report upload is readiness-gated, session-bound, private and validates complete PDF bytes", async () => {
  const owner = await createUser(ownerId);
  const other = await createUser(otherId);
  assert.equal((await account("save", other, { progress: { step: "done", sessionId: "synthetic-other" } })).status, 200);
  const pdf = Buffer.alloc(3 * 1024 * 1024 + 100, 32);
  pdf.write("%PDF-1.7\n", 0);
  pdf.write("%%EOF\n", pdf.length - 6);
  const meta = { filename: "trust-report.pdf", contentType: "application/pdf", sizeBytes: pdf.length,
    organisation: "Synthetic charity", customerContext: "Synthetic only" };
  assert.equal((await account("create-report-upload", owner, meta)).status, 403);
  assert.equal((await account("save", owner, { progress: { step: "done", sessionId: "synthetic" } })).status, 200);
  const prepared = await account("create-report-upload", owner, meta);
  assert.equal(prepared.status, 201, await prepared.clone().text());
  const upload = (await prepared.json() as { upload: { token: string; mode: string; chunks: number } }).upload;
  assert.equal(upload.mode, "chunked");
  assert.equal(upload.chunks, 2);
  assert.deepEqual((await (await account("list-report-reviews", owner)).json() as { reviews: unknown[] }).reviews, []);
  assert.equal((await chunk(upload.token, 0, pdf.subarray(0, 3 * 1024 * 1024), other)).status, 403);
  assert.equal((await chunk(upload.token, 1, pdf.subarray(3 * 1024 * 1024), owner)).status, 200);
  assert.equal((await chunk(upload.token, 0, pdf.subarray(0, 3 * 1024 * 1024), owner)).status, 200);
  const listing = await (await account("list-report-reviews", owner)).json() as { reviews: Array<{ id: string; status: string }> };
  assert.equal(listing.reviews.length, 1);
  assert.equal(listing.reviews[0].status, "awaiting_payment");
  assert.deepEqual((await (await account("list-report-reviews", other)).json() as { reviews: unknown[] }).reviews, []);
  assert.equal((await chunk(upload.token, 0, pdf.subarray(0, 3 * 1024 * 1024), owner)).status, 403);
  const stored = await db.query<{ file_bytes: Buffer }>("SELECT file_bytes FROM sorp_auth.report_review WHERE id=$1", [listing.reviews[0].id]);
  assert.deepEqual(stored.rows[0].file_bytes, pdf);
  const previousCutover = process.env.SORP_AUTH_CUTOVER_ENABLED;
  process.env.SORP_AUTH_CUTOVER_ENABLED = "true";
  try {
    const ctx = { params: Promise.resolve({ id: listing.reviews[0].id }) };
    assert.equal((await downloadReport(new Request(`${origin}/api/sorp-report-download/${listing.reviews[0].id}`,
      { headers: { cookie: other } }), ctx)).status, 404);
    const ownDownload = await downloadReport(new Request(`${origin}/api/sorp-report-download/${listing.reviews[0].id}`,
      { headers: { cookie: owner } }), ctx);
    assert.equal(ownDownload.status, 200);
    assert.deepEqual(Buffer.from(await ownDownload.arrayBuffer()), pdf);
  } finally {
    if (previousCutover === undefined) delete process.env.SORP_AUTH_CUTOVER_ENABLED;
    else process.env.SORP_AUTH_CUTOVER_ENABLED = previousCutover;
  }
  assert.equal((await account("create-report-upload", owner, { ...meta, sizeBytes: 15 * 1024 * 1024 + 1 })).status, 403);
  const maximum = Buffer.alloc(15 * 1024 * 1024, 32);
  maximum.write("%PDF-1.7\n", 0);
  maximum.write("%%EOF\n", maximum.length - 6);
  const maximumPrepared = await account("create-report-upload", owner, { ...meta, sizeBytes: maximum.length,
    filename: "maximum-size.pdf" });
  assert.equal(maximumPrepared.status, 201);
  const maximumToken = (await maximumPrepared.json() as { upload: { token: string; chunks: number } }).upload;
  assert.equal(maximumToken.chunks, 5);
  for (let index = 0; index < 5; index += 1) {
    const result = await chunk(maximumToken.token, index,
      maximum.subarray(index * 3 * 1024 * 1024, (index + 1) * 3 * 1024 * 1024), owner);
    assert.equal(result.status, 200, await result.clone().text());
  }
  const maximumStored = await db.query<{ file_bytes: Buffer }>(
    "SELECT file_bytes FROM sorp_auth.report_review WHERE user_id=$1 AND filename='maximum-size.pdf'", [ownerId]);
  assert.deepEqual(maximumStored.rows[0].file_bytes, maximum);
  const bad = await account("create-report-upload", owner, { ...meta, sizeBytes: 8 });
  const badToken = (await bad.json() as { upload: { token: string } }).upload.token;
  assert.equal((await chunk(badToken, 0, Buffer.from("not-pdf!"), owner)).status, 400);
  assert.equal((await (await account("list-report-reviews", owner)).json() as { reviews: unknown[] }).reviews.length, 2);
});
