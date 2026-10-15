import { proxyExistingSorpBackend } from "@/app/backend-proxy";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { assessmentDigest } from "@/lib/sorp-auth/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: unknown, status: number) => Response.json(data,
  { status, headers: { "cache-control": "private, no-store", vary: "Cookie" } });

/** Owner-initiated one-time export. It never changes Cow records or sends email. */
export async function GET(request: Request) {
  if (process.env.SORP_AUTH_LEGACY_EXPORT_ENABLED !== "true" || independentAuthCutover()) {
    return json({ error: "Assessment export is not available." }, 404);
  }
  if (!request.headers.get("cookie")) return json({ error: "Please sign in first." }, 401);
  const source = await proxyExistingSorpBackend(request, "/api/readiness-account");
  if (!source.ok) return json({ error: "The existing assessment could not be read." }, source.status === 401 ? 401 : 503);
  const raw = await source.text();
  if (raw.length > 2_000_000) return json({ error: "The assessment needs an assisted export." }, 413);
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw) as Record<string, unknown>; }
  catch { return json({ error: "The existing assessment response is incomplete." }, 502); }
  const account = value.account as Record<string, unknown> | undefined;
  const email = String(account?.email || "").trim().toLowerCase();
  if (value.signedIn !== true || !account || !/^[0-9a-f-]{36}$/i.test(String(account.id || "")) ||
      !email.endsWith("@brainstrust.org.uk")) {
    return json({ error: "This export is available only to the signed-in Brainstrust owner." }, 403);
  }
  if (!value.progress || typeof value.progress !== "object" || Array.isArray(value.progress)) {
    return json({ error: "The complete assessment is not available from this session." }, 503);
  }
  const progress = value.progress;
  const sha256 = assessmentDigest(progress);
  const body = JSON.stringify({ schemaVersion: 1, source: "legacy-sorp-session",
    account: { id: account.id, email, name: account.name },
    lastSavedAt: account.lastSavedAt || null, progress, sha256 });
  return new Response(body, { headers: { "content-type": "application/json; charset=utf-8",
    "content-disposition": "attachment; filename=\"sorp-assessment-export.json\"",
    "cache-control": "private, no-store", vary: "Cookie", "x-content-type-options": "nosniff" } });
}
