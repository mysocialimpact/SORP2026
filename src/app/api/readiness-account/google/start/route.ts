import { proxyExistingSorpBackend } from "../../../../backend-proxy";

export const runtime = "nodejs";
export const GET = (request: Request) => proxyExistingSorpBackend(request, "/api/readiness-account/google/start");
