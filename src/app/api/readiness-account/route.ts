import { proxyExistingSorpBackend } from "../../backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => proxyExistingSorpBackend(request, "/api/readiness-account");
export const POST = (request: Request) => proxyExistingSorpBackend(request, "/api/readiness-account");
