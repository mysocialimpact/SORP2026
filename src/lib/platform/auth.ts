import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccessError } from "@/lib/access-error";
import { platformIdentity } from "./identity";
export { platformIdentity } from "./identity";
export type { PlatformIdentity, PlatformMembership } from "./identity";

export async function protectPlatformRequest(request: Request) {
  const identity = await platformIdentity(request.headers.get("cookie") || "");
  if (!["GET", "HEAD"].includes(request.method)) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")}://${request.headers.get("host") || url.host}`;
    if (origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AccessError(403, "Please submit from this website.");
    }
  }
  return identity;
}

export async function protectAdviserPage() {
  try {
    const identity = await platformIdentity((await cookies()).toString());
    const advisers = identity.memberships.filter(membership =>
      membership.type === "Adviser" && ["Adviser", "Enterprise"].includes(membership.entitlement?.plan || "")
    );
    if (!advisers.length) redirect("/dashboard/?adviser=unavailable");
    return { ...identity, advisers };
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect("/login/?next=/adviser/");
    redirect("/dashboard/?adviser=unavailable");
  }
}
