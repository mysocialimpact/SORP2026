import { proxyExistingSorpBackend } from "../../backend-proxy.ts";
import { independentAuthCutover } from "../../../lib/sorp-auth/switch.ts";
import { containsIsolatedCustomerReference, isIsolatedCustomerIdentity,
  isolatedCustomerResponse } from "../../../lib/customer-isolation.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (independentAuthCutover()) {
    const { independentAccountGET } = await import("../../../lib/sorp-auth/compat.ts");
    const response = await independentAccountGET(request);
    const payload = await response.clone().json().catch(() => null);
    return isIsolatedCustomerIdentity(payload) ? isolatedCustomerResponse() : response;
  }
  return proxyExistingSorpBackend(request, "/api/readiness-account");
}
export async function POST(request: Request) {
  const payload = await request.clone().json().catch(() => ({}));
  if (containsIsolatedCustomerReference(payload)) return isolatedCustomerResponse();
  if (String(payload.action || "").trim() === "save" || String(payload.productId || "").trim() === "social-impact-excellence") {
    const { guardExcellenceMutation } = await import("../../../lib/excellence/mutation-guard.ts");
    const blocked = await guardExcellenceMutation(request, payload);
    if (blocked) return blocked;
  }
  // This onboarding journey requires a server-confirmed registry selection.
  // Do not change existing login, invitation or legacy account endpoints.
  if (payload.action === "signup" && payload.progress?.onboarding) {
    const { enabled, getSession, sameOrigin } = await import("../../../lib/onboarding/server.ts");
    const { accountReady } = await import("../../../lib/onboarding/state.ts");
    try { sameOrigin(request); } catch { return Response.json({ error: "Please use this website to create your account." }, { status: 403 }); }
    if (!enabled()) return Response.json({ error: "Account preparation is unavailable here. Please try again shortly." }, { status: 503 });
    try {
      const session = await getSession(request);
      if (!session || !accountReady(session.state)) return Response.json({ error: "Complete your details and confirm the official charity record first." }, { status: 422 });
      const f = session.state.facts;
      if (payload.name?.trim() !== f.name.trim() || payload.email?.trim().toLowerCase() !== f.email.trim().toLowerCase() || payload.position?.trim() !== f.role.trim() || payload.organisation?.trim() !== f.organisation.trim()) {
        return Response.json({ error: "Your details have changed. Please save them and try again." }, { status: 409 });
      }
      // Use the canonical selection, not a charity object supplied by the browser.
      payload.progress.onboarding.selected = session.state.charity.confirmed;
      request = new Request(request, { body: JSON.stringify(payload) });
    } catch {
      return Response.json({ error: "We couldn’t verify your saved introduction. Please try again." }, { status: 503 });
    }
  }
  if (independentAuthCutover()) {
    const { independentAccountPOST } = await import("../../../lib/sorp-auth/compat.ts");
    const response = await independentAccountPOST(request);
    const result = await response.clone().json().catch(() => null);
    return isIsolatedCustomerIdentity(result) ? isolatedCustomerResponse() : response;
  }
  if (request.headers.get("cookie") && !["login", "signup", "logout", "create-report-upload"].includes(String(payload.action || ""))) {
    const accountRequest = new Request(request.url, { method: "GET", headers: request.headers });
    const accountResponse = await proxyExistingSorpBackend(accountRequest, "/api/readiness-account");
    if (accountResponse.status === 403) return accountResponse;
  }
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
