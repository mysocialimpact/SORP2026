/** Run against isolated Postgres and the local Next server on port 3333 with cutover enabled. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!url.includes("127.0.0.1:55432/sorp_test")) throw new Error("Local test DB required.");
const db = new Pool({ connectionString: url });
const origin = "http://localhost:3333";
const id = randomUUID();
const organisationId = randomUUID();
const email = `browser-report-${id}@example.invalid`;
const password = "synthetic-browser-password-2026";

async function main() {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    await db.query('INSERT INTO sorp_auth."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id, "Synthetic browser owner", email]);
    await db.query('INSERT INTO sorp_auth."account"(id,"accountId","providerId","userId",password,"updatedAt") VALUES($1,$2,$3,$4,$5,now())',
      [randomUUID(), id, "credential", id, await hashPassword(password)]);
    await db.query("INSERT INTO sorp_auth.account_progress(user_id,progress) VALUES($1,$2::jsonb)",
      [id, JSON.stringify({ step: "done", sessionId: "synthetic-browser" })]);
    await db.query("INSERT INTO sorp_auth.organisation(id,name,type) VALUES($1,'Synthetic browser charity','Charity')", [organisationId]);
    await db.query("INSERT INTO sorp_auth.entitlement(organisation_id) VALUES($1)", [organisationId]);
    await db.query("INSERT INTO sorp_auth.membership(organisation_id,user_id,role) VALUES($1,$2,'owner')", [organisationId, id]);
    const page = await browser.newPage({ baseURL: origin });
    await page.goto("/login/?return=/charity-impact-reports/review/");
    await page.locator(".account-portal").getByLabel("Email address").fill(email);
    await page.locator(".account-portal").getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /Log in to SORP2026/ }).click();
    await expect(page).toHaveURL(/\/charity-impact-reports\/review\//);
    await expect(page.getByRole("heading", { name: /Choose the PDF/ })).toBeVisible();
    await expect(page.getByLabel("Charity workspace")).toHaveValue(organisationId);
    const pdf = Buffer.alloc(3 * 1024 * 1024 + 90, 32);
    pdf.write("%PDF-1.7\n", 0);
    pdf.write("%%EOF\n", pdf.length - 6);
    await page.locator('.review-upload input[type="file"]').setInputFiles({ name: "synthetic-impact.pdf",
      mimeType: "application/pdf", buffer: pdf });
    await page.getByRole("button", { name: /Upload my report securely/ }).click();
    try {
      await expect(page.getByRole("status").filter({ hasText: "stored securely" })).toBeVisible({ timeout: 30_000 });
    } catch (error) {
      process.stderr.write(`Report page: ${(await page.locator(".review-upload").innerText()).slice(0, 1000)}\n`);
      throw error;
    }
    await expect(page.locator(".review-history")).toContainText("synthetic-impact.pdf");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF" }).click();
    assert.equal((await download).suggestedFilename(), "synthetic-impact.pdf");
    await page.reload();
    await expect(page.locator(".review-history")).toContainText("synthetic-impact.pdf");
    const rows = await db.query<{ file_bytes: Buffer; organisation_id: string }>(
      "SELECT file_bytes,organisation_id FROM sorp_auth.report_review WHERE user_id=$1", [id]);
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].organisation_id, organisationId);
    assert.deepEqual(rows.rows[0].file_bytes, pdf);
    process.stdout.write("Browser login, chunked PDF upload and persisted account listing passed.\n");
  } finally {
    await browser.close();
    await db.query("DELETE FROM sorp_auth.report_review WHERE user_id=$1", [id]);
    await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [organisationId]);
    await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id=$1", [organisationId]);
    await db.query("DELETE FROM sorp_auth.organisation WHERE id=$1", [organisationId]);
    await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [id]);
    await db.end();
  }
}

void main().catch(error => {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
