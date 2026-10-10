export const runtime = "nodejs";

const destinations = {
  "30": { service: "readiness", eventType: "email_review_30_clicked", amountMinor: 5000 },
  "60": { service: "wider", eventType: "email_review_60_clicked", amountMinor: 10000 },
} as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const review = url.searchParams.get("review") as keyof typeof destinations | null;
  const choice = review ? destinations[review] : null;
  if (!choice) return Response.redirect(new URL("/are-you-sorp-ready/review/booking", url.origin), 302);
  const sessionId = url.searchParams.get("sessionId") || "";
  if (process.env.COW_GROWTH_EVENT_URL && process.env.COW_GROWTH_EVENT_KEY && /^[a-zA-Z0-9-]{8,160}$/.test(sessionId)) {
    try {
      await fetch(process.env.COW_GROWTH_EVENT_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.COW_GROWTH_EVENT_KEY}` },
        body: JSON.stringify({ eventId: `${sessionId}:${choice.eventType}`, sessionId, eventType: choice.eventType, source: "sorp2026_email", paymentType: "human_review", amountMinor: choice.amountMinor, currency: "GBP", occurredAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(2500),
      });
    } catch { /* Tracking must never block the booking journey. */ }
  }
  return Response.redirect(new URL(`/are-you-sorp-ready/review/booking?session=${choice.service}&source=report-email`, url.origin), 302);
}
