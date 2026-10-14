/** Out-of-band founder bootstrap. Dry run unless --apply is supplied.
 * The target user must have verified email and a verified TOTP second factor.
 * A new MFA-protected sign-in is required after a grant becomes active.
 */
import { Pool } from "pg";

export async function grantFounder(options: { userId: string; email: string; operator: string;
  reason: string; databaseUrl: string; apply: boolean }) {
  const { userId, email, operator, reason, databaseUrl, apply } = options;
  if (!userId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      operator.trim().length < 3 || reason.trim().length < 10 || !databaseUrl) {
    throw new Error("Pass a user ID, verified email, operator, reason and database URL.");
  }
  const db = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; email: string; email_verified: boolean;
      totp_enabled: boolean; totp_verified: boolean }>(`
      SELECT u.id,u.email,u."emailVerified" email_verified,
        u."twoFactorEnabled" totp_enabled,coalesce(t.verified,false) totp_verified
      FROM sorp_auth."user" u LEFT JOIN sorp_auth."twoFactor" t ON t."userId"=u.id
      WHERE u.id=$1 FOR UPDATE OF u`, [userId]);
    const user = found.rows[0];
    if (found.rows.length !== 1 || user.email.toLowerCase() !== email.toLowerCase() ||
        !user.email_verified || !user.totp_enabled || !user.totp_verified) {
      throw new Error("The exact account must have verified email and TOTP before founder bootstrap.");
    }
    const existing = await client.query<{ revoked_at: Date | null }>(
      "SELECT revoked_at FROM sorp_auth.founder_grant WHERE user_id=$1 FOR UPDATE", [userId]);
    if (existing.rows[0] && !existing.rows[0].revoked_at) {
      throw new Error("The account already has an active founder grant.");
    }
    if (apply) {
      await client.query(`INSERT INTO sorp_auth.founder_grant(user_id,granted_at,grant_reason,revoked_at)
        VALUES($1,now(),$2,NULL) ON CONFLICT(user_id) DO UPDATE SET
        granted_at=excluded.granted_at,grant_reason=excluded.grant_reason,revoked_at=NULL`,
      [userId, reason.trim()]);
      await client.query(`INSERT INTO sorp_auth.audit_event(action,target_type,target_id,metadata)
        VALUES('founder_grant_bootstrapped','user',$1,$2::jsonb)`,
      [userId, JSON.stringify({ operator: operator.trim(), reason: reason.trim() })]);
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    return apply ? "granted" : "ready";
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await db.end(); }
}

async function main() {
  const args = process.argv.slice(2);
  const argument = (name: string) => args[args.indexOf(name) + 1] || "";
  const apply = args.includes("--apply");
  if (!args.includes("--user-id") || !args.includes("--email") ||
      !args.includes("--operator") || !args.includes("--reason") ||
      !process.env.SORP_AUTH_DATABASE_URL) {
    throw new Error("Pass --user-id, --email, --operator, --reason and SORP_AUTH_DATABASE_URL. Add --apply only after review.");
  }
  const result = await grantFounder({ userId: argument("--user-id"), email: argument("--email"),
    operator: argument("--operator"), reason: argument("--reason"),
    databaseUrl: process.env.SORP_AUTH_DATABASE_URL, apply });
  process.stdout.write(result === "ready" ? "Founder bootstrap is ready. No data changed.\n" :
    "Founder grant recorded. Sign out and complete a fresh MFA sign-in.\n");
}

if (process.argv[1]?.endsWith("grant-sorp-founder.ts")) {
  void main().catch(() => {
    process.stderr.write("Founder bootstrap failed. Check identity, verification, TOTP and database access.\n");
    process.exitCode = 1;
  });
}
