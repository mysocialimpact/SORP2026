import { normalisePostcode } from "@/lib/accountants";

export async function GET(request: Request) {
  const postcode = normalisePostcode(new URL(request.url).searchParams.get("q") || "");
  if (!postcode) return Response.json({ error: "Enter a full UK postcode, such as BS1 4DJ." }, { status: 400 });
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      signal: AbortSignal.timeout(8000), next: { revalidate: 86400 },
    });
    if (response.status === 404) return Response.json({ error: "We couldn’t find that postcode. Check it and try again." }, { status: 404 });
    if (!response.ok) throw new Error("Postcode provider unavailable");
    const { result } = await response.json();
    if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) throw new Error("Invalid postcode result");
    return Response.json({ postcode: result.postcode, lat: result.latitude, lng: result.longitude, area: result.admin_district || result.country });
  } catch {
    return Response.json({ error: "Postcode search is temporarily unavailable. You can still search by firm or town, or explore the map." }, { status: 503 });
  }
}
