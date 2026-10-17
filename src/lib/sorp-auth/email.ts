type MessageKind = "verify" | "reset";
import { previewMailEnabled, assertPreviewRecipient, deliverPreviewMail } from "./preview-mail";

const FROM = "SORP 2026 <accounts@sorp2026.org>";
const REPLY_TO = "marcus@mysocialimpact.org";

function assertRecipientReleased(to: string) {
  if (previewMailEnabled()) { assertPreviewRecipient(to); return; }
  const recipient = to.trim().toLowerCase();
  const domain = recipient.split("@")[1];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new Error("SORP account email has an invalid recipient.");
  }
  // Keep this block in both test and public delivery modes. Additional known
  // addresses outside Brainstrust's domain can be blocked without a code release.
  const blocked = (process.env.SORP_AUTH_EMAIL_BLOCKED_RECIPIENTS || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (domain === "brainstrust.org.uk" || domain.endsWith(".brainstrust.org.uk") ||
      blocked.includes(recipient)) {
    throw new Error("Brainstrust account email requires Marcus's explicit approval and a code review.");
  }
  if (process.env.SORP_AUTH_EMAIL_DELIVERY_ENABLED !== "true") {
    throw new Error("SORP account email is disabled for this recipient.");
  }
  const policy = process.env.SORP_AUTH_EMAIL_RECIPIENT_POLICY || "allowlist";
  const approved = (process.env.SORP_AUTH_EMAIL_ALLOWED_RECIPIENTS || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (policy === "allowlist") {
    if (!approved.includes(recipient)) {
      throw new Error("SORP account email is disabled for this recipient.");
    }
    return;
  }
  if (policy === "public" && process.env.SORP_AUTH_CUTOVER_ENABLED === "true" &&
      process.env.SORP_AUTH_STAGING_ENABLED !== "true" &&
      process.env.SORP_AUTH_BASE_URL === "https://sorp2026.org") {
    return;
  }
  throw new Error("SORP account email is disabled for this recipient.");
}

export function authMailConfigured() {
  return previewMailEnabled() || Boolean(process.env.RESEND_API_KEY);
}

/** Sends account links through SORP's verified Resend domain after provisioning. */
export async function sendSorpAuthEmail(kind: MessageKind, to: string, link: string) {
  assertRecipientReleased(to);
  const key = process.env.RESEND_API_KEY;
  if (!key && !previewMailEnabled()) throw new Error("SORP transactional email is not configured.");
  const configuredBase = process.env.SORP_AUTH_BASE_URL;
  if (!configuredBase) throw new Error("SORP authentication origin is not configured.");
  const base = new URL(configuredBase);
  const target = new URL(link);
  if (target.origin !== base.origin || !target.pathname.startsWith("/api/sorp-auth/")) {
    throw new Error("The authentication link has an unexpected destination.");
  }
  const destination = kind === "reset" ? (() => {
    const match = target.pathname.match(/^\/api\/sorp-auth\/reset-password\/([A-Za-z0-9_-]{20,128})$/);
    if (!match) throw new Error("The reset link has an unexpected format.");
    return `${base.origin}/reset-password/#sorp-auth=1&token=${encodeURIComponent(match[1])}`;
  })() : target.toString();
  const subject = kind === "verify" ? "Verify your SORP 2026 email" : "Reset your SORP 2026 password";
  const instruction = kind === "verify" ? "Verify your email address" : "Reset your password";
  if (previewMailEnabled()) { await deliverPreviewMail(to, kind, destination); return; }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [to], reply_to: REPLY_TO, subject,
      text: `${instruction} using this link:\n\n${destination}\n\nIf you did not request this, you can ignore this message.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SORP transactional email was not accepted (${response.status}).`);
}

export async function sendSorpInvitationEmail(to: string, link: string) {
  assertRecipientReleased(to);
  const key = process.env.RESEND_API_KEY;
  const base = process.env.SORP_AUTH_BASE_URL;
  if (!key || !base) throw new Error("SORP invitation email is not configured.");
  const destination = new URL(link);
  if (destination.origin !== new URL(base).origin || !/^\/invitation\/[a-f0-9]{64}\/?$/.test(destination.pathname)) {
    throw new Error("The invitation link has an unexpected destination.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO,
      subject: "Your SORP 2026 organisation invitation",
      text: `You have been invited to a SORP 2026 organisation. Accept using this private link:\n\n${destination.toString()}\n\nThe link expires in seven days. If you did not expect this invitation, you can ignore it.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SORP invitation email was not accepted (${response.status}).`);
}
