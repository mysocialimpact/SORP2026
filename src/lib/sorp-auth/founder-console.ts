import "server-only";
import { sorpAuthPool } from "./auth";
import { founderCreateOrganisation, founderInviteMember, founderRequestClientAccess,
  founderRevokeInvitation, founderSetPlan } from "./admin";

type Input = Record<string, unknown>;
const json = (data: unknown, status = 200) => Response.json(data,
  { status, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });

async function organisations() {
  const result = await sorpAuthPool().query(`SELECT o.id,o.name,o.type,e.plan,
    e.published_price_pence / 100.0 published_price,
    e.payable_price_pence / 100.0 payable_price,
    e.status='complimentary_partner' complimentary,e.complimentary_start,
    e.complimentary_end,e.complimentary_reason,
    (SELECT u.email FROM sorp_auth.membership m JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE m.organisation_id=o.id AND m.status='active'
      ORDER BY (m.role='owner') DESC,m.created_at LIMIT 1) primary_email,
    (SELECT count(*)::int FROM sorp_auth.membership m
      WHERE m.organisation_id=o.id AND m.status='active') member_count,
    o.created_at,o.updated_at
    FROM sorp_auth.organisation o JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
    ORDER BY o.updated_at DESC,o.name LIMIT 1000`);
  return result.rows;
}

async function dashboard(actor: { email: string; name?: string }) {
  const db = sorpAuthPool();
  const [orgs, invitations, clientAccess, recentRegistrations, audit, users, activeUsers] = await Promise.all([
    organisations(),
    db.query(`SELECT i.id::text,i.email,i.role,i.status,o.name organisation_name,i.created_at,i.expires_at
      FROM sorp_auth.invitation i JOIN sorp_auth.organisation o ON o.id=i.organisation_id
      ORDER BY i.created_at DESC LIMIT 50`),
    db.query(`SELECT a.id::text,a.status,a.permissions,a.updated_at,
      adviser.name adviser_name,charity.name charity_name
      FROM sorp_auth.adviser_client_access a
      JOIN sorp_auth.organisation adviser ON adviser.id=a.adviser_organisation_id
      JOIN sorp_auth.organisation charity ON charity.id=a.charity_organisation_id
      ORDER BY a.updated_at DESC LIMIT 100`),
    db.query(`SELECT id,email,"createdAt" created_at FROM sorp_auth."user"
      ORDER BY "createdAt" DESC LIMIT 20`),
    db.query(`SELECT a.id,a.action,a.target_type,a.target_id,a.created_at,
      coalesce(u.email,'System') actor FROM sorp_auth.audit_event a
      LEFT JOIN sorp_auth."user" u ON u.id=a.actor_user_id
      ORDER BY a.created_at DESC LIMIT 30`),
    db.query<{ count: number }>('SELECT count(*)::int count FROM sorp_auth."user"'),
    db.query<{ count: number }>(`SELECT count(DISTINCT "userId")::int count FROM sorp_auth."session"
      WHERE "expiresAt">now()`),
  ]);
  const pendingInvitations = invitations.rows.filter(row => row.status === "pending" &&
    new Date(row.expires_at).getTime() > Date.now());
  const pendingClients = clientAccess.rows.filter(row => row.status === "requested");
  const expiring = orgs.filter(row => row.complimentary && row.complimentary_end &&
    new Date(row.complimentary_end).getTime() < Date.now() + 30 * 86400000);
  const plans = ["Free", "Plus", "Adviser", "Enterprise"];
  return { founder: { email: actor.email, name: actor.name || "Founder" },
    metrics: { organisations: orgs.length, activeUsers: activeUsers.rows[0].count,
      registeredUsers: users.rows[0].count,
      complimentaryAccounts: orgs.filter(row => row.complimentary).length,
      pendingInvitations: pendingInvitations.length,
      activeSubscriptions: orgs.filter(row => Number(row.payable_price) > 0).length,
      planCounts: Object.fromEntries(plans.map(plan => [plan, orgs.filter(row => row.plan === plan).length])),
      source: "Independent SORP account and permission records." },
    organisations: orgs, invitations: invitations.rows, clientAccess: clientAccess.rows,
    recentRegistrations: recentRegistrations.rows, audit: audit.rows,
    attention: [
      ...pendingInvitations.map(row => ({ kind: "invitation", id: row.id,
        title: `Invitation awaiting ${row.email}`, detail: row.organisation_name })),
      ...pendingClients.map(row => ({ kind: "client", id: row.id,
        title: `${row.adviser_name} → ${row.charity_name}`, detail: "Awaiting charity approval" })),
      ...expiring.map(row => ({ kind: "complimentary", id: row.id,
        title: `${row.name} complimentary access`, detail: `Expires ${new Date(row.complimentary_end).toLocaleDateString("en-GB")}` })),
    ],
    unavailable: ["Verified billing revenue", "Billing discounts and promotions", "AI usage and cost", "Ask SORP token cost"] };
}

