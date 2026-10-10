// READ-ONLY UI PROJECTION GENERATED FROM COW CONSOLE. DO NOT EDIT DIRECTLY.
// Runtime results are accepted only when their Cow package hash matches the
// pinned projection hash in sorp-public-model.ts; Cow remains authoritative.
import definition from "./sorp-methodology-v1.generated.json" with { type: "json" };

export type Tier = { status: string; weight: number };
export type Test = {
  id: string; title: string; question: string; why: string; sorp: string;
  tiers: [Tier, Tier, Tier]; rubric: [string, string, string, string, string];
  notSure: string; note?: string; na?: string; jurisdictionOverrides?: Record<string, Tier>;
};
export const tests = definition.tests as unknown as Test[];
export const groups = definition.groups;
export const answers = definition.answers;
export const sorpSource = definition.sorpSource;
export const methodologyVersion = definition.methodologyVersion as "1.0";
export const reportingStrengthBands = definition.reportingStrengthBands;
export const answerScores = definition.answerScores;
export type CanonicalAnswer = keyof typeof answerScores | "not_applicable";
export const crossCuttingPrinciples = definition.crossCuttingPrinciples;
export const confidenceDefinitions = definition.confidenceDefinitions;
export const assessmentProtocol = definition.protocol;
export const methodologyV1 = definition;

export type MethodologyTier = "tier1" | "tier2" | "tier3";
export type ApplicabilityFacts = { s2SeparateSustainabilityReporting?: boolean | null };
export type CanonicalResult = {
  methodologyVersion: typeof methodologyVersion;
  score: number;
  band: string;
  points: number;
  maximum: number;
  mandatory: { applicable: number; demonstrated: number; attention: number; gaps: number; unconfirmed: number };
};

export function requirementFor(test: Test, tier: MethodologyTier, jurisdiction = "") {
  const result = test.tiers[{ tier1: 0, tier2: 1, tier3: 2 }[tier]];
  return test.jurisdictionOverrides?.[jurisdiction] || result;
}

export function scoreCanonical(answersById: Readonly<Record<string, CanonicalAnswer | undefined>>, tier: MethodologyTier, jurisdiction = "", facts: ApplicabilityFacts = {}): CanonicalResult | null {
  if (tests.some(test => !answersById[test.id] || answersById[test.id] === "not_applicable" && !test.na)) return null;
  if (!["ew", "england", "wales", "ni", "northern_ireland", "scotland", "roi", "elsewhere"].includes(jurisdiction)) return null;
  if (answersById.S2 === "not_applicable" && facts.s2SeparateSustainabilityReporting !== false) return null;
  let points = 0;
  let maximum = 0;
  const mandatory = { applicable: 0, demonstrated: 0, attention: 0, gaps: 0, unconfirmed: 0 };
  for (const test of tests) {
    const answer = answersById[test.id]!;
    if (answer === "not_applicable") continue;
    const requirement = requirementFor(test, tier, jurisdiction);
    maximum += requirement.weight * 4;
    points += answerScores[answer] * requirement.weight;
    if (requirement.status.startsWith("MUST")) {
      mandatory.applicable++;
      if (answer === "yes") mandatory.demonstrated++;
      else if (answer === "mostly") mandatory.attention++;
      else if (answer === "not_sure") mandatory.unconfirmed++;
      else mandatory.gaps++;
    }
  }
  const score = maximum ? Math.round(points / maximum * 100) : 0;
  return { methodologyVersion, score, band: reportingStrengthBands.find(item => score >= item.min && score <= item.max)?.label || "UNCLASSIFIED", points, maximum, mandatory };
}
