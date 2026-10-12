import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import path from "node:path";

export type WorkbookRows = Record<string, string[][]>;
const many = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];
// OOXML permits namespace prefixes. Preserve cached values; never execute formulas or links.
export async function readWorkbook(data: Buffer): Promise<WorkbookRows> {
  if (data.length > 3_000_000) throw new Error("Workbook exceeds 3 MB.");
  let expanded = 0,
    entries = 0;
  for (let i = 0; i < data.length - 46; i++)
    if (data.readUInt32LE(i) === 0x02014b50) {
      expanded += data.readUInt32LE(i + 24);
      entries++;
      if (expanded > 20_000_000 || entries > 500)
        throw new Error("Workbook exceeds safe expanded limits.");
      i +=
        45 +
        data.readUInt16LE(i + 28) +
        data.readUInt16LE(i + 30) +
        data.readUInt16LE(i + 32);
    }
  const zip = await JSZip.loadAsync(data);
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });
  const xml = async (name: string) => {
    const file = zip.file(name);
    if (!file) return {};
    const value = await file.async("string");
    if (value.length > 20_000_000 || /<!DOCTYPE|<!ENTITY/i.test(value))
      throw new Error("Unsupported workbook XML.");
    return parser.parse(value);
  };
  // The XML parser yields dynamic OOXML trees; narrow values when translating to strings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rich = (v: any): string =>
    typeof v === "string"
      ? v
      : v?.t !== undefined
        ? rich(v.t)
        : v?.["#text"] !== undefined
          ? String(v["#text"])
          : many(v?.r).map(rich).join("");
  const book = await xml("xl/workbook.xml"),
    rels = await xml("xl/_rels/workbook.xml.rels");
  const strings = many((await xml("xl/sharedStrings.xml")).sst?.si).map(rich);
  const sheets: WorkbookRows = {};
  let total = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sheet of many<any>(book.workbook?.sheets?.sheet)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rel = many<any>(rels.Relationships?.Relationship).find(
      (r) => r["@_Id"] === sheet["@_id"],
    );
    if (!rel || rel["@_TargetMode"] === "External")
      throw new Error("Invalid worksheet relationship.");
    const target = String(rel["@_Target"]);
    const file = path.posix.normalize(
      target.startsWith("/") ? target.slice(1) : "xl/" + target,
    );
    if (!file.startsWith("xl/worksheets/"))
      throw new Error("Invalid worksheet path.");
    const content = await xml(file);
    const rows: string[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of many<any>(content.worksheet?.sheetData?.row)) {
      if (++total > 5000) throw new Error("Import up to 5,000 rows at a time.");
      const cells: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const cell of many<any>(row.c)) {
        const letters = String(cell["@_r"]).match(/^[A-Z]+/)?.[0];
        if (!letters) continue;
        let col = 0;
        for (const l of letters) col = col * 26 + l.charCodeAt(0) - 64;
        if (col > 200) throw new Error("Workbook exceeds 200 columns.");
        cells[col - 1] =
          cell["@_t"] === "inlineStr"
            ? rich(cell.is)
            : cell["@_t"] === "s"
              ? (strings[Number(cell.v)] ?? "")
              : String(cell.v ?? "");
      }
      rows.push(Array.from({ length: cells.length }, (_, i) => cells[i] ?? ""));
    }
    sheets[String(sheet["@_name"])] = rows;
  }
  if (!Object.keys(sheets).length)
    throw new Error("No readable worksheets found.");
  return sheets;
}
export function records(rows: string[][]): Record<string, string>[] {
  const [heads = [], ...body] = rows;
  return body
    .filter((r) => r.some(Boolean))
    .map((r) =>
      Object.fromEntries(r.map((v, i) => [heads[i] || `Column ${i + 1}`, v])),
    );
}
