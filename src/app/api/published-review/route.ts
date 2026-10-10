export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") || "";
  const since = new URL(request.url).searchParams.get("since") || "";
  if (!/^[a-zA-Z0-9-]{8,160}$/.test(sessionId)) return Response.json({ events: [] }, { status: 400 });
  const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
  try {
    const url = new URL("/api/published-review/status", base);
    url.searchParams.set("sessionId", sessionId);
    if (since) url.searchParams.set("since", since);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Status unavailable");
    return new Response(await response.text(), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json({ events: [] }, { headers: { "cache-control": "no-store" } }); }
}
export async function POST(request: Request) {
  try {
    const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data") || false;
    let body: FormData | string = multipart ? await request.formData() : await request.text();
    if (!multipart && (body as string).length > 200000) return Response.json({ error: "This review request is too large." }, { status: 413 });
    if (multipart && (body as FormData).get("report") instanceof File && ((body as FormData).get("report") as File).size > 40_000_000) return Response.json({ error: "Choose one PDF report under 40 MB." }, { status: 413 });
    // Older review tabs can still post feedback to this shared proxy. Block
    // their notification email without changing the separate basic journey.
    const parsed = !multipart ? JSON.parse(body as string) as Record<string, unknown> : null;
    if (parsed?.operation === "feedback") {
      const referer = request.headers.get("referer");
      const source = referer ? new URL(referer) : null;
      if (source?.origin === new URL(request.url).origin && source.pathname.replace(/\/$/, "") === "/are-you-sorp-ready/review") {
        return Response.json({ error: "Review feedback is kept on this device; no email was sent." }, { status: 409 });
      }
    }
    if (parsed) body = JSON.stringify({ ...parsed, commercialPolicy: "Identify important reporting and evidence areas worth discussing. Do not prescribe, recommend or sell specific My Social Impact services. A human review determines what implementation work, if any, the charity needs." });
    if (multipart) {
      const form = body as FormData;
      const payload = form.get("payload");
      if (typeof payload === "string") {
        const value = JSON.parse(payload) as Record<string, unknown>;
        form.set("payload", JSON.stringify({ ...value, commercialPolicy: "Identify important reporting and evidence areas worth discussing. Do not prescribe, recommend or sell specific My Social Impact services. A human review determines what implementation work, if any, the charity needs." }));
      }
    }
    const base = process.env.SORP_READINESS_API_URL || "https://sorp2026.mysocialimpact.org/api/readiness";
    const response = await fetch(new URL("/api/published-review", base), { method: "POST", headers: multipart ? undefined : { "content-type": "application/json" }, body });
    if (!response.headers.get("content-type")?.includes("json")) throw new Error("Unexpected research response");
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch { return Response.json({ error: "We could not reach the public research service. Your progress is saved, and no score has been produced from an unread report.", recovery: "retry", incidentId: null, diagnostic: { stage: "service-connection", source: "Public research service", validation: "not-run" } }, { status: 502 }); }
}
