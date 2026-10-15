/** Import one owner-downloaded assessment after email verification. Dry run by default.
 * Never commit or email the private export. The existing Cow record is left untouched.
 */
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { assessmentDigest } from "../src/lib/sorp-auth/digest";

type AssessmentExport = { schemaVersion: 1; source: "legacy-sorp-session";
  account: { id: string; email: string }; lastSavedAt: string | null;
  progress: Record<string, unknown>; sha256: string };

export function validateAssessmentExport(raw: unknown): AssessmentExport {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected one assessment export.");
  const value = raw as Record<string, unknown>;
  const account = value.account as Record<string, unknown> | undefined;
  const progress = value.progress;
  const id = String(account?.id || "");
  const email = String(account?.email || "").trim().toLowerCase();
  if (value.schemaVersion !== 1 || value.source !== "legacy-sorp-session" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !email.endsWith("@brainstrust.org.uk") ||
      !progress || typeof progress !== "object" || Array.isArray(progress)) {
    throw new Error("The export does not identify a complete Brainstrust assessment.");
  }
  const encoded = JSON.stringify(progress);
  const sha256 = assessmentDigest(progress);
  if (encoded.length < 100 || encoded.length > 1_500_000 || value.sha256 !== sha256 ||
      (value.lastSavedAt !== null && value.lastSavedAt !== undefined &&
        Number.isNaN(new Date(String(value.lastSavedAt)).getTime()))) {
    throw new Error("The assessment is incomplete, too large, or failed its digest check.");
  }
  return { schemaVersion: 1, source: "legacy-sorp-session", account: { id, email },
    lastSavedAt: value.lastSavedAt ? String(value.lastSavedAt) : null,
    progress: progress as Record<string, unknown>, sha256 };
}

export async function importAssessment(data: AssessmentExport, databaseUrl: string) {
  const db = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const owner = await client.query<{ id: string; email: string; verified: boolean }>(
      'SELECT id,email,"emailVerified" verified FROM sorp_auth."user" WHERE id=$1 FOR UPDATE', [data.account.id]);
    if (owner.rows.length !== 1 || !owner.rows[0].verified ||
        owner.rows[0].email.toLowerCase() !== data.account.email) {
      throw new Error("The original account ID and verified mailbox must match the target.");
    }
    const existing = await client.query<{ progress: unknown }>(
      "SELECT progress FROM sorp_auth.account_progress WHERE user_id=$1 FOR UPDATE", [data.account.id]);
    if (existing.rows.length) {
      const current = assessmentDigest(existing.rows[0].progress);
      if (current !== data.sha256) throw new Error("Existing SORP progress differs; do not overwrite newer work.");
      await client.query("ROLLBACK");
      return "already_imported";
    }
    const state = data.progress.state as Record<string, unknown> | undefined;
    const currentStage = Math.max(1, Math.min(7, Number(state?.currentStage) || 1));
    const completedStages = Array.isArray(state?.completedStages)
      ? state.completedStages.filter(stage => Number.isInteger(stage) && Number(stage) >= 1 && Number(stage) <= 7)
      : [];
    await client.query(`INSERT INTO sorp_auth.account_progress
      (user_id,progress,current_stage,completed_stages,last_saved_at)
      VALUES($1,$2::jsonb,$3,$4::jsonb,$5)`, [data.account.id, JSON.stringify(data.progress),
      currentStage, JSON.stringify(completedStages), data.lastSavedAt]);
    await client.query(`INSERT INTO sorp_auth.account_import(source_account_id,source_digest,user_id,verified_at)
      VALUES($1,$2,$1,now())`, [data.account.id, data.sha256]);
    await client.query(`INSERT INTO sorp_auth.audit_event(action,target_type,target_id,metadata)
      VALUES('legacy_assessment_imported','account',$1,$2::jsonb)`,
    [data.account.id, JSON.stringify({ sha256: data.sha256, lastSavedAt: data.lastSavedAt })]);
    await client.query("COMMIT");
    return "imported";
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await db.end(); }
}

async function main() {
  const path = process.argv[2];
  if (!path || process.argv.slice(3).some(arg => arg !== "--apply")) {
    throw new Error("Pass a private assessment export path and optionally --apply.");
  }
  const data = validateAssessmentExport(JSON.parse(await readFile(path, "utf8")));
  if (!process.argv.includes("--apply")) process.stdout.write("Assessment export digest and owner ID are valid. No data changed.\n");
  else {
    if (!process.env.SORP_AUTH_DATABASE_URL) throw new Error("The independent database is not configured.");
    const outcome = await importAssessment(data, process.env.SORP_AUTH_DATABASE_URL);
    process.stdout.write(`Assessment ${outcome}. Verify the owner can open all saved work before cutover.\n`);
  }
}

if (process.argv[1]?.endsWith("import-sorp-assessment.ts")) {
  void main().catch(() => {
    process.stderr.write("Assessment import failed. Check the complete export, digest, verified ID and target data.\n");
    process.exitCode = 1;
  });
}
