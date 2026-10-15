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
    SELECT r.user_id,r.filename,r.file_bytes FROM sorp_auth.report_review r
    WHERE r.id=$1 AND r.status<>'uploading' AND r.file_bytes IS NOT NULL
      AND ($3::boolean OR (r.user_id=$2 AND r.organisation_id IS NULL)
        OR (r.organisation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM sorp_auth.membership m WHERE m.organisation_id=r.organisation_id
            AND m.user_id=$2 AND m.status='active' AND m.role IN ('owner','admin')))
        OR (r.organisation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM sorp_auth.adviser_client_access a
          JOIN sorp_auth.membership m ON m.organisation_id=a.adviser_organisation_id
          JOIN sorp_auth.entitlement e ON e.organisation_id=a.adviser_organisation_id
          WHERE a.charity_organisation_id=r.organisation_id AND a.status='active'
            AND a.permissions->>'reports'='true' AND m.user_id=$2 AND m.status='active'
            AND e.plan IN ('Adviser','Enterprise') AND e.status<>'suspended'
            AND (e.status<>'complimentary_partner' OR e.complimentary_end IS NULL OR e.complimentary_end>now())
        )))`, [id, identity.account.id, identity.platformAccess.founder]);
  const row = result.rows[0];
  if (!row) return new Response(null, { status: 404 });
  if (row.user_id !== identity.account.id) {
    await sorpAuthPool().query(`INSERT INTO sorp_auth.audit_event(actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'report_review',$3)`, [identity.account.id,
      identity.platformAccess.founder ? "founder_report_downloaded" : "shared_report_downloaded", id]);
  }
  const safeName = row.filename.replace(/[\x00-\x1f\x7f"\\/]/g, "_").slice(0, 180);
  return new Response(new Uint8Array(row.file_bytes), { headers: {
    "content-type": "application/pdf", "content-disposition": `attachment; filename="${safeName}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex",
  } });
}
