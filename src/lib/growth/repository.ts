import "server-only";
import { AccessError } from "@/lib/access-error";
import { containsIsolatedCustomerReference, excludeIsolatedCustomerRows } from "@/lib/customer-isolation";
import { getDirectoryFirms } from "@/lib/directory-data";
import { founderDatabase, founderQuery } from "@/lib/founder/db";
import { isKind, publicWebUrl, stages } from "./model";

type Input = Record<string, unknown>;
const fail = (message: string, status = 400): never => { throw new AccessError(status, message); };
const clean = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const uuid = (value: unknown) => /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(String(value));
const date = (value: unknown) => {
  const s = clean(value, 20);
  if (!s) return null;
  const d = new Date(s + "T00:00:00.000Z");
  if (!/^\d{4}-\d\d-\d\d$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== s)
    return fail("Choose a valid date.");
  return s;
};
const idOrNull = (value: unknown) => value ? uuid(value) ? String(value) : fail("Choose a valid record.") : null;

const orgFilter = "lower(o.name)<>'brainstrust' AND coalesce(o.platform_organisation_id,'') NOT IN ('brainstrust','74d0b3b4-755f-43e7-9bc7-79819ae36492','71bdb08b-c545-4cfe-8b8d-1aaf443539d5')";
const trial = "o.type='Adviser' AND o.plan='Adviser' AND o.complimentary AND (o.complimentary_start IS NULL OR o.complimentary_start<=now()) AND (o.complimentary_end IS NULL OR o.complimentary_end>now())";
const relationFields = `r.*,coalesce(f.name,r.name) display_name,o.name organisation_name,o.plan,o.complimentary,o.complimentary_start,o.complimentary_end,
  coalesce((${trial}),false) trial_active,
  CASE WHEN (${trial}) AND o.complimentary_end IS NOT NULL
    THEN ceil(extract(epoch FROM o.complimentary_end-now())/86400)::int END trial_days
  `;
const relationJoin = `FROM research_console.growth_relationships r LEFT JOIN research_console.firms f ON f.id=r.firm_id
  LEFT JOIN research_console.founder_organisations o ON o.id=r.organisation_id AND ${orgFilter}`;

