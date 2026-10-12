// Release helper: convert a verified isolated import into guarded, additive SQL.
// Does not execute remote SQL. Each changed row must still match the pre-import backup.
import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
const backup = JSON.parse(await readFile(process.argv[2], "utf8")).tables;
const c = new pg.Client({ connectionString: process.env.CONSOLE_DATABASE_URL });
await c.connect();
const quote = (v) => "'" + JSON.stringify(v).replaceAll("'", "''") + "'::jsonb";
const result = [];
for (const table of [
  "methodologies",
  "imports",
  "firms",
  "offices",
  "people",
  "runs",
  "sources",
  "evidence",
  "assessments",
  "reviews",
  "history",
  "baselines",
  "visits",
]) {
  const rows = (
    await c.query(`SELECT to_jsonb(t) row FROM research_console.${table} t`)
  ).rows.map((r) => r.row);
  const original = backup[table] ?? [];
  const key = table === "visits" ? "actor" : "id";
  const added = rows.filter((r) => !original.some((o) => o[key] === r[key]));
  // Compare only original fields, so new migration defaults are not mistaken for edits.
  const changed = rows.flatMap((r) => {
    const old = original.find((o) => o[key] === r[key]);
    return old &&
      Object.keys(old).some(
        (k) => JSON.stringify(old[k]) !== JSON.stringify(r[k]),
      )
      ? [{ old, next: r }]
      : [];
  });
  for (let i = 0; i < added.length; i += 10)
    result.push(
      `INSERT INTO research_console.${table} SELECT * FROM jsonb_populate_recordset(NULL::research_console.${table},${quote(added.slice(i, i + 10))})`,
    );
  for (const { old, next } of changed) {
    const columns = Object.keys(old);
    const sets = Object.keys(next).filter((k) => k !== key);
    result.push(
      `DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM research_console.${table} t,jsonb_populate_record(NULL::research_console.${table},${quote(old)}) o WHERE t.${key}=o.${key} AND ROW(${columns.map((k) => "t." + k).join(",")}) IS NOT DISTINCT FROM ROW(${columns.map((k) => "o." + k).join(",")})) THEN RAISE EXCEPTION 'Live record changed; rerun import preview'; END IF; UPDATE research_console.${table} t SET (${sets.join(",")})=(SELECT ${sets.join(",")} FROM jsonb_populate_record(NULL::research_console.${table},${quote(next)})) WHERE t.${key}=${"'" + String(next[key]).replaceAll("'", "''") + "'"}; END $guard$`,
    );
  }
  console.log(
    JSON.stringify({
      table,
      added: added.length,
      changed: changed.length,
      total: rows.length,
    }),
  );
}
await writeFile(process.argv[3], JSON.stringify(result), {
  mode: 0o600,
  flag: "wx",
});
await c.end();
