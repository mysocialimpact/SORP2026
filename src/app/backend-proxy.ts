const backendOrigin = () => process.env.SORP_BACKEND_ORIGIN || "";

export async function proxyExistingSorpBackend(request: Request, pathname: string) {
  const origin = backendOrigin();
  if (!origin) return Response.json({ error: "The existing SORP service connection is temporarily unavailable." }, { status: 503 });

  const incoming = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== incoming.origin) return Response.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
    if (request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Cross-site requests are not accepted." }, { status: 403 });
  }
  const target = new URL(pathname, origin);
  target.search = incoming.search;
  const headers = new Headers({ "x-sorp-destination": "sorp2026.org" });
  for (const name of ["content-type", "cookie", "user-agent", "x-forwarded-for"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
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
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: "The existing SORP service could not be reached. Please try again." }, { status: 502 });
  }
}
