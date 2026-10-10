import { bookingService, BOOKING_TIME_ZONE } from "../../../booking-config";
import { availableSlots } from "../../../booking-google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const service = bookingService(new URL(request.url).searchParams.get("service"));
  if (!service) return Response.json({ error: "That booking option is not available." }, { status: 400 });
  try {
    return Response.json({ serviceId: service.id, timeZone: BOOKING_TIME_ZONE, slots: await availableSlots(service) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Availability could not be checked." }, { status: 503 });
  }
}
