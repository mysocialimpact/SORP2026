import type { Firm } from "@/lib/accountants";

/** Research approval and paid/editorial placement never confer this badge. */
export function VerificationBadge({ firm }: { firm: Pick<Firm, "slug" | "msiVerified" | "msiVerificationDecided"> }) {
  const preview = !firm.msiVerified && !firm.msiVerificationDecided && firm.slug === "burton-sweet";
  if (!firm.msiVerified && !preview) return null;
  return <div className={`msi-verification${preview ? " is-preview" : ""}`} data-verification={preview ? "preview" : "approved"}>
    {preview && <strong className="msi-verification-preview">Design preview · not awarded</strong>}
    <span><span aria-hidden="true">✓ </span>Verified by My Social Impact</span>
    {preview && <small>Illustration only. Burton Sweet has not been awarded this designation.</small>}
  </div>;
}
