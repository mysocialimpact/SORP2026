import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isReadinessComplete } from "@/lib/readiness-status";
import { sorpAuthPool } from "./auth";
import { independentIdentity } from "./identity";

const CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_BYTES = 15 * 1024 * 1024;

type Input = Record<string, unknown>;
type ReviewRow = { id: string; filename: string; size_bytes: number; status: string; created_at: Date };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const present = (row: ReviewRow) => ({ id: row.id, filename: row.filename,
  sizeBytes: row.size_bytes, status: row.status, feedbackReady: row.status === "feedback_ready",
  createdAt: row.created_at.toISOString() });

export async function listReportReviews(userId: string) {
  const rows = await sorpAuthPool().query<ReviewRow>(`SELECT id,filename,size_bytes,status,created_at
    FROM sorp_auth.report_review WHERE user_id=$1 AND status<>'uploading'
    ORDER BY created_at DESC LIMIT 100`, [userId]);
  return { reviews: rows.rows.map(present) };
}

export async function prepareReportUpload(request: Request, userId: string, progress: unknown, input: Input) {
  if (!isReadinessComplete(progress as { step?: string })) {
    throw new Error("Complete your free SORP readiness review before starting a Charity Impact Report review.");
  }
  const filename = typeof input.filename === "string" ? input.filename.trim() : "";
  const organisation = typeof input.organisation === "string" ? input.organisation.trim() : "";
  const context = typeof input.customerContext === "string" ? input.customerContext.trim() : "";
  const size = input.sizeBytes;
  if (!filename.toLowerCase().endsWith(".pdf") || filename.length > 180 || filename.length < 5 ||
      input.contentType !== "application/pdf" || !Number.isInteger(size) ||
      Number(size) < 1 || Number(size) > MAX_BYTES || organisation.length > 180 || context.length > 2000) {
    throw new Error("Choose a PDF report no larger than 15 MB and check its details.");
  }
  const token = randomBytes(32).toString("hex");
  const client = await sorpAuthPool().connect();
  let id: string;
  try {
    await client.query("BEGIN");
    await client.query('SELECT id FROM sorp_auth."user" WHERE id=$1 FOR UPDATE', [userId]);
    await client.query("DELETE FROM sorp_auth.report_review WHERE user_id=$1 AND status='uploading' AND upload_expires_at<now()", [userId]);
    const active = await client.query<{ count: number }>(`SELECT count(*)::int count FROM sorp_auth.report_review
      WHERE user_id=$1 AND status='uploading'`, [userId]);
    if (active.rows[0].count >= 3) throw new Error("Finish or let the existing uploads expire before starting another.");
    const row = await client.query<{ id: string }>(`INSERT INTO sorp_auth.report_review
      (user_id,filename,organisation,customer_context,size_bytes,status,upload_token_hash,upload_expires_at)
      VALUES($1,$2,$3,$4,$5,'uploading',$6,now()+interval '30 minutes') RETURNING id`,
    [userId, filename, organisation, context, size, digest(token)]);
    id = row.rows[0].id;
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  const requestUrl = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1);
  const host = request.headers.get("host") || requestUrl.host;
  const url = new URL(`/api/sorp-report-upload/`, `${proto}://${host}`);
  return { upload: { mode: "chunked", url: url.toString(), token, id,
    chunkBytes: CHUNK_BYTES, chunks: Math.ceil(Number(size) / CHUNK_BYTES) } };
}

const response = (body: unknown, status = 200) => Response.json(body,
  { status, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex" } });

export async function uploadReportChunk(request: Request) {
  const url = new URL(request.url);
  const expected = `${request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)}://${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site")
    return response({ error: "Upload from this website only." }, 403);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return response({ error: "Expected a file chunk." }, 415);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > CHUNK_BYTES + 16_384) return response({ error: "The file chunk is too large." }, 413);
  const identity = await independentIdentity(request.headers);
  if (!identity) return response({ error: "Sign in to upload a report." }, 401);
  if (!isReadinessComplete(identity.progress as { step?: string }))
    return response({ error: "Complete the free readiness review first." }, 403);
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const index = Number(form?.get("index"));
  const file = form?.get("file");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) ||
      !Number.isInteger(index) || index < 0 || index > 4 || !(file instanceof File) ||
      file.size < 1 || file.size > CHUNK_BYTES) {
    return response({ error: "The upload chunk is invalid." }, 400);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const client = await sorpAuthPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<ReviewRow & { size_bytes: number }>(`SELECT id,filename,size_bytes,status,created_at
      FROM sorp_auth.report_review WHERE user_id=$1 AND upload_token_hash=$2
      AND status='uploading' AND upload_expires_at>now() FOR UPDATE`,
    [identity.account.id, digest(token)]);
    const review = found.rows[0];
    if (!review) { await client.query("ROLLBACK"); return response({ error: "The upload is expired or unavailable." }, 403); }
    const expectedChunks = Math.ceil(review.size_bytes / CHUNK_BYTES);
    const expectedSize = Math.min(CHUNK_BYTES, review.size_bytes - index * CHUNK_BYTES);
    if (index >= expectedChunks || bytes.length !== expectedSize) {
      await client.query("ROLLBACK"); return response({ error: "The upload size does not match." }, 400);
    }
    const inserted = await client.query(`INSERT INTO sorp_auth.report_upload_chunk(review_id,chunk_index,bytes)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING chunk_index`, [review.id, index, bytes]);
    if (!inserted.rowCount) {
      await client.query("ROLLBACK"); return response({ error: "This chunk was already uploaded." }, 409);
    }
    const chunks = await client.query<{ chunk_index: number; bytes: Buffer }>(`SELECT chunk_index,bytes
      FROM sorp_auth.report_upload_chunk WHERE review_id=$1 ORDER BY chunk_index`, [review.id]);
    if (chunks.rowCount !== expectedChunks) {
      await client.query("COMMIT");
      return response({ ok: true, complete: false, received: chunks.rowCount });
    }
    const complete = Buffer.concat(chunks.rows.map(row => row.bytes));
    if (complete.length !== review.size_bytes || !complete.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
        !complete.subarray(-2048).includes(Buffer.from("%%EOF"))) {
      await client.query("ROLLBACK"); return response({ error: "The file is not a valid PDF." }, 400);
    }
    const completed = await client.query<ReviewRow>(`UPDATE sorp_auth.report_review SET
      status='awaiting_payment',file_bytes=$2,upload_token_hash=NULL,upload_expires_at=NULL,
      updated_at=now() WHERE id=$1 RETURNING id,filename,size_bytes,status,created_at`, [review.id, complete]);
    await client.query("DELETE FROM sorp_auth.report_upload_chunk WHERE review_id=$1", [review.id]);
    await client.query("COMMIT");
    return response({ ok: true, complete: true, review: present(completed.rows[0]) });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
