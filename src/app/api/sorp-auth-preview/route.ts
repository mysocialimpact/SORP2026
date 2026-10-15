import { independentIdentity } from "@/lib/sorp-auth/identity";
import { independentAuthRoutesEnabled } from "@/lib/sorp-auth/switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!independentAuthRoutesEnabled()) {
    return Response.json({ error: "Independent authentication is not enabled." },
      { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const identity = await independentIdentity(request.headers);
    return Response.json(identity || { signedIn: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Authentication service unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
