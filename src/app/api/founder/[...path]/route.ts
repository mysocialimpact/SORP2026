import { protectFounderRequest } from "@/lib/founder/auth";
import { founderQuery } from "@/lib/founder/db";
import { AccessError } from "@/lib/access-error";
import { listDirectoryControls, setDirectoryControls, setHumanReviewed } from "@/lib/console/directory-controls";
import { firms as publicFirms } from "@/lib/accountants";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { independentFounderGET, independentFounderPOST } from "@/lib/sorp-auth/founder-console";
import { complimentaryAccessEnd } from "@/lib/founder/complimentary-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const plans: Record<string, number> = { Free: 0, Plus: 29, Adviser: 99, Enterprise: 0 };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
const cleanEmail = (email: unknown) => String(email || "").trim().toLowerCase();
const canonical = (value: unknown) => String(value || "").toLowerCase().replace(/\b(?:limited|ltd|llp|plc)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const hostname = (value: unknown) => { try { return new URL(String(value || "")).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
const cleanText = (value: unknown, limit: number) => String(value || "").trim().slice(0, limit);

class PlatformActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function platformAction(request: Request, body: Record<string, unknown>) {
  if (independentAuthCutover()) throw new PlatformActionError(503,
    "This founder action must use independent SORP account records.");
  const origin = process.env.SORP_BACKEND_ORIGIN;
  if (!origin) throw new PlatformActionError(503, "The account service is not configured.");
  let response: Response;
  try {
    response = await fetch(new URL("/api/readiness-account", origin), {
      method: "POST",
      headers: { "content-type": "application/json", cookie: request.headers.get("cookie") || "", "x-sorp-destination": "sorp2026.org" },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000), redirect: "error",
    });
  } catch { throw new PlatformActionError(503, "The secure account service could not be reached."); }
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new PlatformActionError(response.status, typeof payload.error === "string" ? payload.error : "The account service could not complete this request.");
  return payload;
}

function platformOrganisationId(row: Record<string, unknown>) {
  return String(row.platform_organisation_id || row.id || "");
}

async function syncOrganisation(request: Request, row: Record<string, unknown>) {
  return platformAction(request, {
    action: "founder-upsert-organisation", organisationId: platformOrganisationId(row), name: row.name, type: row.type,
    plan: row.plan, publishedPrice: Math.round(Number(row.published_price || 0) * 100), payablePrice: Math.round(Number(row.payable_price || 0) * 100),
    entitlementStatus: row.complimentary ? "complimentary_partner" : "standard", complimentaryEnd: row.complimentary_end || null,
  });
}

async function audit(actor: string, action: string, type: string, id: string, before: unknown, after: unknown) {
  await founderQuery("INSERT INTO research_console.founder_audit_log(actor,action,target_type,target_id,before_state,after_state) VALUES($1,$2,$3,$4,$5,$6)", [actor, action, type, id, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]);
}

async function reconcileLiveOrganisations(rows: unknown) {
  if (!Array.isArray(rows)) return;
  for (const candidate of rows) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const platformId = String(row.id || "").trim();
    const name = String(row.name || "").trim();
    const type = ["Charity", "Adviser", "Other"].includes(String(row.type)) ? String(row.type) : "Other";
    const plan = String(row.plan || "Free") in plans ? String(row.plan || "Free") : "Free";
    if (!platformId || name.length < 2) continue;
    const published = Number(row.published_price || 0) / 100;
    const payable = Number(row.payable_price || 0) / 100;
    const complimentary = String(row.entitlement_status || "").startsWith("complimentary");
    await founderQuery(
      `INSERT INTO research_console.founder_organisations
       (name,type,platform_organisation_id,plan,published_price,payable_price,complimentary,complimentary_start,complimentary_end,complimentary_reason)
       VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $7 THEN now() ELSE NULL END,$8,CASE WHEN $7 THEN 'Complimentary Partner' ELSE NULL END)
       ON CONFLICT(platform_organisation_id) WHERE platform_organisation_id IS NOT NULL DO UPDATE SET
       name=excluded.name,type=excluded.type,plan=excluded.plan,published_price=excluded.published_price,
       payable_price=excluded.payable_price,complimentary=excluded.complimentary,
       complimentary_end=excluded.complimentary_end,
       complimentary_reason=CASE WHEN excluded.complimentary THEN COALESCE(research_console.founder_organisations.complimentary_reason,'Complimentary Partner') ELSE NULL END,
       updated_at=now()`,
      [name, type, platformId, plan, published, payable, complimentary, row.complimentary_end || null],
    );
  }
}

async function reconcileLiveMemberships(users: unknown) {
  if (!Array.isArray(users)) return;
  for (const candidate of users) {
    if (!candidate || typeof candidate !== "object") continue;
    const row = candidate as Record<string, unknown>;
    const platformOrganisationId = cleanText(row.organisationId, 120);
    const memberEmail = cleanEmail(row.email);
    if (!platformOrganisationId || !memberEmail) continue;
    const organisation = (await founderQuery<{ id:string }>("SELECT id FROM research_console.founder_organisations WHERE platform_organisation_id=$1", [platformOrganisationId]))[0];
    if (!organisation) continue;
    const role = ["owner", "admin", "member"].includes(String(row.role)) ? String(row.role) : "member";
    await founderQuery(
      `INSERT INTO research_console.founder_memberships(organisation_id,account_id,email,role,status)
       VALUES($1,$2,$3,$4,'active')
       ON CONFLICT(organisation_id,email) DO UPDATE SET account_id=excluded.account_id,role=excluded.role,status='active'`,
      [organisation.id, cleanText(row.id, 120) || null, memberEmail, role],
    );
  }
}

async function optionalFounderQuery<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  try { return await founderQuery<T>(text, values); }
  catch { return [] as T[]; }
}

