/** One-customer import for a confirmed team organisation and completed response.
 * The private JSON manifest contains the five original D1 rows, plus
 * {"account":{"id":"...","email":"..."}}. Never commit the manifest.
 * Dry run: npx tsx scripts/import-sorp-team.ts /private/team.json
 * Apply:   npx tsx scripts/import-sorp-team.ts /private/team.json --apply
 */
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

type Row = Record<string, unknown>;
type TeamManifest = { account: Row; organisation: Row; membership: Row;
  round: Row; invitation: Row; response: Row };

function value(row: Row, key: string) {
  const item = row[key];
  if (typeof item !== "string" || !item) throw new Error(`The team manifest is missing ${key}.`);
  return item;
}

function jsonArray(row: Row, key: string, length: number) {
  const raw = row[key];
  const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed) || parsed.length !== length) throw new Error(`The team manifest has an invalid ${key}.`);
  return parsed;
}

export function validateTeamManifest(input: unknown): TeamManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected a team manifest object.");
  const manifest = input as TeamManifest;
  for (const field of ["account", "organisation", "membership", "round", "invitation", "response"] as const) {
    if (!manifest[field] || typeof manifest[field] !== "object" || Array.isArray(manifest[field])) {
      throw new Error(`The team manifest is missing ${field}.`);
    }
  }
  const accountId = value(manifest.account, "id");
  const organisationId = value(manifest.organisation, "id");
  const roundId = value(manifest.round, "id");
  const invitationId = value(manifest.invitation, "id");
  if (value(manifest.membership, "account_id") !== accountId ||
      value(manifest.membership, "organisation_id") !== organisationId ||
      value(manifest.round, "organisation_id") !== organisationId ||
      value(manifest.round, "created_by_account_id") !== accountId ||
      value(manifest.invitation, "round_id") !== roundId ||
      value(manifest.response, "round_id") !== roundId ||
      value(manifest.response, "invitation_id") !== invitationId) {
    throw new Error("The customer, organisation, round, invitation and response IDs do not link.");
  }
  if (manifest.organisation.programme !== "team" || manifest.membership.role !== "owner" ||
      manifest.invitation.status !== "completed" || !manifest.response.completed_at ||
      !["confidential", "named"].includes(String(manifest.round.response_mode))) {
    throw new Error("The manifest is not a completed customer team record.");
  }
  const answers = jsonArray(manifest.response, "answers", 25);
  const pillarScores = jsonArray(manifest.response, "pillar_scores", 5);
  if (answers.some(answer => answer !== null && (!Number.isInteger(answer) || Number(answer) < 1 || Number(answer) > 5)) ||
      pillarScores.some(score => typeof score !== "number" || score < 0 || score > 5) ||
      !/^[a-f0-9]{64}$/i.test(value(manifest.invitation, "token_hash"))) {
    throw new Error("The completed response or invitation token hash is invalid.");
  }
  return manifest;
}

export async function importTeam(manifest: TeamManifest, databaseUrl: string) {
  const db = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await db.connect();
  const { account, organisation, membership, round, invitation, response } = manifest;
  try {
    await client.query("BEGIN");
    const owner = await client.query<{ id: string; email: string; verified: boolean }>(
      'SELECT id,email,"emailVerified" verified FROM sorp_auth."user" WHERE id=$1 FOR UPDATE', [account.id]);
    if (owner.rows.length !== 1 || !owner.rows[0].verified ||
        owner.rows[0].email.toLowerCase() !== String(account.email).toLowerCase()) {
      throw new Error("The verified customer account must exist first.");
    }
    await client.query(`INSERT INTO sorp_auth.organisation
      (id,name,type,programme,seat_limit,entitlement_source,created_at,updated_at)
      VALUES($1,$2,'Charity','team',$3,$4,$5,$6)`,
    [organisation.id, organisation.name, organisation.seat_limit, organisation.entitlement_source,
      organisation.created_at, organisation.updated_at]);
    await client.query("INSERT INTO sorp_auth.entitlement(organisation_id) VALUES($1)", [organisation.id]);
    await client.query(`INSERT INTO sorp_auth.membership
      (id,organisation_id,user_id,role,created_at,updated_at)
      VALUES($1,$2,$3,'owner',$4,$5)`,
    [membership.id, organisation.id, account.id, membership.created_at, membership.updated_at]);
    await client.query(`INSERT INTO sorp_auth.team_round
      (id,organisation_id,title,response_mode,status,created_by_user_id,created_at,updated_at,closed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [round.id, organisation.id, round.title, round.response_mode, round.status, account.id,
      round.created_at, round.updated_at, round.closed_at]);
    await client.query(`INSERT INTO sorp_auth.team_invitation
      (id,round_id,email,name,token_hash,status,invited_at,expires_at,started_at,completed_at,revoked_at,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$7::timestamptz+interval '14 days',$8,$9,$10,$11)`,
    [invitation.id, round.id, invitation.email, invitation.name || "", invitation.token_hash,
      invitation.status, invitation.invited_at, invitation.started_at, invitation.completed_at,
      invitation.revoked_at, invitation.updated_at]);
    await client.query(`INSERT INTO sorp_auth.team_response
      (id,round_id,invitation_id,answers,current_index,overall,pillar_scores,maturity,started_at,updated_at,completed_at)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9,$10,$11)`,
    [response.id, round.id, invitation.id, JSON.stringify(jsonArray(response, "answers", 25)),
      response.current_index, response.overall, JSON.stringify(jsonArray(response, "pillar_scores", 5)),
      response.maturity, response.started_at, response.updated_at, response.completed_at]);
    await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'legacy_team_import','organisation',$2)`, [account.id, organisation.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

async function main() {
  const path = process.argv[2];
  if (!path || process.argv.slice(3).some(arg => arg !== "--apply")) throw new Error("Pass a private JSON manifest path and optionally --apply.");
  const manifest = validateTeamManifest(JSON.parse(await readFile(path, "utf8")));
  if (!process.argv.includes("--apply")) process.stdout.write("Linked team manifest is valid. No database changes made.\n");
  else {
    if (!process.env.SORP_AUTH_DATABASE_URL) throw new Error("The independent database is not configured.");
    await importTeam(manifest, process.env.SORP_AUTH_DATABASE_URL);
    process.stdout.write("Confirmed customer team record imported. Verify customer access before cutover.\n");
  }
}

if (process.argv[1]?.endsWith("import-sorp-team.ts")) {
  void main().catch(() => {
    process.stderr.write("Team import failed; check linked records, customer verification and database access.\n");
    process.exitCode = 1;
  });
}
