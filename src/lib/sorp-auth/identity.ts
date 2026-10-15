import "server-only";
import { sorpAuth, sorpAuthPool } from "./auth";

export type IndependentMembership = {
  organisationId: string;
  name: string;
  type: "Charity" | "Adviser" | "Other";
  role: "owner" | "admin" | "member";
  entitlement: { plan: string; publishedPrice: number; payablePrice: number; status: string; complimentaryEnd: string | null };
};

export async function independentIdentity(headers: Headers) {
  const session = await sorpAuth().api.getSession({ headers });
  if (!session?.user || session.user.emailVerified !== true) return null;
  const user = session.user;
  const db = sorpAuthPool();
  const [profile, memberships, founder, access] = await Promise.all([
    db.query<{ position: string; organisation_label: string; progress: unknown;
      current_stage: number; completed_stages: number[]; last_saved_at: Date | null }>(
      `SELECT coalesce(p.position,'') position,coalesce(p.organisation_label,'') organisation_label,
         coalesce(a.progress,'{}'::jsonb) progress,coalesce(a.current_stage,1) current_stage,
         coalesce(a.completed_stages,'[]'::jsonb) completed_stages,a.last_saved_at
       FROM sorp_auth."user" u
       LEFT JOIN sorp_auth.profile p ON p.user_id=u.id
       LEFT JOIN sorp_auth.account_progress a ON a.user_id=u.id WHERE u.id=$1`, [user.id]),
    db.query<{
      organisation_id: string; name: string; type: IndependentMembership["type"];
      role: IndependentMembership["role"]; plan: string; published_price_pence: number;
      payable_price_pence: number; status: string; complimentary_end: Date | null;
    }>(`SELECT m.organisation_id,o.name,o.type,m.role,
         coalesce(e.plan,'Free') plan,coalesce(e.published_price_pence,0) published_price_pence,
         coalesce(e.payable_price_pence,0) payable_price_pence,
         coalesce(e.status,'standard') status,e.complimentary_end
       FROM sorp_auth.membership m JOIN sorp_auth.organisation o ON o.id=m.organisation_id
       LEFT JOIN sorp_auth.entitlement e ON e.organisation_id=o.id
       WHERE m.user_id=$1 AND m.status='active' ORDER BY o.name`, [user.id]),
    db.query<{ allowed: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM sorp_auth.founder_grant g
         JOIN sorp_auth."twoFactor" t ON t."userId"=g.user_id
         WHERE g.user_id=$1 AND g.revoked_at IS NULL AND t.verified=true
         AND g.granted_at < $2::timestamptz
         AND EXISTS(SELECT 1 FROM sorp_auth."user" u WHERE u.id=g.user_id AND u."twoFactorEnabled"=true)) allowed`,
      [user.id, session.session.createdAt]),
    db.query<{ id: string; adviser_name: string; charity_name: string;
      charity_organisation_id: string; permissions: Record<string, boolean>; status: string }>(`
      SELECT a.id::text,adviser.name adviser_name,charity.name charity_name,
        charity.id charity_organisation_id,a.permissions,a.status
      FROM sorp_auth.adviser_client_access a
      JOIN sorp_auth.organisation adviser ON adviser.id=a.adviser_organisation_id
      JOIN sorp_auth.organisation charity ON charity.id=a.charity_organisation_id
      JOIN sorp_auth.membership m ON m.organisation_id=charity.id
      WHERE m.user_id=$1 AND m.status='active'
        AND ((a.status='requested' AND m.role IN ('owner','admin')) OR a.status='active')
      ORDER BY a.updated_at DESC`, [user.id]),
  ]);
  const organisations = memberships.rows.map(row => ({
    organisationId: row.organisation_id, name: row.name, type: row.type, role: row.role,
    entitlement: { plan: row.plan, publishedPrice: row.published_price_pence,
      payablePrice: row.payable_price_pence, status: row.status,
      complimentaryEnd: row.complimentary_end?.toISOString() || null },
  }));
  return {
    signedIn: true as const,
    account: { id: user.id, email: user.email, name: user.name,
      position: profile.rows[0]?.position || "", organisation: profile.rows[0]?.organisation_label || "",
      currentStage: profile.rows[0]?.current_stage || 1,
      completedStages: profile.rows[0]?.completed_stages || [],
      lastSavedAt: profile.rows[0]?.last_saved_at?.toISOString() || null },
    progress: profile.rows[0]?.progress || {},
    platformAccess: { founder: founder.rows[0]?.allowed === true, memberships: organisations,
      approvalRequests: access.rows.filter(row => row.status === "requested").map(row => ({
        id: row.id, adviserName: row.adviser_name, charityName: row.charity_name,
        charityOrganisationId: row.charity_organisation_id, permissions: row.permissions })),
      activeClientAccess: access.rows.filter(row => row.status === "active").map(row => ({
        id: row.id, adviserName: row.adviser_name, charityName: row.charity_name,
        charityOrganisationId: row.charity_organisation_id, permissions: row.permissions })) },
  };
}
