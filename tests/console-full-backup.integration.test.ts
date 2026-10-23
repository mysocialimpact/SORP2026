import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { completeBackup } from "../src/lib/console/backups";
import { restoreBackupForTest } from "../src/lib/console/backup-restore-test";

async function main() {
const sourceUrl = process.env.CONSOLE_DATABASE_URL;
if (!sourceUrl || !sourceUrl.includes("127.0.0.1:5433"))
  throw new Error("Only the disposable local PostgreSQL fixture may run this test.");
const source = new Client({ connectionString: sourceUrl });
const databaseName = `sorp_backup_test_${randomUUID().replaceAll("-", "")}`;
const readerRole = `sorp_backup_${randomUUID().replaceAll("-", "")}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${databaseName}`;
const target = new Client({ connectionString: targetUrl.href });
await source.connect();
try {
  await source.query(`CREATE DATABASE ${databaseName}`);
  await target.connect();
  try {
    for (const file of ["001_research_console.sql", "002_console_completion.sql", "003_icaew_benchmark.sql", "004_console_openai.sql", "005_people_archive.sql"])
      await target.query(readFileSync(`migrations/${file}`, "utf8"));
    for (const client of [source, target]) {
      await client.query("CREATE TABLE public.backup_fixture_parent (id integer PRIMARY KEY, name text NOT NULL)");
      await client.query("CREATE TABLE public.backup_fixture_child (id integer PRIMARY KEY, parent_id integer REFERENCES public.backup_fixture_parent(id))");
    }
    await source.query("INSERT INTO public.backup_fixture_parent VALUES (1, 'preserve customer assessment')");
    await source.query("INSERT INTO public.backup_fixture_child VALUES (2, 1)");
    await source.query(`CREATE ROLE ${readerRole} LOGIN`);
    await source.query(`GRANT USAGE ON SCHEMA research_console TO ${readerRole}`);
    await source.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public,research_console TO ${readerRole}`);
    const readerUrl = new URL(sourceUrl);
    readerUrl.username = readerRole;
    process.env.SORP_BACKUP_DATABASE_URL = readerUrl.href;
    assert.equal((await source.query("SELECT has_table_privilege($1,'research_console.assessments','INSERT') allowed", [readerRole])).rows[0].allowed, false);
    const backup = await completeBackup();
    assert.equal(backup.version, 2);
    assert.equal(backup.tables.public.backup_fixture_parent.length, 1);
    assert.ok(backup.tables.research_console.assessments.length > 0);
    await source.query(`REVOKE SELECT ON public.backup_fixture_child FROM ${readerRole}`);
    await assert.rejects(completeBackup(), /permission denied/, "an unreadable table must fail the whole backup");
    await source.query(`GRANT SELECT ON public.backup_fixture_child TO ${readerRole}`);
    const consoleExport = await completeBackup(["research_console"]);
    assert.equal(consoleExport.tables.public, undefined, "console export must not include other customer records");
    process.env.CONSOLE_BACKUP_RESTORE_DATABASE_URL = targetUrl.href;
    const restored = await restoreBackupForTest(backup);
    assert.ok(restored.restored && restored.restoredTables >= 3);
    assert.ok(restored.relationshipsChecked >= 1);
    assert.equal((await target.query("SELECT name FROM console_backup_restore.public__backup_fixture_parent WHERE id=1")).rows[0].name, "preserve customer assessment");
    process.env.CONSOLE_BACKUP_RESTORE_DATABASE_URL = sourceUrl;
    await assert.rejects(restoreBackupForTest(backup), /cannot run against the source/);
    console.log(`PASS full application backup payload restores ${restored.restoredTables} tables and checks ${restored.relationshipsChecked} relationships in an isolated database`);
  } finally {
    await target.end();
  }
} finally {
  await source.query("DROP TABLE IF EXISTS public.backup_fixture_child, public.backup_fixture_parent");
  await source.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await source.end();
}
}

main().catch(error => { console.error(error); process.exitCode = 1; });
