import { proxyExistingSorpBackend } from "../../backend-proxy.ts";
import { isReadinessComplete } from "../../../lib/readiness-status.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => proxyExistingSorpBackend(request, "/api/readiness-account");
export async function POST(request: Request) {
  const payload = await request.clone().json().catch(() => ({}));
  if (payload.action === "create-report-upload") {
    const accountRequest = new Request(request.url, { method: "GET", headers: request.headers });
    const accountResponse = await proxyExistingSorpBackend(accountRequest, "/api/readiness-account");
    const account = await accountResponse.clone().json().catch(() => ({}));
    if (!accountResponse.ok) return accountResponse;
    if (account.signedIn !== true || !isReadinessComplete(account.progress)) {
      return Response.json(
        { error: "Complete your free SORP readiness review before starting a Charity Impact Report review." },
        { status: account.signedIn === true ? 403 : 401 },
      );
    }
  }
  return proxyExistingSorpBackend(request, "/api/readiness-account");
}
