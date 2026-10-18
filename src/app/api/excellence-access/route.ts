import { excellenceContext } from "@/lib/excellence/access-server";
import { AccessError } from "@/lib/access-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!request.headers.get("cookie")) return Response.json({ error: "Please sign in to see your organisation's access." },
    { status: 401, headers: { "cache-control": "private, no-store" } });
  try {
    const { organisation, access, legacy, ambiguous, maturity, pillars } = await excellenceContext(request.headers.get("cookie") || "");
    return Response.json({ organisation, access, legacy, ambiguous, maturity, pillars },
      { headers: { "cache-control": "private, no-store", vary: "Cookie" } });
  } catch (cause) {
    const status = cause instanceof AccessError ? cause.status : 503;
    return Response.json({ error: status === 401 ? "Please sign in to see your organisation's access." : "Your access could not be checked. Please try again." },
      { status, headers: { "cache-control": "private, no-store" } });
  }
}
