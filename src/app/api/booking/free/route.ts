import { createBookingEvent, slotIsFree, validatedSlot, validEmail } from "../../../booking-google";
import { recordAskSorpBooking } from "../../../booking-growth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read those booking details." }, { status: 400 }); }
  const slot = validatedSlot(input.serviceId, input.start);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const organisation = typeof input.organisation === "string" ? input.organisation.trim() : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim().slice(0, 120) : "";
  if (!slot || slot.service.priceMinor !== 0 || !name || !validEmail(email) || !organisation || idempotencyKey.length < 16) return Response.json({ error: "Please check the slot and booking details." }, { status: 400 });
  try {
    if (!(await slotIsFree(slot.start, slot.end))) return Response.json({ error: "That time has just been taken. Please choose another available slot." }, { status: 409 });
    await createBookingEvent(slot.service, slot.start, slot.end, { name, email, organisation }, idempotencyKey, true);
    await recordAskSorpBooking(input, slot.service.id, slot.start, idempotencyKey);
    return Response.json({ ok: true, session: slot.service.name, start: slot.start, end: slot.end, priceMinor: 0, invitationSent: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The booking could not be completed." }, { status: 502 });
  }
}
