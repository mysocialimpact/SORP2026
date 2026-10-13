export const runtime = "nodejs";

type HelloInput = {
  email?: unknown;
  message?: unknown;
  audience?: unknown;
  newsletter?: unknown;
  source?: unknown;
  submissionId?: unknown;
  website?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Cross-site submissions are not accepted." }, { status: 403 });

  try {
    const raw = await request.text();
    if (raw.length > 8_000) return Response.json({ error: "That message is too long." }, { status: 413 });
    const input = JSON.parse(raw) as HelloInput;
    if (typeof input.website === "string" && input.website.trim())
      return Response.json({ accepted: true, emailSent: false, queued: false }, { headers: { "cache-control": "no-store" } });

    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    const audience = input.audience === "charity" || input.audience === "adviser" ? input.audience : "not selected";
    const newsletter = input.newsletter === true;
    const source = typeof input.source === "string" && /^\/[a-zA-Z0-9/_-]*$/.test(input.source) ? input.source : "/";
    const submissionId = typeof input.submissionId === "string" && /^[a-zA-Z0-9:-]{8,160}$/.test(input.submissionId)
      ? input.submissionId
      : crypto.randomUUID();
    if (!emailPattern.test(email) || email.length > 254)
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (message.length > 3_000)
      return Response.json({ error: "Please keep your message under 3,000 characters." }, { status: 400 });

    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const response = await fetch(new URL("/api/public-homework-message", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: submissionId,
        incidentId: "website-say-hello",
        organisationName: "SORP2026 website visitor",
        organisationId: "",
        email,
        message: message || "Hello — no additional message supplied.",
        diagnostic: [
          `Source: SORP2026 ${source}`,
          `Audience: ${audience}`,
          `Newsletter consent: ${newsletter ? "YES — explicitly selected" : "NO"}`,
          newsletter ? `Consent timestamp: ${new Date().toISOString()}` : "",
          `Submission: ${submissionId}`,
        ].filter(Boolean).join(" · "),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Unexpected message response");
    const result = await response.json() as { accepted?: boolean; queued?: boolean; emailSent?: boolean; cowLogged?: boolean; error?: string };
    if (!response.ok || !result.accepted)
      return Response.json({ error: result.error || "The message was not accepted." }, { status: response.status || 502, headers: { "cache-control": "no-store" } });
    return Response.json({ accepted: true, queued: result.queued === true, emailSent: result.emailSent === true, logged: result.cowLogged === true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not send your message just now. Please email marcus@mysocialimpact.org." }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
