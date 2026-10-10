import type { BookingServiceId } from "./booking-config";

export async function recordAskSorpBooking(input: Record<string, unknown>, serviceId: BookingServiceId, bookingStart: string, bookingId: string) {
  if (input.source !== "ask-sorp") return;
  const sessionId = typeof input.reviewSessionId === "string" ? input.reviewSessionId.trim() : "";
  if (!/^[a-f0-9-]{36}$/i.test(sessionId) || !process.env.COW_GROWTH_EVENT_URL || !process.env.COW_GROWTH_EVENT_KEY) return;
  try {
    const response = await fetch(process.env.COW_GROWTH_EVENT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.COW_GROWTH_EVENT_KEY}` },
      body: JSON.stringify({ eventId: `${sessionId}:ask_sorp_booking_completed:${bookingId}`, sessionId, eventType: "ask_sorp_booking_completed", source: "msi_sorp_booking", details: { serviceId, bookingStart }, occurredAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) console.error("Ask SORP booking Grow delivery failed", response.status);
  } catch (error) {
    console.error("Ask SORP booking Grow delivery failed", error instanceof Error ? error.message : "unknown");
  }
}
