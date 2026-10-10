export const runtime = "nodejs";

const endpoint = process.env.SORP_REPORT_EMAIL_API_URL || "https://sorp2026.mysocialimpact.org/api/report-email";

export async function POST(request: Request) {
  // Older review tabs sent here during report generation. The review now has
  // a dedicated final-page endpoint; reject that legacy route before proxying.
  const referer = request.headers.get("referer");
  if (new URL(request.url).pathname === "/api/readiness/report-email" && referer) {
    try {
      const source = new URL(referer);
      if (source.origin === new URL(request.url).origin && source.pathname.replace(/\/$/, "") === "/are-you-sorp-ready/review") {
        return Response.json({ error: "Your report will be emailed when your review is complete. Please refresh this page to continue." }, { status: 409 });
      }
    } catch { /* An invalid referrer does not change other report flows. */ }
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "We could not read those email details." }, { status: 400 }); }

  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "We could not send your report just now. Your report remains available on this page." }, { status: 502 });
  }
}
