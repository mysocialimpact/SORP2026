import {
  containsIsolatedCustomerReference,
  excludeIsolatedCustomerRows,
  isIsolatedCustomerIdentity,
  isolatedCustomerResponse,
} from "../lib/customer-isolation.ts";

const backendOrigin = () => process.env.SORP_BACKEND_ORIGIN || "";

export async function proxyExistingSorpBackend(request: Request, pathname: string) {
  const origin = backendOrigin();
  if (!origin) return Response.json({ error: "The existing SORP service connection is temporarily unavailable." }, { status: 503 });

  const incoming = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const requestOrigin = request.headers.get("origin");
    const expectedOrigin = `${request.headers.get("x-forwarded-proto") || incoming.protocol.slice(0, -1)}://${request.headers.get("host") || incoming.host}`;
    if (requestOrigin && requestOrigin !== expectedOrigin) return Response.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
    if (request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
  }
  const target = new URL(pathname, origin);
  target.search = incoming.search;
  const headers = new Headers({ "x-sorp-destination": "sorp2026.org" });
  for (const name of ["content-type", "cookie", "user-agent", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.clone().json().catch(() => null);
      if (containsIsolatedCustomerReference(body)) return isolatedCustomerResponse();
    }
  }
  const cookie = request.headers.get("cookie");
  if (cookie && pathname !== "/api/readiness-account") {
    try {
      const identityResponse = await fetch(new URL("/api/readiness-account", origin), {
        headers: { cookie, "x-sorp-destination": "sorp2026.org" },
        cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000),
      });
      const identity = await identityResponse.json().catch(() => ({}));
      if (isIsolatedCustomerIdentity(identity)) return isolatedCustomerResponse();
    } catch { /* The destination request retains its existing availability handling. */ }
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const responseHeaders = new Headers();
    for (const name of ["cache-control", "content-type", "location", "x-robots-tag"]) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    if (setCookies.length) for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
    else if (response.headers.get("set-cookie")) responseHeaders.set("set-cookie", response.headers.get("set-cookie")!);
    responseHeaders.set("cache-control", responseHeaders.get("cache-control") || "no-store");
    const responseType = response.headers.get("content-type") || "";
    if (responseType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      if (isIsolatedCustomerIdentity(payload)) return isolatedCustomerResponse();
      if (containsIsolatedCustomerReference(payload)) {
        return Response.json(excludeIsolatedCustomerRows(payload), {
          status: response.status,
          headers: responseHeaders,
        });
      }
      return Response.json(payload, { status: response.status, headers: responseHeaders });
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: "The existing SORP service could not be reached. Please try again." }, { status: 502 });
  }
}
