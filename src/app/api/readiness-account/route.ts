import { proxyExistingSorpBackend } from "../../backend-proxy.ts";
import { independentAuthCutover } from "../../../lib/sorp-auth/switch.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (independentAuthCutover()) {
    const { independentAccountGET } = await import(
      "../../../lib/sorp-auth/compat.ts"
    );
    return independentAccountGET(request);
  }
  return proxyExistingSorpBackend(request, "/api/readiness-account");
}
export async function POST(request: Request) {
  const payload = await request
    .clone()
    .json()
    .catch(() => ({}));
  if (payload.action === "signup" && payload.progress?.onboarding) {
    const { getSession, sameOrigin } = await import(
      "../../../lib/onboarding/server"
    );
    const { accountReady } = await import("../../../lib/onboarding/state");
    try {
      sameOrigin(request);
      const session = await getSession(request);
      if (!session || !accountReady(session.state))
        return Response.json(
          {
            error:
              "Complete all five registration requirements and confirm an official charity record first.",
          },
          { status: 400 },
        );
      const state = session.state;
      const trusted = {
        ...payload,
        name: state.facts.name,
        email: state.facts.email.toLowerCase(),
        position: state.facts.role,
        organisation: state.facts.organisation,
        progress: {
          ...payload.progress,
          onboarding: {
            facts: state.facts,
            selected: state.charity.confirmed,
            messages: session.messages,
            attribution: session.attribution,
            professionalContext: {
              relationships: state.professional,
              corrections: state.corrections,
              knowledge: state.knowledge,
              independent: state.natural?.independent || false,
            },
          },
        },
      };
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      request = new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify(trusted),
      });
    } catch {
      return Response.json(
        {
          error:
            "Your introduction could not be verified. Please review and retry.",
        },
        { status: 503 },
      );
    }
  }
  if (independentAuthCutover()) {
    const { independentAccountPOST } = await import(
      "../../../lib/sorp-auth/compat.ts"
    );
    return independentAccountPOST(request);
  }
  if (payload.action === "create-report-upload") {
    const accountRequest = new Request(request.url, {
      method: "GET",
      headers: request.headers,
    });
    const accountResponse = await proxyExistingSorpBackend(
      accountRequest,
      "/api/readiness-account",
    );
    const account = await accountResponse
      .clone()
      .json()
      .catch(() => ({}));
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
