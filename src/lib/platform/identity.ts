import "server-only";
import { AccessError } from "@/lib/access-error";
import { independentIdentity } from "@/lib/sorp-auth/identity";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";

export type PlatformMembership = {
  organisationId: string;
  name: string;
  type: "Charity" | "Adviser" | "Other";
  role: "owner" | "admin" | "member";
  entitlement?: { plan?: string; publishedPrice?: number; payablePrice?: number; status?: string; complimentaryEnd?: string | null };
};

export type PlatformIdentity = {
  account: { id: string; email: string; name: string; organisation?: string; position?: string };
  founder: boolean;
  memberships: PlatformMembership[];
};

export async function platformIdentity(cookie: string): Promise<PlatformIdentity> {
  if (independentAuthCutover()) {
    if (!cookie) throw new AccessError(401, "Please log in to SORP2026.");
    const identity = await independentIdentity(new Headers({ cookie }));
    if (!identity) throw new AccessError(401, "Please log in again.");
    return { account: identity.account, founder: identity.platformAccess.founder,
      memberships: identity.platformAccess.memberships as PlatformMembership[] };
  }
  const origin = process.env.SORP_BACKEND_ORIGIN;
  if (!origin) throw new AccessError(503, "Platform access needs configuration.");
  if (!cookie) throw new AccessError(401, "Please log in to SORP2026.");
  let response: Response;
  try {
    response = await fetch(new URL("/api/readiness-account", origin), { headers: { cookie, "x-sorp-destination": "sorp2026.org" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
  } catch { throw new AccessError(503, "The sign-in service could not be reached."); }
  if (!response.ok) throw new AccessError(response.status === 401 ? 401 : 503, response.status === 401 ? "Please log in again." : "Your account permissions could not be loaded.");
  const data = await response.json();
  const account = data.account;
  if (data.signedIn !== true || !account || typeof account.id !== "string" || typeof account.email !== "string") throw new AccessError(401, "Please log in again.");
  const memberships = Array.isArray(data.platformAccess?.memberships) ? data.platformAccess.memberships.filter((item: unknown) => item && typeof item === "object") as PlatformMembership[] : [];
  return {
    account: {
      id: account.id,
      email: account.email,
      name: typeof account.name === "string" ? account.name : account.email,
      organisation: typeof account.organisation === "string" ? account.organisation : undefined,
      position: typeof account.position === "string" ? account.position : undefined,
    },
    founder: data.platformAccess?.founder === true,
    memberships,
  };
}
