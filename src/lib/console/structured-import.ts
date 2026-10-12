import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { categories, canonicalName, publicUrl, websiteDomain } from "./model";
import { records, type WorkbookRows } from "./workbook";

export function workbookKind(grid: WorkbookRows) {
  if (grid["Firm scores"] && grid["Raw evidence"] && grid.Methodology)
    return "pilot";
  if (grid.Firms?.[0]?.includes("ICAEW source URL")) return "directory";
  return null;
}
export function supportedCategories(label: string) {
  const result: string[] = [];
  if (/service/i.test(label)) result.push("services");
  if (/people/i.test(label)) result.push("people");
  if (/sorp|knowledge/i.test(label)) result.push("sorp");
  if (/client|case/i.test(label)) result.push("clients");
  if (/external|recognition/i.test(label)) result.push("recognition");
  return result;
}
export function validateStructured(grid: WorkbookRows) {
  const kind = workbookKind(grid);
  if (!kind) throw new Error("Workbook format is not recognised.");
  const firms = records(grid[kind === "pilot" ? "Firm scores" : "Firms"]);
  const raw = kind === "pilot" ? records(grid["Raw evidence"]) : [];
  const keys = new Set<string>();
  for (const row of firms) {
    const name = row["Firm name"];
    if (!name || keys.has(canonicalName(name)))
      throw new Error("Missing or repeated firm name in workbook.");
    keys.add(canonicalName(name));
    for (const k of [
      "Website",
      "ICAEW directory URL",
      "ICAEW source URL",
      "Independent evidence URL",
    ])
      if (row[k]) publicUrl(row[k]);
    if (kind === "pilot") {
      const scores = pilotScores(row);
      if (
        categories.some(
          (c) =>
            !Number.isInteger(scores[c.id]) ||
            scores[c.id] < 0 ||
            scores[c.id] > c.max,
        ) ||
        Object.values(scores).reduce((a, b) => a + b, 0) !==
          Number(row["Total /100"])
      )
        throw new Error(`Invalid category scores or total for ${name}.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row["Research date"]))
        throw new Error(`Missing research date for ${name}.`);
    }
  }
  for (const e of raw) {
    const f = firms.find((f) => f.ID === e["Firm ID"]);
    if (!f || canonicalName(f["Firm name"]) !== canonicalName(e["Firm name"]))
      throw new Error("Evidence firm ID/name mismatch.");
    if (e["Source URL"]) publicUrl(e["Source URL"]);
  }
  return { kind, firms, raw };
}
export function pilotScores(r: Record<string, string>) {
  return {
    services: Number(r["Dedicated charity services /25"]),
    people: Number(r["Specialist people /20"]),
    sorp: Number(r["SORP knowledge /20"]),
    clients: Number(r["Clients & cases /20"]),
    recognition: Number(r["External recognition /15"]),
  };
}

export async function importStructured(
  c: PoolClient,
  batch: {
    id: string;
    raw_rows: { __grid: WorkbookRows };
    summary: Record<string, unknown>;
  },
  actor: string,
) {
  const grid = batch.raw_rows.__grid;
  const { kind, firms, raw } = validateStructured(grid);
  let methodologyId: string | undefined;
  if (kind === "pilot") {
    methodologyId = randomUUID();
    await c.query(
      "INSERT INTO research_console.methodologies(id,name,categories,boundaries,rules,notes,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        methodologyId,
        "Charity Accountant Evidence Methodology v1.0 — original pilot",
        JSON.stringify(categories),
        "[0,20,40,60,80,100]",
        grid.Methodology.map((r) => r.filter(Boolean).join(" | ")).join("\n"),
        "Original supplied methodology preserved verbatim. Historical research judgement; not retrofitted to v1.1.",
        "2026-10-12T00:00:00Z",
      ],
    );
  }
  const changed: string[] = [],
    added: string[] = [],
    assessmentIds: string[] = [],
    evidenceIds: string[] = [],
    conflicts: string[] = [];
  for (const row of firms) {
    const name = row["Firm name"],
      key = canonicalName(name),
      icaew = row["ICAEW directory URL"] || row["ICAEW source URL"] || null,
      website = row.Website || null;
    const matches = (
      await c.query(
        "SELECT * FROM research_console.firms WHERE merged_into IS NULL AND (name_key=$1 OR ($2::text IS NOT NULL AND icaew_url=$2)) FOR UPDATE",
        [key, icaew],
      )
    ).rows;
    if (matches.length > 1)
      throw new Error(
        `Conflicting matches for ${name}; resolve before importing.`,
      );
    let firm = matches[0];
    if (!firm) {
      const domain = website ? websiteDomain(website) : null;
      if (
        domain &&
        (
          await c.query(
            "SELECT 1 FROM research_console.firms WHERE domain=$1 AND merged_into IS NULL",
            [domain],
          )
        ).rowCount
      )
        throw new Error(
          `An existing firm shares the website for ${name}; review identity before importing.`,
        );
      firm = (
        await c.query(
          "INSERT INTO research_console.firms(name,name_key,website,domain,icaew_url,icaew_tag) VALUES($1,$2,$3,$4,$5,true) RETURNING *",
          [name, key, website, domain, icaew],
        )
      ).rows[0];
      added.push(firm.id);
    }
    const before = firm;
    if (
      website &&
      firm.website &&
      websiteDomain(website) !== websiteDomain(firm.website)
    )
      conflicts.push(
        `${name}: existing website retained; incoming website archived.`,
      );
    firm = (
      await c.query(
        `UPDATE research_console.firms SET website=coalesce(website,$2),domain=coalesce(domain,$3),icaew_url=coalesce(icaew_url,$4),icaew_tag=coalesce(icaew_tag,true),contact=CASE WHEN $5::text IS NOT NULL AND NOT contact ? 'telephone' THEN contact||jsonb_build_object('telephone',$5::text) ELSE contact END,updated_at=now() WHERE id=$1 RETURNING *`,
        [
          firm.id,
          website,
          website ? websiteDomain(website) : null,
          icaew,
          row.Telephone && !/^Not available/i.test(row.Telephone)
            ? row.Telephone
            : null,
        ],
      )
    ).rows[0];
    changed.push(firm.id);
    await c.query(
      "INSERT INTO research_console.history(firm_id,entity,entity_id,previous,next,reason,actor) VALUES($1,'import',$2,$3,$4,$5,$6)",
      [
        firm.id,
        batch.id,
        JSON.stringify(before),
        JSON.stringify({ firm, original: row }),
        `${kind} workbook: fill missing fields and append original research; retain existing decisions`,
        actor,
      ],
    );
    // An incoming directory address supplements an incomplete office; it never replaces an existing office.
    if (row["ICAEW directory address"]) {
      const address = row["ICAEW directory address"];
      const postcode =
        address.match(/[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i)?.[0] ?? null;
      const offices = (
        await c.query(
          "SELECT * FROM research_console.offices WHERE firm_id=$1",
          [firm.id],
        )
      ).rows;
      const match = offices.find(
        (o) =>
          o.address === address ||
          (postcode &&
            String(o.postcode).replace(/\s/g, "").toUpperCase() ===
              postcode.replace(/\s/g, "").toUpperCase()),
      );
      if (!match)
        await c.query(
          "INSERT INTO research_console.offices(firm_id,address,postcode,source_url,verification) VALUES($1,$2,$3,$4,'Imported pilot — not rechecked')",
          [firm.id, address, postcode, icaew],
        );
      else if (!match.address) {
        await c.query(
          "UPDATE research_console.offices SET address=$2 WHERE id=$1",
          [match.id, address],
        );
        await c.query(
          "INSERT INTO research_console.history(firm_id,entity,entity_id,previous,next,reason,actor) VALUES($1,'office',$2,$3,$4,$5,$6)",
          [
            firm.id,
            match.id,
            JSON.stringify(match),
            JSON.stringify({ ...match, address }),
            `Missing address supplied by import ${batch.id}`,
            actor,
          ],
        );
      }
    }
    if (kind === "pilot") {
      const refs: Record<string, string[]> = Object.fromEntries(
        categories.map((c) => [c.id, []]),
      );
      for (const e of raw.filter((e) => e["Firm ID"] === row.ID)) {
        const supported = supportedCategories(e["Score category supported"]);
        const id = randomUUID();
        await c.query(
          `INSERT INTO research_console.evidence(id,firm_id,source_type,category,title,summary,url,accessed_at,confidence,notes,import_batch_id,supported_categories,provenance,sorp) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [
            id,
            firm.id,
            e["Source type"] === "Website"
              ? "Firm website"
              : e["Source type"] === "Research note"
                ? "Internal research notes"
                : e["Source type"],
            supported[0] ?? null,
            e["Evidence type"],
            e["Raw evidence / research note"],
            e["Source URL"] || null,
            e.Accessed || null,
            "Imported — not rechecked",
            `Original pilot paraphrase; ${e["Score category supported"]}. Original assessment confidence: ${row["Research confidence"]}.`,
            batch.id,
            supported,
            JSON.stringify({
              kind: "pilot",
              original: e,
              firmResearchConfidence: row["Research confidence"],
            }),
            "Not assessed",
          ],
        );
        evidenceIds.push(id);
        for (const cat of supported) refs[cat].push(id);
      }
      const id = randomUUID(),
        scores = pilotScores(row);
      assessmentIds.push(id);
      const reasons = Object.fromEntries(
        categories.map((cat) => [
          cat.id,
          `Original v1.0 award: ${scores[cat.id]}/${cat.max}. The workbook supplies this shared justification, not a separate point breakdown: ${row["Short justification"]}`,
        ]),
      );
      await c.query(
        `INSERT INTO research_console.assessments(id,firm_id,methodology_id,scores,total,reasons,evidence_ids,gaps,confidence,sorp,origin,actor,created_at,import_batch_id,historical_level) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Historical pilot v1.0',$11,$12,$13,$14)`,
        [
          id,
          firm.id,
          methodologyId,
          JSON.stringify(scores),
          Number(row["Total /100"]),
          JSON.stringify(reasons),
          JSON.stringify(refs),
          [row["Evidence gaps"]],
          row["Research confidence"],
          row["SORP evidence"],
          actor,
          row["Research date"] + "T00:00:00Z",
          batch.id,
          Number(row["Evidence level 0–5"]),
        ],
      );
      await c.query(
        `UPDATE research_console.firms SET research_completed_at=coalesce(research_completed_at,$2),status=CASE WHEN status='Not researched' THEN 'Ready for Marcus' ELSE status END WHERE id=$1`,
        [firm.id, row["Research date"] + "T00:00:00Z"],
      );
    } else if (row["Charity specialism evidence"]) {
      const url = row["Independent evidence URL"] || icaew;
      const summary = row["Charity specialism evidence"];
      if (
        !(
          await c.query(
            "SELECT 1 FROM research_console.evidence WHERE firm_id=$1 AND summary=$2 AND url IS NOT DISTINCT FROM $3",
            [firm.id, summary, url],
          )
        ).rowCount
      ) {
        const id = randomUUID();
        evidenceIds.push(id);
        await c.query(
          "INSERT INTO research_console.evidence(id,firm_id,source_type,category,title,summary,url,confidence,notes,import_batch_id,provenance) VALUES($1,$2,$3,'services','Original directory workbook evidence',$4,$5,'Imported — not rechecked',$6,$7,$8)",
          [
            id,
            firm.id,
            row["Independent evidence URL"] ? "Firm website" : "ICAEW",
            summary,
            url,
            "Historical classification retained as provenance, not approval: " +
              row.Classification,
            batch.id,
            JSON.stringify({ kind: "directory", original: row }),
          ],
        );
      }
    }
  }
  const summary = {
    ...batch.summary,
    imported: added.length,
    matched: firms.length - added.length,
    changed,
    added,
    assessmentIds,
    evidenceIds,
    conflicts,
    methodologyId,
    verified: true,
  };
  await c.query(
    "UPDATE research_console.imports SET status='committed',summary=$2 WHERE id=$1",
    [batch.id, JSON.stringify(summary)],
  );
  return { id: batch.id, status: "committed", summary };
}
