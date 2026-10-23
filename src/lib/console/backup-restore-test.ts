import { Client } from "pg";

type Backup = { version: 2; tables: Record<string, Record<string, unknown[]>> };
const identifier = /^[a-z_][a-z0-9_]*$/;

// Restores only into the dedicated schema on a separate recovery branch/database.
export async function restoreBackupForTest(backup: Backup) {
  const destination = process.env.CONSOLE_BACKUP_RESTORE_DATABASE_URL;
  const origin = process.env.CONSOLE_DATABASE_URL;
  if (!destination || !origin) throw new Error("Isolated recovery-test database needs configuration.");
  const target = new URL(destination), source = new URL(origin);
  if (target.hostname.replace("-pooler", "") === source.hostname.replace("-pooler", "") && target.pathname === source.pathname)
    throw new Error("Recovery test cannot run against the source database.");
  if (backup.version !== 2 || !backup.tables?.research_console?.backup_runs || !backup.tables.public)
    throw new Error("Complete application backup is required for recovery testing.");

  const client = new Client({ connectionString: destination, statement_timeout: 30000 });
  let phase = "connect";
  let currentTable = "";
  let connected = false;
  try {
    await client.connect();
    connected = true;
    phase = "begin";
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('console-backup-restore-test'))");
    phase = "schema";
    const schema = await client.query(
      "SELECT 1 FROM pg_namespace WHERE nspname='console_backup_restore'",
    );
    if (!schema.rowCount)
      throw new Error("The isolated recovery schema must be provisioned before backup verification.");
    let restoredTables = 0;
    for (const [schema, tables] of Object.entries(backup.tables)) {
      if (!identifier.test(schema)) throw new Error("Invalid recovery schema.");
      for (const [table, rows] of Object.entries(tables)) {
        phase = "table";
        currentTable = `${schema}.${table}`;
        if (!identifier.test(table) || `${schema}__${table}`.length > 63 || !Array.isArray(rows))
          throw new Error("Invalid recovery table.");
        const restored = `console_backup_restore.${schema}__${table}`;
        await client.query(`CREATE TABLE IF NOT EXISTS ${restored} (LIKE ${schema}.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`);
        await client.query(`TRUNCATE TABLE ${restored}`);
        await client.query(`INSERT INTO ${restored} SELECT * FROM jsonb_populate_recordset(NULL::${restored},$1::jsonb)`, [JSON.stringify(rows)]);
        const difference = await client.query(`WITH expected AS (SELECT * FROM jsonb_populate_recordset(NULL::${restored},$1::jsonb)) SELECT 1 FROM ((SELECT * FROM expected EXCEPT ALL SELECT * FROM ${restored}) UNION ALL (SELECT * FROM ${restored} EXCEPT ALL SELECT * FROM expected)) difference LIMIT 1`, [JSON.stringify(rows)]);
        if (difference.rowCount) throw new Error(`Restored data differs: ${schema}.${table}`);
        restoredTables++;
      }
    }
    phase = "relationships";
    currentTable = "";
    const foreignKeys = (await client.query(`
      SELECT ns.nspname source_schema, src.relname source_table,
        nd.nspname target_schema, dst.relname target_table,
        array_agg(sa.attname::text ORDER BY columns.ordinality) source_columns,
        array_agg(da.attname::text ORDER BY columns.ordinality) target_columns
      FROM pg_constraint constraint_record
      JOIN pg_class src ON src.oid = constraint_record.conrelid
      JOIN pg_namespace ns ON ns.oid = src.relnamespace
      JOIN pg_class dst ON dst.oid = constraint_record.confrelid
      JOIN pg_namespace nd ON nd.oid = dst.relnamespace
      JOIN unnest(constraint_record.conkey, constraint_record.confkey) WITH ORDINALITY AS columns(source_number, target_number, ordinality) ON true
      JOIN pg_attribute sa ON sa.attrelid = src.oid AND sa.attnum = columns.source_number
      JOIN pg_attribute da ON da.attrelid = dst.oid AND da.attnum = columns.target_number
      WHERE constraint_record.contype = 'f' AND ns.nspname IN ('public','research_console','sorp_auth','msi_products')
      GROUP BY constraint_record.oid, ns.nspname, src.relname, nd.nspname, dst.relname
    `)).rows;
    let relationshipsChecked = 0;
    for (const key of foreignKeys) {
      const {source_schema, source_table, target_schema, target_table, source_columns, target_columns} = key;
      currentTable = `${source_schema}.${source_table}`;
      if (!backup.tables[source_schema]?.[source_table] || !backup.tables[target_schema]?.[target_table]) continue;
      if (![source_schema, source_table, target_schema, target_table, ...source_columns, ...target_columns].every((value: string) => identifier.test(value)))
        throw new Error("Invalid recovery relationship.");
      const on = source_columns.map((column: string, index: number) => `s.${column}=d.${target_columns[index]}`).join(" AND ");
      const populated = source_columns.map((column: string) => `s.${column} IS NOT NULL`).join(" AND ");
      const missing = target_columns.map((column: string) => `d.${column} IS NULL`).join(" AND ");
      const broken = await client.query(`SELECT 1 FROM console_backup_restore.${source_schema}__${source_table} s LEFT JOIN console_backup_restore.${target_schema}__${target_table} d ON ${on} WHERE ${populated} AND ${missing} LIMIT 1`);
      if (broken.rowCount) throw new Error(`Broken restored relationship: ${source_schema}.${source_table}`);
      relationshipsChecked++;
    }
    phase = "commit";
    currentTable = "";
    await client.query("COMMIT");
    return { restored: true, restoredTables, relationshipsChecked };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    const message = error instanceof Error ? error.message : "Unknown restore error";
    console.error("Isolated backup restore failed", { phase, table: currentTable, code,
      target: target.hostname, message: message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]").slice(0, 240) });
    if (connected) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (connected) await client.end();
  }
}
