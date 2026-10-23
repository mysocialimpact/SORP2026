import type { Firm } from "@/lib/accountants";

/** Research approval and paid/editorial placement never confer this badge. */
export function VerificationBadge({ firm }: { firm: Pick<Firm, "slug" | "msiVerified" | "msiVerificationDecided"> }) {
  if (!firm.msiVerified) return null;
  return <div className="msi-verification" data-verification="approved">
    <span><span aria-hidden="true">✓ </span>Verified by My Social Impact</span>
  </div>;
}
