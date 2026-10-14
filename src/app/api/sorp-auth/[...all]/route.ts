import { toNextJsHandler } from "better-auth/next-js";
import { sorpAuth } from "@/lib/sorp-auth/auth";
import { independentAuthRoutesEnabled } from "@/lib/sorp-auth/switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function disabled() {
  return Response.json({ error: "Independent authentication is not enabled." },
    { status: 404, headers: { "Cache-Control": "no-store" } });
}

function canonicalRequest(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  return new Request(url, request);
}

export async function GET(request: Request) {
  if (!independentAuthRoutesEnabled()) return disabled();
  try { return await toNextJsHandler(sorpAuth()).GET(canonicalRequest(request)); }
  catch { return Response.json({ error: "Authentication service unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } }); }
}

export async function POST(request: Request) {
  if (!independentAuthRoutesEnabled()) return disabled();
  try { return await toNextJsHandler(sorpAuth()).POST(canonicalRequest(request)); }
  catch { return Response.json({ error: "Authentication service unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
