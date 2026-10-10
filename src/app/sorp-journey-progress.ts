import type { Finding, Lens } from "./sorp-public-model";

export type PreparedDocument = { id: string; expiresAt: string; title: string; period: string; sourceUrl: string; pageCount: number; pagesProcessed: number; validation: "passed"; storedCopyUsed: boolean; uploaded?: boolean };
export type StageEvent = { stage: string; message: string; createdAt?: string; phase?: "started" | "completed" | "retry" | "failed" | "cache-hit"; result?: string; httpStatus?: number | null; cacheHit?: boolean };
export const completedEvent = (event: StageEvent) => event.phase === "completed" || event.phase === "cache-hit";
export const validPreparedDocument = (document: PreparedDocument | null | undefined) => Boolean(document?.id && document.validation === "passed" && document.pageCount > 0 && document.pagesProcessed === document.pageCount && Date.parse(document.expiresAt) > Date.now());
export const assessmentWalkthroughMs = 20000;

// Select a traceable example; answer quality is not a criterion for selection.
export function assessmentExample(lens: Lens | null | undefined): Finding | null {
  if (lens?.publicationStatus !== "PUBLISHABLE") return null;
  const candidates = lens.findings.filter(finding => {
    const trail = finding.assessmentTrail;
    return trail && trail.classification === finding.answer && trail.source.digest === lens.assessmentRun?.sourceDigest
      && !finding.contradictions && !finding.needsHumanReview
      && trail.propositions.length > 0 && trail.validation?.length === trail.propositions.length
      && trail.propositions.every(proposition => trail.validation?.some(check => check.propositionId === proposition.id && check.valid))
      && trail.evidence.some(item => item.excerpt.trim().length >= 40 && item.excerpt.length <= 650 && Number.isInteger(item.page) && item.page > 0 && item.page <= (lens.diagnostics?.pageCount || 0));
  });
  return candidates.sort((a, b) => Math.min(...a.assessmentTrail!.evidence.map(item => item.excerpt.length)) - Math.min(...b.assessmentTrail!.evidence.map(item => item.excerpt.length)) || a.fieldId - b.fieldId)[0] || null;
}