function productStatus(rows: Record<string, unknown>[], organisationId: string, fallback = "not_started") {
  const matches = rows.filter(row => String(row.organisationId || "") === organisationId);
  if (!matches.length) return fallback;
  if (matches.some(row => ["completed", "complete", "feedback_ready"].includes(String(row.status)))) return "completed";
  return "in_progress";
}

function publicSlug(row: { name:string; website:string|null; domain:string|null }) {
  const targetDomain = row.domain || hostname(row.website);
  return publicFirms.find(firm =>
    Boolean(targetDomain && hostname(firm.website) === targetDomain) || canonical(firm.name) === canonical(row.name),
  )?.slug || null;
}

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const actor = await protectFounderRequest(request);
    const path = await context.params;
    const [resource, id, action] = path.path;
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (independentAuthCutover()) {
        const independent = await independentFounderGET(actor, resource, id, url);
        if (independent) return independent;
      }
      if (resource === "dashboard") {
        const [membershipCount, invitations, auditRows, live, feedbackAttention, enquiryAttention, directorRows] = await Promise.all([
          founderQuery<{ count: string }>("SELECT count(*) FROM research_console.founder_memberships WHERE status='active'"),
          founderQuery("SELECT * FROM research_console.founder_invitations ORDER BY created_at DESC LIMIT 20"),
          founderQuery("SELECT * FROM research_console.founder_audit_log ORDER BY created_at DESC LIMIT 30"),
          platformAction(request, { action: "founder-overview" }),
          optionalFounderQuery<{ count:string }>("SELECT count(*) FROM research_console.founder_feedback WHERE status='new'"),
          optionalFounderQuery<{ count:string }>("SELECT count(*) FROM research_console.founder_contact_enquiries WHERE status='new'"),
          optionalFounderQuery("SELECT account_id,data,revision,updated_at FROM msi_products.impact_director ORDER BY updated_at DESC"),
        ]);
        await reconcileLiveOrganisations(live.organisations);
        await reconcileLiveMemberships(live.users);
        const storedOrganisations = await founderQuery<Record<string, unknown>>(`SELECT o.*,
          (SELECT email FROM research_console.founder_memberships m WHERE m.organisation_id=o.id ORDER BY (m.role='owner') DESC,m.created_at LIMIT 1) primary_email,
          (SELECT count(*)::int FROM research_console.founder_memberships m WHERE m.organisation_id=o.id) member_count
          FROM research_console.founder_organisations o ORDER BY o.updated_at DESC`);
        const liveMetrics = live.metrics && typeof live.metrics === "object" ? live.metrics as Record<string, unknown> : {};
        const liveProducts = live.products && typeof live.products === "object" ? live.products as Record<string, unknown> : {};
        const readiness = Array.isArray(liveProducts.readiness) ? liveProducts.readiness as Record<string, unknown>[] : [];
        const impactReports = Array.isArray(liveProducts.impactReports) ? liveProducts.impactReports as Record<string, unknown>[] : [];
        const excellence = Array.isArray(liveProducts.excellence) ? liveProducts.excellence as Record<string, unknown>[] : [];
        const users = Array.isArray(live.users) ? live.users as Record<string, unknown>[] : [];
        const organisations: Record<string, unknown>[] = storedOrganisations.map(row => {
          const platformId = String(row.platform_organisation_id || "");
          const liveRow = Array.isArray(live.organisations) ? (live.organisations as Record<string, unknown>[]).find(item => String(item.id) === platformId) : undefined;
          const readinessRows = readiness.filter(item => String(item.organisationId || "") === platformId);
          const progress = readinessRows.length ? Math.max(...readinessRows.map(item => Number(item.percentage || 0))) : 0;
          const reports = impactReports.filter(item => String(item.organisationId || "") === platformId);
          const director = directorRows.filter(item => users.some(user => String(user.organisationId || "") === platformId && String(user.id) === String(item.account_id)));
          return { ...row, last_activity: liveRow?.last_activity || liveRow?.lastActivity || row.updated_at, progress, products: {
            readiness: productStatus(readiness, platformId), askSorp: "not_recorded", impactReports: reports.some(item => item.feedbackReady) ? "completed" : reports.length ? "in_progress" : "not_started",
            excellence: productStatus(excellence, platformId), impactDirector: director.some(item => (item.data as Record<string,unknown> | undefined)?.completed) ? "completed" : director.length ? "in_progress" : "not_started",
          } };
        });
        const planCounts = Object.fromEntries(Object.keys(plans).map(plan => [plan, organisations.filter(row => row.plan === plan).length]));
        const pendingInvitations = Array.isArray(live.invitations) ? live.invitations.filter((row:Record<string,unknown>) => ["pending", "preparing"].includes(String(row.status))) : [];
        const failedInvitations = Array.isArray(live.invitations) ? live.invitations.filter((row:Record<string,unknown>) => row.status === "failed") : [];
        const pendingClients = Array.isArray(live.clients) ? live.clients.filter((row:Record<string,unknown>) => row.status === "pending") : [];
        const expiring = organisations.filter(row => row.complimentary_end && new Date(String(row.complimentary_end)).getTime() < Date.now() + 30 * 86400000);
        const newFeedback = Number(feedbackAttention[0]?.count || 0), newEnquiries = Number(enquiryAttention[0]?.count || 0);
        return json({
          founder: { email: actor.email, name: actor.name || "Founder" },
          metrics: {
            organisations: Number(liveMetrics.organisations || organisations.length), activeUsers: Number(liveMetrics.activeUsers || 0),
            registeredUsers: Number(liveMetrics.registeredUsers || membershipCount[0]?.count || 0),
            newOrganisationsThisWeek: Number(liveMetrics.newOrganisationsThisWeek || 0), recentlyActiveOrganisations: Number(liveMetrics.recentlyActiveOrganisations || 0),
            organisationsAssessing: Number(liveMetrics.organisationsAssessing || 0),
            complimentaryAccounts: Number(liveMetrics.complimentaryAccounts || organisations.filter(row => row.complimentary).length),
            pendingInvitations: Number(liveMetrics.pendingInvitations || pendingInvitations.length),
            activeSubscriptions: organisations.filter(row => Number(row.payable_price) > 0).length,
            planCounts, source: "Live platform identities plus Founder commercial records.",
          },
          organisations, users, invitations: live.invitations || invitations, clientAccess: live.clients || [], recentRegistrations: live.recentRegistrations || [], activity: live.activity || [], audit: auditRows,
          products: { ...liveProducts, impactDirector: directorRows.map(row => {
            const user = users.find(item => String(item.id) === String(row.account_id));
            return { ...row, accountId:row.account_id, user:user?.name || user?.email || "Account holder", organisationId:user?.organisationId || null, organisation:user?.organisationName || "" };
          }) },
          attention: [
            ...pendingInvitations.map((row:Record<string,unknown>) => ({ kind:"invitation", id:row.id, title:`Invitation awaiting ${row.email}`, detail:row.organisation_name || "Organisation" })),
            ...failedInvitations.map((row:Record<string,unknown>) => ({ kind:"invitation", id:row.id, title:`Invitation failed for ${row.email}`, detail:row.delivery_error || "Review and resend the invitation" })),
            ...pendingClients.map((row:Record<string,unknown>) => ({ kind:"client", id:row.id, title:`${row.adviser_name} → ${row.charity_name}`, detail:"Awaiting charity approval" })),
            ...expiring.map(row => ({ kind:"complimentary", id:row.id, title:`${row.name} complimentary access`, detail:`Expires ${new Date(String(row.complimentary_end)).toLocaleDateString("en-GB")}` })),
            ...(newEnquiries ? [{ kind:"enquiry", title:`${newEnquiries} new ${newEnquiries === 1 ? "enquiry" : "enquiries"}`, detail:"Review and follow up", target:"feedback" }] : []),
            ...(newFeedback ? [{ kind:"feedback", title:`${newFeedback} new feedback ${newFeedback === 1 ? "item" : "items"}`, detail:"Review customer feedback", target:"feedback" }] : []),
          ],
          unavailable: ["Verified billing revenue", "Billing discounts and promotions", "Ask SORP topic analytics and token cost"],
        });
      }
      if (resource === "organisations") return json(await founderQuery("SELECT * FROM research_console.founder_organisations ORDER BY name"));
      if (resource === "organisation" && id) {
        const organisation = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0];
        if (!organisation) return json({ error: "Organisation not found." }, 404);
        const live = await platformAction(request, { action:"founder-overview" });
        await reconcileLiveMemberships(live.users);
        const platformId = String(organisation.platform_organisation_id || "");
        const users = Array.isArray(live.users) ? (live.users as Record<string,unknown>[]).filter(row => String(row.organisationId || "") === platformId) : [];
        const accountIds = users.map(row => String(row.id));
        const liveProducts = live.products && typeof live.products === "object" ? live.products as Record<string,unknown> : {};
        const filterProduct = (value: unknown) => Array.isArray(value) ? value.filter((row:Record<string,unknown>) => String(row.organisationId || "") === platformId) : [];
        const [memberships, clients, history, directors] = await Promise.all([
          founderQuery("SELECT * FROM research_console.founder_memberships WHERE organisation_id=$1 ORDER BY created_at", [id]),
          founderQuery("SELECT ca.*,o.name charity_name FROM research_console.founder_client_access ca JOIN research_console.founder_organisations o ON o.id=ca.charity_organisation_id WHERE ca.adviser_organisation_id=$1", [id]),
          founderQuery("SELECT * FROM research_console.founder_audit_log WHERE target_id=$1 ORDER BY created_at DESC", [id]),
          accountIds.length ? optionalFounderQuery(`SELECT account_id,data,revision,updated_at FROM msi_products.impact_director WHERE account_id = ANY($1::text[])`, [accountIds]) : Promise.resolve([]),
        ]);
        return json({ organisation, memberships, users, clients, history, products:{ readiness:filterProduct(liveProducts.readiness), impactReports:filterProduct(liveProducts.impactReports), excellence:filterProduct(liveProducts.excellence), impactDirector:directors, askSorp:liveProducts.askSorp || null }, activity:Array.isArray(live.activity)?(live.activity as Record<string,unknown>[]).filter(row=>String(row.organisationId||"")===platformId):[] });
      }
      if (resource === "user" && id) {
        const detail = await platformAction(request, { action:"founder-account-detail", accountId:id });
        const directors = await optionalFounderQuery("SELECT account_id,data,revision,updated_at FROM msi_products.impact_director WHERE account_id=$1", [id]);
        return json({ ...detail, impactDirector: directors[0] || null });
      }
      if (resource === "search") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const live = await platformAction(request, { action:"founder-overview" });
        await reconcileLiveOrganisations(live.organisations); await reconcileLiveMemberships(live.users);
        const organisations = await founderQuery("SELECT * FROM research_console.founder_organisations ORDER BY name");
        const orgResults = organisations.filter(row=>!q||[row.name,row.primary_email].some(value=>String(value||"").toLowerCase().includes(q))).slice(0,50).map(row=>({kind:"organisation",...row}));
        const userResults = (Array.isArray(live.users)?live.users:[]).filter((row:Record<string,unknown>)=>!q||[row.name,row.email,row.organisationName].some(value=>String(value||"").toLowerCase().includes(q))).slice(0,50).map((row:Record<string,unknown>)=>({kind:"user",...row}));
        return json([...orgResults,...userResults].slice(0,50));
      }
      if (resource === "accountants") {
        const rows = await listDirectoryControls(url.searchParams.get("q") || "");
        const firms = rows.map(row => ({ ...row, overall_score: row.total, public_slug: publicSlug(row) }));
        return json({
          firms,
          metrics: {
            total: firms.length,
            researched: firms.filter(row => row.research_completed_at).length,
            humanReviewed: firms.filter(row => row.approved_at).length,
            publicListings: firms.filter(row => row.public_visible && row.public_slug).length,
            featured: firms.filter(row => row.featured).length,
          },
        });
      }
      if (resource === "plans") return json({
        plans: [
          { name:"Free", price:0, description:"Core access and saved progress." },
          { name:"Plus", price:29, description:"Expanded charity tools and support." },
          { name:"Adviser", price:99, description:"Adviser workspace and authorised client management." },
          { name:"Enterprise", price:null, description:"Bespoke access agreed directly." },
        ],
        billingConnected:false,
        discountsConnected:false,
      });
      if (resource === "feedback") {
        const status = ["new", "reviewing", "actioning", "resolved"].includes(url.searchParams.get("status") || "") ? url.searchParams.get("status")! : "";
        const category = ["general", "suggestion", "problem"].includes(url.searchParams.get("category") || "") ? url.searchParams.get("category")! : "";
        const sourceType = ["user", "automatic"].includes(url.searchParams.get("source") || "") ? url.searchParams.get("source")! : "";
        const search = cleanText(url.searchParams.get("q"), 160);
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const params = [status, category, sourceType, search ? `%${search}%` : "", limit, offset];
        const where = `($1='' OR status=$1) AND ($2='' OR category=$2) AND ($3='' OR source_type=$3) AND ($4='' OR user_name ILIKE $4 OR email ILIKE $4 OR organisation_name ILIKE $4 OR comment ILIKE $4 OR page_path ILIKE $4 OR theme ILIKE $4 OR technical_context->>'contactEmail' ILIKE $4)`;
        const [rows, count] = await Promise.all([
          founderQuery(`SELECT *, account_id LIKE 'anonymous:%' AS anonymous, nullif(technical_context->>'contactEmail','') AS contact_email FROM research_console.founder_feedback WHERE ${where} ORDER BY created_at DESC LIMIT $5 OFFSET $6`, params),
          founderQuery<{ count: string }>(`SELECT count(*) FROM research_console.founder_feedback WHERE ${where}`, params.slice(0, 4)),
        ]);
        return json({ rows, total: Number(count[0]?.count || 0), limit, offset });
      }
      if (resource === "enquiries") {
        const status = ["new", "actioning", "resolved"].includes(url.searchParams.get("status") || "") ? url.searchParams.get("status")! : "";
        const search = cleanText(url.searchParams.get("q"), 160);
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
        const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
        const params = [status, search ? `%${search}%` : "", limit, offset];
        const where = `($1='' OR status=$1) AND ($2='' OR user_name ILIKE $2 OR email ILIKE $2 OR organisation_name ILIKE $2 OR message ILIKE $2 OR page_path ILIKE $2)`;
        const [rows, count] = await Promise.all([
          founderQuery(`SELECT * FROM research_console.founder_contact_enquiries WHERE ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`, params),
          founderQuery<{ count: string }>(`SELECT count(*) FROM research_console.founder_contact_enquiries WHERE ${where}`, params.slice(0, 2)),
        ]);
        return json({ rows, total: Number(count[0]?.count || 0), limit, offset });
      }
      if (resource === "feedback-metrics") {
        const [summary, trends, recurring] = await Promise.all([
          founderQuery(`SELECT count(*) FILTER (WHERE status='new')::int new_feedback,
            count(*) FILTER (WHERE category='problem' AND status<>'resolved')::int outstanding_problems,
            round(avg(rating)::numeric,1) average_rating,
            count(*) FILTER (WHERE status='resolved')::int resolved,
            count(*) FILTER (WHERE created_at > now()-interval '30 days')::int last_30_days
            FROM research_console.founder_feedback`),
          founderQuery(`SELECT category,count(*)::int submissions,round(avg(rating)::numeric,1) average_rating
            FROM research_console.founder_feedback WHERE created_at > now()-interval '30 days' GROUP BY category ORDER BY submissions DESC`),
          founderQuery(`SELECT coalesce(nullif(theme,''),page_path) label,count(*)::int submissions
            FROM research_console.founder_feedback WHERE category='problem' AND status<>'resolved'
            GROUP BY coalesce(nullif(theme,''),page_path) HAVING count(*) > 1 ORDER BY submissions DESC,label LIMIT 8`),
        ]);
        return json({ summary: summary[0] || {}, trends, recurring });
      }
      if (resource === "improvements") return json(await founderQuery("SELECT * FROM research_console.founder_improvements ORDER BY published DESC,published_at DESC NULLS LAST,updated_at DESC"));
      return json({ error: "Not found" }, 404);
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await request.json().catch(() => ({}));
    if (independentAuthCutover()) {
      const independent = await independentFounderPOST(actor, resource, id, action, body);
      if (independent) return independent;
    }
    if (resource === "organisations") {
      const name = String(body.name || "").trim();
      const type = ["Charity", "Adviser", "Other"].includes(body.type) ? body.type : "Other";
      if (name.length < 2 || name.length > 200) return json({ error: "Enter an organisation name." }, 400);
      const row = (await founderQuery("INSERT INTO research_console.founder_organisations(name,type,platform_organisation_id) VALUES($1,$2,gen_random_uuid()::text) RETURNING *", [name, type]))[0] as Record<string, unknown> & { id: string };
      await syncOrganisation(request, row);
      await audit(actor.email, "organisation_created", "organisation", row.id, null, row);
      return json(row, 201);
    }
    if (resource === "organisation" && id && action === "plan") {
      const before = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0] as Record<string, unknown> | undefined;
      if (!before) return json({ error: "Organisation not found." }, 404);
      const plan = String(body.plan || "Free");
      if (!(plan in plans)) return json({ error: "Unknown plan." }, 400);
      const complimentary = Boolean(body.complimentary);
      const end = complimentaryAccessEnd(body);
      const payable = complimentary ? 0 : plans[plan];
      const row = (await founderQuery("UPDATE research_console.founder_organisations SET plan=$1,published_price=$2,payable_price=$3,complimentary=$4,complimentary_start=CASE WHEN $4 THEN COALESCE(complimentary_start,now()) ELSE NULL END,complimentary_end=$5,complimentary_reason=$6,updated_at=now() WHERE id=$7 RETURNING *", [plan, plans[plan], payable, complimentary, end, complimentary ? String(body.reason || "Complimentary access") : null, id]))[0];
      await syncOrganisation(request, row as Record<string, unknown>);
      await audit(actor.email, complimentary ? "complimentary_access_changed" : "plan_changed", "organisation", id, before, row);
      return json(row);
    }
    if (resource === "organisation" && id && action === "revoke-complimentary") {
      const before = (await founderQuery("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0] as Record<string, unknown> | undefined;
      if (!before) return json({ error: "Organisation not found." }, 404);
      const row = (await founderQuery("UPDATE research_console.founder_organisations SET plan='Free',published_price=0,payable_price=0,complimentary=false,complimentary_start=NULL,complimentary_end=NULL,complimentary_reason=NULL,updated_at=now() WHERE id=$1 RETURNING *", [id]))[0];
      await syncOrganisation(request, row as Record<string, unknown>);
      await audit(actor.email, "complimentary_access_revoked", "organisation", id, before, row);
      return json(row);
    }
    if (resource === "organisation" && id && action === "invite") {
      const email = cleanEmail(body.email);
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      const role = ["owner", "admin", "member"].includes(body.role) ? body.role : "member";
      const organisation = (await founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_organisations WHERE id=$1", [id]))[0];
      if (!organisation) return json({ error: "Organisation not found." }, 404);
      await syncOrganisation(request, organisation);
      const delivered = await platformAction(request, { action: "founder-invite", organisationId: platformOrganisationId(organisation), email, role });
      const platformInvitation = delivered.invitation && typeof delivered.invitation === "object" ? delivered.invitation as Record<string, unknown> : {};
      const deliveryStatus = ["pending", "sent", "delivered", "failed", "accepted"].includes(String(platformInvitation.status)) ? String(platformInvitation.status) : "pending";
      const invitation = (await founderQuery("INSERT INTO research_console.founder_invitations(organisation_id,email,role,status,invited_by) VALUES($1,$2,$3,$4,$5) RETURNING *", [id, email, role, deliveryStatus, actor.email]))[0];
      await founderQuery("INSERT INTO research_console.founder_memberships(organisation_id,email,role,status) VALUES($1,$2,$3,'invited') ON CONFLICT(organisation_id,email) DO UPDATE SET role=excluded.role,status='invited'", [id, email, role]);
      await audit(actor.email, "invitation_recorded", "organisation", id, null, invitation);
      return json({ ...invitation, delivery: deliveryStatus, platform: platformInvitation }, 201);
    }
    if (resource === "clients" && (id === "link" || action === "link")) {
      const adviser = String(body.adviserOrganisationId || "");
      const charity = String(body.charityOrganisationId || "");
      if (!adviser || !charity || adviser === charity) return json({ error: "Choose two different organisations." }, 400);
      const permissions = { progress: Boolean(body.permissions?.progress), answers: Boolean(body.permissions?.answers), edit: Boolean(body.permissions?.edit), invitations: Boolean(body.permissions?.invitations) };
      const [adviserRow, charityRow] = await Promise.all([
        founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_organisations WHERE id=$1 AND type='Adviser'", [adviser]),
        founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_organisations WHERE id=$1 AND type='Charity'", [charity]),
      ]);
      if (!adviserRow[0] || !charityRow[0]) return json({ error: "Choose a valid adviser and charity." }, 400);
      await Promise.all([syncOrganisation(request, adviserRow[0]), syncOrganisation(request, charityRow[0])]);
      const live = await platformAction(request, { action: "founder-client-access", adviserOrganisationId: platformOrganisationId(adviserRow[0]), charityOrganisationId: platformOrganisationId(charityRow[0]), permissions });
      const row = (await founderQuery("INSERT INTO research_console.founder_client_access(adviser_organisation_id,charity_organisation_id,permissions,status) VALUES($1,$2,$3,'requested') ON CONFLICT(adviser_organisation_id,charity_organisation_id) DO UPDATE SET permissions=excluded.permissions,updated_at=now() RETURNING *", [adviser, charity, JSON.stringify(permissions)]))[0];
      await audit(actor.email, "client_access_changed", "client_access", String(row.id), null, row);
      return json({ ...row as Record<string, unknown>, platform: live }, 201);
    }
    if (resource === "accountants" && id && action === "directory") {
      return json(await setDirectoryControls(id, body, actor.email));
    }
    if (resource === "accountants" && id && action === "human-review") {
      return json(await setHumanReviewed(id, body.reviewed === true, String(body.notes || ""), actor.email));
    }
    if (resource === "invitations" && id && action === "revoke") {
      const live = await platformAction(request, { action: "founder-revoke-invitation", invitationId:id });
      await audit(actor.email, "invitation_revoked", "invitation", id, null, live);
      return json(live);
    }
    if (resource === "invitations" && id && action === "resend") {
      const live = await platformAction(request, { action: "founder-resend-invitation", invitationId:id });
      await audit(actor.email, "invitation_resent", "invitation", id, null, live);
      return json(live);
    }
    if (resource === "feedback" && id && action === "update") {
      const before = (await founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_feedback WHERE id=$1", [id]))[0];
      if (!before) return json({ error: "Feedback not found." }, 404);
      const status = ["new", "reviewing", "actioning", "resolved"].includes(body.status) ? body.status : before.status;
      const notes = cleanText(body.internalNotes, 5_000) || null;
      const theme = cleanText(body.theme, 160) || null;
      const row = (await founderQuery("UPDATE research_console.founder_feedback SET status=$1,internal_notes=$2,theme=$3,updated_at=now() WHERE id=$4 RETURNING *", [status, notes, theme, id]))[0];
      await audit(actor.email, "feedback_updated", "feedback", id, before, row);
      return json(row);
    }
    if (resource === "enquiries" && id && action === "update") {
      const before = (await founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_contact_enquiries WHERE id=$1", [id]))[0];
      if (!before) return json({ error: "Enquiry not found." }, 404);
      const status = ["new", "actioning", "resolved"].includes(body.status) ? body.status : before.status;
      const notes = cleanText(body.internalNotes, 5_000) || null;
      const row = (await founderQuery("UPDATE research_console.founder_contact_enquiries SET status=$1,internal_notes=$2,updated_at=now() WHERE id=$3 RETURNING *", [status, notes, id]))[0];
      await audit(actor.email, "contact_enquiry_updated", "contact_enquiry", id, before, row);
      return json(row);
    }
    if (resource === "improvements" && !id) {
      const said = cleanText(body.said, 1_000);
      const did = cleanText(body.did, 2_000);
      const linkUrl = cleanText(body.linkUrl, 500) || null;
      const feedbackId = cleanText(body.feedbackId, 80) || null;
      if (!said || !did) return json({ error: "Add both what users said and what changed." }, 400);
      if (linkUrl && !linkUrl.startsWith("/")) return json({ error: "Use a link within SORP 2026." }, 400);
      if (feedbackId && !(await founderQuery("SELECT id FROM research_console.founder_feedback WHERE id=$1", [feedbackId]))[0]) return json({ error: "Linked feedback was not found." }, 400);
      const published = body.published === true;
      const row = (await founderQuery("INSERT INTO research_console.founder_improvements(feedback_id,said,did,link_url,published,published_at,created_by) VALUES($1,$2,$3,$4,$5,CASE WHEN $5 THEN now() END,$6) RETURNING *", [feedbackId, said, did, linkUrl, published, actor.email]))[0] as Record<string, unknown> & { id: string };
      await audit(actor.email, published ? "improvement_published" : "improvement_created", "improvement", row.id, null, row);
      return json(row, 201);
    }
    if (resource === "improvements" && id && action === "update") {
      const before = (await founderQuery<Record<string, unknown>>("SELECT * FROM research_console.founder_improvements WHERE id=$1", [id]))[0];
      if (!before) return json({ error: "Improvement not found." }, 404);
      const said = cleanText(body.said, 1_000);
      const did = cleanText(body.did, 2_000);
      const linkUrl = cleanText(body.linkUrl, 500) || null;
      if (!said || !did) return json({ error: "Add both what users said and what changed." }, 400);
      if (linkUrl && !linkUrl.startsWith("/")) return json({ error: "Use a link within SORP 2026." }, 400);
      const published = body.published === true;
      const row = (await founderQuery("UPDATE research_console.founder_improvements SET said=$1,did=$2,link_url=$3,published=$4,published_at=CASE WHEN $4 THEN coalesce(published_at,now()) ELSE NULL END,updated_at=now() WHERE id=$5 RETURNING *", [said, did, linkUrl, published, id]))[0];
      await audit(actor.email, published ? "improvement_published" : "improvement_updated", "improvement", id, before, row);
      return json(row);
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    if (error instanceof PlatformActionError) return json({ error: error.message }, error.status);
    const e = error as Error & { code?: string };
    console.error("Founder Control Centre request failed", { message: e.message, code: e.code });
    if (e.code || /database|connect|timeout/i.test(e.message)) return json({ error: "The founder database could not complete this request. Existing records are retained; please retry." }, 503);
    return json({ error: e.message || "Unable to complete this request." }, 400);
  }
}

export const GET = handle;
export const POST = handle;
