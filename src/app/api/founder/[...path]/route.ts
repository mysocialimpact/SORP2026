import { protectFounderRequest } from "@/lib/founder/auth";
import { founderQuery } from "@/lib/founder/db";
import { AccessError } from "@/lib/console/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const plans: Record<string, number> = { Free: 0, Plus: 29, Adviser: 99, Enterprise: 0 };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
const cleanEmail = (email: unknown) => String(email || "").trim().toLowerCase();

async function audit(actor: string, action: string, type: string, id: string, before: unknown, after: unknown) {
  await founderQuery("INSERT INTO research_console.founder_audit_log(actor,action,target_type,target_id,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)", [actor, action, type, id, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]);
}

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const actor = await protectFounderRequest(request);
    const path = await context.params;
    const [resource, id, action] = path.path;
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (resource === "dashboard") {
        const [orgs, membershipCount, invitations, auditRows] = await Promise.all([
          founderQuery("SELECT * FROM research_console.founder_organisations ORDER BY updated_at DESC"),
          founderQuery<{ count: string }>("SELECT count(*) FROM research_console.founder_memberships WHERE status='active'"),
          founderQuery("SELECT * FROM research_console.founder_invitations ORDER BY created_at DESC LIMIT 20"),
          founderQuery("SELECT * FROM research_console.founder_audit_log ORDER BY created_at DESC LIMIT 30"),
        ]);
        return json({ founder: { email: actor.email, name: actor.name || "Founder" }, metrics: { organisations: orgs.length, activeUsers: Number(membershipCount[0]?.count || 0), registeredUsers: Number(membershipCount[0]?.count || 0), source: "Founder records only; platform-wide analytics are not connected." }, organisations: orgs, invitations, audit: auditRows, unavailable: ["Platform-wide registrations", "AI usage and cost", "Ask SORP usage", "Assessment activity outside founder records"] });
      }
      if (resource === "organisations") return json(await founderQuery("SELECT * FROM research_console.founder_organisations ORDER BY name"));
      if (resource === "organisation" && id) {
        const organisation = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0];
        if (!organisation) return json({ error: "Organisation not found." }, 404);
        const [memberships, clients, history] = await Promise.all([founderQuery("SELECT * FROM research_console.founder_memberships WHERE organisation_id=$1 ORDER BY created_at", [id]), founderQuery("SELECT ca.*,o.name charity_name FROM research_console.founder_client_access ca JOIN research_console.founder_organisations o ON o.id=ca.charity_organisation_id WHERE ca.adviser_organisation_id=$1", [id]), founderQuery("SELECT * FROM research_console.founder_audit_log WHERE target_id=$1 ORDER BY created_at DESC", [id])]);
        return json({ organisation, memberships, clients, history });
      }
      if (resource === "search") {
        const q = `%${(url.searchParams.get("q") || "").trim()}%`;
        return json(await founderQuery("SELECT o.*,count(m.id)::int member_count FROM research_console.founder_organisations o LEFT JOIN research_console.founder_memberships m ON m.organisation_id=o.id WHERE o.name ILIKE $1 OR EXISTS(SELECT 1 FROM research_console.founder_memberships mm WHERE mm.organisation_id=o.id AND mm.email ILIKE $1) GROUP BY o.id ORDER BY o.name LIMIT 50", [q]));
      }
      return json({ error: "Not found" }, 404);
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await request.json().catch(() => ({}));
    if (resource === "organisations") {
      const name = String(body.name || "").trim();
      const type = ["Charity", "Adviser", "Other"].includes(body.type) ? body.type : "Other";
      if (name.length < 2 || name.length > 200) return json({ error: "Enter an organisation name." }, 400);
      const row = (await founderQuery("INSERT INTO research_console.founder_organisations(name,type) VALUES($1,$2) RETURNING *", [name, type]))[0] as { id: string };
      await audit(actor.email, "organisation_created", "organisation", row.id, null, row);
      return json(row, 201);
    }
    if (resource === "organisation" && id && action === "plan") {
      const before = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0] as Record<string, unknown> | undefined;
      if (!before) return json({ error: "Organisation not found." }, 404);
      const plan = String(body.plan || "Free");
      if (!(plan in plans)) return json({ error: "Unknown plan." }, 400);
      const complimentary = Boolean(body.complimentary);
      let end: string | null = null;
      if (body.duration === "30" || body.duration === "90") end = new Date(Date.now() + Number(body.duration) * 86400000).toISOString();
      else if (body.expiry) { const parsed = new Date(body.expiry); if (Number.isNaN(parsed.getTime())) return json({ error: "Enter a valid expiry date." }, 400); end = parsed.toISOString(); }
      const payable = complimentary ? 0 : plans[plan];
      const row = (await founderQuery("UPDATE research_console.founder_organisations SET plan=$1,published_price=$2,payable_price=$3,complimentary=$4,complimentary_start=CASE WHEN $4 THEN COALESCE(complimentary_start,now()) ELSE NULL END,complimentary_end=$5,complimentary_reason=$6,updated_at=now() WHERE id=$7 RETURNING *", [plan, plans[plan], payable, complimentary, end, complimentary ? String(body.reason || "Complimentary access") : null, id]))[0];
      await audit(actor.email, complimentary ? "complimentary_access_changed" : "plan_changed", "organisation", id, before, row);
      return json(row);
    }
    if (resource === "organisation" && id && action === "revoke-complimentary") {
      const before = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0] as Record<string, unknown> | undefined;
      if (!before) return json({ error: "Organisation not found." }, 404);
      const row = (await founderQuery("UPDATE research_console.founder_organisations SET complimentary=false,payable_price=published_price,complimentary_start=NULL,complimentary_end=NULL,complimentary_reason=NULL,updated_at=now() WHERE id=$1 RETURNING *", [id]))[0];
      await audit(actor.email, "complimentary_access_revoked", "organisation", id, before, row);
      return json(row);
    }
    if (resource === "organisation" && id && action === "invite") {
      const email = cleanEmail(body.email);
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      const role = ["owner", "admin", "member"].includes(body.role) ? body.role : "member";
      const invitation = (await founderQuery("INSERT INTO research_console.founder_invitations(organisation_id,email,role,invited_by) VALUES($1,$2,$3,$4) RETURNING *", [id, email, role, actor.email]))[0];
      await founderQuery("INSERT INTO research_console.founder_memberships(organisation_id,email,role,status) VALUES($1,$2,$3,'invited') ON CONFLICT(organisation_id,email) DO UPDATE SET role=excluded.role,status='invited'", [id, email, role]);
      await audit(actor.email, "invitation_recorded", "organisation", id, null, invitation);
      return json({ ...invitation, delivery: "recorded", note: "Invitation delivery is not connected; share this invitation through your approved email workflow." }, 201);
    }
    if (resource === "clients" && action === "link") {
      const adviser = String(body.adviserOrganisationId || "");
      const charity = String(body.charityOrganisationId || "");
      if (!adviser || !charity || adviser === charity) return json({ error: "Choose two different organisations." }, 400);
      const permissions = { progress: Boolean(body.permissions?.progress), answers: Boolean(body.permissions?.answers), edit: Boolean(body.permissions?.edit), invitations: Boolean(body.permissions?.invitations) };
      const row = (await founderQuery("INSERT INTO research_console.founder_client_access(adviser_organisation_id,charity_organisation_id,permissions,status) VALUES($1,$2,$3,'requested') ON CONFLICT(adviser_organisation_id,charity_organisation_id) DO UPDATE SET permissions=excluded.permissions,updated_at=now() RETURNING *", [adviser, charity, JSON.stringify(permissions)]))[0];
      await audit(actor.email, "client_access_changed", "client_access", String(row.id), null, row);
      return json(row, 201);
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    const e = error as Error & { code?: string };
    if (e.code || /database|connect|timeout/i.test(e.message)) return json({ error: "The founder database could not complete this request. Existing records are retained; please retry." }, 503);
    return json({ error: e.message || "Unable to complete this request." }, 400);
  }
}

export const GET = handle;
export const POST = handle;
