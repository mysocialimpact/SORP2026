import "server-only";
import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { query, transaction } from "./db";
import { canonicalName, publicUrl, websiteDomain } from "./model";
import { audit } from "./repository";
type Row = Record<string, string>;
function value(input: ExcelJS.CellValue): string {
  if (input === null || input === undefined) return "";
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object") {
    if ("richText" in input) return input.richText.map((t) => t.text).join("");
    if ("text" in input) return String(input.text);
    if ("result" in input) return String(input.result ?? "");
    return JSON.stringify(input);
  }
  return String(input);
}
function checkZip(buffer: Buffer) {
  let expanded = 0,
    entries = 0;
  for (let i = 0; i < buffer.length - 46; i++) {
    if (buffer.readUInt32LE(i) === 0x02014b50) {
      expanded += buffer.readUInt32LE(i + 24);
      entries++;
      if (expanded > 20000000 || entries > 500)
        throw new Error(
          "This workbook expands beyond the safe import limit. Split it into smaller files.",
        );
      i +=
        45 +
        buffer.readUInt16LE(i + 28) +
        buffer.readUInt16LE(i + 30) +
        buffer.readUInt16LE(i + 32);
    }
  }
}
export async function previewImport(file: File, actor: string) {
  if (file.size > 3000000)
    throw new Error("Please use a CSV or XLSX file smaller than 3 MB.");
  if (!/\.(csv|xlsx)$/i.test(file.name))
    throw new Error("Use a CSV or XLSX file.");
  const data = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(data).digest("hex");
  const existing = (
    await query("SELECT * FROM research_console.imports WHERE fingerprint=$1", [
      hash,
    ])
  )[0];
  if (existing) return existing;
  const book = new ExcelJS.Workbook();
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    checkZip(data);
    await book.xlsx.load(
      data as unknown as Parameters<typeof book.xlsx.load>[0],
    );
  } else {
    const { Readable } = await import("node:stream");
    await book.csv.read(Readable.from([data]));
  }
  const sheets: Record<string, Row[]> = {};
  let rowCount = 0;
  for (const sheet of book.worksheets) {
    const headers: string[] = [];
    sheet
      .getRow(1)
      .eachCell((cell, index) => (headers[index] = value(cell.value).trim()));
    const rows: Row[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      if (++rowCount > 5000)
        throw new Error("Import up to 5,000 rows at a time.");
      const output: Row = {};
      row.eachCell((cell, col) => {
        output[headers[col] || `Column ${col}`] = value(cell.value);
      });
      rows.push(output);
    });
    sheets[sheet.name] = rows;
  }
  const eligible = Object.entries(sheets).filter(([name, rows]) =>
    rows.some((row) =>
      Object.keys(row).some(
        (key) =>
          /^(firm|firm name|canonical name)$/i.test(key) ||
          (/^(firms|candidates|accountants)$/i.test(name) &&
            key.toLowerCase() === "name"),
      ),
    ),
  );
  const preferred = eligible.filter(([name]) =>
    /^(firms|candidates|accountants)$/i.test(name),
  );
  const chosen =
    preferred.length === 1
      ? preferred[0]
      : eligible.length === 1
        ? eligible[0]
        : null;
  if (!chosen)
    throw new Error(
      "Use one sheet named Firms or Candidates with a Firm name column. People and evidence sheets are preserved but never treated as firms.",
    );
  const [candidateSheet, candidateRows] = chosen;
  if (!candidateRows.length)
    throw new Error(
      "Add a column headed Firm name. All other columns and sheets will be preserved in the import archive.",
    );
  const summary = {
    candidates: candidateRows.length,
    candidateSheet,
    sheets: Object.keys(sheets),
    warnings: [
      "Imports add unreviewed candidates only. Existing records are never overwritten. All original sheets, research and score columns are retained in the import archive; reviewing and mapping pilot scores into assessments remains a separate step.",
    ],
  };
  return (
    await query(
      "INSERT INTO research_console.imports(filename,fingerprint,raw_rows,summary,actor) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [file.name, hash, JSON.stringify(sheets), JSON.stringify(summary), actor],
    )
  )[0];
}
const cell = (row: Row, keys: string[]) => {
  for (const key of keys) {
    const found = Object.entries(row).find(
      ([heading]) => heading.toLowerCase().trim() === key,
    );
    if (found) return found[1];
  }
  return "";
};
export async function commitImport(id: string, actor: string) {
  return transaction(async (c) => {
    const batch = (
      await c.query(
        "SELECT * FROM research_console.imports WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!batch) throw new Error("Import preview not found.");
    if (batch.status === "committed") return batch;
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('console-firm-identity'))",
    );
    let imported = 0,
      duplicates = 0;
    const issues: string[] = [];
    const candidateSheet = batch.summary.candidateSheet;
    if (!candidateSheet || !batch.raw_rows[candidateSheet])
      throw new Error(
        "This older preview needs a new file preview before import.",
      );
    for (const row of batch.raw_rows[candidateSheet] as Row[]) {
      const name = cell(row, [
        "firm",
        "firm name",
        "name",
        "canonical name",
      ]).trim();
      if (!name) continue;
      if (name.length < 2 || name.length > 200) {
        issues.push(`Invalid name: ${name.slice(0, 100)}`);
        continue;
      }
      let website: string | null = null,
        icaew: string | null = null;
      try {
        const w = cell(row, ["website", "website url"]);
        if (w) website = publicUrl(w);
        const i = cell(row, ["icaew url", "icaew_url"]);
        if (i) icaew = publicUrl(i);
      } catch {
        issues.push(`${name}: invalid source URL, skipped.`);
        continue;
      }
      const domain = website ? websiteDomain(website) : null;
      const matches = (
        await c.query(
          "SELECT id FROM research_console.firms WHERE merged_into IS NULL AND (name_key=$1 OR domain=$2 OR icaew_url=$3)",
          [canonicalName(name), domain, icaew],
        )
      ).rows;
      if (matches.length) {
        duplicates++;
        issues.push(
          `${name}: possible existing firm; original row retained without overwriting or merging.`,
        );
        continue;
      }
      const firm = (
        await c.query(
          "INSERT INTO research_console.firms(name,name_key,website,domain,icaew_url) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [name, canonicalName(name), website, domain, icaew],
        )
      ).rows[0];
      const town = cell(row, ["town", "town/city", "location"]),
        postcode = cell(row, ["postcode"]);
      if (town || postcode)
        await c.query(
          "INSERT INTO research_console.offices(firm_id,town,postcode,address,country,source_url,verification) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            firm.id,
            town,
            postcode,
            cell(row, ["address", "full address"]),
            cell(row, ["country"]) || null,
            icaew,
            "Imported — unverified",
          ],
        );
      const summary = cell(row, ["evidence", "summary", "raw evidence"]);
      const evidenceUrl = cell(row, [
        "evidence url",
        "evidenceurl",
        "source url",
      ]);
      if (summary) {
        let url = null;
        try {
          if (evidenceUrl) url = publicUrl(evidenceUrl);
        } catch {
          issues.push(`${name}: evidence URL requires correction.`);
        }
        await c.query(
          "INSERT INTO research_console.evidence(firm_id,source_type,title,summary,url,confidence,notes) VALUES($1,'Internal note',$2,$3,$4,'Needs review',$5)",
          [
            firm.id,
            "Imported research",
            summary,
            url,
            `Preserved from ${batch.filename}; not independently rechecked.`,
          ],
        );
      }
      await audit(
        c,
        firm.id,
        "import",
        id,
        null,
        row,
        "Candidate imported; source row retained",
        actor,
      );
      imported++;
    }
    const summary = { ...batch.summary, imported, duplicates, issues };
    return (
      await c.query(
        "UPDATE research_console.imports SET status='committed',summary=$2 WHERE id=$1 RETURNING *",
        [id, JSON.stringify(summary)],
      )
    ).rows[0];
  });
}
function safeCell(v: unknown): string {
  const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
  return /^[=+\-@\t\r\n]/.test(s) ? "'" + s : s;
}
export async function exportData(format: string, approved: boolean) {
  const book = new ExcelJS.Workbook();
  book.creator = "SORP2026 private research console";
  const ids = (
    await query<{ id: string }>(
      `SELECT id FROM research_console.firms WHERE merged_into IS NULL ${approved ? "AND approved_at IS NOT NULL" : ""} ORDER BY name LIMIT 10001`,
    )
  ).map((f) => f.id);
  if (ids.length > 10000)
    throw new Error("Export currently supports up to 10,000 firms per file.");
  const tables =
    format === "csv"
      ? ["firms"]
      : [
          "firms",
          "offices",
          "people",
          "evidence",
          "runs",
          "assessments",
          "reviews",
          "history",
          "methodologies",
          "baselines",
          "sources",
        ];
  for (const table of tables) {
    let rows: Record<string, unknown>[];
    if (["methodologies", "baselines"].includes(table))
      rows = await query(`SELECT * FROM research_console.${table}`);
    else if (table === "sources")
      rows = await query(
        "SELECT s.* FROM research_console.sources s JOIN research_console.runs r ON r.id=s.run_id WHERE r.firm_id=ANY($1::uuid[])",
        [ids],
      );
    else
      rows = await query(
        `SELECT * FROM research_console.${table} WHERE ${table === "firms" ? "id" : "firm_id"}=ANY($1::uuid[])`,
        [ids],
      );
    const sheet = book.addWorksheet(table);
    if (rows.length) {
      const keys = Object.keys(rows[0]);
      sheet.addRow(keys);
      for (const row of rows)
        sheet.addRow(keys.map((key) => safeCell(row[key])));
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => (col.width = 28));
    }
  }
  return format === "csv"
    ? Buffer.from(await book.csv.writeBuffer())
    : Buffer.from(await book.xlsx.writeBuffer());
}
