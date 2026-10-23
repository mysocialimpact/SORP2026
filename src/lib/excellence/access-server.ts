import "server-only";
import { founderQuery } from "@/lib/founder/db";
import { platformIdentity } from "@/lib/platform/identity";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { AccessError } from "@/lib/access-error";
import { baselineOnlyAccess, legacyAccess, maturityProgress, normaliseAccess,
  pillarAvailable, pillarProgress, type ExcellenceAccess, type ExcellencePillar } from "./access-policy";

type ProductRecord = { status?: string; data?: Record<string, unknown>; createdAt?: string; updatedAt?: string } | null;

async function savedProduct(cookie: string, accountId: string): Promise<ProductRecord> {
  if (independentAuthCutover()) {
    const { sorpAuthPool } = await import("@/lib/sorp-auth/auth");
    const row = await sorpAuthPool().query<{ status: string; data: Record<string, unknown>; created_at: Date; updated_at: Date }>(
      "SELECT status,data,created_at,updated_at FROM sorp_auth.product_progress WHERE user_id=$1 AND product_id='social-impact-excellence'", [accountId]);
    return row.rows[0] ? { status: row.rows[0].status, data: row.rows[0].data,
      createdAt: row.rows[0].created_at.toISOString(), updatedAt: row.rows[0].updated_at.toISOString() } : null;
  }
  const origin = process.env.SORP_BACKEND_ORIGIN;
  if (!origin) throw new AccessError(503, "The account service is unavailable.");
  const response = await fetch(new URL("/api/readiness-account", origin), {
    method: "POST", headers: { cookie, "content-type": "application/json", "x-sorp-destination": "sorp2026.org" },
    body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }),
    cache: "no-store", signal: AbortSignal.timeout(15000), redirect: "error",
  });
  if (!response.ok) throw new AccessError(response.status === 401 ? 401 : 503, "Your saved Social Impact Excellence work could not be checked.");
  const payload = await response.json();
  if (payload.account?.id !== accountId) throw new AccessError(403, "Your account could not be matched to its saved work.");
  return payload.productProgress || null;
}

export async function excellenceContext(cookie: string) {
  const identity = await platformIdentity(cookie);
  const memberships = identity.memberships.filter(row => row && typeof row.organisationId === "string" && row.organisationId);
  const [rows, product] = await Promise.all([
    memberships.length ? independentAuthCutover()
      ? (await import("@/lib/sorp-auth/auth")).sorpAuthPool().query<{
          id: string; name: string; platform_organisation_id: string; excellence_access: unknown
        }>(`SELECT id,name,id platform_organisation_id,excellence_access
          FROM sorp_auth.organisation WHERE id = ANY($1::text[])`,
          [memberships.map(row => row.organisationId)]).then(result => result.rows)
      : founderQuery<{ id: string; name: string; platform_organisation_id: string; excellence_access: unknown }>(
          "SELECT id,name,platform_organisation_id,excellence_access FROM research_console.founder_organisations WHERE platform_organisation_id = ANY($1::text[])",
          [memberships.map(row => row.organisationId)]) : Promise.resolve([]),
    savedProduct(cookie, identity.account.id),
  ]);
  // Product progress is keyed by person, not organisation. A multi-organisation
  // session cannot safely choose a charity's permission from a browser value.
  const ambiguous = memberships.length !== 1;
  const organisation = !ambiguous ? rows.find(row => row.platform_organisation_id === memberships[0].organisationId) : undefined;
  const access: ExcellenceAccess = ambiguous || !organisation ? baselineOnlyAccess : organisation.excellence_access === null ? legacyAccess : normaliseAccess(organisation.excellence_access) || baselineOnlyAccess;
  const maturity = maturityProgress(product?.data);
  const pillars = Object.fromEntries((["purpose", "leadership", "data", "delivery", "communications"] as const).map(key =>
    [key, { ...pillarProgress(product?.data, key), available: pillarAvailable(access, maturity.completed, key) }])) as Record<ExcellencePillar, ReturnType<typeof pillarProgress> & { available: boolean }>;
  return { identity, organisation: organisation ? { id: organisation.id, name: organisation.name } : null,
    access, legacy: Boolean(organisation && organisation.excellence_access === null), ambiguous,
    maturity: { ...maturity, available: access.stages.maturity, updatedAt: product?.updatedAt || null,
      completedAt: maturity.completed && typeof product?.data?.completedAt === "string" ? product.data.completedAt : null },
    pillars, product };
}

export function canUsePillar(context: Awaited<ReturnType<typeof excellenceContext>>, pillar: ExcellencePillar) {
  return context.pillars[pillar].available;
}

export function accessMessage(context: Awaited<ReturnType<typeof excellenceContext>>, pillar: ExcellencePillar) {
  if (!context.maturity.completed) return "Complete your Social Impact Maturity Assessment before beginning the pillar deep dives.";
  if (context.ambiguous) return "This account belongs to more than one organisation. Ask your administrator to confirm which organisation this assessment belongs to.";
  if (!context.access.pillars[pillar]) return "Your Maturity Assessment is complete. This deep dive is awaiting activation by your organisation's SORP administrator.";
  return "This deep dive is available.";
}
