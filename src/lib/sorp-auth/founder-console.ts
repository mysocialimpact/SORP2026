import "server-only";
import { sorpAuthPool } from "./auth";
import { founderQuery } from "@/lib/founder/db";
import { founderCreateOrganisation, founderInviteMember, founderRequestClientAccess,
  founderRevokeInvitation, founderSetPlan, founderUpdateMembership } from "./admin";
import { complimentaryAccessEnd } from "@/lib/founder/complimentary-access";
import { EXCELLENCE_PILLARS, EXCELLENCE_STAGES, baselineOnlyAccess,
  normaliseAccess } from "@/lib/excellence/access-policy";

type Input = Record<string, unknown>;
const json = (data: unknown, status = 200) => Response.json(data,
  { status, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });

async function organisations() {
  const result = await sorpAuthPool().query(`SELECT o.id,o.id platform_organisation_id,o.name,o.type,o.excellence_access,
    CASE WHEN e.status='complimentary_partner' AND e.complimentary_end<=now() THEN 'Free' ELSE e.plan END plan,
    CASE WHEN e.status='complimentary_partner' AND e.complimentary_end<=now() THEN 0 ELSE e.published_price_pence / 100.0 END published_price,
    CASE WHEN e.status='complimentary_partner' AND e.complimentary_end<=now() THEN 0 ELSE e.payable_price_pence / 100.0 END payable_price,
    (e.status='complimentary_partner' AND (e.complimentary_end IS NULL OR e.complimentary_end>now())) complimentary,e.complimentary_start,
    e.complimentary_end,e.complimentary_reason,
    (SELECT u.email FROM sorp_auth.membership m JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE m.organisation_id=o.id AND m.status='active'
      ORDER BY (m.role='owner') DESC,m.created_at LIMIT 1) primary_email,
    (SELECT count(*)::int FROM sorp_auth.membership m
      WHERE m.organisation_id=o.id AND m.status='active') member_count,
    o.created_at,o.updated_at,o.updated_at last_activity
    FROM sorp_auth.organisation o JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
    ORDER BY o.updated_at DESC,o.name LIMIT 1000`);
  return result.rows;
}

async function directoryData() {
  const db = sorpAuthPool();
  const [people, readiness, excellence, reports] = await Promise.all([
    db.query(`SELECT DISTINCT ON (u.id) u.id,u.name,u.email,coalesce(p.position,'') position,
      m.organisation_id "organisationId",o.name "organisationName",m.role,
      CASE WHEN u."emailVerified" THEN 'verified' ELSE 'unverified' END status,
      u."createdAt" "createdAt",coalesce(a.last_saved_at,u."createdAt") "lastActivity"
      FROM sorp_auth."user" u LEFT JOIN sorp_auth.profile p ON p.user_id=u.id
      LEFT JOIN sorp_auth.membership m ON m.user_id=u.id AND m.status='active'
      LEFT JOIN sorp_auth.organisation o ON o.id=m.organisation_id
      LEFT JOIN sorp_auth.account_progress a ON a.user_id=u.id
      ORDER BY u.id,(m.role='owner') DESC NULLS LAST LIMIT 1000`),
    db.query(`SELECT a.user_id "accountId",u.name "user",u.email,
      m.organisation_id "organisationId",o.name organisation,
      CASE WHEN a.progress->>'step'='done' THEN 'completed' ELSE 'in_progress' END status,
      CASE WHEN a.progress->>'step'='done' THEN 100 ELSE least(99,round(a.current_stage*100.0/7)) END percentage,
      a.last_saved_at "updatedAt" FROM sorp_auth.account_progress a
      JOIN sorp_auth."user" u ON u.id=a.user_id
      LEFT JOIN LATERAL (SELECT organisation_id FROM sorp_auth.membership
        WHERE user_id=u.id AND status='active' ORDER BY (role='owner') DESC LIMIT 1) m ON true
      LEFT JOIN sorp_auth.organisation o ON o.id=m.organisation_id
      ORDER BY a.last_saved_at DESC LIMIT 1000`),
    db.query(`SELECT p.user_id "accountId",u.name "user",u.email,
      m.organisation_id "organisationId",o.name organisation,p.status,p.updated_at "updatedAt"
      FROM sorp_auth.product_progress p JOIN sorp_auth."user" u ON u.id=p.user_id
      LEFT JOIN LATERAL (SELECT organisation_id FROM sorp_auth.membership
        WHERE user_id=u.id AND status='active' ORDER BY (role='owner') DESC LIMIT 1) m ON true
      LEFT JOIN sorp_auth.organisation o ON o.id=m.organisation_id
      WHERE p.product_id='social-impact-excellence' ORDER BY p.updated_at DESC LIMIT 1000`),
    db.query(`SELECT r.id::text,r.user_id "accountId",u.name "user",u.email,
      coalesce(r.organisation_id,m.organisation_id) "organisationId",coalesce(o.name,r.organisation) organisation,
      r.filename,r.status,r.status='feedback_ready' "feedbackReady",r.updated_at "updatedAt"
      FROM sorp_auth.report_review r JOIN sorp_auth."user" u ON u.id=r.user_id
      LEFT JOIN LATERAL (SELECT organisation_id FROM sorp_auth.membership
        WHERE user_id=u.id AND status='active' ORDER BY (role='owner') DESC LIMIT 1) m ON true
      LEFT JOIN sorp_auth.organisation o ON o.id=coalesce(r.organisation_id,m.organisation_id)
      WHERE r.status<>'uploading' ORDER BY r.updated_at DESC LIMIT 1000`),
  ]);
  return { users: people.rows, products: { readiness: readiness.rows,
    excellence: excellence.rows, impactReports: reports.rows,
    askSorp: { note: 'Independent SORP authentication does not import MSI conversation analytics.' },
    impactDirector: [] } };
}

