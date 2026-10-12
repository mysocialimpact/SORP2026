import { categories, type Category } from "./model.ts";
export type Criterion = {
  id: string;
  category: Category;
  points: number;
  label: string;
  enabled: boolean;
};
export const provisionalRubric: Criterion[] = [
  ["A1", "services", 10, "Dedicated charity or not-for-profit service page"],
  [
    "A2",
    "services",
    6,
    "Explicit charity accounting, audit, examination or reporting services",
  ],
  ["A3", "services", 5, "Identifiable specialist charity service line or team"],
  [
    "A4",
    "services",
    4,
    "Multiple additional charity advisory services or substantial sector service content",
  ],
  ["B1", "people", 8, "Named senior professional responsible for charity work"],
  ["B2", "people", 5, "Verified specialist qualification such as DChA"],
  [
    "B3",
    "people",
    4,
    "Additional named charity specialists with responsibilities",
  ],
  ["B4", "people", 3, "Explicit charity-sector professional track record"],
  [
    "C1",
    "sorp",
    10,
    "Substantive published technical analysis of Charity SORP 2026",
  ],
  ["C2", "sorp", 5, "Substantive general Charity SORP technical guidance"],
  ["C3", "sorp", 3, "Separate SORP training, technical publication or webinar"],
  [
    "C4",
    "sorp",
    2,
    "Named professional responsible for SORP technical guidance",
  ],
  [
    "D1",
    "clients",
    8,
    "Named substantiated charity client relationships or appointments",
  ],
  ["D2", "clients", 6, "Detailed charity case studies or engagements"],
  [
    "D3",
    "clients",
    4,
    "Verifiable charity testimonials or independent client evidence",
  ],
  [
    "D4",
    "clients",
    2,
    "Substantiated breadth or scale of charity client portfolio",
  ],
  ["E1", "recognition", 5, "External charity-sector speaking engagements"],
  [
    "E2",
    "recognition",
    4,
    "Independently published relevant technical contributions",
  ],
  [
    "E3",
    "recognition",
    4,
    "Recognised professional charity-accounting training delivery",
  ],
  [
    "E4",
    "recognition",
    2,
    "Independent recognition or charity-sector leadership appointments",
  ],
].map(([id, category, points, label]) => ({
  id: String(id),
  category: category as Category,
  points: Number(points),
  label: String(label),
  enabled: true,
}));
export function validateRubric(input: unknown): Criterion[] {
  if (!Array.isArray(input) || input.length !== provisionalRubric.length)
    throw new Error(
      "Keep all twenty criteria. Disable a criterion instead of removing its history.",
    );
  const rules = input as Criterion[];
  for (const original of provisionalRubric) {
    const matches = rules.filter((r) => r.id === original.id);
    const r = matches[0];
    if (
      matches.length !== 1 ||
      r.category !== original.category ||
      !Number.isInteger(r.points) ||
      r.points < 0 ||
      typeof r.enabled !== "boolean" ||
      r.label !== original.label
    )
      throw new Error(
        "Use unique original criteria, whole points and enabled flags. Criterion meanings remain fixed; semantic changes need a new evaluator version.",
      );
  }
  for (const c of categories)
    if (
      rules
        .filter((r) => r.category === c.id && r.enabled)
        .reduce((s, r) => s + r.points, 0) > c.max
    )
      throw new Error(`${c.name} exceeds its ${c.max}-point maximum.`);
  return rules;
}
