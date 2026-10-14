import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { uploadReportChunk } from "@/lib/sorp-auth/report-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (request: Request) => independentAuthCutover()
  ? uploadReportChunk(request) : Response.json({ error: "Independent uploads are disabled." }, { status: 404 });
