import sourceFirms from "@/data/accountants.json";
import researchedFirms from "@/data/accountants-research.json";

export const serviceLabels = {
  accounts: "Charity accounts",
  sorp: "SORP reporting",
  audit: "Charity audits",
  examination: "Independent examinations",
  tax: "Tax and VAT",
  outsourced: "Outsourced finance",
  management: "Financial management",
} as const;
export type Service = keyof typeof serviceLabels;
export type Point = { lat: number; lng: number };
export type Bounds = { north: number; south: number; east: number; west: number };
export type Firm = {
  slug: string;
  name: string;
  website: string;
  postcode: string;
  location: string;
  classification: string;
  evidence: string;
  contact: string;
  icaewUrl: string;
  evidenceUrl: string;
  spreadsheetRow: number | null;
  reviewed: string;
  coordinates: Point | null;
  coordinateSource: string;
  services: { id: Service; source: string; evidence: string }[];
  featured?: boolean;
  overview?: string;
  people?: { name: string; role: string; source: string }[];
  offices?: { address: string; postcode: string; source: string; phone?: string }[];
  email?: string;
  researchSources?: { title: string; url: string }[];
};
export const firms: Firm[] = [...(sourceFirms as Firm[]).map(firm => firm.slug === "tittensor-and-co-limited" ? {
  ...firm, coordinates: { lat: 51.88065, lng: 0.143985 },
  coordinateSource: "https://www.doogal.co.uk/LSOA21/E01023453",
} : firm), ...researchedFirms as Firm[]];
export const directoryPath = "/accountants-advisers/";
export const firmPath = (firm: Pick<Firm, "slug">) => `${directoryPath}${firm.slug}/`;

export function normalisePostcode(input: string) {
  const compact = input.toUpperCase().replace(/\s+/g, "");
  return /^(GIR0AA|[A-PR-UWYZ][A-HK-Y]?\d[ABEHMNPRVWXY\d]?\d[ABD-HJLNP-UW-Z]{2})$/.test(compact)
    ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : null;
}

/** Great-circle distance between postcode centroids, not driving distance. */
export function milesBetween(a: Point, b: Point) {
  const radians = (n: number) => n * Math.PI / 180;
  const dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function selectFirms(all: Firm[], options: { query: string; services: Service[]; origin: Point | null; area: Bounds | null; evidenced: boolean }) {
  const query = options.query.trim().toLocaleLowerCase();
  return all.filter(firm => {
    const matches = !query || `${firm.name} ${firm.location} ${firm.postcode}`.toLocaleLowerCase().includes(query);
    const services = options.services.every(id => firm.services.some(service => service.id === id));
    const p = firm.coordinates, b = options.area;
    const area = !b || !!p && p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;
    return matches && services && area && (!options.evidenced || firm.classification === "Verified");
  }).map(firm => ({ firm, distance: options.origin && firm.coordinates ? milesBetween(options.origin, firm.coordinates) : null }))
    .sort((a, b) => options.origin
      ? (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.firm.name.localeCompare(b.firm.name)
      : Number(!!b.firm.featured) - Number(!!a.firm.featured) || a.firm.name.localeCompare(b.firm.name));
}
