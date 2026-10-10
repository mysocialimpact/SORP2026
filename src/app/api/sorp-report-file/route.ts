export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";
export const preferredRegion = "lhr1";

const charityCommissionOrigin = "https://register-of-charities.charitycommission.gov.uk";

function officialAccountsPdf(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== charityCommissionOrigin || url.pathname !== "/en/charity-search") return null;
    if (url.searchParams.get("p_p_resource_id") !== "/accounts-resource") return null;
    const organisationNumber = url.searchParams.get("_uk_gov_ccew_onereg_charitydetails_web_portlet_CharityDetailsPortlet_priv_r_p_organisationNumber") || "";
    return /^\d{6,7}$/.test(organisationNumber) ? url : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const source = officialAccountsPdf(new URL(request.url).searchParams.get("source"));
  if (!source) return Response.json({ error: "Choose a valid Charity Commission accounts PDF." }, { status: 400 });
  let lastError = "The Charity Commission report did not respond.";
  for (const timeout of [45000, 90000]) {
    try {
      const response = await fetch(source, {
        headers: { accept: "application/pdf,application/octet-stream;q=0.9,*/*;q=0.1" },
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) {
        lastError = `The Charity Commission returned HTTP ${response.status}.`;
        if (response.status === 429 || response.status >= 500) continue;
        return Response.json({ error: lastError }, { status: 502 });
      }
      const resolved = new URL(response.url);
      if (resolved.origin !== charityCommissionOrigin) return Response.json({ error: "The official report redirected outside the Charity Commission." }, { status: 502 });
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength < 1000 || bytes.byteLength > 40_000_000 || new TextDecoder().decode(bytes.slice(0, 4)) !== "%PDF") {
        lastError = "The official response was not a supported PDF.";
        continue;
      }
      return new Response(bytes, { headers: {
        "content-type": "application/pdf",
        "content-length": String(bytes.byteLength),
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      } });
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  return Response.json({ error: lastError }, { status: 504 });
}
