// Restore only into a newly created, empty test database. Never overwrites records.
import pg from "pg";
import { readFile } from "node:fs/promises";
const [file] = process.argv.slice(2);
if (!file || !process.env.CONSOLE_RESTORE_DATABASE_URL)
  throw new Error(
    "Supply backup file and CONSOLE_RESTORE_DATABASE_URL for an empty test database.",
  );
if (
  process.env.CONSOLE_RESTORE_DATABASE_URL === process.env.CONSOLE_DATABASE_URL
)
  throw new Error("Restore destination must differ from the live database.");
const backup = JSON.parse(await readFile(file, "utf8"));
const names = [
  "migrations",
  "methodologies",
  "firms",
  "offices",
  "people",
  "runs",
  "sources",
  "evidence",
  "assessments",
  "reviews",
  "imports",
  "history",
  "baselines",
  "visits",
  "benchmarks",
  "backup_runs",
    "ai_usage",
    "discovery_cache",
];
if (
  backup.schema !== "research_console" ||
  !backup.tables ||
  Object.keys(backup.tables).some((t) => !names.includes(t))
)
  throw new Error("Invalid backup format.");
const c = new pg.Client({
  connectionString: process.env.CONSOLE_RESTORE_DATABASE_URL,
});
await c.connect();
try {
  if (
    (await c.query("SELECT to_regnamespace('research_console') exists")).rows[0]
      .exists
  )
    throw new Error(
      "Restore requires a database without a research_console schema.",
    );
  await c.query("BEGIN");
  for (const migration of [
    "001_research_console.sql",
    "002_console_completion.sql",
    "003_icaew_benchmark.sql",
    "004_console_openai.sql",
    "005_people_archive.sql",
  ]) {
    const sql = (
      await readFile(
        new URL("../migrations/" + migration, import.meta.url),
        "utf8",
      )
    )
      .replace(/^BEGIN;\s*/, "")
      .replace(/COMMIT;\s*$/, "");
    await c.query(sql);
  }
  // Only the two seed tables in the newly created schema exist at this point.
  await c.query(
    "DELETE FROM research_console.migrations; DELETE FROM research_console.methodologies",
  );
  // Imported evidence and assessments reference batches; firms can reference merged firms.
  const order = [
    "migrations",
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
    "benchmarks",
    "backup_runs",
    "ai_usage",
    "discovery_cache",
  ];
  for (const table of order) {
    const pending = [...(backup.tables[table] ?? [])];
    while (pending.length) {
      const index = pending.findIndex(
        (row) =>
          !["firms", "methodologies", "assessments"].includes(table) ||
          ![row.merged_into, row.parent_id, row.previous_id]
            .filter(Boolean)
            .some((id) => pending.some((p) => p.id === id)),
      );
      if (index < 0) throw new Error("Cyclic backup relationship.");
      const row = pending.splice(index, 1)[0];
      const columns = Object.keys(row);
      if (columns.some((k) => !/^[a-z_]+$/.test(k)))
        throw new Error("Invalid column name.");
      await c.query(
        `INSERT INTO research_console.${table} (${columns.join(",")}) SELECT ${columns.join(",")} FROM jsonb_populate_record(NULL::research_console.${table},$1::jsonb)`,
        [JSON.stringify(row)],
      );
    }
  }
  for (const [table, rows] of Object.entries(backup.tables)) {
    const restored = (
      await c.query(`SELECT to_jsonb(t) row FROM research_console.${table} t`)
    ).rows.map((x) => x.row);
    if (restored.length !== rows.length)
      throw new Error("Restore count mismatch: " + table);
    // Compare every original field; additional migration defaults are allowed.
    const key = (r) => String(r.id ?? r.version ?? r.actor);
    for (const row of rows) {
      const other = restored.find((r) => key(r) === key(row));
      if (
        !other ||
        Object.keys(row).some(
          (k) => JSON.stringify(other[k]) !== JSON.stringify(row[k]),
        )
      )
        throw new Error("Restore value mismatch: " + table);
    }
  }
  await c.query("COMMIT");
  console.log(
    "Restore verified: all original rows, fields and relationships match.",
  );
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  await c.end();
}
