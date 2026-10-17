import "server-only";
import { AccessError } from "./access-error";
import { platformIdentity } from "./platform/identity";
import type { NextRequest } from "next/server";

/** Reuse the actual account service. A cookie's presence never proves identity. */
export async function verifyToolSession(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview" && process.env.SORP_ISOLATED_PREVIEW === "true") {
    const { isolatedPreviewResponse } = await import("./isolated-preview");
    const { NextRequest } = await import("next/server");
    const response = await isolatedPreviewResponse(new NextRequest(new URL("/api/readiness-account/", request.url), {
      headers: request.headers,
    }));
    if (!response.ok) throw new AccessError(503, "The preview account service is unavailable.");
    const data = await response.json();
    if (data.signedIn !== true || typeof data.account?.id !== "string")
      throw new AccessError(401, "Register or log in to use this tool.");
    return;
  }
  const cookie = request.headers.get("cookie") || "";
  if (!cookie) throw new AccessError(401, "Register or log in to use this tool.");
  await platformIdentity(cookie);
}
