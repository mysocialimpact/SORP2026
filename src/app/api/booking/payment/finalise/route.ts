import { bookingService } from "../../../../booking-config";
import { recordAskSorpBooking } from "../../../../booking-growth";
import { confirmBookingEvent, createBookingEvent, deleteBookingEvent, slotIsFree, validatedSlot, validEmail } from "../../../../booking-google";

export const runtime = "nodejs";
const endpoint = process.env.SORP_PAYMENT_SERVICE_URL || "https://milkmaid.theideasshed.com";

async function payment(action: "status" | "capture" | "cancel", sessionId: string) {
  const response = await fetch(`${endpoint}/api/sorp-booking-payment`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SORP_PAYMENT_SERVICE_KEY}` }, body: JSON.stringify({ action, sessionId }) });
  const result = await response.json() as { error?: string; status?: string; serviceId?: string; bookingStart?: string; amountMinor?: number; idempotencyKey?: string };
  if (!response.ok) throw new Error(result.error || "The secure payment could not be verified.");
  return result;
}

export async function POST(request: Request) {
  if (!process.env.SORP_PAYMENT_SERVICE_KEY) return Response.json({ error: "Secure payment is temporarily unavailable." }, { status: 503 });
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read those booking details." }, { status: 400 }); }
  const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const organisation = typeof input.organisation === "string" ? input.organisation.trim() : "";
  const evidence = typeof input.evidence === "string" ? input.evidence.trim().slice(0, 800) : "";
  if (!sessionId || !name || !validEmail(email) || !organisation) return Response.json({ error: "Please check the booking details." }, { status: 400 });
  let status: Awaited<ReturnType<typeof payment>>;
  try { status = await payment("status", sessionId); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment could not be verified." }, { status: 502 }); }
  const service = bookingService(status.serviceId);
  const slot = validatedSlot(status.serviceId, status.bookingStart);
  if (!service || !slot || status.amountMinor !== service.priceMinor || !status.idempotencyKey || !["authorised", "paid"].includes(status.status || "")) return Response.json({ error: "That payment does not match this booking." }, { status: 409 });
  try {
    if (status.status !== "paid" && !(await slotIsFree(slot.start, slot.end))) {
      await payment("cancel", sessionId);
      return Response.json({ error: "That time has just been taken. Your payment authorisation was cancelled; please choose another slot." }, { status: 409 });
    }
    await createBookingEvent(service, slot.start, slot.end, { name, email, organisation, evidence }, status.idempotencyKey, false);
    if (status.status !== "paid") await payment("capture", sessionId);
    await confirmBookingEvent(service, slot.start, { name, email, organisation, evidence });
    await recordAskSorpBooking(input, service.id, slot.start, sessionId);
    return Response.json({ ok: true, session: service.name, start: slot.start, end: slot.end, priceMinor: service.priceMinor, paid: true, invitationSent: true });
  } catch (error) {
    if (status.status !== "paid") { try { await payment("cancel", sessionId); await deleteBookingEvent(service, slot.start); } catch { /* Preserve the original failure. */ } }
    return Response.json({ error: error instanceof Error ? error.message : "The paid booking could not be completed." }, { status: 502 });
  }
}
