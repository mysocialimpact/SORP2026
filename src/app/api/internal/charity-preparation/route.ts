import { timingSafeEqual } from "node:crypto";
import { enabled } from "@/lib/onboarding/server";
import { query } from "@/lib/console/db";
import { prepareCharity } from "@/lib/onboarding/intelligence";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`),
    supplied = Buffer.from(request.headers.get("authorization") || "");
  if (
    !enabled() ||
    !process.env.CRON_SECRET ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return new Response(null, { status: 404 });
  const jobs = await query<{ identity: string }>(
    "SELECT identity FROM research_console.charity_intelligence WHERE attempts<3 AND next_attempt_at<=now() AND (status IN ('queued','failed','partial') OR (status='running' AND lease_until<now())) ORDER BY next_attempt_at LIMIT 1",
  );
  for (const job of jobs) await prepareCharity(job.identity);
  await query(
    "DELETE FROM research_console.onboarding_sessions WHERE expires_at<now()",
  );
  return Response.json({ processed: jobs.length });
}