export async function readGrowth(params: URLSearchParams) {
  const view = params.get("view") || "overview";
  const id = params.get("id");
  const q = clean(params.get("q"), 100);
  const page = Math.min(10000, Math.max(0, parseInt(params.get("page") || "",10) || 0));
  if (view === "overview") {
    const [counts, events, enquiries] = await Promise.all([
      founderQuery(`SELECT r.kind,r.stage,count(*)::int total,count(*) FILTER (WHERE ${trial})::int trials
        ${relationJoin} GROUP BY r.kind,r.stage`),
      founderQuery(`SELECT a.action,count(DISTINCT a.relationship_id)::int total FROM research_console.growth_activity a
        JOIN research_console.growth_relationships r ON r.id=a.relationship_id
        WHERE r.kind='charities' AND a.action IN ('report-draft','report-shared') GROUP BY a.action`),
      founderQuery("SELECT count(*)::int total FROM research_console.founder_contact_enquiries"),
    ]);
    return { counts, events, enquiries: enquiries[0]?.total ?? null };
  }
  if (!isKind(view)) return fail("Choose a growth channel.");
  if (id) {
    if (!uuid(id)) return fail("Choose a valid record.");
    const [record] = await founderQuery(`SELECT ${relationFields},
      (SELECT max(a.created_at) FROM research_console.growth_activity a WHERE a.relationship_id=r.id AND
        (a.action='email-sent' OR (a.action='meeting' AND a.details->>'meeting_status'='Completed'))) last_contact,
      EXISTS(SELECT 1 FROM research_console.growth_relationships s WHERE lower(s.contact_email)=lower(r.contact_email) AND s.contact_review='Do not contact') suppressed
      ${relationJoin} WHERE r.kind=$1 AND (r.id=$2 OR r.firm_id=$2)`, [view,id]);
    const firmId = view === "accountants" ? record?.firm_id || id : null;
    if (!record && !firmId) return fail("Prospect not found.",404);
    const [firms, evidence, people, activity, referrals, organisations, partners, directory] = await Promise.all([
      firmId ? founderQuery(`SELECT f.id,f.name,f.website,f.domain,f.contact,f.approved_at,f.research_completed_at,
        a.total,a.scores,(SELECT town FROM research_console.offices WHERE firm_id=f.id ORDER BY id LIMIT 1) location
        FROM research_console.firms f LEFT JOIN LATERAL
        (SELECT total,scores FROM research_console.assessments WHERE firm_id=f.id AND origin<>'Automated pilot calibration'
        ORDER BY created_at DESC,id DESC LIMIT 1) a ON true WHERE f.id=$1 AND f.merged_into IS NULL`, [firmId]) : [],
      firmId ? founderQuery(`SELECT title,summary,url,category,confidence,accessed_at FROM research_console.evidence
        WHERE firm_id=$1 AND state='Current' ORDER BY created_at DESC LIMIT 30`, [firmId]) : [],
      firmId ? founderQuery("SELECT name,role,profile_url FROM research_console.people WHERE firm_id=$1 AND archived_at IS NULL ORDER BY name LIMIT 30", [firmId]) : [],
      record ? founderQuery("SELECT id,action,details,actor,created_at FROM research_console.growth_activity WHERE relationship_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100", [record.id]) : [],
      record && view === "accountants" ? founderQuery(`SELECT ${relationFields},(SELECT count(*)::int FROM research_console.founder_memberships m
        WHERE m.organisation_id=o.id AND m.status='active') members
        ${relationJoin} WHERE r.referred_by=$1 ORDER BY r.name`, [record.id]) : [],
      record ? founderQuery(`SELECT o.id,o.name FROM research_console.founder_organisations o WHERE ${orgFilter} AND o.platform_organisation_id IS NOT NULL AND o.type=$1 ORDER BY o.name`, [view === "accountants" ? "Adviser" : "Charity"]) : [],
      record && view === "charities" ? founderQuery(`SELECT r.id,f.name FROM research_console.growth_relationships r
        JOIN research_console.firms f ON f.id=r.firm_id WHERE r.kind='accountants' AND f.merged_into IS NULL ORDER BY f.name`) : [],
      firmId ? getDirectoryFirms() : [],
    ]);
    if (!record && !firms.length) return fail("Research profile not found.",404);
    const firm = firms[0];
    const domain = (value: unknown) => {
      try { return new URL(String(value)).hostname.toLowerCase().replace(/^www\./,""); } catch { return ""; }
    };
    const normal = (value: string) => value.toLowerCase().replace(/\b(?:limited|ltd|llp|plc)\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
    const listed = firm ? directory.find(item => normal(item.name) === normal(String(firm.name)) ||
      Boolean(domain(item.website) && domain(item.website) === (firm.domain || domain(firm.website)))) : undefined;
    return excludeIsolatedCustomerRows({ record: record || null,
      firm: firm ? { ...firm, listing: listed ? { slug: listed.slug, featured: listed.featured } : null } : null,
      evidence, people, activity, referrals, organisations, partners });
  }
  const filter = clean(params.get("stage"));
  const sort = params.get("sort");
  const order = sort === "follow-up" ? "follow_up ASC NULLS LAST,display_name,id" :
    sort === "name" ? "display_name,id" : "CASE priority WHEN 'High' THEN 0 WHEN 'Normal' THEN 1 ELSE 2 END, follow_up ASC NULLS LAST, display_name,id";
  const conditions = `($1='' OR concat_ws(' ',display_name,website,contact_name,contact_email,charity_number) ILIKE '%' || $1 || '%')
    AND ($2='' OR ($2=stage AND relationship_id IS NOT NULL) OR ($2='tracked' AND relationship_id IS NOT NULL) OR ($2='due' AND follow_up<=CURRENT_DATE AND stage<>'Not interested') OR ($2='trial' AND trial_active)
      OR ($2='report-draft' AND EXISTS(SELECT 1 FROM research_console.growth_activity WHERE relationship_id=pipeline.id AND action='report-draft'))
      OR ($2='report-shared' AND EXISTS(SELECT 1 FROM research_console.growth_activity WHERE relationship_id=pipeline.id AND action='report-shared')))`;
  const sql = view === "accountants"
    ? `SELECT f.id,f.name display_name,f.website,NULL::text charity_number,r.id relationship_id,r.contact_name,r.contact_email,
        coalesce(r.stage,CASE WHEN f.research_completed_at IS NOT NULL THEN 'Researched' ELSE 'Research profile' END) stage,r.priority,r.follow_up,r.next_action,r.owner_name,o.name organisation_name,
        coalesce((${trial}),false) trial_active,a.total score,
        (SELECT town FROM research_console.offices WHERE firm_id=f.id ORDER BY id LIMIT 1) location
      FROM research_console.firms f LEFT JOIN research_console.growth_relationships r ON r.firm_id=f.id
      LEFT JOIN research_console.founder_organisations o ON o.id=r.organisation_id AND ${orgFilter}
      LEFT JOIN LATERAL (SELECT total FROM research_console.assessments WHERE firm_id=f.id AND origin<>'Automated pilot calibration'
        ORDER BY created_at DESC,id DESC LIMIT 1) a ON true WHERE f.merged_into IS NULL`
    : `SELECT r.id,r.name display_name,r.website,r.charity_number,r.id relationship_id,r.contact_name,r.contact_email,
        r.stage,r.priority,r.follow_up,r.next_action,r.owner_name,o.name organisation_name,false trial_active,NULL::int score,NULL::text location
      ${relationJoin} WHERE r.kind='charities'`;
  const [rows, counts] = await Promise.all([
    founderQuery(`WITH pipeline AS (${sql}) SELECT * FROM pipeline WHERE ${conditions}
      ORDER BY ${order} LIMIT 31 OFFSET $3`, [q,filter,page * 30]),
    founderQuery(`SELECT r.stage,count(*)::int total FROM research_console.growth_relationships r WHERE kind=$1 GROUP BY r.stage`, [view]),
  ]);
  return { rows: excludeIsolatedCustomerRows(rows.slice(0,30)), hasMore: rows.length > 30, counts };
}

export async function writeGrowth(input: Input, actor: string) {
  if (containsIsolatedCustomerReference(input) || /\bwill jones\b/i.test(clean(input.contact_name))) return fail("That contact is excluded from this workspace.",403);
  const kind = input.kind;
  if (!isKind(kind)) return fail("Choose a prospect type.");
  const action = clean(input.action, 30);
  const client = await founderDatabase().connect();
  try {
    await client.query("BEGIN");
    const log = async (id: string, type: string, details: Input) => {
      const result = await client.query("INSERT INTO research_console.growth_activity(relationship_id,action,details,actor) VALUES($1,$2,$3,$4) RETURNING id", [id,type,JSON.stringify(details),actor]);
      return result.rows[0].id as string;
    };
    if (action === "create") {
      const firm = kind === "accountants" ? idOrNull(input.firm_id) : null;
      const name = kind === "charities" ? clean(input.name) : null;
      if (kind === "accountants" && (!firm || !(await client.query("SELECT id FROM research_console.firms WHERE id=$1 AND merged_into IS NULL", [firm])).rowCount)) return fail("Choose a current accountant research profile.",404);
      if (kind === "charities" && (!name || !/[\p{L}\p{N}]{2}/u.test(name.replace(/[^\p{L}\p{N}]/gu,"")))) return fail("Enter the charity’s name.");
      const number = clean(input.charity_number, 25).toUpperCase().replace(/\s+/g,"") || null;
      if (number && !/^(?:SC|NIC)?\d{4,10}$/.test(number)) return fail("Enter a valid UK charity number, or leave it blank.");
      const rawWebsite = clean(input.website, 400);
      const website = publicWebUrl(rawWebsite) || null;
      if (rawWebsite && !website) return fail("Enter a website starting with https:// or http://.");
      const row = (await client.query(`INSERT INTO research_console.growth_relationships(kind,firm_id,name,website,charity_number,stage,owner_name)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [kind,firm,name,website,number,kind==="accountants"?"Researched":"Identified",actor])).rows[0];
      await log(row.id,"created",{ stage:kind==="accountants"?"Researched":"Identified" });
      await client.query("COMMIT");
      return { id: row.id };
    }
    const id = idOrNull(input.id);
    if (!id) return fail("Choose a prospect.");
    const before = (await client.query("SELECT * FROM research_console.growth_relationships WHERE id=$1 AND kind=$2 FOR UPDATE", [id,kind])).rows[0];
    if (!before || containsIsolatedCustomerReference(before)) return fail("Prospect not found.",404);
    if (action === "update") {
      const stage = clean(input.stage);
      if (!(stages[kind] as readonly string[]).includes(stage)) return fail("Choose a pipeline stage.");
      const priority = clean(input.priority);
      if (!["High","Normal","Low"].includes(priority)) return fail("Choose a priority.");
      const owner = clean(input.owner_name, 120);
      if (!owner) return fail("Enter an assigned owner.");
      const email = clean(input.contact_email,254).toLowerCase() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid contact email.");
      const review = clean(input.contact_review);
      const basis = clean(input.contact_basis,2000) || null;
      if (!["Review needed","Reviewed for outreach","Do not contact"].includes(review)) return fail("Choose a contact review status.");
      if (review === "Reviewed for outreach" && (!email || !basis)) return fail("Record the selected email and your basis for contacting it.");
      if (before.contact_review === "Do not contact" && (review !== before.contact_review || email !== before.contact_email))
        return fail("This record is suppressed. Keep the opt-out on file.",409);
      if (email && review === "Reviewed for outreach" && (await client.query(`SELECT 1 FROM research_console.growth_relationships
        WHERE lower(contact_email)=$1 AND contact_review='Do not contact' LIMIT 1`,[email])).rowCount) return fail("This address has opted out.",409);
      const organisation = idOrNull(input.organisation_id);
      if (organisation && !(await client.query(`SELECT id FROM research_console.founder_organisations o
        WHERE o.id=$1 AND o.platform_organisation_id IS NOT NULL AND o.type=$2 AND ${orgFilter}`,[organisation,kind==="accountants"?"Adviser":"Charity"])).rowCount) return fail("Choose an existing organisation of the correct type.");
      const referrer = kind === "charities" ? idOrNull(input.referred_by) : null;
      const referral = referrer ? clean(input.referral_evidence,2000) : null;
      if (referrer && (!organisation || !referral || !(await client.query("SELECT id FROM research_console.growth_relationships WHERE id=$1 AND kind='accountants'",[referrer])).rowCount)) return fail("Link the registered charity and record evidence confirming the referral.");
      if (stage === "Registered" && !organisation) return fail("Link the registered charity before selecting Registered.");
      if (["Report prepared","Report approved"].includes(stage) && !(await client.query("SELECT id FROM research_console.growth_activity WHERE relationship_id=$1 AND action=$2 LIMIT 1",[id,stage==="Report prepared"?"report-draft":"report-approved"])).rowCount) return fail("Save or approve a report before selecting this stage.");
      await client.query(`UPDATE research_console.growth_relationships SET stage=$2,priority=$3,owner_name=$4,contact_name=$5,
        contact_email=$6,contact_review=$7,contact_basis=$8,next_action=$9,follow_up=$10,organisation_id=$11,referred_by=$12,referral_evidence=$13,updated_at=now() WHERE id=$1`,
        [id,stage,priority,owner,clean(input.contact_name) || null,email,review,basis,clean(input.next_action,1000) || null,date(input.follow_up),organisation,referrer,referral]);
      await log(id,"updated",{ stage, previous_stage:before.stage, previous_organisation:before.organisation_id, organisation, previous_referrer:before.referred_by, referrer, contact_review:review });
    } else if (action === "email-draft" || action === "report-draft") {
      const title = clean(input.title,250), body = clean(input.body,20_000);
      if (!title || !body) return fail("Enter a title and text before saving.");
      const sources = clean(input.sources,5000), limits = clean(input.limitations,5000);
      if (action === "report-draft" && (kind !== "charities" || !sources || !limits)) return fail("Record the public evidence and limitations for this report.");
      const version = await log(id,action,{ title,body,sources,limitations:limits,service:clean(input.service), recipient: action==="email-draft" ? before.contact_email : undefined });
      await client.query("UPDATE research_console.growth_relationships SET updated_at=now() WHERE id=$1",[id]);
      await client.query("COMMIT");
      return { id,version };
    } else if (["report-approved","report-shared","email-sent"].includes(action)) {
      if (action !== "email-sent" && kind !== "charities") return fail("This action is for charity reports.");
      const version = idOrNull(input.version);
      const expected = action === "email-sent" ? "email-draft" : action === "report-approved" ? "report-draft" : "report-approved";
      const previous = (await client.query("SELECT details FROM research_console.growth_activity WHERE id=$1 AND relationship_id=$2 AND action=$3",[version,id,expected])).rows[0];
      if (!previous || input.confirm !== true) return fail("Review and explicitly confirm this version first.");
      const evidence = clean(input.evidence,2000);
      if (action === "email-sent" || action === "report-shared") {
        if (!evidence) return fail("Enter evidence of the message or report shared outside this workspace.");
        if (before.contact_review !== "Reviewed for outreach" || !before.contact_email ||
          (await client.query("SELECT 1 FROM research_console.growth_relationships WHERE lower(contact_email)=lower($1) AND contact_review='Do not contact' LIMIT 1",[before.contact_email])).rowCount)
          return fail("Review the recipient’s contact permission and any opt-out before recording outreach.",409);
        if (action === "email-sent" && previous.details.recipient !== before.contact_email) return fail("Save a new draft for the selected recipient first.");
      }
      if (action === "report-approved" && (await client.query("SELECT 1 FROM research_console.growth_activity WHERE relationship_id=$1 AND action='report-approved' AND details->>'version'=$2",[id,version])).rowCount) return fail("This report version is already approved.",409);
      await log(id,action,{ title:previous.details.title,version,evidence,recipient:before.contact_email });
    } else if (action === "meeting" || action === "note") {
      const title = clean(input.title,250), body = clean(input.body,10_000);
      if (!title || !body) return fail("Enter a title and notes.");
      const meetingDate = action === "meeting" ? date(input.meeting_date) : null;
      const status = clean(input.meeting_status,30);
      if (action === "meeting" && (!meetingDate || !["Planned","Booked externally","Completed","Cancelled"].includes(status))) return fail("Record a date and the actual meeting status.");
      await log(id,action,{title,body,meeting_date:meetingDate,meeting_status:action==="meeting"?status:undefined});
    } else return fail("Choose a supported growth action.");
    await client.query("COMMIT");
    return { id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
