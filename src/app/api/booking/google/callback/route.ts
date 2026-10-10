import { exchangeOauthCode, exchangeReadinessAccountOauthCode, readinessAccountPassword, validOauthState, validReadinessAccountOauthState } from "../../../../booking-google";

export const runtime = "nodejs";

const ACCOUNT_UNAVAILABLE = "Google verified your identity, but the secure account service did not complete the sign-in. Your assessment is still safe on this device. Please try Google sign-in again.";

async function callReadinessAccount(endpoint: string, key: string, body: Record<string, unknown>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(12_000) });
      const raw = await response.text();
      let payload: Record<string, unknown>;
      try { payload = raw ? JSON.parse(raw) as Record<string, unknown> : {}; }
      catch {
        console.error("[google-account] account service returned unreadable content", { status: response.status, attempt });
        if (attempt < 3) { await new Promise(resolve => setTimeout(resolve, attempt * 200)); continue; }
        return { response: null, payload: { error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
      }
      if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
        console.warn("[google-account] retrying temporary account service response", { status: response.status, attempt });
        await new Promise(resolve => setTimeout(resolve, attempt * 200));
        continue;
      }
      return { response, payload };
    } catch (error) {
      console.error("[google-account] account service request failed", { attempt, error: error instanceof Error ? error.name : "unknown" });
      if (attempt < 3) { await new Promise(resolve => setTimeout(resolve, attempt * 200)); continue; }
    }
  }
  return { response: null, payload: { error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  if (code && validReadinessAccountOauthState(state)) {
    try {
      const profile = await exchangeReadinessAccountOauthCode(code);
      const endpoint = (process.env.COW_GROWTH_EVENT_URL || "").replace(/\/events\/?(?:\?.*)?$/, "/accounts");
      const key = process.env.COW_GROWTH_EVENT_KEY;
      if (!endpoint || !key) throw new Error("The secure account service is not configured.");
      const password = readinessAccountPassword(profile.subject);
      let account = await callReadinessAccount(endpoint, key, { action: "login", email: profile.email, password });
      if (account.response?.status === 401) {
        account = await callReadinessAccount(endpoint, key, { action: "signup", name: profile.name, position: "TO CONFIRM", email: profile.email, password, progress: null });
        // A previous callback can have created the account before its response was interrupted.
        if (account.response?.status === 409) account = await callReadinessAccount(endpoint, key, { action: "login", email: profile.email, password });
      }
      if (!account.response?.ok || typeof account.payload.sessionToken !== "string") throw new Error(typeof account.payload.error === "string" ? account.payload.error : ACCOUNT_UNAVAILABLE);
      const cookie = `msi_sorp_session=${account.payload.sessionToken}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`;
      return new Response(null, { status: 302, headers: { location: "/are-you-sorp-ready/review/?account=google", "set-cookie": cookie, "cache-control": "no-store" } });
    } catch (error) {
      return new Response(null, { status: 302, headers: { location: `/are-you-sorp-ready/review/?account_error=${encodeURIComponent(error instanceof Error ? error.message : "Google sign-in did not complete.")}`, "cache-control": "no-store" } });
    }
  }
  if (!code || !validOauthState(state)) return new Response("Google authorisation could not be verified.", { status: 400 });
  try {
    const token = await exchangeOauthCode(code);
    return new Response(`<!doctype html><meta name="robots" content="noindex"><title>Google Calendar connected</title><style>body{font:16px system-ui;max-width:720px;margin:12vh auto;padding:24px}textarea{width:100%;min-height:120px}h1{font-family:Georgia,serif;font-size:42px}</style><h1>Google Calendar connected ✓</h1><p>Copy this one-time production refresh token into the secure Vercel environment variable <strong>GOOGLE_REFRESH_TOKEN</strong>. It is not stored in the browser or application.</p><textarea readonly aria-label="Google refresh token">${token}</textarea><p>You can close this page after the production environment has been updated.</p>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Google authorisation did not complete.", { status: 502 });
  }
}
