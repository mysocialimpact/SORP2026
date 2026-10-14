import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import { independentIdentity } from "@/lib/sorp-auth/identity";
import { sorpAuthPool } from "@/lib/sorp-auth/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!independentAuthCutover()) return new Response(null, { status: 404 });
  const identity = await independentIdentity(request.headers);
  if (!identity) return new Response(null, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const result = await sorpAuthPool().query<{ user_id: string; filename: string; file_bytes: Buffer }>(`
    SELECT user_id,filename,file_bytes FROM sorp_auth.report_review
    WHERE id=$1 AND status<>'uploading' AND file_bytes IS NOT NULL
      AND (user_id=$2 OR $3::boolean)`, [id, identity.account.id, identity.platformAccess.founder]);
  const row = result.rows[0];
  if (!row) return new Response(null, { status: 404 });
  if (row.user_id !== identity.account.id) {
    await sorpAuthPool().query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,'founder_report_downloaded','report_review',$2)`, [identity.account.id, id]);
  }
  const safeName = row.filename.replace(/[\x00-\x1f\x7f"\\/]/g, "_").slice(0, 180);
  return new Response(new Uint8Array(row.file_bytes), { headers: {
    "content-type": "application/pdf", "content-disposition": `attachment; filename="${safeName}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex",
  } });
}
