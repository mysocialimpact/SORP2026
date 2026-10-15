/** Reconcile the two founder-ledger organisations with verified Cow records.
 * The manifest is private and this command is dry-run by default. It never
 * imports a password, grants a membership, sends mail, or activates client access.
 */
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

type LedgerOrg = { id: string; name: string; type: string; platform_organisation_id: string;
  plan: string; published_price: string; payable_price: string; complimentary: boolean;
  complimentary_start: string | null; complimentary_end: string | null;
  complimentary_reason: string | null };
type Reconciliation = { schemaVersion: 1; brainstrust: { ledger: LedgerOrg; teamOrganisationId: string;
  ownerAccountId: string; ownerEmail: string }; fluid: { ledger: LedgerOrg };
  cowClientAccess: { id: string; adviser_organisation_id: string; charity_organisation_id: string;
    requested_by_account_id: string; approved_by_account_id: string; status: string;
    permissions: Record<string, boolean> } };
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function validateReconciliation(raw: unknown): Reconciliation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Expected a reconciliation manifest.");
  const data = raw as Reconciliation;
  const brain = data.brainstrust?.ledger;
  const fluid = data.fluid?.ledger;
  const access = data.cowClientAccess;
  if (data.schemaVersion !== 1 || !brain || !fluid || !access ||
      !uuid.test(brain.id) || !uuid.test(fluid.id) ||
      !uuid.test(data.brainstrust.teamOrganisationId) || !uuid.test(data.brainstrust.ownerAccountId) ||
      !data.brainstrust.ownerEmail.toLowerCase().endsWith("@brainstrust.org.uk") ||
      brain.name !== "Brainstrust" || brain.type !== "Charity" || brain.plan !== "Free" ||
      brain.platform_organisation_id !== "brainstrust" ||
      fluid.name !== "FLUID" || fluid.type !== "Adviser" || fluid.plan !== "Adviser" ||
      fluid.platform_organisation_id !== "fluid-adviser" || !fluid.complimentary ||
      Number(fluid.published_price) !== 99 || Number(fluid.payable_price) !== 0 ||
      access.status !== "active" || access.adviser_organisation_id !== fluid.platform_organisation_id ||
      access.charity_organisation_id !== brain.platform_organisation_id ||
      access.approved_by_account_id !== data.brainstrust.ownerAccountId ||
      !access.permissions ||
      access.permissions.progress !== true || access.permissions.answers !== true ||
      access.permissions.edit !== false || access.permissions.invitations !== false) {
    throw new Error("The founder and Cow organisation records do not reconcile.");
  }
  return data;
}

