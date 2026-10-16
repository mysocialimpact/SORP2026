import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Explicit, branch-scoped isolation. This cannot enable fixtures in Production.
  if (process.env.VERCEL_ENV === "preview" && process.env.SORP_ISOLATED_PREVIEW === "true") {
    const { isolatedPreviewResponse } = await import("./lib/isolated-preview");
    return isolatedPreviewResponse(request);
  }
  return NextResponse.next();
}
export const config = { matcher: "/api/:path*" };
