import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
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
];
export function backupConfiguration() {
  return {
    configured: required.every((k) => Boolean(process.env[k])),
    missing: required.filter((k) => !process.env[k]),
  };
}
export async function completeBackup() {
  const c = await database().connect();
  try {
    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables: Record<string, unknown[]> = {};
    const names = (
      await c.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='research_console' AND table_type='BASE TABLE' ORDER BY table_name",
      )
    ).rows;
    for (const { table_name: name } of names) {
      if (!/^[a-z_]+$/.test(name))
        throw new Error("Unsupported table identifier.");
      tables[name] = (
        await c.query(`SELECT to_jsonb(t) row FROM research_console.${name} t`)
      ).rows.map((r) => r.row);
    }
    await c.query("COMMIT");
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      schema: "research_console",
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
  try {
    const backup = await completeBackup();
    const plaintext = Buffer.from(JSON.stringify(backup));
    const sha = createHash("sha256").update(plaintext).digest("hex");
    const encrypted = encryptBackup(plaintext, secret),
      key =
        prefix +
        new Date().toISOString().replaceAll(":", "-") +
        "-" +
        run.id +
        ".json.enc";
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
      }),
    );
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
    const previousRestore=(await query("SELECT completed_at FROM research_console.backup_runs WHERE status='verified' AND details->>'restoreVerified'='true' AND completed_at>now()-interval '7 days' ORDER BY completed_at DESC LIMIT 1"))[0];
    const restore=(!previousRestore||new Date().getUTCDay()===0)?await restoreBackupForTest(JSON.parse(decryptBackup(downloaded,secret).toString())):null;
    const details = {
      tables: Object.fromEntries(
        Object.entries(backup.tables).map(([k, v]) => [k, v.length]),
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
      "UPDATE research_console.backup_runs SET status='failed',completed_at=now(),details=$2 WHERE id=$1",
      [
        run.id,
        JSON.stringify({
          message: "Backup failed; inspect private server logs and retry.",
        }),
      ],
    );
    console.error(
      "Console backup failed",
      run.id,
      error instanceof Error ? error.name : "Error",
    );
    throw new Error(
      "Backup failed. Your existing backups are retained; the console shows an alert.",
    );
  } finally {
    s3.destroy();
  }
}
