import { proxyExistingSorpBackend } from "../../backend-proxy.ts";
import { independentAuthCutover } from "../../../lib/sorp-auth/switch.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (independentAuthCutover()) {
    const { independentAccountGET } = await import("../../../lib/sorp-auth/compat.ts");
    return independentAccountGET(request);
  }
  return proxyExistingSorpBackend(request, "/api/readiness-account");
}
export async function POST(request: Request) {
  if (independentAuthCutover()) {
    const { independentAccountPOST } = await import("../../../lib/sorp-auth/compat.ts");
    return independentAccountPOST(request);
  }
  const payload = await request.clone().json().catch(() => ({}));
  if (payload.action === "create-report-upload") {
    const accountRequest = new Request(request.url, { method: "GET", headers: request.headers });
    const accountResponse = await proxyExistingSorpBackend(accountRequest, "/api/readiness-account");
    const account = await accountResponse.clone().json().catch(() => ({}));
    if (!accountResponse.ok) return accountResponse;
    if (account.signedIn !== true) {
      return Response.json(
        { error: "Sign in before starting a Charity Impact Report review." },
        { status: 401 },
      );
    }
  }
  return proxyExistingSorpBackend(request, "/api/readiness-account");
}
