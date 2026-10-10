import { proxyExistingSorpBackend } from "../../../../backend-proxy";

export const runtime = "nodejs";
export const POST = (request: Request) => proxyExistingSorpBackend(request, "/api/booking/payment/finalise");
