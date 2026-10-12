export const categories = [
  {
    id: "services",
    name: "Dedicated charity services",
    max: 25,
    description:
      "Dedicated charity or not-for-profit services, relevant offerings and sector-specific positioning.",
  },
  {
    id: "people",
    name: "Specialist people and qualifications",
    max: 20,
    description:
      "Named charity specialists, verified qualifications, DChA and identifiable teams or leadership.",
  },
  {
    id: "sorp",
    name: "SORP knowledge and publications",
    max: 20,
    description:
      "Published Charity SORP guidance, technical updates and specific SORP 2026 evidence.",
  },
  {
    id: "clients",
    name: "Clients, case studies and testimonials",
    max: 20,
    description:
      "Identifiable charity clients and credible evidence of sector work.",
  },
  {
    id: "recognition",
    name: "External talks and recognition",
    max: 15,
    description:
      "Relevant external talks, professional recognition and independent sector contributions.",
  },
] as const;
export type Category = (typeof categories)[number]["id"];
export const statuses = [
  "Not researched",
  "Researching",
  "Needs more evidence",
  "Ready for Marcus",
  "Approved",
  "Not qualified",
  "Recheck later",
];
export const defaultBoundaries = [0, 20, 40, 60, 80, 100];
export const levelNames = [
  "No evidence",
  "Limited",
  "Some",
  "Clear",
  "Strong",
  "Extensive",
];
export function evidenceLevel(
  score: number | null,
  boundaries: number[] = defaultBoundaries,
) {
  return score === null ? null : boundaries.findIndex((max) => score <= max);
}
export function validateBoundaries(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length !== 6 ||
    value[0] !== 0 ||
    value[5] !== 100 ||
    value.some((v, i) => !Number.isInteger(v) || (i > 0 && v <= value[i - 1]))
  )
    throw new Error(
      "Use six increasing whole-number boundaries, from 0 to 100.",
    );
  return value;
}
export function canonicalName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function publicUrl(value: string) {
  const u = new URL(value);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw new Error("Use a public http or https source URL.");
  return u.toString();
}
export function websiteDomain(value: string) {
  return new URL(publicUrl(value)).hostname.toLowerCase().replace(/^www\./, "");
}
export type Firm = {
  id: string;
  name: string;
  aliases: string[];
  website: string | null;
  icaew_url: string | null;
  icaew_tag: boolean | null;
  status: string;
  review_status: string;
  priority: number;
  research_completed_at: string | null;
  created_at: string;
  total: number | null;
  scores: Record<string, number> | null;
  sorp: string | null;
  gaps: string[] | null;
  assessment_id: string | null;
  confidence: string | null;
  office_count: number;
  location?: string;
  merged_into?: string | null;
};
export type Evidence = {
  id: string;
  firm_id: string;
  run_id: string | null;
  source_type: string;
  category: Category | null;
  title: string;
  summary: string;
  url: string | null;
  accessed_at: string | null;
  published_at: string | null;
  people: string[];
  sorp: string;
  confidence: string;
  state: string;
  notes: string;
};
export type Assessment = {
  id: string;
  firm_id: string;
  run_id: string | null;
  methodology_id: string;
  scores: Record<Category, number>;
  total: number;
  reasons: Record<Category, string>;
  evidence_ids: Record<Category, string[]>;
  gaps: string[];
  confidence: string;
  sorp: string;
  origin: string;
  created_at: string;
  previous_id: string | null;
};
export type Methodology = {
  id: string;
  name: string;
  categories: typeof categories;
  boundaries: number[];
  rules: string;
  created_at: string;
  notes: string;
};
