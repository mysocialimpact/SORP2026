import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { database, query } from "./db";
import { encryptBackup, decryptBackup, encryptionKey } from "./backup-crypto";
import {restoreBackupForTest} from './backup-restore-test';
const required = [
  "CONSOLE_BACKUP_BUCKET",
  "CONSOLE_BACKUP_ENDPOINT",
  "CONSOLE_BACKUP_ACCESS_KEY_ID",
  "CONSOLE_BACKUP_SECRET_ACCESS_KEY",
  "CONSOLE_BACKUP_ENCRYPTION_KEY",
  "CONSOLE_BACKUP_RESTORE_DATABASE_URL",
  "SORP_BACKUP_DATABASE_URL",
];
export function backupConfiguration() {
  return {
    configured: required.every((k) => Boolean(process.env[k])),
    missing: required.filter((k) => !process.env[k]),
  };
}
const applicationSchemas = ["public", "research_console", "sorp_auth", "msi_products"] as const;
let backupPool: Pool | undefined;

function backupDatabase() {
  if (!process.env.SORP_BACKUP_DATABASE_URL) throw new Error("The full application backup reader needs connecting.");
  if (!backupPool) {
    backupPool = new Pool({ connectionString: process.env.SORP_BACKUP_DATABASE_URL,
      max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000, statement_timeout: 30000 });
    attachDatabasePool(backupPool);
  }
  return backupPool;
}

export async function completeBackup(schemas: readonly (typeof applicationSchemas)[number][] = applicationSchemas) {
  if (!schemas.includes("research_console")) throw new Error("Research console backup status is required.");
  const c = await (schemas.length === 1 ? database() : backupDatabase()).connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables: Record<string, Record<string, unknown[]>> = {};
    const names = (
      await c.query(
        "SELECT n.nspname table_schema,c.relname table_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1::text[]) AND c.relkind IN ('r','p') ORDER BY n.nspname,c.relname",
        [schemas],
      )
    ).rows;
    if (!names.some(({table_schema,table_name}) => table_schema === "research_console" && table_name === "backup_runs"))
      throw new Error("Research console backup status table is missing.");
    for (const { table_schema: schema, table_name: name } of names) {
      if (!/^[a-z_]+$/.test(schema) || !/^[a-z_]+$/.test(name))
        throw new Error("Unsupported table identifier.");
      tables[schema] ??= {};
      tables[schema][name] = (
        await c.query(`SELECT to_jsonb(t) row FROM ${schema}.${name} t`)
      ).rows.map((r) => r.row);
    }
    await c.query("COMMIT");
    return {
      version: 2 as const,
      createdAt: new Date().toISOString(),
      tables,
    };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
export async function runBackup() {
  const config = backupConfiguration();
  if (!config.configured)
    throw new Error(
      "Off-site backups — awaiting storage configuration: " +
        config.missing.join(", "),
    );
  const secret = process.env.CONSOLE_BACKUP_ENCRYPTION_KEY!;
  encryptionKey(secret);
  const endpoint = new URL(process.env.CONSOLE_BACKUP_ENDPOINT!);
  if (endpoint.protocol !== "https:")
    throw new Error("Backup storage requires HTTPS.");
  const bucket = process.env.CONSOLE_BACKUP_BUCKET!,
    prefix = process.env.CONSOLE_BACKUP_PREFIX || "daily/";
  if (!/^[a-z0-9-]+\/$/.test(prefix)) throw new Error("Invalid backup prefix.");
  const s3 = new S3Client({
    endpoint: endpoint.href,
    region: process.env.CONSOLE_BACKUP_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.CONSOLE_BACKUP_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CONSOLE_BACKUP_SECRET_ACCESS_KEY!,
    },
  });
  const [run] = await query<{ id: string }>(
    "INSERT INTO research_console.backup_runs(status) VALUES('running') RETURNING id",
  );
  let key: string | undefined;
  let stage = "export";
  try {
    const backup = await completeBackup();
    const plaintext = Buffer.from(JSON.stringify(backup));
    const sha = createHash("sha256").update(plaintext).digest("hex");
    const encrypted = encryptBackup(plaintext, secret);
    key =
        prefix +
        new Date().toISOString().replaceAll(":", "-") +
        "-" +
        run.id +
        ".json.enc";
    stage = "upload";
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
      }),
    );
    stage = "download";
    const returned = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const downloaded = Buffer.from(await returned.Body!.transformToByteArray());
    if (
      createHash("sha256")
        .update(decryptBackup(downloaded, secret))
        .digest("hex") !== sha
    )
      throw new Error("Backup download/decryption verification failed.");
    stage = "restore";
    const previousRestore=(await query("SELECT completed_at FROM research_console.backup_runs WHERE status='verified' AND details->>'restoreVerified'='true' AND details->>'formatVersion'='2' AND completed_at>now()-interval '7 days' ORDER BY completed_at DESC LIMIT 1"))[0];
    const restore=(!previousRestore||new Date().getUTCDay()===0)?await restoreBackupForTest(JSON.parse(decryptBackup(downloaded,secret).toString())):null;
    const details = {
      formatVersion: 2,
      tables: Object.fromEntries(
        Object.entries(backup.tables).flatMap(([schema, tables]) =>
          Object.entries(tables).map(([name, rows]) => [`${schema}.${name}`, rows.length])),
      ),
      bytes: encrypted.length,
      encrypted: true,
      downloadVerified: true,
      restoreVerified:Boolean(restore?.restored),
      lastRestore:restore?new Date().toISOString():previousRestore?.completed_at,
      retentionDays: 30,
      retentionEnabled:
        Boolean(restore?.restored||previousRestore),
    };
    await query(
      "UPDATE research_console.backup_runs SET status='verified',completed_at=now(),object_key=$2,sha256=$3,details=$4 WHERE id=$1",
      [run.id, key, sha, JSON.stringify(details)],
    );
    stage = "retention";
    // Activation follows an isolated restore check. Only this job's exact prefix and envelope names are eligible.
    if (details.retentionEnabled) {
      let token: string | undefined;
      do {
        const list = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        for (const object of list.Contents ?? [])
          if (
            object.Key?.startsWith(prefix) &&
            /\d{4}-\d{2}-\d{2}T[\d.-]+Z-[a-f0-9-]{36}\.json\.enc$/.test(
              object.Key,
            ) &&
            object.LastModified &&
            object.LastModified.getTime() < Date.now() - 30 * 86400000
          )
            await s3.send(
              new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }),
            );
        token = list.IsTruncated ? list.NextContinuationToken : undefined;
      } while (token);
    }
    return { id: run.id, status: "verified", key, sha256: sha, ...details };
  } catch (error) {
    await query(
      "UPDATE research_console.backup_runs SET status='failed',completed_at=now(),object_key=$2,details=$3 WHERE id=$1",
      [
        run.id,
        stage === "export" || stage === "upload" ? null : key,
        JSON.stringify({
          message: "Backup failed; inspect private server logs and retry.", stage,
        }),
      ],
    );
    console.error(
      "Console backup failed",
      run.id,
      stage,
      error instanceof Error ? error.name : "Error",
    );
    throw new Error(
      "Backup failed. Your existing backups are retained; the console shows an alert.",
    );
  } finally {
    s3.destroy();
  }
}
