import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { Pool } from "pg";
import { importTeam, validateTeamManifest } from "../scripts/import-sorp-team";
import { reconcileOrganisations, validateReconciliation } from "../scripts/reconcile-sorp-organisations";

const url = process.env.SORP_AUTH_DATABASE_URL || "";
if (!/^postgres(?:ql)?:\/\/[^@]+@127\.0\.0\.1:55432\/sorp_test$/.test(url))
  throw new Error("Use the isolated local sorp_test database.");
const db = new Pool({ connectionString: url });
const ownerId = randomUUID();
const teamId = randomUUID();
const memberId = randomUUID();
const roundId = randomUUID();
const invitationId = randomUUID();
const responseId = randomUUID();
const fluidId = "fluid-adviser";
const brainLedgerId = randomUUID();
const fluidLedgerId = randomUUID();
const email = `synthetic-${ownerId}@brainstrust.org.uk`;
const now = new Date().toISOString();

after(async () => {
  await db.query("DELETE FROM sorp_auth.legacy_organisation_link WHERE organisation_id IN ($1,$2)", [teamId, fluidId]);
  await db.query("DELETE FROM sorp_auth.team_response WHERE round_id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.team_invitation WHERE round_id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.team_round WHERE id=$1", [roundId]);
  await db.query("DELETE FROM sorp_auth.membership WHERE organisation_id=$1", [teamId]);
  await db.query("DELETE FROM sorp_auth.entitlement WHERE organisation_id IN ($1,$2)", [teamId, fluidId]);
  await db.query("DELETE FROM sorp_auth.organisation WHERE id IN ($1,$2)", [teamId, fluidId]);
  await db.query('DELETE FROM sorp_auth."user" WHERE id=$1', [ownerId]);
  await db.end();
});

test("founder ledger maps to the original team ID without granting adviser access", async () => {
  const source = validateTeamManifest({ account: { id: ownerId, email },
    organisation: { id: teamId, name: "Brainstrust", programme: "team", seat_limit: 15,
      entitlement_source: "legacy", created_at: now, updated_at: now },
    membership: { id: memberId, organisation_id: teamId, account_id: ownerId,
      role: "owner", created_at: now, updated_at: now },
    round: { id: roundId, organisation_id: teamId, title: "Synthetic team", response_mode: "confidential",
      status: "open", created_by_account_id: ownerId, created_at: now, updated_at: now, closed_at: null },
    invitation: { id: invitationId, round_id: roundId, email, name: "Synthetic",
      token_hash: "a".repeat(64), status: "completed", invited_at: now,
      started_at: now, completed_at: now, revoked_at: null, updated_at: now },
    response: { id: responseId, round_id: roundId, invitation_id: invitationId,
      answers: Array(25).fill(4), current_index: 24, overall: 4,
      pillar_scores: Array(5).fill(4), maturity: "Developing",
      started_at: now, updated_at: now, completed_at: now } });
  const ledger = (id: string, name: string, type: string, platform_organisation_id: string,
    plan: string, complimentary: boolean) => ({ id, name, type, platform_organisation_id,
      plan, complimentary, published_price: complimentary ? "99.00" : "0.00",
      payable_price: "0.00", complimentary_start: complimentary ? now : null,
      complimentary_end: null, complimentary_reason: complimentary ? "Synthetic partner" : null });
  const manifest = validateReconciliation({ schemaVersion: 1,
    brainstrust: { ledger: ledger(brainLedgerId, "Brainstrust", "Charity", "brainstrust", "Free", false),
      teamOrganisationId: teamId, ownerAccountId: ownerId, ownerEmail: email },
    fluid: { ledger: ledger(fluidLedgerId, "FLUID", "Adviser", fluidId, "Adviser", true) },
    cowClientAccess: { id: "synthetic-access", adviser_organisation_id: fluidId,
      charity_organisation_id: "brainstrust", requested_by_account_id: randomUUID(),
      approved_by_account_id: ownerId, status: "active",
      permissions: { progress: true, answers: true, edit: false, invitations: false } } });
  await db.query('INSERT INTO sorp_auth."user"(id,name,email,"emailVerified") VALUES($1,$2,$3,false)',
    [ownerId, "Synthetic owner", email]);
  await assert.rejects(importTeam(source, url), /verified customer/);
  await db.query('UPDATE sorp_auth."user" SET "emailVerified"=true WHERE id=$1', [ownerId]);
  await importTeam(source, url);
  assert.equal((await db.query("SELECT count(*)::int n FROM sorp_auth.entitlement WHERE organisation_id=$1", [teamId])).rows[0].n, 1);
  const result = await reconcileOrganisations(manifest, url);
  assert.equal(result.brainstrustOrganisationId, teamId);
  assert.equal(result.clientAccessActivated, false);
  const links = await db.query("SELECT source,source_id,organisation_id FROM sorp_auth.legacy_organisation_link WHERE organisation_id IN ($1,$2)",
    [teamId, fluidId]);
  assert.equal(links.rows.length, 5);
  assert.equal(links.rows.find(row => row.source === "founder_ledger" && row.source_id === brainLedgerId)?.organisation_id, teamId);
  assert.equal((await db.query("SELECT count(*)::int n FROM sorp_auth.adviser_client_access WHERE charity_organisation_id=$1", [teamId])).rows[0].n, 0);
  await reconcileOrganisations(manifest, url);
  assert.equal((await db.query("SELECT count(*)::int n FROM sorp_auth.organisation WHERE id=$1", [fluidId])).rows[0].n, 1);
});