async function organisationDetail(id: string) {
  const db = sorpAuthPool();
  const [orgs, members, clients, history] = await Promise.all([
    organisations(),
    db.query(`SELECT m.id,u.email,m.role,m.status,m.created_at,m.updated_at
      FROM sorp_auth.membership m JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE m.organisation_id=$1 ORDER BY m.created_at`, [id]),
    db.query(`SELECT a.id::text,a.status,a.permissions,c.name charity_name
      FROM sorp_auth.adviser_client_access a JOIN sorp_auth.organisation c ON c.id=a.charity_organisation_id
      WHERE a.adviser_organisation_id=$1 ORDER BY c.name`, [id]),
    db.query(`SELECT a.id,a.action,a.created_at,coalesce(u.email,'System') actor
      FROM sorp_auth.audit_event a LEFT JOIN sorp_auth."user" u ON u.id=a.actor_user_id
      WHERE a.target_id=$1 ORDER BY a.created_at DESC LIMIT 30`, [id]),
  ]);
  const organisation = orgs.find(row => row.id === id);
  return organisation ? { organisation, memberships: members.rows, clients: clients.rows, history: history.rows } : null;
}

/** Returns null only for unrelated research-console routes. */
export async function independentFounderGET(actor: { email: string; name?: string },
  resource: string, id: string | undefined, url: URL): Promise<Response | null> {
  if (resource === "dashboard") return json(await dashboard(actor));
  if (resource === "organisations") return json(await organisations());
  if (resource === "organisation" && id) {
    const detail = await organisationDetail(id);
    return detail ? json(detail) : json({ error: "Organisation not found." }, 404);
  }
  if (resource === "search") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    return json((await organisations()).filter(row =>
      !q || row.name.toLowerCase().includes(q) || String(row.primary_email || "").toLowerCase().includes(q)).slice(0, 50));
  }
  return null;
}

export async function independentFounderPOST(actor: { id?: string }, resource: string,
  id: string | undefined, action: string | undefined, body: Input): Promise<Response | null> {
  if (!actor.id) return json({ error: "Founder account ID is missing." }, 403);
  if (resource === "organisations") {
    const created = await founderCreateOrganisation(actor.id, body);
    return json((await organisationDetail(created.id))!.organisation, 201);
  }
  if (resource === "organisation" && id && action === "plan") {
    const duration = body.duration;
    const complimentary = body.complimentary === true;
    const expiry = duration === "30" || duration === "90"
      ? new Date(Date.now() + Number(duration) * 86400000).toISOString()
      : duration === "custom" && body.expiry ? new Date(String(body.expiry)).toISOString() : null;
    await founderSetPlan(actor.id, { organisationId: id, plan: body.plan,
      complimentary, complimentaryEnd: expiry, reason: body.reason });
    return json((await organisationDetail(id))!.organisation);
  }
  if (resource === "organisation" && id && action === "revoke-complimentary") {
    await founderSetPlan(actor.id, { organisationId: id, plan: "Free", complimentary: false });
    return json((await organisationDetail(id))!.organisation);
  }
  if (resource === "organisation" && id && action === "invite") {
    const invitation = await founderInviteMember(actor.id, { organisationId: id,
      email: body.email, role: body.role });
    return json({ ...invitation, delivery: "sent" }, 201);
  }
  if (resource === "clients" && (id === "link" || action === "link")) {
    return json(await founderRequestClientAccess(actor.id, body), 201);
  }
  if (resource === "invitations" && id && action === "revoke") {
    return json(await founderRevokeInvitation(actor.id, { invitationId: id }));
  }
  return null;
}
