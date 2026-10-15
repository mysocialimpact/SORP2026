import { AccessError } from "@/lib/console/auth";
import { createHash } from "node:crypto";
import { founderQuery } from "@/lib/founder/db";
import { platformIdentity, protectPlatformRequest, type PlatformIdentity } from "@/lib/platform/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
});

type Input = {
  kind?: unknown;
  submissionId?: unknown;
  pagePath?: unknown;
  rating?: unknown;
  category?: unknown;
  comment?: unknown;
  contactEmail?: unknown;
  enquiryType?: unknown;
  message?: unknown;
  website?: unknown;
};

function profile(identity: PlatformIdentity | null, request: Request) {
  if (!identity) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const anonymousId = createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex").slice(0, 32);
    return {
      accountId: `anonymous:${anonymousId}`,
      name: "Website visitor",
      email: "",
      organisationId: null,
      organisationName: "Not provided",
      accountType: "Anonymous",
    };
  }
  const membership = identity.memberships.find(item => item.name === identity.account.organisation) || identity.memberships[0];
  return {
    accountId: identity.account.id,
    name: identity.account.name.slice(0, 200),
    email: identity.account.email.toLowerCase().slice(0, 254),
    organisationId: membership?.organisationId || null,
    organisationName: (membership?.name || identity.account.organisation || "Individual account").slice(0, 200),
    accountType: (membership?.type || identity.account.position || "Individual").slice(0, 100),
  };
}

function submissionId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[a-zA-Z0-9:-]{8,160}$/.test(id) ? id : "";
}

function pagePath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "/";
  return path.startsWith("/") && path.length <= 300 && !/[\r\n]/.test(path) ? path : "/";
}

async function rateLimited(table: "founder_feedback" | "founder_contact_enquiries", accountId: string) {
  const rows = await founderQuery<{ count: string }>(
    `SELECT count(*) FROM research_console.${table} WHERE account_id=$1 AND created_at > now() - interval '1 hour'`,
    [accountId],
  );
  return Number(rows[0]?.count || 0) >= (accountId.startsWith("anonymous:") ? 20 : 8);
}

export async function GET(request: Request) {
  try {
    await protectPlatformRequest(request);
    const improvements = await founderQuery(
      "SELECT id,said,did,link_url,published_at FROM research_console.founder_improvements WHERE published=true ORDER BY published_at DESC NULLS LAST,created_at DESC LIMIT 20",
    );
    return json({ improvements });
  } catch (error) {
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    return json({ error: "Recent improvements could not be loaded just now." }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")}://${request.headers.get("host") || url.host}`;
    if (origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Please submit from this website." }, 403);
    const raw = await request.text();
    if (raw.length > 12_000) return json({ error: "That submission is too long." }, 413);
    const input = JSON.parse(raw) as Input;
    if (typeof input.website === "string" && input.website.trim()) return json({ accepted: true });
    const id = submissionId(input.submissionId);
    if (!id) return json({ error: "Please refresh the page and try again." }, 400);
    const source = pagePath(input.pagePath);
    let identity: PlatformIdentity | null = null;
    try { identity = await platformIdentity(request.headers.get("cookie") || ""); }
    catch (error) { if (!(error instanceof AccessError)) throw error; }
    const person = profile(identity, request);

    if (input.kind === "feedback") {
      const duplicate = await founderQuery<{ id: string }>("SELECT id FROM research_console.founder_feedback WHERE submission_id=$1", [id]);
      if (duplicate[0]) return json({ accepted: true, id: duplicate[0].id, duplicate: true });
      if (await rateLimited("founder_feedback", person.accountId)) return json({ error: "We’ve received several contributions from this account. Please try again a little later." }, 429);
      const rating = Number.isInteger(input.rating) && Number(input.rating) >= 1 && Number(input.rating) <= 5 ? Number(input.rating) : null;
      const category = ["general", "suggestion", "problem"].includes(String(input.category)) ? String(input.category) : "general";
      const comment = typeof input.comment === "string" ? input.comment.trim() : "";
      const contactEmail = typeof input.contactEmail === "string" ? input.contactEmail.trim().toLowerCase() : "";
      if (!rating && !comment) return json({ error: "Choose a star rating, write a comment, or both." }, 400);
      if (comment.length > 3_000) return json({ error: "Please keep feedback under 3,000 characters." }, 400);
      if (contactEmail.length > 254 || (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) return json({ error: "Enter a valid contact email address, or leave it blank." }, 400);
      const row = (await founderQuery<{ id: string }>(
        `INSERT INTO research_console.founder_feedback
          (submission_id,account_id,user_name,email,organisation_id,organisation_name,account_type,page_path,category,rating,comment,technical_context)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) RETURNING id`,
        [id, person.accountId, person.name, person.email, person.organisationId, person.organisationName, person.accountType, source, category, rating, comment || null, JSON.stringify(contactEmail ? { contactEmail } : {})],
      ))[0];
      return json({ accepted: true, id: row.id }, 201);
    }

    if (input.kind === "contact") {
      if (!identity) return json({ error: "Please log in before sending an account enquiry." }, 401);
      const duplicate = await founderQuery<{ id: string }>("SELECT id FROM research_console.founder_contact_enquiries WHERE submission_id=$1", [id]);
      if (duplicate[0]) return json({ accepted: true, id: duplicate[0].id, duplicate: true });
      if (await rateLimited("founder_contact_enquiries", person.accountId)) return json({ error: "We’ve received several messages from this account. Please try again a little later." }, 429);
      const enquiryType = ["question", "advice", "meeting"].includes(String(input.enquiryType)) ? String(input.enquiryType) : "question";
      const message = typeof input.message === "string" ? input.message.trim() : "";
      if (!message) return json({ error: "Please add a short message for Marcus." }, 400);
      if (message.length > 3_000) return json({ error: "Please keep your message under 3,000 characters." }, 400);
      const row = (await founderQuery<{ id: string }>(
        `INSERT INTO research_console.founder_contact_enquiries
          (submission_id,account_id,user_name,email,organisation_id,organisation_name,account_type,page_path,enquiry_type,message)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [id, person.accountId, person.name, person.email, person.organisationId, person.organisationName, person.accountType, source, enquiryType, message],
      ))[0];
      return json({ accepted: true, id: row.id }, 201);
    }

    return json({ error: "Choose contact or feedback." }, 400);
  } catch (error) {
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "That submission could not be read." }, 400);
    const failure = error as Error & { code?: string };
    if (failure.code === "23505") return json({ accepted: true, duplicate: true });
    console.error("continuous-improvement write failed", {
      name: failure.name,
      code: failure.code,
      message: failure.message,
    });
    return json({ error: "We couldn’t safely store that just now. Your words are still here, so please try again." }, 503);
  }
}
