import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { headers } from "next/headers";

/** Explicit test inbox, never a production mail transport or verification bypass. */
export function previewMailEnabled() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.SORP_AUTH_PREVIEW_MAIL !== "true") return false;
  try {
    return new URL(process.env.SORP_AUTH_DATABASE_URL || "").pathname === "/sorp_flagship_pr94";
  } catch { return false; }
}
let pool: Pool | undefined;
function inbox() {
  if (!previewMailEnabled()) throw new Error("Preview inbox unavailable.");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.SORP_AUTH_DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
    attachDatabasePool(pool);
  }
  return pool;
}
export function assertPreviewRecipient(email: string) {
  if (!/^[a-z0-9._+-]+@example\.invalid$/i.test(email)) throw new Error("This preview only accepts test addresses ending @example.invalid. No real email is sent.");
}
export async function deliverPreviewMail(to: string, kind: string, link: string) {
  assertPreviewRecipient(to);
  const draft = (await headers()).get("cookie")?.match(/(?:^|;\s*)sorp_onboarding=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!draft) throw new Error("Start a preview introduction before creating a test account.");
  await inbox().query("INSERT INTO sorp_auth.preview_mail(recipient,kind,link,draft_id) VALUES($1,$2,$3,$4)", [to.toLowerCase(), kind, link, draft]);
}
export async function readPreviewVerification(email: string, draft: string) {
  assertPreviewRecipient(email);
  const { rows } = await inbox().query("SELECT link FROM sorp_auth.preview_mail WHERE recipient=$1 AND draft_id=$2 AND kind='verify' AND created_at>now()-interval '30 minutes' ORDER BY created_at DESC LIMIT 1", [email.toLowerCase(), draft]);
  return rows[0]?.link as string | undefined;
}
