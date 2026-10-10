export const PUBLIC_BUILD = "PUBLIC-3 · 26 SEPTEMBER 2026";
// Do not reuse pre-validation trial results after the source-corpus guard.
export const STORAGE_KEY = "msi-sorp-public-evidence-v2";
export type Candidate = { name: string; registrationNumber: string; locality: string; jurisdiction: string; entityType: string; latestIncome: number | null; financialYearEnd: string; accountingBasis: string; accountingBasisConfidence: string; website: string; officialUrl: string; summary: string; reportUrl: string; reportTitle: string; reportPeriod: string; publicReadiness: { impactReport: { found: boolean; title: string; url: string } }; sources: { label: string; url: string; detail: string; kind: string }[] };
export type AssessmentTrail = { source: { document: string; reportingPeriod: string; url: string; digest: string }; evidence: { id: string; page: number; section?: string; excerpt: string; propositionIds?: string[]; relevance?: string }[]; propositions: { id: string; condition: string; state: "established" | "not_established" | "unknown"; evidenceIds: string[]; explanation: string }[]; validation?: { propositionId: string; valid: boolean; reasons: string[]; adjudicated: boolean }[]; sorpTest: { questionId: string; requirement: string; references: string[] }; logicalTest: string; ruleVersion: string; ruleStatus: string; classification: string; why: string; whyNotHigher: string };
export type Finding = { fieldId: number; questionId?: string; answer: "yes" | "mostly" | "partly" | "limited" | "not_yet" | "not_sure" | "not_applicable"; confidence: string; finding: string; reason: string; excerpt: string; page: string; sourceUrl: string; action: string; requirement: string; classification: string; sources: { reference: string; page: number; text: string }[]; sourceSufficiency?: "sufficient" | "not_assessable"; applicability?: "applicable" | "not_applicable" | "unknown"; contradictions?: string; msiInsight?: string; evidence?: { id: string; page: number; excerpt: string }[]; assessmentTrail?: AssessmentTrail; needsHumanReview?: boolean };
export type Lens = { lens: "tar" | "wider"; methodologyVersion?: string; ruleVersion?: string; methodologySnapshot?: { methodologyId: string; methodologyVersion: string; tests: Array<{ id: string }>; groups: Array<{ prefix: string; title: string; subtitle: string }>; answerScores: Record<string, number>; reportingStrengthBands: Array<{ min: number; max: number; label: string }> }; assessmentRun?: { id: string; sourceDocument: string; sourceDigest: string; reportingPeriod: string; sorpVersion: string; methodologyVersion: string; ruleVersion: string; methodologyContentHash?: string; canonicalSourceVersion?: string; canonicalSourceFingerprint?: string; evidenceRetrievalVersion?: string; evidenceFingerprint?: string; propositionValidationVersion?: string; validationStatus?: string; engineVersion: string; modelVersion: string; assessedAt: string; materialFingerprint: string }; publicationStatus?: "PUBLISHABLE" | "REVIEW_REQUIRED"; canonicalEvidenceSet?: unknown[]; validationResults?: { propositionId: string; valid: boolean; reasons: string[]; adjudicated: boolean }[]; tier?: string; mandatory?: { applicable: number; demonstrated: number; attention: number; gaps: number; unconfirmed: number }; historicalCorrections?: { questionId: string; originalAnswer: string; originalEvidence: string; originalReason: string; correctedAnswer: string; correctedEvidence: string; correctionReason: string; reviewer: string; confirmedAt: string }[]; readable: boolean; score: number | null; confidence: string; title: string; period: string; sourceUrl: string; accountingBasis: string; findings: Finding[]; limitation: string; diagnostics?: { pageCount: number; pagesProcessed: number; textExtractionSuccess: boolean; extractedTextLength: number; allChunksIndexed: boolean; assessmentRetrievalSucceeded: boolean } };
export const APPROVED_COW_METHODOLOGY_HASH = "dda7df64fa051e4448e438f8bd0c91982f9d0ebe4b4794f588fb2f5c2199ac1e";
export function verifiedTar(lens: Lens | null | undefined): lens is Lens {
  const reading = lens?.diagnostics;
  return lens?.lens === "tar" && lens.readable && lens.score !== null && lens.findings.length === 15
    && !!reading && reading.pageCount > 0 && reading.pagesProcessed === reading.pageCount
    && reading.textExtractionSuccess && reading.extractedTextLength > 0
    && reading.allChunksIndexed && reading.assessmentRetrievalSucceeded;
}
export function verifiedCanonicalTar(lens: Lens | null | undefined): lens is Lens {
  const reading = lens?.diagnostics;
  return lens?.methodologyVersion === "1.0" && lens.lens === "tar" && lens.publicationStatus === "PUBLISHABLE" && lens.readable && lens.score !== null
    && lens.assessmentRun?.methodologyContentHash === APPROVED_COW_METHODOLOGY_HASH && lens.methodologySnapshot?.methodologyVersion === lens.methodologyVersion
    && lens.findings.length === 19 && lens.findings.every((finding, index) => finding.fieldId === index + 1 && !!finding.questionId && !!finding.assessmentTrail)
    && !!reading && reading.pageCount > 0 && reading.pagesProcessed === reading.pageCount
    && reading.textExtractionSuccess && reading.extractedTextLength > 0
    && reading.allChunksIndexed && reading.assessmentRetrievalSucceeded;
}
export type Intelligence = { effectiveVersion: string; layers: { name: string; label: string; version: number }[] };
export type Report = { candidate: Candidate; tar: Lens; wider: Lens; createdAt: string; intelligence: Intelligence };
export type Research = { status: string; candidates: Candidate[]; selected: Candidate | null; query: string };
export type Turn = { role: "assistant" | "user"; content: string; promptId?: number; citations?: { reference: string; extract: string }[] };
export const weights = { yes: 4, mostly: 3, partly: 2, limited: 1, not_yet: 1, not_sure: 0, not_applicable: 0 };
export const answerLabels = { yes: "Clearly evidenced", mostly: "Mostly evidenced", partly: "Partly evidenced", limited: "Limited", not_yet: "Not yet in place", not_sure: "Not established", not_applicable: "Not applicable" };
export const classificationLabel = (value: string) => ["JUDGEMENT", "MSI_READINESS"].includes(value) ? "MSI JUDGEMENT" : value;
export const band = (score: number | null) => score === null ? "Not enough evidence" : score >= 75 ? "Looking strong" : score >= 50 ? "Getting ready" : "Needs attention";
export const methodology = "This is a retrospective published-evidence review of narrative and impact-reporting readiness, not a full accounts audit or a compliance certificate. SORP 2026 is the source of truth. The same 15 equally weighted fields and existing 0–4 response scale are used separately for each lens: clearly evidenced 4, mostly 3, partly 2, positively not yet in place 1, not established 0. Each lens totals up to 60 points, expressed as a rounded percentage. Unestablished evidence reduces the evidence-readiness score; it does not prove that a practice is absent. No score is given when the source cannot be read or nothing can be established. Wider evidence never changes the TAR score. Tier-specific classifications use latest published income, not a prediction of next-period income. Current unpublished practice requires separate evidence and human judgement.";
export function highlights(lens: Lens) {
  const strong = lens.findings.filter(f => weights[f.answer] >= 3).sort((a, b) => weights[b.answer] - weights[a.answer]).slice(0, 3);
  const gaps = lens.findings.filter(f => weights[f.answer] < 4).sort((a, b) => Number(b.classification === "MUST") - Number(a.classification === "MUST") || weights[a.answer] - weights[b.answer]).slice(0, 3);
  return { strong, gaps, priorities: gaps.length ? gaps : lens.findings.filter(f => f.answer !== "yes").slice(0, 3) };
}
// The guided review asks only about material gaps in this charity's existing
// findings. It never changes either published-evidence score.
export function guidedPrompts(report: Report): Finding[] {
  const wider = new Map(report.wider.findings.map(finding => [finding.fieldId, finding]));
  return report.tar.findings
    .filter(finding => finding.answer !== "yes" && (finding.answer !== "mostly" || finding.confidence.toUpperCase() !== "HIGH"))
    .sort((first, second) => {
      const importance = (finding: Finding) =>
        (finding.classification === "MUST" ? 5 : 0)
        + (finding.answer === "not_sure" ? 4 : finding.answer === "partly" ? 3 : 2)
        + (finding.confidence.toUpperCase() === "LOW" ? 2 : finding.confidence.toUpperCase() === "MEDIUM" ? 1 : 0)
        + ((weights[wider.get(finding.fieldId)?.answer || finding.answer] > weights[finding.answer]) ? 2 : 0);
      return importance(second) - importance(first);
    })
    .slice(0, 3);
}
export function emptyLens(lens: "tar" | "wider", limitation: string): Lens { return { lens, readable: false, score: null, confidence: "LOW", title: lens === "tar" ? "Statutory reporting not assessed" : "Wider evidence not assessed", period: "", sourceUrl: "", accountingBasis: "unknown", findings: [], limitation }; }
export function emailResult(report: Report, conversationNotes: string[] = []) {
  const { tar, wider } = report;
  const { strong, gaps, priorities } = highlights(tar);
  const category = (value: string) => tar.findings.filter(f => f.classification === value && weights[f.answer] < 4).map(f => f.action);
  return { score: tar.score ?? 0, band: band(tar.score), confidence: tar.confidence, overview: `Published-evidence review for ${report.candidate.name}. TAR readiness: ${tar.score === null ? "not scored" : `${tar.score}/100`}. Separate wider-evidence view: ${wider.score === null ? "not scored" : `${wider.score}/100`}. ${tar.limitation} ${wider.limitation} Generated ${report.createdAt.slice(0, 10)}. Intelligence ${report.intelligence.effectiveVersion}.${conversationNotes.length ? ` User-supplied conversation context, not independently verified and not used to change published-evidence scores: ${conversationNotes.join(" | ").slice(0, 3000)}.` : ""}`,
    strong: strong.map(f => f.finding), attention: gaps.map(f => f.finding), priorities: priorities.map(f => f.action),
    must: category("MUST"), should: category("SHOULD"), may: [], judgement: tar.findings.filter(f => ["JUDGEMENT", "MSI_READINESS"].includes(f.classification)).map(f => f.reason),
    additionalChecks: ["This published-evidence narrative review is not a complete financial-statement or all-module compliance audit. Conditional SORP requirements and current circumstances need separate consideration."],
    trusteesReportReadiness: [`${tar.title} · ${tar.period}. ${tar.sourceUrl}`, ...tar.findings.map(f => f.finding)],
    widerImpactEvidence: [`Separate score: ${wider.score ?? "not scored"}; confidence ${wider.confidence}. ${wider.title}. ${wider.limitation}`, ...wider.findings.map(f => f.finding)], userConfirmedPractice: [], sectionScores: [],
    publishedEvidence: { scoreAvailable: tar.score !== null, methodology, traceability: [tar, wider].flatMap(lens => lens.findings.map(f => ({ title: `${lens.lens === "tar" ? "TAR" : "Wider evidence"} / ${f.fieldId}. ${f.finding}`, detail: `${classificationLabel(f.classification)}. ${answerLabels[f.answer]}. Confidence: ${f.confidence}. WHY: ${f.reason} EVIDENCE: ${f.excerpt || "Not established in the inspected material."} ${f.page ? `Page/section: ${f.page}.` : ""} SOURCE: ${f.sourceUrl || "No accessible source"}. SORP: ${f.sources.map(s => `${s.reference} (p.${s.page}): ${s.text}`).join(" ")} NEXT: ${f.action}` }))) },
  };
}
// Keep this concise enough for the existing canonical conversation context.
export function conversationReport(report: Report | null) { return report && { basis: "Published evidence only; immutable retrospective scores", sourceAcquisition: "MSI found and retrieved these public sources. The user identified the organisation; they did not supply or upload these documents.", organisation: report.candidate.name, methodology, ...Object.fromEntries([report.tar, report.wider].map(lens => [lens.lens, { score: lens.score, confidence: lens.confidence, title: lens.title, period: lens.period, limitation: lens.limitation, findings: lens.findings.map(({ sources, ...f }) => ({ ...f, sorpReferences: sources.map(s => s.reference) })) }])) }; }
