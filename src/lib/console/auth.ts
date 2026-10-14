import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccessError } from "@/lib/access-error";
export { AccessError } from "@/lib/access-error";
export async function authenticate(cookie: string) {
  const origin = process.env.SORP_BACKEND_ORIGIN;
  if (!origin)
    throw new AccessError(503, "Private access needs configuration.");
  if (!cookie) throw new AccessError(401, "Please log in to SORP2026.");
  let response: Response;
  try {
    response = await fetch(new URL("/api/readiness-account", origin), {
      headers: { cookie, "x-sorp-destination": "sorp2026.org" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AccessError(503, "The sign-in service could not be reached.");
  }
  if (!response.ok) throw new AccessError(401, "Please log in again.");
  const data = await response.json();
  if (
    data.signedIn !== true ||
    typeof data.account?.id !== "string" ||
    typeof data.account?.email !== "string"
  )
    throw new AccessError(401, "Please log in again.");
  if (data.platformAccess?.founder !== true)
    throw new AccessError(403, "This console is private to authorised platform founders.");
  return data.account.email.trim().toLowerCase();
}
export async function protectPage() {
  try {
    return await authenticate((await cookies()).toString());
  } catch (error) {
    if (error instanceof AccessError && error.status === 403)
      redirect("/console/unauthorised/");
    redirect("/console/login/");
  }
}
export async function protectRequest(request: Request) {
  const email = await authenticate(request.headers.get("cookie") || "");
  if (!["GET", "HEAD"].includes(request.method)) {
    if (
      request.headers.get("origin") !==
        `${request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "")}://${request.headers.get("host")}` ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new AccessError(403, "Please submit from this website.");
  }
  return email;
}
