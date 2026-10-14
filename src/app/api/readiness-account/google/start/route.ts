import { proxyExistingSorpBackend } from "../../../../backend-proxy";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";

export const runtime = "nodejs";
export const GET = (request: Request) => independentAuthCutover()
  ? Response.json({ error: "Google sign-in is not configured for independent SORP accounts." }, { status: 404 })
  : proxyExistingSorpBackend(request, "/api/readiness-account/google/start");
