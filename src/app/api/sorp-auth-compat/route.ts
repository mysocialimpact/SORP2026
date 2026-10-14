import { independentAccountGET, independentAccountPOST } from "@/lib/sorp-auth/compat";
import { independentAuthRoutesEnabled } from "@/lib/sorp-auth/switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const disabled = () => Response.json({ error: "Independent account preview is not enabled." },
  { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!independentAuthRoutesEnabled()) return disabled();
  try { return await independentAccountGET(request); }
  catch { return Response.json({ error: "The independent account service is unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!independentAuthRoutesEnabled()) return disabled();
  try { return await independentAccountPOST(request); }
  catch { return Response.json({ error: "The independent account service is unavailable." }, { status: 503 }); }
}