async function dashboard(actor: { email: string; name?: string }) {
  const db = sorpAuthPool();
  const [orgs, invitations, clientAccess, recentRegistrations, audit, users, activeUsers, directory] = await Promise.all([
    organisations(),
    db.query(`SELECT i.id::text,i.organisation_id,i.email,i.role,
      CASE WHEN i.status='pending' THEN 'sent' ELSE i.status END status,
      o.name organisation_name,i.created_at,i.created_at last_sent_at,i.expires_at
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
    directoryData(),
  ]);
  const pendingInvitations = invitations.rows.filter(row => row.status === "sent" &&
    new Date(row.expires_at).getTime() > Date.now());
  const pendingClients = clientAccess.rows.filter(row => row.status === "requested");
  const expiring = orgs.filter(row => row.complimentary && row.complimentary_end &&
    new Date(row.complimentary_end).getTime() < Date.now() + 30 * 86400000);
  const [newFeedback, newEnquiries] = await Promise.all([
    founderQuery<{ count: string }>("SELECT count(*)::text count FROM research_console.founder_feedback WHERE status='new'")
      .then(rows => Number(rows[0]?.count || 0)).catch(() => 0),
    founderQuery<{ count: string }>("SELECT count(*)::text count FROM research_console.founder_contact_enquiries WHERE status='new'")
      .then(rows => Number(rows[0]?.count || 0)).catch(() => 0),
  ]);
  const plans = ["Free", "Plus", "Adviser", "Enterprise"];
  return { founder: { email: actor.email, name: actor.name || "Founder" },
    metrics: { organisations: orgs.length, activeUsers: activeUsers.rows[0].count,
      registeredUsers: users.rows[0].count,
      newOrganisationsThisWeek: orgs.filter(row =>
        new Date(row.created_at).getTime() > Date.now() - 7 * 86400000).length,
      recentlyActiveOrganisations: orgs.filter(row =>
        new Date(row.updated_at).getTime() > Date.now() - 7 * 86400000).length,
      organisationsAssessing: new Set(directory.products.readiness.map(row => row.organisationId).filter(Boolean)).size,
      complimentaryAccounts: orgs.filter(row => row.complimentary).length,
      pendingInvitations: pendingInvitations.length,
      activeSubscriptions: orgs.filter(row => Number(row.payable_price) > 0).length,
      planCounts: Object.fromEntries(plans.map(plan => [plan, orgs.filter(row => row.plan === plan).length])),
      source: "Independent SORP account and permission records." },
    organisations: orgs, users: directory.users, products: directory.products,
    invitations: invitations.rows, clientAccess: clientAccess.rows,
    recentRegistrations: recentRegistrations.rows, audit: audit.rows, activity: audit.rows,
    attention: [
      ...pendingInvitations.map(row => ({ kind: "invitation", id: row.id,
        title: `Invitation awaiting ${row.email}`, detail: row.organisation_name })),
      ...pendingClients.map(row => ({ kind: "client", id: row.id,
        title: `${row.adviser_name} → ${row.charity_name}`, detail: "Awaiting charity approval" })),
      ...expiring.map(row => ({ kind: "complimentary", id: row.id,
        title: `${row.name} complimentary access`, detail: `Expires ${new Date(row.complimentary_end).toLocaleDateString("en-GB")}` })),
      ...(newEnquiries ? [{ kind: "enquiry", title: `${newEnquiries} new enquiries`, detail: "Review and follow up", target: "feedback" }] : []),
      ...(newFeedback ? [{ kind: "feedback", title: `${newFeedback} new feedback items`, detail: "Review customer feedback", target: "feedback" }] : []),
    ],
    unavailable: ["Verified billing revenue", "Billing discounts and promotions", "AI usage and cost", "Ask SORP token cost"] };
}

async function organisationDetail(id: string) {
  const db = sorpAuthPool();
  const [orgs, members, clients, history, directory] = await Promise.all([
    organisations(),
    db.query(`SELECT m.id,m.user_id,u.name,u.email,m.role,m.status,m.created_at,m.updated_at
      FROM sorp_auth.membership m JOIN sorp_auth."user" u ON u.id=m.user_id
      WHERE m.organisation_id=$1 ORDER BY m.created_at`, [id]),
    db.query(`SELECT a.id::text,a.status,a.permissions,c.name charity_name
      FROM sorp_auth.adviser_client_access a JOIN sorp_auth.organisation c ON c.id=a.charity_organisation_id
      WHERE a.adviser_organisation_id=$1 ORDER BY c.name`, [id]),
    db.query(`SELECT a.id,a.action,a.created_at,coalesce(u.email,'System') actor
      FROM sorp_auth.audit_event a LEFT JOIN sorp_auth."user" u ON u.id=a.actor_user_id
      WHERE a.target_id=$1 ORDER BY a.created_at DESC LIMIT 30`, [id]),
    directoryData(),
  ]);
  const organisation = orgs.find(row => row.id === id);
  const productRows = directory.products;
  return organisation ? { organisation, memberships: members.rows, clients: clients.rows,
    excellenceAccess: normaliseAccess(organisation.excellence_access) || baselineOnlyAccess,
    excellenceLegacy: false,
    history: history.rows, activity: history.rows,
    users: members.rows.map(member => ({ id: member.user_id, name: member.name,
      email: member.email, organisationId: id, organisationName: organisation.name,
      role: member.role, status: member.status, createdAt: member.created_at,
      lastActivity: member.updated_at })),
    products: { readiness: productRows.readiness.filter(row => row.organisationId === id),
      excellence: productRows.excellence.filter(row => row.organisationId === id),
      impactReports: productRows.impactReports.filter(row => row.organisationId === id),
      askSorp: productRows.askSorp, impactDirector: [] } } : null;
}

async function userDetail(id: string) {
  const db = sorpAuthPool();
  const directory = await directoryData();
  const user = directory.users.find(row => row.id === id);
  if (!user) return null;
  const [progress, products, reports] = await Promise.all([
    db.query(`SELECT progress,current_stage,last_saved_at FROM sorp_auth.account_progress WHERE user_id=$1`, [id]),
    db.query(`SELECT product_id,status,data,updated_at FROM sorp_auth.product_progress WHERE user_id=$1`, [id]),
    db.query(`SELECT id::text,filename,status,updated_at FROM sorp_auth.report_review
      WHERE user_id=$1 AND status<>'uploading' ORDER BY updated_at DESC`, [id]),
  ]);
  const readiness = progress.rows[0] ? {
    status: progress.rows[0].progress?.step === 'done' ? 'completed' : 'in_progress',
    progress: progress.rows[0].progress, updatedAt: progress.rows[0].last_saved_at,
    percentage: progress.rows[0].progress?.step === 'done' ? 100 :
      Math.min(99, Math.round(Number(progress.rows[0].current_stage || 1) * 100 / 7)),
  } : undefined;
  return { user, readiness, products: products.rows, reports: reports.rows,
    askSorp: [], impactDirector: null };
}

/** Returns null only for unrelated research-console routes. */
export async function independentFounderGET(actor: { id?: string; email: string; name?: string },
  resource: string, id: string | undefined, url: URL): Promise<Response | null> {
  if (resource === "dashboard") return json(await dashboard(actor));
  if (resource === "organisations") return json(await organisations());
  if (resource === "plans") return json({ plans: [
    { name: "Free", price: 0, description: "Free account" },
    { name: "Plus", price: 29, description: "Plus subscription" },
    { name: "Adviser", price: 99, description: "Adviser subscription" },
    { name: "Enterprise", price: null, description: "Custom agreement" },
  ], billingConnected: false, discountsConnected: false });
  if (resource === "user" && id) {
    const detail = await userDetail(id);
    if (detail && actor.id) await sorpAuthPool().query(`INSERT INTO sorp_auth.audit_event
      (actor_user_id,action,target_type,target_id) VALUES($1,'founder_account_viewed','user',$2)`, [actor.id, id]);
    return detail ? json(detail) : json({ error: "User not found." }, 404);
  }
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
  if (resource === "organisation" && id && action === "excellence-access") {
    const category = body.category === "stage" ? "stages" : body.category === "pillar" ? "pillars" : null;
    const key = String(body.key || "");
    if (!category || !(category === "stages" ? EXCELLENCE_STAGES : EXCELLENCE_PILLARS).some(item => item === key) ||
        typeof body.enabled !== "boolean") return json({ error: "Choose a valid access setting." }, 400);
    const client = await sorpAuthPool().connect();
    try {
      await client.query("BEGIN");
      const found = await client.query<{ excellence_access: unknown }>(
        "SELECT excellence_access FROM sorp_auth.organisation WHERE id=$1 FOR UPDATE", [id]);
      if (!found.rowCount) { await client.query("ROLLBACK"); return json({ error: "Organisation not found." }, 404); }
      const current = normaliseAccess(found.rows[0].excellence_access);
      if (!current) { await client.query("ROLLBACK"); return json({ error: "Review this organisation's access settings." }, 409); }
      const before = category === "stages" ? current.stages[key as keyof typeof current.stages]
        : current.pillars[key as keyof typeof current.pillars];
      const next = { stages: { ...current.stages }, pillars: { ...current.pillars } };
      if (category === "stages") next.stages[key as keyof typeof next.stages] = body.enabled;
      else next.pillars[key as keyof typeof next.pillars] = body.enabled;
      await client.query("UPDATE sorp_auth.organisation SET excellence_access=$2::jsonb,updated_at=now() WHERE id=$1",
        [id, JSON.stringify(next)]);
      await client.query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id,metadata)
        VALUES($1,'excellence_access_changed','organisation',$2,$3::jsonb)`,
        [actor.id, id, JSON.stringify({ category, key, before, enabled: body.enabled })]);
      await client.query("COMMIT");
      return json({ access: next, category, key, enabled: body.enabled });
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }
  if (resource === "organisation" && id && action === "plan") {
    const complimentary = body.complimentary === true;
    const expiry = complimentaryAccessEnd(body);
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
  if (resource === "organisation" && id && action === "membership") {
    return json(await founderUpdateMembership(actor.id, { organisationId: id,
      userId: body.userId, role: body.role, status: body.status }));
  }
  if (resource === "clients" && (id === "link" || action === "link")) {
    return json(await founderRequestClientAccess(actor.id, body), 201);
  }
  if (resource === "invitations" && id && action === "revoke") {
    return json(await founderRevokeInvitation(actor.id, { invitationId: id }));
  }
  if (resource === "invitations" && id && action === "resend") {
    const original = await sorpAuthPool().query<{ organisation_id: string; email: string; role: string }>(`
      SELECT organisation_id,email,role FROM sorp_auth.invitation
      WHERE id=$1 AND status='pending'`, [id]);
    if (!original.rows[0]) return json({ error: "The invitation cannot be resent." }, 409);
    const replacement = await founderInviteMember(actor.id, {
      organisationId: original.rows[0].organisation_id,
      email: original.rows[0].email, role: original.rows[0].role,
    });
    await founderRevokeInvitation(actor.id, { invitationId: id });
    return json({ invitation: { id: replacement.id, status: "sent" } }, 201);
  }
  return null;
}
