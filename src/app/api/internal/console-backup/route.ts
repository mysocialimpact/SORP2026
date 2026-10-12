import { timingSafeEqual } from "node:crypto";
import { runBackup } from "@/lib/console/backups";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
      ? Buffer.from("Bearer " + process.env.CRON_SECRET)
      : null,
    actual = Buffer.from(request.headers.get("authorization") || "");
  if (
    !expected ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  )
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  try {
    return Response.json(await runBackup(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Backup failed; inspect console backup status." },
      { status: 503 },
    );
  }
}
