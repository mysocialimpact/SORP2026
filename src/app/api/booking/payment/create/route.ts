import { validatedSlot, slotIsFree, validEmail } from "../../../../booking-google";

export const runtime = "nodejs";
const endpoint = process.env.SORP_PAYMENT_SERVICE_URL || "https://milkmaid.theideasshed.com";

export async function POST(request: Request) {
  if (!process.env.SORP_PAYMENT_SERVICE_KEY) return Response.json({ error: "Secure payment is temporarily unavailable." }, { status: 503 });
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read those booking details." }, { status: 400 }); }
  const slot = validatedSlot(input.serviceId, input.start);
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const organisation = typeof input.organisation === "string" ? input.organisation.trim() : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim().slice(0, 120) : "";
  if (!slot || !slot.service.priceMinor || !name || !validEmail(email) || !organisation || idempotencyKey.length < 16) return Response.json({ error: "Please check the slot and booking details." }, { status: 400 });
  try {
    if (!(await slotIsFree(slot.start, slot.end))) return Response.json({ error: "That time has just been taken. Please choose another available slot." }, { status: 409 });
    const response = await fetch(`${endpoint}/api/sorp-checkout`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SORP_PAYMENT_SERVICE_KEY}` }, body: JSON.stringify({ paymentType: "booking_review", presentation: "embedded", serviceId: slot.service.id, amountMinor: slot.service.priceMinor, sessionId: typeof input.reviewSessionId === "string" && input.reviewSessionId.trim().length >= 8 ? input.reviewSessionId.trim().slice(0, 120) : idempotencyKey, organisation, email, name, bookingStart: slot.start, idempotencyKey }) });
    return new Response(await response.text(), { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Stripe could not be reached. No payment was taken." }, { status: 502 });
  }
}