export async function reconcileOrganisations(data: Reconciliation, databaseUrl: string) {
  const db = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const brain = await client.query<{ id: string; name: string; type: string; user_id: string; email: string; verified: boolean }>(`
      SELECT o.id,o.name,o.type,m.user_id,u.email,u."emailVerified" verified
      FROM sorp_auth.organisation o
      JOIN sorp_auth.membership m ON m.organisation_id=o.id AND m.status='active' AND m.role='owner'
      JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE o.id=$1 FOR UPDATE OF o`, [data.brainstrust.teamOrganisationId]);
    if (brain.rows.length !== 1 || brain.rows[0].name !== "Brainstrust" || brain.rows[0].type !== "Charity" ||
        brain.rows[0].user_id !== data.brainstrust.ownerAccountId ||
        brain.rows[0].email.toLowerCase() !== data.brainstrust.ownerEmail.toLowerCase() || !brain.rows[0].verified) {
      throw new Error("Import and verify the original Brainstrust team owner before reconciling organisations.");
    }
    const fluid = data.fluid.ledger;
    const existing = await client.query<{ name: string; type: string }>(
      "SELECT name,type FROM sorp_auth.organisation WHERE id=$1 FOR UPDATE", [fluid.platform_organisation_id]);
    if (existing.rows.length && (existing.rows[0].name !== fluid.name || existing.rows[0].type !== fluid.type))
      throw new Error("An existing FLUID organisation has conflicting identity.");
    if (!existing.rows.length) {
      await client.query(`INSERT INTO sorp_auth.organisation(id,name,type,programme,seat_limit,entitlement_source)
        VALUES($1,$2,'Adviser','snapshot',1,'founder_ledger')`, [fluid.platform_organisation_id, fluid.name]);
    }
    const entitlement = await client.query<{ plan: string; status: string; published_price_pence: number; payable_price_pence: number }>(
      "SELECT plan,status,published_price_pence,payable_price_pence FROM sorp_auth.entitlement WHERE organisation_id=$1 FOR UPDATE",
      [fluid.platform_organisation_id]);
    if (entitlement.rows.length && (entitlement.rows[0].plan !== "Adviser" ||
        entitlement.rows[0].status !== "complimentary_partner" ||
        entitlement.rows[0].published_price_pence !== 9900 || entitlement.rows[0].payable_price_pence !== 0)) {
      throw new Error("An existing FLUID entitlement conflicts with the founder ledger.");
    }
    if (!entitlement.rows.length) await client.query(`INSERT INTO sorp_auth.entitlement
      (organisation_id,plan,published_price_pence,payable_price_pence,status,
       complimentary_start,complimentary_end,complimentary_reason)
      VALUES($1,'Adviser',9900,0,'complimentary_partner',$2,$3,$4)`,
    [fluid.platform_organisation_id, fluid.complimentary_start, fluid.complimentary_end, fluid.complimentary_reason]);
    const links = [
      ["cow_team", data.brainstrust.teamOrganisationId, data.brainstrust.teamOrganisationId],
      ["cow_platform", data.brainstrust.ledger.platform_organisation_id, data.brainstrust.teamOrganisationId],
      ["founder_ledger", data.brainstrust.ledger.id, data.brainstrust.teamOrganisationId],
      ["cow_platform", fluid.platform_organisation_id, fluid.platform_organisation_id],
      ["founder_ledger", fluid.id, fluid.platform_organisation_id],
    ];
    for (const [source, sourceId, target] of links) {
      const linked = await client.query<{ organisation_id: string }>(`INSERT INTO sorp_auth.legacy_organisation_link
        (source,source_id,organisation_id) VALUES($1,$2,$3)
        ON CONFLICT(source,source_id) DO UPDATE SET organisation_id=sorp_auth.legacy_organisation_link.organisation_id
        RETURNING organisation_id`, [source, sourceId, target]);
      if (linked.rows[0].organisation_id !== target) throw new Error("A legacy organisation link conflicts with this mapping.");
    }
    await client.query(`INSERT INTO sorp_auth.audit_event(action,target_type,target_id,metadata)
      VALUES('legacy_organisation_reconciled','organisation',$1,$2::jsonb)`,
    [data.brainstrust.teamOrganisationId, JSON.stringify({ founderLedgerId: data.brainstrust.ledger.id,
      fluidLedgerId: fluid.id, cowClientAccessId: data.cowClientAccess.id,
      clientAccessActivated: false, adviserMembershipGranted: false })]);
    await client.query("COMMIT");
    return { brainstrustOrganisationId: data.brainstrust.teamOrganisationId,
      fluidOrganisationId: fluid.platform_organisation_id, clientAccessActivated: false };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await db.end(); }
}

async function main() {
  const path = process.argv[2];
  if (!path || process.argv.slice(3).some(arg => arg !== "--apply"))
    throw new Error("Pass a private reconciliation manifest and optionally --apply.");
  const data = validateReconciliation(JSON.parse(await readFile(path, "utf8")));
  if (!process.argv.includes("--apply")) {
    process.stdout.write("Organisation mappings match; no permission grants or database changes made.\n");
  } else {
    if (!process.env.SORP_AUTH_DATABASE_URL) throw new Error("The independent database is not configured.");
    const result = await reconcileOrganisations(data, process.env.SORP_AUTH_DATABASE_URL);
    process.stdout.write(`Mapped ${result.brainstrustOrganisationId} and ${result.fluidOrganisationId}; client access remains inactive.\n`);
  }
}

if (process.argv[1]?.endsWith("reconcile-sorp-organisations.ts")) {
  void main().catch(() => {
    process.stderr.write("Organisation reconciliation failed; inspect source IDs, verified owner and target records.\n");
    process.exitCode = 1;
  });
}
