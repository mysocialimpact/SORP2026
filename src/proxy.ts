import { NextResponse, type NextRequest } from "next/server";
import { isToolApi, isToolPage, normaliseToolPath, publicAccountActions } from "./lib/tool-access-policy";
import { registrationHref, signInHref } from "./lib/account-navigation";
import { AccessError } from "./lib/access-error";

export async function proxy(request: NextRequest) {
  const path = normaliseToolPath(request.nextUrl.pathname);
  let protectedAccountAction = false;
  if (["/api/readiness-account", "/api/sorp-auth-compat"].includes(path) && request.method === "POST") {
    const input = await request.clone().json().catch(() => ({}));
    protectedAccountAction = !publicAccountActions.has(input?.action);
  }
  const protectedPage = isToolPage(path);
  if (protectedPage || isToolApi(path) || protectedAccountAction) {
    try {
      const { verifyToolSession } = await import("./lib/tool-access");
      await verifyToolSession(request);
      if (!protectedPage && !["GET", "HEAD"].includes(request.method)) {
        const expected = `${request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.slice(0, -1)}://${request.headers.get("host") || request.nextUrl.host}`;
        if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site")
          throw new AccessError(403, "Please use this website to submit your work.");
      }
    } catch (cause) {
      const status = cause instanceof AccessError ? cause.status : 503;
      const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      if (protectedPage && status === 401) {
        const response = NextResponse.redirect(new URL(registrationHref(destination), request.url));
        response.headers.set("cache-control", "private, no-store");
        return response;
      }
      return NextResponse.json({
        error: status === 401 ? "Register or log in to use this tool. Your existing work is saved." : "Your account could not be checked. Please try again.",
        ...(status === 401 ? { registrationUrl: registrationHref(destination), loginUrl: signInHref(destination) } : {}),
      }, { status, headers: { "cache-control": "private, no-store", vary: "Cookie" } });
    }
  }
  // Explicit, branch-scoped isolation. This cannot enable fixtures in Production.
  if (path.startsWith("/api/") && process.env.VERCEL_ENV === "preview" && process.env.SORP_ISOLATED_PREVIEW === "true") {
    const { isolatedPreviewResponse } = await import("./lib/isolated-preview");
    return isolatedPreviewResponse(request);
  }
  const response = NextResponse.next();
  if (protectedPage || isToolApi(path) || protectedAccountAction) {
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("vary", "Cookie");
  }
  return response;
}
// Check every application route, including encoded paths and RSC navigation.
// Static assets still pass through without any account request.
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
