import "server-only";
import { firms as staticFirms, type Firm } from "@/lib/accountants";
import { publicDirectoryControls, type DirectoryControlRow } from "@/lib/console/directory-controls";

function canonicalName(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/\b(?:limited|ltd|llp|plc)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function domain(value: string | null | undefined) {
  if (!value) return "";
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function controlFor(firm: Firm, controls: DirectoryControlRow[]) {
  const firmDomain = domain(firm.website);
  const firmName = canonicalName(firm.name);
  return controls.find(control =>
    Boolean(firmDomain && control.domain && firmDomain === control.domain) ||
    canonicalName(control.name) === firmName,
  );
}

/**
 * Preserve the complete, curated public directory while applying founder-owned
 * visibility and placement decisions from the existing research database.
 * Database failure must never take the whole public directory offline.
 */
export async function getDirectoryFirms(): Promise<Firm[]> {
  let controls: DirectoryControlRow[];
  try { controls = await publicDirectoryControls(); }
  catch { return staticFirms; }
  return staticFirms.flatMap(firm => {
    const control = controlFor(firm, controls);
    if (control?.directory_configured && control.public_visible === false) return [];
    return [{
      ...firm,
      featured: control?.directory_configured ? control.featured : firm.featured,
      featuredPriority: control?.directory_configured ? control.featured_priority : firm.featuredPriority,
      placementLabel: control?.directory_configured ? control.placement_label : (firm.placementLabel || (firm.featured ? "Editorial launch feature" : undefined)),
      msiVerified: control?.msi_verified === true,
      msiVerificationDecided: control?.msi_verification_decided === true,
      humanReviewed: Boolean(control?.approved_at),
      humanReviewedAt: control?.approved_at || undefined,
    }];
  });
}

export async function getDirectoryFirm(slug: string) {
  return (await getDirectoryFirms()).find(firm => firm.slug === slug);
}
