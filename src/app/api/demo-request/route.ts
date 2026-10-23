import { createHash } from "node:crypto";
import { founderQuery } from "@/lib/founder/db";
import { platformIdentity } from "@/lib/platform/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)}://${request.headers.get("host") || url.host}`;
  if (origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Please submit from this website." }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 2_000) return reply({ error: "That request is too long." }, 413);
    const input = JSON.parse(raw) as Record<string, unknown>;
    // A filled hidden field is treated as abuse, never as a successful request.
    if (input.website) return reply({ error: "Please try again." }, 400);
    const id = typeof input.submissionId === "string" && /^[a-f0-9-]{36}$/.test(input.submissionId) ? input.submissionId : "";
    if (!id) return reply({ error: "Please refresh and try again." }, 400);
    const source = typeof input.source === "string" && /^\/[a-zA-Z0-9/_-]{0,250}$/.test(input.source) ? input.source : "/";
    let identity: Awaited<ReturnType<typeof platformIdentity>> | null = null;
    try { identity = await platformIdentity(request.headers.get("cookie") || ""); } catch { /* Public visitors need no account. */ }
    const email = identity?.account.email?.trim().toLowerCase() || (typeof input.email === "string" ? input.email.trim().toLowerCase() : "");
    const name = identity?.account.name?.trim() || (typeof input.name === "string" ? input.name.trim() : "");
    if (!emailPattern.test(email) || email.length > 254) return reply({ error: "Enter a valid email address." }, 400);
    if (name.length > 160) return reply({ error: "Please shorten the name." }, 400);
    const membership = identity?.memberships.find(item => item.name === identity?.account.organisation) || identity?.memberships[0];
    const organisation = membership?.name || identity?.account.organisation || "";
    const accountId = identity?.account.id || `anonymous:${createHash("sha256").update(`${request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}|${request.headers.get("user-agent") || "unknown"}`).digest("hex").slice(0, 32)}`;
    const duplicate = await founderQuery<{ id: string }>("SELECT id FROM research_console.founder_contact_enquiries WHERE submission_id=$1", [id]);
    if (duplicate.length) return reply({ accepted: true, duplicate: true });
    const recent = await founderQuery<{ count: string }>("SELECT count(*)::text count FROM research_console.founder_contact_enquiries WHERE account_id=$1 AND created_at > now() - interval '1 hour'", [accountId]);
    if (Number(recent[0]?.count || 0) >= (identity ? 8 : 3)) return reply({ error: "Please try again later." }, 429);
    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const provider = await fetch(new URL("/api/public-homework-message", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: id,
        incidentId: "website-free-demo-request",
        organisationName: organisation || "SORP2026 website visitor",
        organisationId: membership?.organisationId || "",
        email,
        message: `FREE DEMO REQUEST. Name: ${name || "Not supplied"}. Organisation: ${organisation || "Not supplied"}. Source: ${source}. Marcus: please reply personally with your booking link. No appointment has been booked.`,
        diagnostic: `Source: SORP2026 ${source} · Request: free demo · Submission: ${id} · Marketing consent: not requested`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!provider.ok || !provider.headers.get("content-type")?.includes("json")) return reply({ error: "We could not accept your request just now. Your email is still in the form; please try again." }, 502);
    const delivery = await provider.json() as { accepted?: boolean; queued?: boolean; emailSent?: boolean };
    if (!delivery.accepted || (!delivery.queued && !delivery.emailSent)) return reply({ error: "The message service did not confirm your request. Your email is still in the form; please try again." }, 502);
    // A confirmed queue/send is the success boundary. The founder record is a secondary copy.
    let recorded = false;
    try {
      await founderQuery(`INSERT INTO research_console.founder_contact_enquiries
        (submission_id,account_id,user_name,email,organisation_id,organisation_name,account_type,page_path,enquiry_type,message)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'meeting',$9) ON CONFLICT (submission_id) DO NOTHING`,
        [id, accountId, name || "Website visitor", email, membership?.organisationId || null, organisation || "Not provided", membership?.type || "Anonymous", source, "Free demo requested; Marcus to reply personally with booking link."]);
      recorded = true;
    } catch { /* Provider has accepted the request; do not imply it failed or resend. */ }
    return reply({ accepted: true, queued: delivery.queued === true, emailSent: delivery.emailSent === true, recorded });
  } catch {
    return reply({ error: "We could not accept your request just now. Your email is still in the form; please try again." }, 503);
  }
}
