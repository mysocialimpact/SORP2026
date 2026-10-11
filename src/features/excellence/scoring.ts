import { PILLARS, QUESTIONS } from "./questions.ts";
import type { PillarKey, ScoredAssessment } from "./models.ts";

export function maturityFor(score: number) {
  if (score < 2) return "Very early stage";
  if (score < 3) return "Developing";
  if (score < 4) return "Partly established";
  if (score < 4.8) return "Strong";
  return "Fully embedded";
}

export function scoreAssessment(answers: number[]): ScoredAssessment {
  if (answers.length !== 25 || answers.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error("A complete set of 25 answers on the 1-5 scale is required.");
  }

  const pillarScores = PILLARS.map(({ key }, index) => ({
    pillar: key,
    score: answers.slice(index * 5, index * 5 + 5).reduce((sum, value) => sum + value, 0) / 5
  }));
  const overall = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  const ranked = QUESTIONS.map((question, index) => ({ question, value: answers[index] }));
  const strengths = [...ranked].sort((a, b) => b.value - a.value || a.question.id - b.question.id).slice(0, 3).map(({ question }) => question);
  const opportunities = [...ranked].sort((a, b) => a.value - b.value || a.question.id - b.question.id).slice(0, 3).map(({ question }) => question);

  return { overall, maturity: maturityFor(overall), pillarScores, strengths, opportunities };
}

export function recommendationFor(scores: { pillar: PillarKey; score: number }[], overall: number) {
  const purpose = scores.find((score) => score.pillar === "purpose")?.score ?? 0;
  const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
  if (purpose < 3) return "Begin with a Purpose Pulse Check to clarify the change you exist to create.";
  if (weakest.pillar !== "purpose" && weakest.score < 3) return "Move into a Diagnostic to understand what sits behind the weakest pillar.";
  if (purpose >= 4 && overall >= 4) return "Consider a Verified Assessment to test the strong foundation against evidence.";
  return "Use the complimentary review to agree the most valuable next step with MSI.";
}

export function commentaryFor(overall: number, pillarScores: { pillar: PillarKey; score: number }[]) {
  const ordered = [...pillarScores].sort((a, b) => b.score - a.score);
  const label = (value: PillarKey) => PILLARS.find((pillar) => pillar.key === value)?.label ?? value;
  return `This assessment indicates a ${maturityFor(overall).toLowerCase()} level of social impact maturity. ${label(ordered[0].pillar)} is the clearest current strength. The most immediate opportunity is to improve ${label(ordered.at(-1)!.pillar).toLowerCase()} and make the underlying practice more consistent, evidenced and repeatable.`;
}
