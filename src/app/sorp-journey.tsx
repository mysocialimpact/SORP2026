import { readinessStages } from "./sorp-questionnaire";
import "./sorp-journey.css";

export type SorpBasis = { classification: string; explanation: string; interpretation?: string; citations: { reference: string; module: string; page: number; extract: string }[] };
export type PublicReadinessFinding = { fieldId: number; suggestedAnswer: "yes" | "mostly" | "partly" | "not_yet" | "not_sure"; confidence: "high" | "medium" | "low"; reason: string; trusteesReportEvidence: string; widerImpactEvidence: string; sourceUrls: string[] };
export type PublicReadinessReview = {
  status: "reviewed" | "limited" | "unavailable"; readinessStatus?: "likely_ready" | "partly_ready" | "not_yet_ready" | "unable_to_determine"; overallConfidence: "high" | "medium" | "low";
  tarScore?: number | null; widerEvidenceScore?: number | null; widerEvidenceReason?: string;
  strong: string[]; attention: string[]; unknown: string[];
  trusteesReport: { reviewed: boolean; title: string; url: string; period: string; discovery?: "standalone" | "embedded_in_annual_accounts" | "public_filing_unidentified" | "unavailable" };
  impactReport: { found: boolean; title: string; url: string };
  websiteReviewed: boolean; findings: PublicReadinessFinding[];
};
export type ReadinessWorkflow = {
  version: number; currentStage: number; completedStages: number[]; stageTitle: string; stageCount: number;
  known: { id: string; label: string; value: string; established: boolean; source: string; sourceUrl?: string }[];
  next: { id: string; question: string; why: string; basis: SorpBasis; actions: { label: string; value: string }[]; provisional?: PublicReadinessReview; proposal?: PublicReadinessFinding };
};

export function SorpJourneyProgress({ current, completed, result = false }: { current: number; completed: number[]; result?: boolean }) {
  const stageCount = readinessStages.length;
  return <header className="sorp-journey-progress">
    <div className="sorp-journey-title"><strong>{result ? readinessStages[stageCount - 1] : readinessStages[current - 1]}</strong></div>
    <ol aria-label={`Your ${stageCount}-stage SORP readiness journey`}>{readinessStages.map((title, index) => {
      const stageNumber = index + 1;
      const statusClass = completed.includes(stageNumber) ? "is-complete" : current === stageNumber ? "is-current" : "";
      return <li key={title} className={statusClass} aria-current={current === stageNumber && !result ? "step" : undefined}><span aria-hidden="true">{completed.includes(stageNumber) ? "✓" : stageNumber}</span><small>{title}</small></li>;
    })}</ol>
  </header>;
}

export function SorpBasisDrawer({ basis }: { basis: SorpBasis }) {
  return <details className="sorp-basis-drawer"><summary>See the SORP basis <span aria-hidden="true">+</span></summary><div><span className="sorp-basis-label">{basis.classification === "MSI_READINESS" || basis.classification === "JUDGEMENT" ? "MSI JUDGEMENT" : basis.classification}</span><h4>Charities SORP 2026</h4><p>{basis.explanation}</p>{basis.interpretation && <p className="sorp-basis-note">{basis.interpretation}</p>}{basis.citations.length ? basis.citations.map(citation => <article key={citation.reference}><strong>Paragraph {citation.reference}</strong><small>{citation.module} · PDF page {citation.page}</small><p>{citation.extract}</p></article>) : <p className="sorp-basis-note">MSI judgement: this step helps us tailor the assessment. It is not taken from one specific SORP paragraph.</p>}</div></details>;
}

export function SorpKnownContext({ workflow, defaultOpen = true }: { workflow: ReadinessWorkflow; defaultOpen?: boolean }) {
  const count = workflow.known.filter(item => item.established).length;
  if (!count) return null;
  return <details className="sorp-known-context" open={defaultOpen}><summary><span>What we know so far</span><small>{count} of {workflow.known.length} established</small></summary><dl>{workflow.known.map(item => <div key={item.id} className={item.established ? "is-known" : "is-unresolved"}><span aria-hidden="true">{item.established ? "✓" : "○"}</span><div><dt>{item.label}</dt><dd>{item.value}</dd>{item.source && <small>{item.source === "publicly_observed" ? "Public record · correct us if this has changed" : item.source === "user_confirmed" ? "Confirmed with you" : item.source}{item.sourceUrl && <> · <a href={item.sourceUrl}>View source ↗</a></>}</small>}</div></div>)}</dl></details>;
}
