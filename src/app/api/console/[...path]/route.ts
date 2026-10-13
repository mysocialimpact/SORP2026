import { after } from "next/server";
import { protectRequest, AccessError } from "@/lib/console/auth";
import * as repository from "@/lib/console/repository";
import { query } from "@/lib/console/db";
import { startResearch, runResearch } from "@/lib/console/research";
import {
  automaticAssessment,
  calibrationReport,
  pilotCalibration,
} from "@/lib/console/automatic-assessment";
import { aiUsageSummary } from "@/lib/console/openai-response";
import {
  discoverFirm,
  discoveryConfigured,
  discoverMissingWebsite,
} from "@/lib/console/discovery";
import {
  backupConfiguration,
  completeBackup,
  runBackup,
} from "@/lib/console/backups";
import {
  previewImport,
  commitImport,
  exportData,
} from "@/lib/console/import-export";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const actor = await protectRequest(request);
    const { path } = await context.params;
    const [resource, id, action] = path;
    const get = request.method === "GET";
    const url = new URL(request.url);
    if (get && resource === "access") return json({ authorised: true });
    if (get && resource === "dashboard")
      return json(await repository.dashboard(actor));
    if (get && resource === "ai-usage") return json(await aiUsageSummary());
    if (get && resource === "calibration")
      return json(await calibrationReport());
    if (get && resource === "status") {
      await query("SELECT 1");
      return json({
        database: true,
        auth: true,
        research: discoveryConfigured()
          ? "OpenAI web search and cited evidence research configured."
          : "OpenAI key missing; direct website collection only.",
        automaticScoring: true,
        nameDiscovery: discoveryConfigured(),
        pilot: Number(
          (
            await query<{ count: string }>(
              "SELECT count(*) FROM research_console.assessments WHERE origin='Historical pilot v1.0'",
            )
          )[0].count,
        ),
        backup: {
          ...backupConfiguration(),
          last:
            (
              await query(
                "SELECT status,completed_at FROM research_console.backup_runs ORDER BY started_at DESC LIMIT 1",
              )
            )[0] ?? null,
        },
      });
    }
    if (get && resource === "methodology")
      return json(
        await query(
          "SELECT * FROM research_console.methodologies ORDER BY created_at DESC",
        ),
      );
    if (get && resource === "firms")
      return json(
        id
          ? await repository.report(id)
          : await repository.listFirms(url.searchParams),
      );
    if (get && resource === "compare") {
      const ids = (url.searchParams.get("ids") || "")
        .split(",")
        .filter(Boolean);
      if (ids.length < 2 || ids.length > 5)
        throw new Error("Choose two to five firms.");
      return json(await Promise.all(ids.map(repository.report)));
    }
    if (get && resource === "imports")
      return json(
        await query(
          "SELECT id,filename,status,summary,created_at FROM research_console.imports ORDER BY created_at DESC LIMIT 50",
        ),
      );
    if (get && resource === "export") {
      if (url.searchParams.get("format") === "backup")
        return new Response(JSON.stringify(await completeBackup()), {
          headers: {
            "Cache-Control": "private, no-store",
            "Content-Type": "application/json",
            "Content-Disposition":
              'attachment; filename="sorp-console-complete-backup.json"',
          },
        });
      const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";
      const buffer = await exportData(
        format,
        url.searchParams.get("approved") === "true",
      );
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Type":
            format === "csv"
              ? "text/csv"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="sorp-research.${format}"`,
        },
      });
    }
    if (get && resource === "runs")
      return json(
        (
          await query("SELECT * FROM research_console.runs WHERE id=$1", [id])
        )[0] || null,
      );
    if (get) return json({ error: "Not found" }, 404);
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (resource === "imports" && !id) {
      if (Number(request.headers.get("content-length") || 0) > 3500000)
        throw new Error("Import limit is 3 MB.");
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a spreadsheet.");
      return json(await previewImport(file, actor));
    }
    if (Number(request.headers.get("content-length") || 0) > 100000)
      throw new Error("Request is too large.");
    const text = await request.text();
    if (text.length > 100000) throw new Error("Request is too large.");
    const body = JSON.parse(text);
    if (resource === "discover")
      return json(await discoverFirm(String(body.input ?? "")));
    if (resource === "backup") return json(await runBackup());
    if (resource === "calibration") return json(await pilotCalibration());
    if (resource === "firms" && action === "auto-score")
      return json(await automaticAssessment(id, actor));
    if (resource === "visit") {
      await query(
        "INSERT INTO research_console.visits(actor,researched) SELECT $1,count(*)::int FROM research_console.firms WHERE merged_into IS NULL AND research_completed_at IS NOT NULL ON CONFLICT(actor) DO UPDATE SET visited_at=now(),researched=excluded.researched",
        [actor],
      );
      return json({ ok: true });
    }
    if (resource === "firms" && !id)
      return json(await repository.createFirm(body, actor));
    if (resource === "firms" && action === "website-discovery")
      return json(await discoverMissingWebsite(id, actor));
    if (resource === "firms" && action === "research") {
      const run = await startResearch(id, actor, {
        refresh: body.refresh === true,
      });
      if (run.created) after(() => runResearch(run.id));
      return json(run, 202);
    }
    if (resource === "firms" && (action === "people" || action === "offices"))
      return json(await repository.saveDetail(id, action, body, actor));
    if (resource === "firms" && action === "evidence")
      return json(await repository.saveEvidence(id, body, actor));
    if (resource === "firms" && action === "assessment")
      return json(await repository.saveAssessment(id, body, actor));
    if (resource === "firms" && action === "review")
      return json(await repository.reviewFirm(id, body, actor));
    if (resource === "firms" && action === "correct")
      return json(await repository.correctFirm(id, body, actor));
    if (resource === "firms" && action === "flag")
      return json(
        await repository.flagEvidence(
          id,
          String(body.id),
          String(body.state),
          actor,
        ),
      );
    if (resource === "firms" && action === "merge")
      return json(await repository.mergeFirms(id, String(body.target), actor));
    if (resource === "methodology")
      return json(await repository.reviseMethod(body, actor));
    if (resource === "imports" && id)
      return json(await commitImport(id, actor));
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof AccessError)
      return json({ error: error.message }, error.status);
    const e = error as Error & { code?: string };
    if (e.code || /connect|database|timeout/i.test(e.message))
      return json(
        {
          error:
            "The database could not complete this request. Your existing records are retained; please retry.",
        },
        503,
      );
    return json(
      { error: e.message || "Unable to complete this request." },
      400,
    );
  }
}
export const GET = handle;
export const POST = handle;
