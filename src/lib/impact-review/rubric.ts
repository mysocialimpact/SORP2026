import { PILLARS, QUESTIONS } from "../../features/excellence/questions.ts";
export const REVIEW_VERSION = "report-evidence-1";
export const claimsPrinciples = [
  { name: "Evidence", definition: "Know what supports the claim; distinguish activity, outputs, outcomes and impact." },
  { name: "Proportion", definition: "Do not turn contribution into causation or uncertainty into certainty." },
  { name: "Transparency", definition: "Show the sources, methods, assumptions and limitations." },
  { name: "Balance", definition: "Include what did not work and who did not benefit, not just the best story." },
  { name: "Learning", definition: "Use the evidence to decide what to keep, change, stop or test next." },
];
export const excellencePillars = PILLARS.map(p => ({ name: p.key === "communication" ? "Communications" : p.label,
  definition: QUESTIONS.filter(q => q.pillar === p.key).map(q => `${q.statement}: ${q.meaning}`).join("\n") }));
export const limitations = "This is an automated preliminary review of the information presented in your report. It identifies evidence, strengths and opportunities for improvement against My Social Impact’s frameworks. It does not independently verify the underlying information, assess undisclosed organisational practices or constitute an audit, certification or formal assurance opinion. My Social Impact offers independent expert reviews for a more comprehensive assessment.";
export const rubric = "Each Claims Code principle uses whole-number disclosure ratings: 0 = relevant claims presented without support or necessary context; 1 = isolated support with major gaps; 2 = partial support and explanation; 3 = mostly consistent support, context and limitations; 4 = consistently well-supported, proportionate and transparent disclosure. Null = insufficient readable evidence to rate. Principle score = rating × 25; overall = equal-weight mean rounded to nearest 5, only when all five principles can be rated. Scores describe this document only, never certification. Excellence has no numerical maturity score.";
export type Framework = "claims" | "excellence";
export type PageText = { page: number; text: string };
export type Finding = { name: string; status: "demonstrated" | "partial" | "not_disclosed" | "cannot_determine";
  rating: number | null; finding: string; strength: string; gap: string; recommendation: string;
  evidence: { page: number; quote: string }[] };
export type ReviewResult = { summary: string; sections: Finding[]; recommendations: string[]; limitations: string[]; overall: number | null };
const normalise = (text: string) => text.normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
export function validateReview(value: unknown, framework: Framework, pages: PageText[]): ReviewResult {
  const r = value as ReviewResult;
  const names = (framework === "claims" ? claimsPrinciples : excellencePillars).map(p => p.name);
  if (!r || typeof r.summary !== "string" || !Array.isArray(r.sections) || r.sections.length !== 5 ||
      !Array.isArray(r.recommendations) || r.recommendations.length !== 3 || r.recommendations.some(x => typeof x !== "string" || !x.trim()) ||
      !Array.isArray(r.limitations) || r.limitations.some(x => typeof x !== "string")) throw new Error("The review was incomplete. Please retry.");
  for (const [i,s] of r.sections.entries()) {
    if (s.name !== names[i] || !["demonstrated","partial","not_disclosed","cannot_determine"].includes(s.status) ||
        [s.finding,s.strength,s.gap,s.recommendation].some(x => typeof x !== "string" || x.length > 4000) ||
        !Array.isArray(s.evidence) || s.evidence.length > 5 ||
        !(s.rating === null || Number.isInteger(s.rating) && s.rating >= 0 && s.rating <= 4)) throw new Error("Invalid framework findings.");
    for (const e of s.evidence) {
      const page = pages.find(p => p.page === e.page);
      if (typeof e.quote !== "string" || e.quote.trim().length < 15 || !page || !normalise(page.text).includes(normalise(e.quote)))
        throw new Error("A source quotation could not be verified. No review has been published. Please retry.");
    }
    if (framework === "excellence") s.rating = null;
    if (!s.evidence.length) {
      s.rating = null;
      if (["demonstrated","partial"].includes(s.status)) throw new Error("A finding was missing its source evidence.");
    }
    if (["not_disclosed","cannot_determine"].includes(s.status)) s.rating = null;
  }
  r.overall = framework === "claims" && r.sections.every(s => s.rating !== null)
    ? Math.round(r.sections.reduce((n,s) => n + s.rating! * 25,0) / 25) * 5 : null;
  return r;
}
