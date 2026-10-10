export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "msi_sorp_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const attempts = new Map<string, { count: number; resetAt: number }>();
const ACCOUNT_UNAVAILABLE = "The secure account-saving service did not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again. If it still will not save, email marcus@mysocialimpact.org and we will help.";

function tooManyAttempts(request: Request, email: unknown) {
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const key = `${ip}:${String(email || "").trim().toLowerCase().slice(0, 254)}`;
  const now = Date.now(), current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

function accountEndpoint() {
  const events = process.env.COW_GROWTH_EVENT_URL;
  if (!events) return "";
  return events.replace(/\/events\/?(?:\?.*)?$/, "/accounts");
}

function cookieValue(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || "";
}

function sessionCookie(token: string) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

async function callCow(body: Record<string, unknown>) {
  const endpoint = accountEndpoint(), key = process.env.COW_GROWTH_EVENT_KEY;
  if (!endpoint || !key) {
    console.error("[readiness-account] account service configuration is missing", { endpointConfigured: Boolean(endpoint), keyConfigured: Boolean(key) });
    return { response: null, payload: { code: "ACCOUNT_SERVICE_UNAVAILABLE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      const raw = await response.text();
      let payload: Record<string, unknown>;
      try {
        payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      } catch {
        console.error("[readiness-account] account service returned an unreadable response", { status: response.status, contentType: response.headers.get("content-type"), attempt });
        if (attempt === 1 && [502, 503, 504].includes(response.status)) continue;
        return { response: null, payload: { code: "ACCOUNT_SERVICE_BAD_RESPONSE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
      }
      if (attempt === 1 && [502, 503, 504].includes(response.status)) {
        console.warn("[readiness-account] retrying temporary account service failure", { status: response.status });
        continue;
      }
      return { response, payload };
    } catch (error) {
      console.error("[readiness-account] account service request failed", { attempt, error: error instanceof Error ? error.name : "unknown" });
      if (attempt === 1) continue;
    }
  }
  return { response: null, payload: { code: "ACCOUNT_SERVICE_UNAVAILABLE", error: ACCOUNT_UNAVAILABLE } as Record<string, unknown> };
}

function publicPayload(payload: Record<string, unknown>) {
  const safe = { ...payload };
  delete safe.sessionToken;
  return safe;
}

export async function GET(request: Request) {
  const token = cookieValue(request);
  if (!token) return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const { response, payload } = await callCow({ action: "load", sessionToken: token });
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (response.status === 401) return Response.json({ signedIn: false }, { status: 401, headers: { "Cache-Control": "no-store", "Set-Cookie": clearCookie() } });
  return Response.json({ signedIn: true, ...publicPayload(payload) }, { status: response.status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return Response.json({ error: "We could not read the account details sent by this browser. Please refresh the page and try again; your assessment is still safe on this device." }, { status: 400 }); }
  const action = String(input.action || "");
  if (!["signup", "login", "save", "logout"].includes(action)) return Response.json({ error: "Unsupported account action." }, { status: 400 });
  if ((action === "signup" || action === "login") && tooManyAttempts(request, input.email)) {
    return Response.json({ error: "We have paused sign-in attempts for 15 minutes to protect your account. Your assessment is still safe on this device. Please wait and then try again." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  }
  const token = cookieValue(request);
  const { response, payload } = await callCow({ ...input, sessionToken: token });
  if (!response) return Response.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if ((action === "signup" || action === "login") && typeof payload.sessionToken === "string") headers["Set-Cookie"] = sessionCookie(payload.sessionToken);
  if (action === "logout" || response.status === 401) headers["Set-Cookie"] = clearCookie();
  return Response.json(publicPayload(payload), { status: response.status, headers });
}
