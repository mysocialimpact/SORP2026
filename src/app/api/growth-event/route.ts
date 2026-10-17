import { proxyExistingSorpBackend } from "../../backend-proxy";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => null);
  if (body?.eventType === "homepage_audience_selected") {
    if (body.page !== "/" || (body.audience !== "charity" && body.audience !== "adviser")) {
      return Response.json({ error: "Invalid audience selection." }, { status: 400 });
    }
    // The existing Growth service accepts stage_viewed, but not new event names.
    // The campaign tag identifies this as a homepage audience selection, retaining
    // any original UTM campaign after the separator. No simulated click calls this route.
    const tag = `homepage_audience_${body.audience}`;
    const campaign = typeof body.campaign === "string" && body.campaign ? `${tag}|${body.campaign}`.slice(0, 120) : tag;
    const forwarded = new Request(request.url, {
      method: "POST", headers: request.headers,
      body: JSON.stringify({ ...body, eventType: "stage_viewed", campaign }),
    });
    return proxyExistingSorpBackend(forwarded, "/api/growth-event");
  }
  return proxyExistingSorpBackend(request, "/api/growth-event");
}
