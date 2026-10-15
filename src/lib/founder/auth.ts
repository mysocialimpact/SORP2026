import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccessError } from "@/lib/access-error";
import { independentIdentity } from "@/lib/sorp-auth/identity";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";

type FounderIdentity = { id?: string; email: string; name?: string };

export async function founderIdentity(cookie?: string): Promise<FounderIdentity> {
  if (independentAuthCutover()) {
    if (!cookie) throw new AccessError(401, "Please log in to SORP2026.");
    const identity = await independentIdentity(new Headers({ cookie }));
    if (!identity) throw new AccessError(401, "Please log in again.");
    if (!identity.platformAccess.founder) throw new AccessError(403,
      "This control centre is private to authorised platform administrators.");
    return { id: identity.account.id, email: identity.account.email.toLowerCase(), name: identity.account.name };
  }
  const origin = process.env.SORP_BACKEND_ORIGIN;
  if (!origin) throw new AccessError(503, "Founder access needs configuration.");
  if (!cookie) throw new AccessError(401, "Please log in to SORP2026.");
  let response: Response;
  try {
    response = await fetch(new URL("/api/readiness-account", origin), { headers: { cookie, "x-sorp-destination": "sorp2026.org" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
  } catch { throw new AccessError(503, "The sign-in service could not be reached."); }
  if (!response.ok) throw new AccessError(401, "Please log in again.");
  const data = await response.json();
  const account = data.account;
  if (data.signedIn !== true || !account || typeof account.email !== "string") throw new AccessError(401, "Please log in again.");
  if (typeof account.id !== "string" || data.platformAccess?.founder !== true) throw new AccessError(403, "This control centre is private to authorised platform administrators.");
  return { id: account.id, email: account.email.trim().toLowerCase(), name: typeof account.name === "string" ? account.name : undefined };
}

export async function protectFounderPage() {
  try { return await founderIdentity((await cookies()).toString()); }
  catch (error) { if (error instanceof AccessError && error.status === 403) redirect("/console/unauthorised/"); redirect("/login/?next=/founder/"); }
}

export async function protectFounderRequest(request: Request) {
  const identity = await founderIdentity(request.headers.get("cookie") || "");
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expected = `${request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "")}://${request.headers.get("host")}`;
    if (origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") throw new AccessError(403, "Please submit from this website.");
  }
  return identity;
}
