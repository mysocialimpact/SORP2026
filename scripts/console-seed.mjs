// Emits reviewable seed SQL; does not connect to a database or modify public data.
import { readFileSync } from "node:fs";
const candidates = JSON.parse(readFileSync("src/data/accountants.json"));
const researched = JSON.parse(
  readFileSync("src/data/accountants-research.json"),
);
const all = [...candidates, ...researched];
const q = (v) =>
  v === null || v === undefined
    ? "NULL"
    : "'" + String(v).replaceAll("'", "''") + "'";
const j = (v) => q(JSON.stringify(v)) + "::jsonb";
const key = (n) =>
  n
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const lines = [];
for (const name of [
  "Burton Sweet",
  "Ecovis Wingrave Yeats",
  "Moore Kingston Smith",
  "Frank S Lachman",
])
  if (!all.some((f) => key(f.name) === key(name)))
    all.push({ name, website: null, slug: key(name).replaceAll(" ", "-") });
for (const f of all) {
  const domain = f.website
    ? new URL(f.website).hostname.replace(/^www\./, "")
    : null;
  const condition = `NOT EXISTS(SELECT 1 FROM research_console.firms WHERE name_key=${q(key(f.name))} OR icaew_url=${q(f.icaewUrl)})`;
  lines.push(
    `INSERT INTO research_console.firms(name,name_key,website,domain,icaew_url,icaew_tag) SELECT ${q(f.name)},${q(key(f.name))},${q(f.website || null)},${q(domain)},${q(f.icaewUrl)},${f.spreadsheetRow ? "true" : "NULL"} WHERE ${condition}`,
  );
  const id = `(SELECT id FROM research_console.firms WHERE name_key=${q(key(f.name))} ORDER BY created_at LIMIT 1)`;
  const imported = `NOT EXISTS(SELECT 1 FROM research_console.history WHERE entity='initial-import' AND entity_id=${q(f.slug)})`;
  if (f.location)
    lines.push(
      `INSERT INTO research_console.offices(firm_id,town,postcode,source_url,verification) SELECT ${id},${q(f.location)},${q(f.postcode)},${q(f.icaewUrl)},'Imported — unverified' WHERE ${imported}`,
    );
  for (const o of f.offices || [])
    lines.push(
      `INSERT INTO research_console.offices(firm_id,address,postcode,telephone,source_url,verification) SELECT ${id},${q(o.address)},${q(o.postcode)},${q(o.phone)},${q(o.source)},'Prior website research — inspect source' WHERE ${imported}`,
    );
  for (const p of f.people || [])
    lines.push(
      `INSERT INTO research_console.people(firm_id,name,role,profile_url,notes) SELECT ${id},${q(p.name)},${q(p.role)},${q(p.source)},'Preserved prior research. Qualifications require confirmation in the console.' WHERE ${imported}`,
    );
  if (f.evidence)
    lines.push(
      `INSERT INTO research_console.evidence(firm_id,source_type,category,title,summary,url,accessed_at,confidence,notes) SELECT ${id},'Firm website','services','Preserved directory research',${q(f.evidence)},${q(f.evidenceUrl || null)},${q(f.reviewed)},'Needs review','Imported from existing repository research; not a newly completed console assessment.' WHERE ${imported}`,
    );
  for (const e of f.services || [])
    lines.push(
      `INSERT INTO research_console.evidence(firm_id,source_type,category,title,summary,url,accessed_at,confidence,notes) SELECT ${id},'Firm website',${q(e.id === "sorp" ? "sorp" : "services")},${q(e.id + " — preserved evidence")},${q(e.evidence)},${q(e.source)},${q(f.reviewed)},'Needs review','Prior source-linked research; verify before scoring.' WHERE ${imported}`,
    );
  lines.push(
    `INSERT INTO research_console.history(firm_id,entity,entity_id,next,reason,actor) SELECT ${id},'initial-import',${q(f.slug)},${j(f)},'Preserved complete existing directory source record; unreviewed console candidate','Repository import' WHERE ${imported}`,
  );
}
lines.push(
  `INSERT INTO research_console.imports(filename,fingerprint,raw_rows,status,summary,actor) VALUES('Existing ICAEW import + repository research','repository-directory-v1',${j({ candidates, researched })},'committed',${j({ imported: all.length, pilot: "Not supplied", notes: "No completed research or scores inferred from imported classifications." })},'Repository import') ON CONFLICT(fingerprint) DO NOTHING`,
);
console.log(lines.map((s) => s + ";").join("\n"));
