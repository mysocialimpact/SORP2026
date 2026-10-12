// Explicit offline backup: CONSOLE_DATABASE_URL=... node scripts/console-backup.mjs /secure/path/backup.json
import pg from "pg";
import { writeFile } from "node:fs/promises";
const path = process.argv[2];
if (!path || !process.env.CONSOLE_DATABASE_URL)
  throw new Error("Supply a private output path and CONSOLE_DATABASE_URL.");
const client = new pg.Client({
  connectionString: process.env.CONSOLE_DATABASE_URL,
});
await client.connect();
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const tables = {};
  for (const name of [
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
  ])
    tables[name] = (
      await client.query(`SELECT * FROM research_console.${name}`)
    ).rows;
  await client.query("COMMIT");
  await writeFile(
    path,
    JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      schema: "research_console",
      tables,
    }),
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Private, consistent research backup written. Store it outside the deployment filesystem.",
  );
} finally {
  await client.end();
}
