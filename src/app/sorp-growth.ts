"use client";

type Context = {
  organisation?: string; charityTier?: string; readinessScore?: number; evidenceConfidence?: string;
  currentStage?: number; paymentType?: string; band?: string; amountMinor?: number; currency?: string; rating?: number;
};

// The existing Grow endpoint is best-effort: measurement must never hold up the assessment.
export async function trackSorpEvent(sessionId: string, eventType: string, context: Context = {}, once = true) {
  if (!sessionId) return;
  const marker = `msi-growth:${sessionId}:${eventType}`;
  try {
    if (once && window.localStorage.getItem(marker)) return;
    const attributionKey = `msi-sorp-attribution:${sessionId}`;
    let attribution = window.localStorage.getItem(attributionKey);
    if (!attribution) {
      const params = new URLSearchParams(window.location.search);
      attribution = JSON.stringify({ acquisitionSource: params.get("utm_source") || undefined, campaign: params.get("utm_campaign") || undefined });
      window.localStorage.setItem(attributionKey, attribution);
    }
    const response = await fetch("/api/growth-event", {
      method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
      body: JSON.stringify({ eventId: once ? `${sessionId}:${eventType}` : `${sessionId}:${eventType}:${crypto.randomUUID()}`, sessionId, eventType, ...JSON.parse(attribution), ...context }),
    });
    if (once && response.ok) window.localStorage.setItem(marker, "1");
  } catch { /* Grow outages and storage restrictions cannot break the customer journey. */ }
}
