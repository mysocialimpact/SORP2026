import { readFile } from "node:fs/promises";
import { previewImport, commitImport } from "../src/lib/console/import-export";
import { query } from "../src/lib/console/db";
import { readWorkbook, records } from "../src/lib/console/workbook";
import { pilotScores } from "../src/lib/console/structured-import";
async function main() {
  const commit = process.argv.includes("--commit");
  for (const path of process.argv.slice(2).filter((p) => p !== "--commit")) {
    const bytes = await readFile(path);
    const file = new File([bytes], path.split("/").pop()!);
    const preview = await previewImport(file, "Authorised workbook import");
    console.log(
      JSON.stringify({
        filename: file.name,
        previewId: preview.id,
        summary: preview.summary,
      }),
    );
    if (commit) {
      const result = await commitImport(
        String(preview.id),
        "Authorised workbook import",
      );
      const grid = await readWorkbook(bytes);
      if (grid["Firm scores"])
        for (const row of records(grid["Firm scores"])) {
          const found = await query<{
            scores: Record<string, number>;
            total: number;
            historical_level: number;
            date: string;
            name: string;
          }>(
            `SELECT a.scores,a.total,a.historical_level,to_char(a.created_at,'YYYY-MM-DD') date,m.name FROM research_console.assessments a JOIN research_console.firms f ON f.id=a.firm_id JOIN research_console.methodologies m ON m.id=a.methodology_id WHERE a.import_batch_id=$1 AND f.name=$2`,
            [preview.id, row["Firm name"]],
          );
          const a = found[0],
            scores = pilotScores(row);
          if (
            found.length !== 1 ||
            !a ||
            Object.entries(scores).some(([k, v]) => a.scores[k] !== v) ||
            a.total !== Number(row["Total /100"]) ||
            a.historical_level !== Number(row["Evidence level 0–5"]) ||
            a.date !== row["Research date"] ||
            !a.name.includes("v1.0")
          )
            throw new Error(
              "Historical assessment mismatch: " + row["Firm name"],
            );
        }
      if (grid["Raw evidence"]) {
        const imported = await query<{ summary: string; url: string }>(
          `SELECT summary,url FROM research_console.evidence WHERE import_batch_id=$1`,
          [preview.id],
        );
        const raw = records(grid["Raw evidence"]);
        if (
          imported.length !== raw.length ||
          raw.some(
            (r) =>
              !imported.some(
                (e) =>
                  e.summary === r["Raw evidence / research note"] &&
                  e.url === r["Source URL"],
              ),
          )
        )
          throw new Error("Raw evidence verification failed.");
      }
      console.log(JSON.stringify({ verified: true, result }));
    }
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
