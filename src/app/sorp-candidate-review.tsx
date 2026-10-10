"use client";
/* The final-report effect is intentionally guarded by its saved workflow state. */
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { tierFromSetup, tierLabel, type AssessmentSetup } from "./sorp-questionnaire";
import { answers, answerScores, groups, methodologyVersion, reportingStrengthBands, requirementFor, scoreCanonical, tests, type CanonicalAnswer, type MethodologyTier } from "./sorp-methodology-v1";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";
import { SorpPublicSupportCheckout } from "./sorp-public-support-checkout";
import { SorpReviewBooking } from "./sorp-review-booking";
import { SorpMarcus } from "./sorp-marcus";
import { SorpIdentityPreview } from "./sorp-identity-preview";
import { SorpHomeworkExperience } from "./sorp-homework-experience";
import { SorpAssessmentExperience } from "./sorp-assessment-experience";
import { validPreparedDocument, type PreparedDocument } from "./sorp-journey-progress";
import { SnapshotBuilding, SnapshotReady, SnapshotMethod, SnapshotReveal } from "./sorp-snapshot-experience";
import { SorpScopeGuide } from "./sorp-scope-intro";
import { SorpMethodologyGuide } from "./sorp-public-methodology";
import { SorpIntroduction, introductionScreens } from "./sorp-introduction";
import { SorpScreenContext, SorpScreenHero } from "./sorp-forward-line";
import { historicalSnapshotInterpretation, mandatoryAnswerLabels, mandatoryAnswerOrder, mandatoryDistribution, mandatoryInterpretationParts, mandatoryPriorityAction, type MandatoryDistribution } from "./sorp-score-interpretation";
import { actionHierarchy, readinessKnowledgeStatus } from "./sorp-readiness-presentation";
import { classificationLabel, emptyLens, verifiedCanonicalTar, type Candidate, type Finding, type Intelligence, type Lens, type Report, type Research } from "./sorp-public-model";
import "./sorp-candidate-review.css";
import "./sorp-discovery.css";
import "./sorp-snapshot-experience.css";
import "./sorp-screen-layout.css";
import "./sorp-journey-progress.css";

type Step = "scope" | "public-methodology" | "intro" | "benefits" | "find" | "confirmation" | "account" | "homework" | "assessment" | "quick-generating" | "tar-recovery" | "quick-ready" | "quick" | "quick-feedback" | "method" | "criterion" | "complete" | "generating" | "report-ready" | "report" | "email-ready" | "final-feedback" | "support" | "before-go" | "next" | "help" | "done" | "non-sorp";
type Correction = { answer?: CanonicalAnswer; context: string; savedContext?: string; reviewed: boolean; widerSource?: string; widerNote?: string };
type HomeworkFailure = { reason: string; incidentId: string | null; recovery: "retry" | "upload-report"; diagnostic?: { stage?: string; source?: string; httpStatus?: number | null; contentType?: string | null; attemptCount?: number; pageCount?: number; pagesProcessed?: number; validation?: string } };
type Saved = { sessionId: string; step: Step; query: string; research: Research | null; candidate: Candidate | null; state: unknown; intelligence: Intelligence | null; verifiedTar: Lens | null; preparedDocument?: PreparedDocument | null; walkthroughSeen?: boolean; report: Report | null; homeworkFailure?: HomeworkFailure | null; email: string; emailConfirm: string; name: string; role: string; roleOther: string; criterion: number; corrections: Record<string, Correction>; reportView: number; emailSent: boolean; supportPaid: boolean; quickRating: number; quickComment: string; finalRating: number; finalComment: string };
type ReadinessAccount = { name: string; email: string; position: string };
type ReviewLocation = Pick<Saved, "step" | "criterion" | "reportView">;
type ReviewHistory = { past: ReviewLocation[]; current: ReviewLocation; future: ReviewLocation[] };
const KEY = "msi-sorp-canonical-methodology-v1";
const HISTORY_KEY = `${KEY}-history`;
const BUILD = "BUILD 120 · 10 OCTOBER 2026 · 13:38 BST";
const BUILD_COMPACT = "B120 · 10/10 · 13:38";
const SORP_SOURCE = "https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1";
const initial: Saved = { sessionId: "", step: "scope", query: "", research: null, candidate: null, state: null, intelligence: null, verifiedTar: null, report: null, homeworkFailure: null, email: "", emailConfirm: "", name: "", role: "", roleOther: "", criterion: 0, corrections: {}, reportView: 0, emailSent: false, supportPaid: false, quickRating: 0, quickComment: "", finalRating: 0, finalComment: "" };
const locationOf = ({ step, criterion, reportView }: Saved): ReviewLocation => ({ step, criterion, reportView });
const sameLocation = (left: ReviewLocation, right: ReviewLocation) => left.step === right.step && left.criterion === right.criterion && left.reportView === right.reportView;
const isLocation = (value: unknown): value is ReviewLocation => Boolean(value && typeof value === "object" && typeof (value as ReviewLocation).step === "string" && Number.isInteger((value as ReviewLocation).criterion) && Number.isInteger((value as ReviewLocation).reportView));
const normaliseLocation = (location: ReviewLocation): ReviewLocation => location;
const isTransient = (step: Step) => step === "quick-generating" || step === "generating";
const phases = ["Introduction", "Find charity", "Published report", "Assessment", "Historical snapshot", "Current readiness", "Your report", "What next"];
const scale: { value: CanonicalAnswer; label: string }[] = [
  ...Object.keys(answerScores).map((value, index) => ({ value: value as CanonicalAnswer, label: answers[index] || value.replaceAll("_", " ").toUpperCase() })),
  { value: "not_applicable", label: "NOT APPLICABLE" },
];
const coreQuestions = tests.map((test, index) => ({ id: index + 1, code: test.id, title: test.title,
  section: test.id.replace(/\d+$/, ""), question: test.question, explanation: test.why,
  sources: [...new Set(test.sorp.match(/\d+\.\d+/g) || [])],
  classification: { tier1: test.tiers[0].status, tier2: test.tiers[1].status, tier3: test.tiers[2].status },
}));
const readinessAreas = groups.map(group => {
  const questions = coreQuestions.filter(question => question.section === group.prefix);
  return { section: group.prefix, title: group.title, label: group.subtitle, first: questions[0].id, last: questions.at(-1)!.id };
});
const band = (score: number | null) => score === null ? "Not enough evidence" : reportingStrengthBands.find(item => score >= item.min && score <= item.max)?.label || "UNCLASSIFIED";
const canonicalHighlights = (lens: Lens) => {
  const scoreOf = (finding: Finding) => { const answer = finding.answer; return answer === "not_applicable" ? -1 : answerScores[answer]; };
  const strong = lens.findings.filter(finding => scoreOf(finding) >= 3).sort((left, right) => scoreOf(right) - scoreOf(left)).slice(0, 3);
  const gaps = lens.findings.filter(finding => finding.answer !== "yes" && finding.answer !== "not_applicable").sort((left, right) => Number(right.classification.startsWith("MUST")) - Number(left.classification.startsWith("MUST")) || scoreOf(left) - scoreOf(right)).slice(0, 3);
  return { strong, gaps, priorities: gaps };
};
const scoreReadinessAreas = (answersById: Readonly<Record<number, CanonicalAnswer>>, tier: MethodologyTier, jurisdiction = "") => readinessAreas.map(area => {
  const included = coreQuestions.filter(question => question.section === area.section && answersById[question.id] !== "not_applicable");
  const maximum = included.reduce((total, question) => total + requirementFor(tests[question.id - 1], tier, jurisdiction).weight * 4, 0);
  const points = included.reduce((total, question) => { const answer = answersById[question.id]; return total + (answer === "not_applicable" ? 0 : answerScores[answer]) * requirementFor(tests[question.id - 1], tier, jurisdiction).weight; }, 0);
  return { ...area, score: maximum ? Math.round(points / maximum * 100) : 0 };
});
const phaseFor = (step: Step) => ["scope", "public-methodology", "intro", "benefits"].includes(step) ? 0 : ["find", "confirmation", "account"].includes(step) ? 1 : ["homework", "tar-recovery"].includes(step) ? 2 : ["assessment", "quick-generating"].includes(step) ? 3 : ["quick-ready", "quick", "quick-feedback"].includes(step) ? 4 : ["method", "criterion", "complete"].includes(step) ? 5 : ["generating", "report-ready", "report", "email-ready"].includes(step) ? 6 : 7;
const safeLink = (url: string) => /^https:\/\//.test(url) ? url : "";
const reportSteps = ["Bringing together your published evidence", "Adding your current responses and context", "Comparing published reporting with your current view", "Checking the relevant SORP 2026 requirements", "Prioritising what matters most", "Turning findings into practical next steps", "Preparing your personalised PDF"];
const reportSlides = [
  { kicker: "01 · TWO VIEWS", title: "ONE CLEARER PICTURE.", body: "We are comparing what your published report demonstrated with where you say things stand today. The two views remain clearly labelled." },
  { kicker: "02 · BEYOND COMPLIANCE", title: "BETTER INFORMATION. BETTER DECISIONS.", body: "SORP is the requirement. The greater opportunity is evidence that helps trustees and managers understand what is working, learn and decide what to improve." },
  { kicker: "03 · SOCIAL IMPACT EXCELLENCE", title: "FIVE CONNECTED DISCIPLINES.", body: "Purpose · Leadership · Data · Delivery · Communication. Together they make impact part of normal management, rather than something reconstructed at year-end." },
  { kicker: "04 · WHY IT MATTERS", title: "USEFUL TO MORE THAN THE REPORT WRITER.", body: "Clear impact information helps trustees govern, managers learn, funders and donors understand value, and charities communicate responsibly." },
  { kicker: "05 · WHAT COMES NEXT", title: "YOUR REPORT IS A STARTING POINT.", body: "Use the priorities internally, talk them through with MSI, review wider impact evidence, or continue into the Social Impact Maturity Assessment." },
];
const roles = ["CEO / SENIOR LEADER", "TRUSTEE / CHAIR", "FINANCE / TREASURER", "IMPACT / EVALUATION", "PROGRAMME / DELIVERY", "FUNDRAISING / DEVELOPMENT", "COMMUNICATIONS / MARKETING", "ACCOUNTANT / AUDITOR / ADVISER", "OTHER"];
const areaLabels = tests.map(test => test.title);
const pause = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function post(url: string, body: unknown) {
  const multipart = body instanceof FormData;
  const response = await fetch(url, { method: "POST", headers: multipart ? undefined : { "content-type": "application/json" }, body: multipart ? body : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || data.error) { const failure = new Error(data.error || "That step could not be completed.") as Error & { recovery?: string; incidentId?: string | null; diagnostic?: HomeworkFailure["diagnostic"] }; failure.recovery = data.recovery; failure.incidentId = data.incidentId; failure.diagnostic = data.diagnostic; throw failure; }
  return data;
}

function FindingSource({ finding }: { finding: Finding }) {
  return <div className="scr-sources"><p><strong>Published evidence</strong> {finding.excerpt || "We could not establish this from the inspected statutory reporting. That is not proof the practice is absent."}</p>{safeLink(finding.sourceUrl) && <a href={finding.sourceUrl} target="_blank" rel="noreferrer">View published source ↗</a>}<p><strong>SORP basis</strong> {classificationLabel(finding.classification)}{["JUDGEMENT", "MSI_READINESS"].includes(finding.classification) ? ". MSI judgement is not an official SORP category." : ""}</p>{finding.sources.map(source => <p key={`${source.reference}-${source.page}`}><a href={`${SORP_SOURCE}#page=${source.page}`} target="_blank" rel="noreferrer">SORP 2026 · {source.reference} · p.{source.page} ↗</a><br />{source.text}</p>)}</div>;
}

function AssessmentAudit({ finding, compact = false }: { finding: Finding; compact?: boolean }) {
  const trail = finding.assessmentTrail;
  if (!trail) return <p className="scr-muted">The structured assessment trail is unavailable for this earlier result. Run the Historical Snapshot again to create it.</p>;
  return <div className={`scr-assessment-audit ${compact ? "is-compact" : ""}`}>
    <p><strong>SOURCE</strong> {trail.source.document} · {trail.source.reportingPeriod || "period not stated"}{trail.source.url.startsWith("https://") && <> · <a href={trail.source.url} target="_blank" rel="noreferrer">open source ↗</a></>}<small>SHA-256 {trail.source.digest}</small></p>
    <div><strong>EVIDENCE</strong>{trail.evidence.length ? trail.evidence.map(item => <blockquote key={item.id}>“{item.excerpt}” <cite>Page {item.page}{item.section ? ` · ${item.section}` : ""} · {item.id}{!compact && item.relevance ? ` · ${item.relevance}` : ""}</cite></blockquote>) : <p>No exact passage established this area; in a complete readable source the proposition is treated as not established, not unknown.</p>}</div>
    <div><strong>PROPOSITIONS</strong><ol>{trail.propositions.map(item => { const validation = trail.validation?.find(result => result.propositionId === item.id); return <li key={item.id} className={`is-${item.state}`}><b>{item.state === "established" ? "YES" : item.state === "not_established" ? "NO" : "UNKNOWN"}</b><span>{item.condition}</span>{!compact && item.explanation && <small>{item.explanation}</small>}{!compact && validation && <small>Validation: {validation.valid ? "passed" : "failed"}{validation.adjudicated ? " after targeted adjudication" : ""}{validation.reasons.length ? ` · ${validation.reasons.join(" ")}` : ""}</small>}</li>; })}</ol></div>
    <p><strong>SORP TEST</strong> {trail.sorpTest.requirement} · {trail.sorpTest.references.join(", ")}</p>
    <p><strong>LOGICAL TEST</strong> {trail.logicalTest} · approved rule {trail.ruleVersion}</p>
    <p><strong>CLASSIFICATION</strong> {scale.find(item => item.value === finding.answer)?.label || finding.answer}</p>
    <p><strong>WHY</strong> {trail.why}</p><p><strong>WHY NOT HIGHER</strong> {trail.whyNotHigher}</p>
  </div>;
}

function SnapshotAssessmentRows({ lens }: { lens: Lens }) {
  return <details className="scr-details hs-assessment-trail"><summary>HOW WAS THIS ASSESSED? <span>+</span></summary><p>Open any question to see the complete chain: source → evidence → propositions → SORP test → approved logical rule → classification.</p><div className="scr-report-list">{lens.findings.map(finding => <details key={finding.questionId || finding.fieldId}><summary><span>{finding.questionId} · {quickFindingTitle(finding)}</span><b>{scale.find(item => item.value === finding.answer)?.label || "NOT SURE"}</b></summary><AssessmentAudit finding={finding} compact /></details>)}</div></details>;
}

function CanonicalFindings({ lens, corrections }: { lens: Lens; corrections?: Record<string, Correction> }) {
  return <div className="scr-report-list">{groups.map(group => <section key={group.prefix}><h2>{group.title}</h2>{tests.filter(test => test.id.startsWith(group.prefix)).map(test => {
    const finding = lens.findings.find(item => item.questionId === test.id);
    if (!finding) return null;
    const current = corrections?.[String(finding.fieldId)];
    const nextStep = !current?.answer ? finding.action
      : current.answer === "not_sure" ? `Confirm what can be evidenced for ${test.title.toLowerCase()} before deciding whether action is needed.`
        : ["yes", "not_applicable"].includes(current.answer) ? "Already strong or not applicable — no immediate action indicated by this assessment."
          : ["mostly", "partly"].includes(current.answer) ? `Improve ${test.title.toLowerCase()} when practical.`
            : `Address ${test.title.toLowerCase()}.`;
    return <details key={test.id}><summary><span>{test.id} · {test.title}</span><b>{scale.find(item => item.value === finding.answer)?.label || "NOT SURE"}</b></summary><p><strong>SORP POSITION:</strong> {finding.classification} · paragraph {test.sorp}</p><p><strong>WHAT YOUR LAST TAR DEMONSTRATED:</strong> {finding.reason}</p><p><strong>CONFIDENCE:</strong> {finding.confidence}</p>{finding.needsHumanReview && <p><strong>HUMAN REVIEW ADVISED:</strong> Applicable MUST finding with low-confidence or unassessable evidence.</p>}{finding.contradictions && <p><strong>QUALIFYING OR CONTRADICTORY EVIDENCE:</strong> {finding.contradictions}</p>}{finding.msiInsight && <p><strong>MSI INSIGHT:</strong> {finding.msiInsight}</p>}{current?.answer && <p><strong>YOUR POSITION NOW:</strong> {scale.find(item => item.value === current.answer)?.label}. Charity-confirmed or supplied; not independently verified.</p>}{current?.savedContext && <p><strong>YOUR COMMENT:</strong> {current.savedContext}</p>}{current?.widerSource && <p><strong>EVIDENCE ELSEWHERE:</strong> {current.widerSource}{current.widerNote ? ` · ${current.widerNote}` : ""}. This does not rewrite the historical TAR.</p>}<p><strong>{current?.answer ? "NEXT STEP FROM YOUR CURRENT ANSWER" : "FOR YOUR NEXT TAR"}:</strong> {nextStep}</p><AssessmentAudit finding={finding}/></details>;
  })}</section>)}</div>;
}

function ProgressSequence({ items, complete, active = 0 }: { items: string[]; complete: number; active?: number }) {
  return <ol className="scr-progress-sequence" aria-label="Review progress">{items.map((item, index) => <li key={item} className={index < complete ? "is-complete" : index === active ? "is-active" : ""}><span aria-hidden="true">{index < complete ? "✓" : index === active ? "◉" : "○"}</span>{item}</li>)}</ol>;
}

function ReportBuildingPresentation({ slide, onSlide, complete, active }: { slide: number; onSlide: (value: number) => void; complete: number; active: number }) {
  const item = reportSlides[slide];
  return <div className="scr-report-building"><div className="scr-report-building-status"><span className="scr-report-pulse" aria-hidden="true" /><strong>YOUR REPORT IS BEING PREPARED</strong><span>{Math.min(complete, reportSteps.length)} OF {reportSteps.length} CHECKS COMPLETE</span></div><div className="scr-report-building-grid"><section key={slide} className="scr-report-slide"><p className="scr-kicker">{item.kicker}</p><h2>{item.title}</h2><p>{item.body}</p><div className="scr-report-slide-nav"><button type="button" disabled={slide === 0} onClick={() => onSlide(Math.max(0, slide - 1))}>← PREVIOUS</button><span>{slide + 1} / {reportSlides.length}</span><button type="button" disabled={slide === reportSlides.length - 1} onClick={() => onSlide(Math.min(reportSlides.length - 1, slide + 1))}>NEXT →</button></div></section><aside><p className="scr-kicker">BUILDING IN THE BACKGROUND</p><ProgressSequence items={reportSteps} complete={complete} active={active}/></aside></div></div>;
}

function EvidenceChecklist({ candidate, research, tier, busy, phase, visible = 8 }: { candidate: Candidate | null; research: Research | null; tier: string; busy: boolean; phase: "identity" | "homework"; visible?: number }) {
  const found = candidate || research?.candidates[0] || null;
  const checks: [string, boolean][] = phase === "identity" ? [
    ["Searching the Charity Commission", Boolean(research)],
    ["Registered charity found", found?.entityType === "registered_charity"],
    ["Official website found", Boolean(safeLink(found?.website || ""))],
  ] : [
    ["Finding the latest published accounts", Boolean(candidate?.reportUrl)],
    ["Finding the Trustees’ Annual Report", Boolean(candidate?.reportUrl && candidate?.reportTitle)],
    ["Confirming the reporting period", Boolean(candidate?.reportPeriod)],
    ["Checking the accounting basis", Boolean(candidate && ["HIGH", "ESTABLISHED"].includes(candidate.accountingBasisConfidence?.toUpperCase()))],
    ["Finding published gross income", candidate?.latestIncome !== null && candidate?.latestIncome !== undefined],
    ["Checking whether SORP applies", Boolean(candidate && candidate.entityType === "registered_charity" && candidate.accountingBasis !== "unknown")],
    ["Identifying the SORP 2026 tier", tier !== "Not yet confirmed"],
    ["Matching the relevant reporting requirements", tier !== "Not yet confirmed" && candidate?.entityType === "registered_charity"],
  ];
  return <ol className="scr-progress-sequence scr-evidence-checklist" aria-label="Public evidence checks">{checks.map(([label, established], index) => { const done = established && index < visible; return <li key={label} className={done ? "is-complete" : busy && index === checks.findIndex((item, position) => !item[1] || position >= visible) ? "is-active" : ""}><span aria-hidden="true">{done ? "✓" : "○"}</span>{label}</li>; })}</ol>;
}

function FeedbackPanel({ rating, comment, status, onRating, onComment, onCommentBlur, quick = false, overall = false }: { rating: number; comment: string; status: string; onRating: (value: number) => void; onComment: (value: string) => void; onCommentBlur: () => void; quick?: boolean; overall?: boolean }) {
  return <div className="scr-feedback">{quick && <div className="scr-feedback-beta-invite"><h2>HELP THE NEXT CHARITY</h2><p>One quick piece of feedback helps us improve the tool for the next charity. It is completely optional.</p></div>}{(quick || overall) && <h2 className="scr-feedback-question">{overall ? "HELP THE NEXT CHARITY" : "HAS THIS BEEN USEFUL SO FAR?"}</h2>}<div className="scr-stars" role="group" aria-label="Usefulness rating">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-label={`${value} out of 5`} aria-pressed={rating === value} onClick={() => onRating(value)}>{value <= rating ? "★" : "☆"}</button>)}</div><div className="scr-star-scale"><span>1 = {quick || overall ? "NOT YET USEFUL" : "NOT VERY USEFUL"}</span><span>5 = EXTREMELY USEFUL</span></div><label className="scr-context">{overall ? "ONE THING THAT WOULD MAKE THIS BETTER?" : "ANYTHING WE COULD IMPROVE?"}<span className="scr-feedback-comment-help">Optional — a short comment is enough.</span><textarea rows={3} value={comment} onChange={e => onComment(e.target.value)} onBlur={onCommentBlur} placeholder="Optional" maxLength={2000}/></label>{status && <p className={status === "error" ? "scr-feedback-error" : "scr-saved"} role="status">{status === "saving" ? "SAVING FEEDBACK…" : status === "saved" ? "Thank you. This genuinely helps us improve the beta." : "Feedback could not be sent just now. You can still continue."}</p>}</div>;
}

const quickFindingTitle = (finding: Finding) => tests.find(test => test.id === finding.questionId)?.title || tests[finding.fieldId - 1]?.title || `Assessment area ${finding.fieldId}`;
const priorityAction = (finding: Finding) => mandatoryPriorityAction(finding, quickFindingTitle(finding));

function QuickFindingLabel({ finding }: { finding: Finding }) {
  if (["MUST", "SHOULD", "MAY"].some(status => finding.classification.startsWith(status))) return <span className={`scr-quick-label scr-quick-label--${finding.classification.startsWith("MUST") ? "must" : finding.classification.toLowerCase()}`}>{finding.classification}</span>;
  if (["JUDGEMENT", "MSI_READINESS"].includes(finding.classification)) return <span className="scr-quick-judgement">JUDGEMENT REQUIRED</span>;
  return null;
}

function MandatoryStatus({ distribution, selfReported = false, insufficient = false }: { distribution: MandatoryDistribution; selfReported?: boolean; insufficient?: boolean }) {
  const applicable = mandatoryAnswerOrder.reduce((total, answer) => total + distribution[answer], 0);
  const dominant = mandatoryAnswerOrder.reduce((leader, answer) => distribution[answer] > distribution[leader] ? answer : leader, mandatoryAnswerOrder[0]);
  const interpretation = mandatoryInterpretationParts(distribution);
  return <section className="hs-mandatory" data-reveal-mandatory>
    <h2>MANDATORY SORP REQUIREMENTS</h2>
    {applicable ? <>
      <p className="hs-must-apply"><strong>{applicable}</strong> REQUIREMENTS APPLY</p>
      <div className="hs-mandatory-continuum" aria-label={`${applicable} applicable mandatory requirements: ${mandatoryAnswerOrder.map(answer => `${distribution[answer]} ${mandatoryAnswerLabels[answer]}`).join(", ")}`}>
        {mandatoryAnswerOrder.filter(answer => distribution[answer] > 0).map((answer, index) => <span key={answer} className={`hs-mandatory-segment hs-mandatory-segment--${answer}`} style={{ width: `${distribution[answer] / applicable * 100}%`, "--segment-order": index } as CSSProperties}/>) }
      </div>
      <div className="hs-must-distribution">
        {mandatoryAnswerOrder.map(answer => <div key={answer} className={answer === dominant ? "is-dominant" : ""}><span>{mandatoryAnswerLabels[answer]}</span><strong>{distribution[answer]}</strong></div>)}
      </div>
      <div className="hs-mandatory-interpretation">{insufficient ? <><strong>NOT YET KNOWN</strong><p>There is insufficient confirmed information to judge mandatory readiness confidently. Confirm the unanswered areas before treating them as gaps.</p></> : <><strong>{interpretation.headline}</strong>{interpretation.detail && <p>{interpretation.detail}</p>}{interpretation.confirmation && <p>{interpretation.confirmation}</p>}</>}</div>
    </> : <p>Mandatory status has not been established.</p>}
    <p className="hs-status-note">{selfReported ? "Current self-reported position · not independently verified." : "Published evidence only · separate from Reporting Strength."}</p>
  </section>;
}

function QuickReviewResult({ lens, onMethodology }: { lens: Lens; onMethodology: () => void }) {
  const snapshot = historicalSnapshotInterpretation(lens);
  const knowledge = readinessKnowledgeStatus(lens.findings.map(finding => finding.answer));
  return <SnapshotReveal score={lens.score}>
    <div className="scr-quick-heading" data-reveal-heading><SorpScreenHero><p className="scr-kicker">PUBLISHED EVIDENCE · YOUR STARTING POINT</p><h1>YOUR HISTORICAL SNAPSHOT</h1></SorpScreenHero><p>Based on what your latest published Trustees’ Annual Report and accounts demonstrate.</p></div>
    <div className="hs-payoff">
      <section className="hs-strength"><h2>REPORTING STRENGTH</h2><div className="hs-score" aria-label={lens.score === null ? "No score established" : `${lens.score} out of 100`}><strong data-score aria-hidden="true">{lens.score ?? "—"}</strong><span aria-hidden="true">/100</span></div><div data-reveal-band><p className="hs-band">{knowledge.label || `${band(lens.score)} REPORTING STRENGTH`}</p><p className="hs-strength-explanation">A 0–100 view of how much strong reporting is evidenced across the fixed framework.</p></div></section>
      <MandatoryStatus distribution={snapshot.distribution} insufficient={knowledge.insufficient}/>
    </div>
    <p className={`hs-knowledge${knowledge.insufficient ? " is-insufficient" : ""}`}><strong>{knowledge.insufficient ? "NOT READY IS NOT THE SAME AS NOT YET KNOWN." : "CONFIRMED INFORMATION"}</strong>{knowledge.message}</p>
    <section className="hs-sorp-language" aria-labelledby="hs-sorp-language-title"><h2 id="hs-sorp-language-title">MUST / SHOULD / MAY</h2><dl className="hs-language"><div><dt>MUST</dt><dd>Required for SORP compliance.</dd></div><div><dt>SHOULD</dt><dd>SORP good practice.</dd></div><div><dt>MAY</dt><dd>Optional or permitted.</dd></div></dl></section>
    <section className="hs-tells-us"><h2>WHAT THIS TELLS US</h2><p>{snapshot.interpretation}</p></section>
    <p className="hs-full-report-message"><strong>Your full report comes later.</strong> It will show the detailed strengths, gaps, evidence and priorities after you bring this historical view up to date.</p>
    <div className="scr-quick-next"><span aria-hidden="true">→</span><div><h2>THIS IS THE HISTORICAL VIEW.</h2><p>Next, you’ll bring it up to date with what has changed since the report was published.</p></div></div>
    <SnapshotMethod onMethodology={onMethodology}/>
    <SnapshotAssessmentRows lens={lens}/>
  </SnapshotReveal>;
}

function ReportHighlights({ lens }: { lens: Lens }) {
  const { strong, gaps } = canonicalHighlights(lens);
  const judgement = lens.findings.filter(f => ["JUDGEMENT", "MSI_READINESS"].includes(f.classification));
  return <div className="scr-quick-result scr-report-highlights">
    <section className="scr-quick-snapshot"><h2>YOUR SORP SNAPSHOT</h2><p className="scr-quick-snapshot-note">From the published evidence behind your Historical Snapshot. Your current answers remain self-reported.</p><div className="scr-quick-category-grid">{["MUST", "SHOULD", "MAY"].map(category => {
      const findings = lens.findings.filter(f => category === "MUST" ? f.classification.startsWith("MUST") : f.classification === category);
      const clear = findings.filter(f => f.answer === "yes").length;
      return <div className="scr-quick-category" key={category}><span className={`scr-quick-label scr-quick-label--${category.toLowerCase()}`}>{category}</span>{findings.length ? <><p><strong>{clear}</strong> clearly evidenced</p><p><strong>{findings.length - clear}</strong> {category === "MUST" ? "need attention" : category === "SHOULD" ? "areas for stronger practice" : "optional opportunities"}</p></> : <p className="scr-quick-category-empty">No {category}-classified areas in this review.</p>}</div>;
    })}</div>{judgement.length > 0 && <div className="scr-quick-interpretation"><span className="scr-quick-judgement">JUDGEMENT REQUIRED</span><p>{judgement.map(quickFindingTitle).join(" · ")}. MSI interpretation, separate from the SORP categories.</p></div>}</section>
    <div className="scr-quick-findings">{[{ title: "WHAT LOOKS STRONG", items: strong, kind: "strong" }, { title: "IMPORTANT GAPS", items: gaps, kind: "gaps" }].map(section => <section className={`scr-quick-findings-${section.kind}`} key={section.kind}><h2>{section.title}</h2>{section.items.slice(0, 3).map(f => <article key={f.fieldId}><QuickFindingLabel finding={f}/><h3>{quickFindingTitle(f)}</h3><p>{f.finding}</p></article>)}{!section.items.length && <p>No {section.kind === "strong" ? "strengths" : "material gaps"} identified in the inspected evidence.</p>}</section>)}</div>
  </div>;
}

function ActionAgenda({ groups }: { groups: ReturnType<typeof actionHierarchy> }) {
  const sections = [
    { title: "DO NOW", items: groups.doNow, empty: "No immediate gap or unconfirmed area was identified.", kind: "now" },
    { title: "IMPROVE WHEN PRACTICAL", items: groups.improve, empty: "No practical improvement item was identified.", kind: "improve" },
    { title: "ALREADY STRONG / NO ACTION", items: groups.noAction, empty: "No area reached the clearly evidenced threshold.", kind: "strong" },
  ] as const;
  return <div className="scr-action-hierarchy">{sections.map((section) => <section key={section.title} className={`is-${section.kind}`}><h2>{section.title}</h2>{section.items.length ? <ol>{section.items.map((finding) => { const unknown = finding.answer === "not_sure"; const title = quickFindingTitle(finding); return <li key={finding.fieldId}><div><QuickFindingLabel finding={finding}/>{unknown && <span className="scr-not-known">NOT YET KNOWN</span>}<h3>{section.kind === "strong" ? title : unknown ? `Confirm what can be evidenced for ${title.toLowerCase()}.` : section.kind === "improve" ? `Improve ${title.toLowerCase()} when practical.` : `Address ${title.toLowerCase()}.`}</h3><p>{section.kind === "strong" ? "This area is already clearly evidenced. No immediate action is indicated by this assessment." : unknown ? "This area is unconfirmed. Establish the evidence before deciding whether further action is needed." : finding.reason}</p></div></li>; })}</ol> : <p>{section.empty}</p>}</section>)}</div>;
}

function CompletionActions({ onViewReport, onBook, onTrack }: { onViewReport: () => void; onBook: () => void; onTrack: (event: string) => void }) {
  return <section className="scr-completion-actions" aria-label="Optional next steps">
    <div className="scr-completion-primary"><p className="scr-kicker">IF A HUMAN CONVERSATION WOULD HELP</p><h2>REVIEW YOUR RESULTS WITH MARCUS.</h2><p>Choose a free 10-minute fit check, a 30-minute SORP Review for £50, or a 60-minute deeper review for £100. We’ll go through your report, answer questions and agree the most useful next steps.</p><button type="button" onClick={() => { onTrack("book_conversation_clicked"); onBook(); }}>SEE REVIEW OPTIONS →</button></div>
    <a className="scr-completion-maturity" href="https://platform.mysocialimpact.org/snapshot" target="_blank" rel="noreferrer" onClick={() => onTrack("maturity_assessment_clicked")}><small>FREE · 10–15 MINUTES</small><strong>START THE SOCIAL IMPACT MATURITY ASSESSMENT</strong><span>Explore Purpose, Leadership, Data, Delivery and Communication. ↗</span></a>
    <div className="scr-completion-secondary">
      <a href="mailto:marcus@mysocialimpact.org?subject=Social%20Impact%20Report%20review" onClick={() => onTrack("social_impact_report_review_clicked")}><strong>HAVE A SOCIAL IMPACT REPORT?</strong><span>Ask MSI to review the wider impact story and evidence.</span></a>
      <a href="mailto:marcus@mysocialimpact.org?subject=Implementation%20support%20from%20%C2%A3250" onClick={() => onTrack("implementation_support_clicked")}><strong>NEED PRACTICAL SUPPORT?</strong><span>SORP-readiness and Social Impact Excellence support starts from £250.</span></a>
      <a href="mailto:marcus@mysocialimpact.org?subject=Impact%20Director%20support%20updates" onClick={() => onTrack("monthly_impact_director_clicked")}><strong>IMPACT DIRECTOR SUPPORT</strong><span>Register interest in future monthly support for managing impact throughout the year.</span></a>
    </div>
    <div className="scr-done-links"><button type="button" onClick={onViewReport}>VIEW MY REPORT →</button><a href="https://mysocialimpact.org/" target="_blank" rel="noreferrer">VISIT MY SOCIAL IMPACT →</a></div>
  </section>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49L6.4 13.9Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1c.79-2.37 3-4.13 5.6-4.13Z"/></svg>;
}

const GOOGLE_ACCOUNT_SIGN_IN_ENABLED = false;

export function SorpCandidateReview() {
  const [saved, setSaved] = useState<Saved>(initial);
  const [navigation, setNavigation] = useState<ReviewHistory>({ past: [], current: locationOf(initial), future: [] });
  const [loaded, setLoaded] = useState(false);
  const hydrated = useRef(false);
  const emailAttempt = useRef<string | null>(null);
  const trackedStage = useRef<string | null>(null);
  const previousSaved = useRef<Saved | null>(null);
  const [busy, setBusy] = useState("");
  const [homeworkStarted, setHomeworkStarted] = useState(0);
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState<string[]>([]);
  const [reportSlide, setReportSlide] = useState(0);
  const [generationReady, setGenerationReady] = useState(false);
  const [milestone, setMilestone] = useState("");
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<{ clientSecret: string; sessionId: string } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ quick: string; final: string }>({ quick: "", final: "" });
  const [problemEmail, setProblemEmail] = useState("");
  const [problemMessage, setProblemMessage] = useState("");
  const [problemStatus, setProblemStatus] = useState("");
  const [problemSending, setProblemSending] = useState(false);
  const [account, setAccount] = useState<ReadinessAccount | null>(null);
  const [accountMode, setAccountMode] = useState<"signup" | "login">("signup");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [googleSignInStarting, setGoogleSignInStarting] = useState(false);
  const [reportDragActive, setReportDragActive] = useState(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let restored: Saved;
    try { const stored = JSON.parse(localStorage.getItem(KEY) || "null"); restored = stored?.sessionId ? { ...initial, ...stored, emailConfirm: stored.emailConfirm || stored.email || "", reportView: Math.min(stored.reportView || 0, 1), corrections: Object.fromEntries(Object.entries(stored.corrections || {}).map(([id, value]) => { const correction = (value && typeof value === "object" ? value : { context: "", reviewed: false }) as Correction; return [id, { ...correction, savedContext: correction.savedContext ?? correction.context }]; })), step: stored.step === "email-ready" ? "final-feedback" : stored.step === "generating" ? "complete" : stored.step === "quick-generating" ? "homework" : stored.step } : { ...initial, sessionId: crypto.randomUUID() }; if (restored.report && !verifiedCanonicalTar(restored.report.tar)) restored = { ...restored, report: null, verifiedTar: null, emailSent: false, step: "homework", reportView: 0 }; if (!verifiedCanonicalTar(restored.verifiedTar)) restored.verifiedTar = verifiedCanonicalTar(restored.report?.tar) ? restored.report!.tar : null; }
    catch { restored = { ...initial, sessionId: crypto.randomUUID() }; setError("This browser could not restore a saved review. Please keep this page open until your PDF arrives."); }
    // Public landing-page starts always show the scope introduction, retaining saved answers.
    const entryUrl = new URL(window.location.href);
    if (entryUrl.searchParams.get("entry") === "intro") {
      restored = { ...restored, step: "scope" };
      entryUrl.searchParams.delete("entry");
      window.history.replaceState(window.history.state, "", entryUrl.pathname + entryUrl.search + entryUrl.hash);
    }
    setSaved(restored);
    try { const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null"); const current = locationOf(restored); setNavigation(history && isLocation(history.current) && sameLocation(normaliseLocation(history.current), current) && Array.isArray(history.past) && history.past.every(isLocation) && Array.isArray(history.future) && history.future.every(isLocation) ? { past: history.past.map(normaliseLocation), current, future: history.future.map(normaliseLocation) } : { past: [], current, future: [] }); }
    catch { setNavigation({ past: [], current: locationOf(restored), future: [] }); }
    previousSaved.current = restored;
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { setError("This browser could not save your progress. Please keep the page open until your PDF arrives."); } } }, [saved, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/readiness-account", { cache: "no-store", signal: abort.signal });
        if (!response.ok) return;
        const data = await response.json() as { signedIn?: boolean; account?: ReadinessAccount; progress?: Partial<Saved> };
        if (!data.signedIn || !data.account) {
          setSaved(current => current.candidate && !["scope", "public-methodology", "intro", "benefits", "find", "confirmation", "account"].includes(current.step)
            ? { ...current, step: "account" }
            : current);
          return;
        }
        setAccount(data.account);
        setSaved(current => {
          const restored = !current.candidate && data.progress?.sessionId ? { ...initial, ...data.progress } as Saved : current;
          const position = data.account!.position && data.account!.position !== "TO CONFIRM" ? data.account!.position : "";
          return { ...restored, name: restored.name || data.account!.name, email: data.account!.email, emailConfirm: data.account!.email, role: restored.role || (roles.includes(position) ? position : position ? "OTHER" : ""), roleOther: restored.roleOther || (position && !roles.includes(position) ? position : "") };
        });
        event("account_signed_in");
      } catch (caught) {
        if (!abort.signal.aborted) console.error("Saved SORP account could not be restored", caught);
      }
    })();
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("account_error");
    if (oauthError) setAccountError(oauthError);
    if (params.has("account") || oauthError) {
      params.delete("account"); params.delete("account_error");
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
    }
    return () => abort.abort();
  }, [loaded]);
  useEffect(() => {
    if (!loaded || !account) return;
    const timer = window.setTimeout(() => { void fetch("/api/readiness-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", progress: saved }) }); }, 900);
    return () => window.clearTimeout(timer);
  }, [loaded, account, saved]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(navigation)); } catch { /* Review progress still saves independently. */ } } }, [navigation, loaded]);
  useEffect(() => {
    if (!loaded) return;
    const previous = previousSaved.current;
    previousSaved.current = saved;
    if (isTransient(saved.step)) return;
    const location = locationOf(saved);
    setNavigation(history => {
      if (!sameLocation(history.current, location)) return { past: [...history.past, history.current].slice(-100), current: location, future: [] };
      const dataChanged = previous && sameLocation(locationOf(previous), location) && (Object.keys(saved) as (keyof Saved)[]).some(key => key !== "step" && key !== "criterion" && key !== "reportView" && saved[key] !== previous[key]);
      return dataChanged && history.future.length ? { ...history, future: [] } : history;
    });
  }, [saved, loaded]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [saved.step, saved.criterion, saved.reportView]);
  useEffect(() => { if (!milestone) return; const timer = window.setTimeout(() => setMilestone(""), 1800); return () => window.clearTimeout(timer); }, [milestone]);
  useEffect(() => {
    if (!loaded || trackedStage.current === saved.step) return;
    trackedStage.current = saved.step;
    event("stage_viewed", { currentStage: phaseFor(saved.step) + 1, journeyStep: saved.step });
  }, [loaded, saved.step]);
  useEffect(() => {
    const reportComplete = ["final-feedback", "support", "before-go", "next", "help", "done"].includes(saved.step);
    if (!reportComplete) { emailAttempt.current = null; return; }
    if (!loaded || !saved.report || !saved.email || saved.emailSent) return;
    const receiptKey = `msi-review-email:${saved.sessionId}:${saved.email.trim().toLowerCase()}`;
    if (emailAttempt.current === receiptKey) return;
    emailAttempt.current = receiptKey;
    void sendFinalReport(receiptKey);
  }, [loaded, saved.step, saved.sessionId, saved.email, saved.emailSent]);
  function event(type: string, extra = {}) { void trackSorpEvent(saved.sessionId, type, { organisation: saved.candidate?.name, readinessScore: saved.report?.tar.score ?? undefined, ...extra }, false); }
  async function saveFeedback(phase: "quick" | "final", rating: number, comment: string) {
    if (!rating && !comment.trim()) return;
    // Feedback is already retained with the review in local state. Do not
    // invoke the shared published-review email operation before the final page.
    setFeedbackStatus(current => ({ ...current, [phase]: "saved" }));
    event(phase === "quick" ? "quick_review_feedback_submitted" : "full_review_feedback_submitted", { rating });
  }
  function go(step: Step) { setError(""); setSaved(current => ({ ...current, step })); }
  const report = saved.report;
  const homeworkComplete = !!saved.state && (validPreparedDocument(saved.preparedDocument) || verifiedCanonicalTar(saved.verifiedTar));
  const tar = report?.tar;
  const historicalSnapshot = tar ? historicalSnapshotInterpretation(tar) : null;
  const { strong, gaps } = tar ? canonicalHighlights(tar) : { strong: [], gaps: [] };
  const questions = coreQuestions.map(question => {
    const existing = tar?.findings.find(finding => finding.fieldId === question.id);
    // Preserve the service's score. A missing item remains explicitly unestablished,
    // never silently inferred from website or impact-report evidence.
    const fallback: Finding = { fieldId: question.id, answer: "not_sure", confidence: "LOW", finding: question.question, reason: "Not established from the statutory material inspected.", excerpt: "", page: "", sourceUrl: tar?.sourceUrl || "", action: "Check the relevant reporting and evidence before the next Trustees’ Annual Report.", requirement: question.explanation, classification: question.classification.tier1, sources: question.sources.map(reference => ({ reference, page: 0, text: question.explanation })) };
    return { question, finding: existing || fallback, returned: Boolean(existing) };
  });
  const current = questions[saved.criterion];
  const currentTest = tests[saved.criterion];
  const correction = current ? saved.corrections[String(current.question.id)] : undefined;
  const phase = phaseFor(saved.step);
  const homeworkFailure = saved.homeworkFailure;
  const canUploadForFailure = homeworkFailure?.recovery === "upload-report";
  const charityCommissionRecord = safeLink(saved.candidate?.officialUrl || "");
  const charityCommissionReport = safeLink(saved.candidate?.reportUrl || "");
  const supportEmailHref = `mailto:marcus@mysocialimpact.org?subject=${encodeURIComponent(`Are You SORP Ready? problem${homeworkFailure?.incidentId ? ` · ${homeworkFailure.incidentId}` : ""}`)}&body=${encodeURIComponent([`Charity: ${saved.candidate?.name || "Not provided"}${saved.candidate?.registrationNumber ? ` · ${saved.candidate.registrationNumber}` : ""}`, `Session: ${saved.sessionId}`, `Incident: ${homeworkFailure?.incidentId || "Not confirmed"}`, `Problem: ${error || homeworkFailure?.reason || "The published report could not be read."}`, "", "Please tell us anything else that would help:"].join("\n"))}`;
  const setup = (saved.state as { setup?: AssessmentSetup } | null)?.setup;
  const reportingTier = setup ? tierLabel(setup) : "Not yet confirmed";
  const tier = setup ? tierFromSetup(setup) : null;
  const reviewedCount = questions.filter(({ question }) => saved.corrections[String(question.id)]?.reviewed && saved.corrections[String(question.id)]?.answer).length;
  const currentAnswers = Object.fromEntries(questions.map(({ question }) => [question.code, saved.corrections[String(question.id)]?.answer])) as Record<string, CanonicalAnswer | undefined>;
  // Selecting N/A here is the charity's explicit current-position confirmation
  // that no separate sustainability report exists. It does not alter the TAR.
  const currentResult = reviewedCount === tests.length && tier ? scoreCanonical(currentAnswers, tier, setup?.jurisdiction, {
    s2SeparateSustainabilityReporting: currentAnswers.S2 === "not_applicable" ? false : null,
  }) : null;
  const currentScore = currentResult?.score ?? null;
  const currentMandatoryDistribution = currentResult && tier ? mandatoryDistribution(questions.map(({ question, finding }) => ({ ...finding, classification: requirementFor(tests[question.id - 1], tier, setup?.jurisdiction).status, answer: saved.corrections[String(question.id)]!.answer! }))) : null;
  const currentAreaScores = currentResult && tier ? scoreReadinessAreas(Object.fromEntries(questions.map(({ question }) => [question.id, saved.corrections[String(question.id)]!.answer!])), tier, setup?.jurisdiction) : null;
  const currentArea = current ? readinessAreas.find(area => area.section === current.question.section) : null;
  const scoreDifference = currentScore !== null && tar?.score !== null && tar?.score !== undefined ? currentScore - tar.score : null;
  const changedAnswers = questions.filter(({ question, finding }) => { const answer = saved.corrections[String(question.id)]?.answer; return Boolean(answer && answer !== finding.answer); });
  const improvedCount = changedAnswers.filter(({ question, finding }) => { const answer = saved.corrections[String(question.id)]?.answer; return answer && answer !== "not_applicable" && answer !== "not_sure" && finding.answer !== "not_applicable" && finding.answer !== "not_sure" && answerScores[answer] > answerScores[finding.answer]; }).length;
  const worsenedCount = changedAnswers.filter(({ question, finding }) => { const answer = saved.corrections[String(question.id)]?.answer; return answer && answer !== "not_applicable" && answer !== "not_sure" && finding.answer !== "not_applicable" && finding.answer !== "not_sure" && answerScores[answer] < answerScores[finding.answer]; }).length;
  const savedComments = questions.filter(({ question }) => Boolean(saved.corrections[String(question.id)]?.savedContext?.trim()));
  const widerEvidence = questions.filter(({ question }) => Boolean(saved.corrections[String(question.id)]?.widerSource));
  const currentUnknown = questions.filter(({ question }) => saved.corrections[String(question.id)]?.answer === "not_sure");
  const currentFindings = questions.map(({ question, finding }) => ({ ...finding, answer: saved.corrections[String(question.id)]?.answer || finding.answer }));
  const currentKnowledge = readinessKnowledgeStatus(currentFindings.map(finding => finding.answer));
  const currentActions = actionHierarchy(currentFindings);
  const actionCodes = (findings: Finding[]) => findings.map(finding => questions.find(item => item.finding.fieldId === finding.fieldId)?.question.code).filter(Boolean).join(" · ");
  async function revealSteps(items: string[]) {
    setGeneration([]);
    for (const item of items) { await pause(1700); setGeneration(previous => [...previous, item]); }
  }

  async function find(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.query.trim() || busy || saved.research) return;
    setSaved(state => ({ ...state, candidate: null, state: null }));
    setBusy("find"); setError(""); event("assessment_started");
    try {
      const data = await post("/api/published-review", { operation: "find", query: saved.query, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      setSaved(state => ({ ...state, research: data.research, intelligence: data.intelligence, candidate: null, state: null, verifiedTar: null, preparedDocument: null, walkthroughSeen: false, report: null, emailSent: false, corrections: {} }));
      event("organisation_found");
      if (data.research.candidates.length === 1) {
        setBusy("");
        setSaved(state => ({ ...state, candidate: data.research.candidates[0] }));
        await pause(700);
        setSaved(state => ({ ...state, step: "confirmation" }));
      }
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not search just now."); }
    finally { setBusy(""); }
  }
  function confirmCandidate(candidate: Candidate) {
    setSaved(state => ({ ...state, candidate, state: null, verifiedTar: null, preparedDocument: null, walkthroughSeen: false, report: null, corrections: {}, step: "confirmation" }));
  }
  async function submitAccount(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!saved.candidate || accountBusy) return;
    const action = account ? "save" : accountMode;
    const role = saved.role === "OTHER" ? saved.roleOther.trim() : saved.role;
    if (action === "login") {
      if (!saved.email.trim() || !accountPassword) { setAccountError("Enter your email and password to sign in."); return; }
    } else {
      if (!saved.name.trim() || !role || !saved.email.trim()) { setAccountError("Please complete your name, role and email before continuing."); return; }
      if (saved.email.trim().toLowerCase() !== saved.emailConfirm.trim().toLowerCase()) { setAccountError("Those email addresses do not match."); return; }
      if (action === "signup" && accountPassword !== accountPasswordConfirm) { setAccountError("Those passwords do not match."); return; }
    }
    setAccountBusy(true); setAccountError("");
    try {
      const progress = { ...saved, email: saved.email.trim().toLowerCase(), emailConfirm: saved.email.trim().toLowerCase(), name: saved.name.trim() };
      const body = action === "save" ? { action, progress } : action === "signup" ? { action, name: saved.name.trim(), position: role, email: saved.email.trim().toLowerCase(), password: accountPassword, progress } : { action, email: saved.email.trim().toLowerCase(), password: accountPassword };
      const response = await fetch("/api/readiness-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { account?: ReadinessAccount; progress?: Partial<Saved>; error?: string };
      if (!response.ok || !data.account) throw new Error(data.error || "The secure account service could not complete sign-in.");
      setAccount(data.account);
      const accountPosition = data.account.position && data.account.position !== "TO CONFIRM" ? data.account.position : "";
      if (action === "login") setSaved(current => {
        const restored = data.progress?.sessionId ? { ...current, ...data.progress } : current;
        return { ...restored, email: data.account!.email, emailConfirm: data.account!.email, name: restored.name || data.account!.name, role: restored.role || (roles.includes(accountPosition) ? accountPosition : accountPosition ? "OTHER" : ""), roleOther: restored.roleOther || (accountPosition && !roles.includes(accountPosition) ? accountPosition : ""), step: accountPosition ? restored.step : "account" };
      });
      setAccountPassword(""); setAccountPasswordConfirm("");
      event(action === "signup" ? "account_created" : "account_signed_in");
      if (action === "login" && (!accountPosition || data.progress?.candidate)) return;
      await startHomework();
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Sign-in did not complete. Your progress remains safe on this device."); }
    finally { setAccountBusy(false); }
  }
  async function signOutAccount() {
    if (accountActionBusy) return;
    setAccountActionBusy(true); setAccountError("");
    try {
      const response = await fetch("/api/readiness-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("Sign out did not complete. Please try again.");
      setAccount(null);
      setSaved(current => current.candidate ? { ...current, step: "account" } : current);
      event("account_signed_out");
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Sign out did not complete. Please try again."); }
    finally { setAccountActionBusy(false); }
  }
  async function startHomework() {
    if (!saved.candidate || busy) return;
    if (validPreparedDocument(saved.preparedDocument) || verifiedCanonicalTar(saved.verifiedTar)) { go("homework"); return; }
    const candidate = saved.candidate;
    go("homework");
    const started = Date.now();
    setHomeworkStarted(started);
    setBusy("profile"); setError(""); setSaved(state => ({ ...state, homeworkFailure: null }));
    try {
      const existingSetup = saved.state && typeof saved.state === "object" && "setup" in saved.state
        ? (saved.state as { setup?: { income?: string } }).setup : null;
      // A saved profile without a public-income tier cannot produce the
      // canonical deterministic score. Refresh it instead of repeatedly
      // reusing the same incomplete state on Retry.
      const canReuseProfile = Boolean(saved.intelligence && saved.candidate?.latestIncome !== null && existingSetup?.income);
      const data = canReuseProfile ? { candidate, state: saved.state, intelligence: saved.intelligence } : await post("/api/published-review", { operation: "profile", candidate, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      setSaved(state => ({ ...state, candidate: data.candidate, state: data.state, intelligence: data.intelligence, verifiedTar: null }));
      if (data.candidate.entityType !== "registered_charity") { go("non-sorp"); return; }
      const reviewed = await post("/api/published-review", { operation: "prepare-tar", methodologyVersion: "1.0", candidate: data.candidate, state: data.state, sessionId: saved.sessionId, intelligencePin: data.intelligence });
      if (!validPreparedDocument(reviewed.preparedDocument)) throw new Error("The Trustees’ Annual Report was not fully validated. Please retry.");
      setSaved(state => ({ ...state, preparedDocument: reviewed.preparedDocument, walkthroughSeen: false }));
    } catch (cause) {
      const failure = cause as Error & { recovery?: string; incidentId?: string | null; diagnostic?: HomeworkFailure["diagnostic"] };
      const recovery = failure.recovery === "upload-report" ? "upload-report" : "retry";
      setError("");
      setProblemStatus("");
      setSaved(state => ({ ...state, step: "tar-recovery", homeworkFailure: { reason: failure.message || "We could not read the Trustees’ Annual Report reliably.", incidentId: failure.incidentId || null, recovery, diagnostic: failure.diagnostic } }));
    }
    finally { setBusy(""); }
  }
  async function submitHomeworkProblem(event: React.FormEvent) {
    event.preventDefault();
    if (problemSending || problemMessage.trim().length < 3) return;
    setProblemSending(true); setProblemStatus("");
    const failure = saved.homeworkFailure;
    try {
      const response = await fetch("/api/readiness/problem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        sessionId: saved.sessionId, incidentId: failure?.incidentId || "", organisationName: saved.candidate?.name || "", organisationId: saved.candidate?.registrationNumber || "",
        email: problemEmail, message: problemMessage, diagnostic: [failure?.reason, failure?.diagnostic?.source, failure?.diagnostic?.stage, failure?.diagnostic?.httpStatus ? `HTTP ${failure.diagnostic.httpStatus}` : "", failure?.diagnostic?.attemptCount ? `${failure.diagnostic.attemptCount} attempts` : ""].filter(Boolean).join(" · "),
      }) });
      const result = await response.json() as { accepted?: boolean; queued?: boolean; emailSent?: boolean; cowLogged?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "The message was not accepted.");
      setProblemStatus(result.emailSent ? "Thank you — your message has been emailed to My Social Impact." : result.queued ? "Thank you — your message is saved for My Social Impact and queued for delivery." : "Thank you — your message has been logged for My Social Impact.");
      setProblemMessage("");
    } catch (cause) { setProblemStatus(cause instanceof Error ? cause.message : "We could not submit that message. Please email marcus@mysocialimpact.org instead."); }
    finally { setProblemSending(false); }
  }
  async function finishQuickReview(lens: Lens) {
    if (!verifiedCanonicalTar(lens)) throw new Error("The Trustees’ Annual Report was not fully read. We cannot give a score yet.");
    const next: Report = { candidate: saved.candidate!, tar: lens, wider: emptyLens("wider", "Wider evidence was deliberately not assessed in this published-reporting review."), createdAt: new Date().toISOString(), intelligence: saved.intelligence! };
    setSaved(state => ({ ...state, report: next, email: state.email.trim(), verifiedTar: lens, step: saved.candidate?.entityType === "registered_charity" ? "assessment" : "non-sorp" }));
    event("public_research_completed", { readinessScore: lens.score ?? undefined, evidenceConfidence: lens.confidence }); event("quick_review_reached"); event("tar_score", { readinessScore: lens.score ?? undefined });
  }
  async function review(e?: React.FormEvent) {
    e?.preventDefault(); if (!saved.candidate || !saved.intelligence || busy) return;
    if (!homeworkComplete) { setSaved(state => ({ ...state, preparedDocument: null, step: "homework" })); setError("Your saved document checkpoint has expired. Your charity selection is saved; locate and read its report again to continue."); return; }
    if ((saved.email || saved.emailConfirm) && saved.email.trim().toLowerCase() !== saved.emailConfirm.trim().toLowerCase()) { setError("Your saved account email could not be confirmed. Please return to the account step and sign in again."); return; }
    setHomeworkStarted(Date.now());
    setError(""); go("assessment");
    if (verifiedCanonicalTar(saved.verifiedTar)) {
      if (!saved.report) await finishQuickReview(saved.verifiedTar);
      return;
    }
    setBusy("tar");
    try {
      const reviewed = await post("/api/published-review", { operation: "assess-tar", methodologyVersion: "1.0", preparedDocumentId: saved.preparedDocument?.id, candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence });
      if (reviewed.lens?.publicationStatus === "REVIEW_REQUIRED") throw new Error("The document was read successfully, but a material evidence question needs human review. No score has been published.");
      await finishQuickReview(reviewed.lens as Lens);
    } catch (cause) {
      const failure = cause as Error & { recovery?: string; incidentId?: string | null };
      if (failure.recovery === "prepare-report") setSaved(state => ({ ...state, preparedDocument: null, step: "homework" }));
      setError(failure.message || "The assessment could not finish. Your validated report is saved; please retry.");
    } finally { setBusy(""); }
  }
  async function uploadTar(file?: File) {
    if (!file || !saved.candidate || !saved.intelligence || busy) return;
    const payload = new FormData();
    payload.set("payload", JSON.stringify({ operation: "prepare-tar", methodologyVersion: "1.0", candidate: saved.candidate, state: saved.state, sessionId: saved.sessionId, intelligencePin: saved.intelligence }));
    payload.set("report", file);
    const started = Date.now();
    setHomeworkStarted(started);
    setBusy("profile"); setError(""); go("homework");
    try { const data = await post("/api/published-review", payload); if (!validPreparedDocument(data.preparedDocument)) throw new Error("The uploaded report was not fully read."); setSaved(state => ({ ...state, preparedDocument: data.preparedDocument, walkthroughSeen: false, homeworkFailure: null, step: "homework" })); }
    catch (cause) { setError(""); setSaved(state => ({ ...state, step: "tar-recovery", homeworkFailure: { reason: cause instanceof Error ? cause.message : "This copy could not be read safely.", incidentId: null, recovery: "upload-report", diagnostic: { stage: "uploaded-report", source: "Uploaded report", validation: "failed" } } })); }
    finally { setBusy(""); setGenerationReady(false); }
  }
  function updateCorrection(patch: Partial<Correction>) {
    if (!current) return; const id = String(current.question.id);
    setSaved(state => ({ ...state, corrections: { ...state.corrections, [id]: { ...(state.corrections[id] || { context: "", reviewed: false }), ...patch } } }));
  }
  function nextCriterion() {
    if (!current || !saved.corrections[String(current.question.id)]?.answer) return;
    const id = String(current.question.id);
    const wasReviewed = saved.corrections[id]?.reviewed;
    setSaved(state => ({ ...state, corrections: { ...state.corrections, [id]: { ...(state.corrections[id] || { context: "" }), reviewed: true } }, criterion: state.criterion + 1 < tests.length ? state.criterion + 1 : state.criterion, step: state.criterion + 1 < tests.length ? "criterion" : "complete" }));
    if (!wasReviewed) event("guided_prompt_completed", { currentStage: saved.criterion + 1 });
    if ([6, 13, 18].includes(saved.criterion)) setMilestone(saved.criterion === 6 ? "7 OF 19 COMPLETE ✓" : saved.criterion === 13 ? "14 OF 19 COMPLETE ✓" : "19 OF 19 COMPLETE ✓");
    if (saved.criterion === tests.length - 1) { event("core_questions_completed"); event("guided_conversation_completed"); }
  }
  function resultWithContext(value: Report) {
    const historical = value.tar.mandatory;
    const snapshot = historicalSnapshotInterpretation(value.tar);
    const currentMandatory = currentResult?.mandatory;
    const summary = (status: typeof historical) => status ? `${status.demonstrated} of ${status.applicable} applicable MUST requirements clearly demonstrated; ${status.attention + status.gaps} need attention; ${status.unconfirmed} require confirmation.` : "Mandatory status could not be established.";
    const label = (answer: CanonicalAnswer | Finding["answer"]) => scale.find(item => item.value === answer)?.label || "NOT SURE";
    const trail = questions.map(({ question, finding }) => {
      const answer = saved.corrections[String(question.id)];
      const audit = finding.assessmentTrail;
      const auditText = audit ? `SOURCE: ${audit.source.document}; period ${audit.source.reportingPeriod || "not stated"}; ${audit.source.url}; SHA-256 ${audit.source.digest}. EVIDENCE: ${audit.evidence.length ? audit.evidence.map(item => `${item.id}, page ${item.page}${item.section ? `, ${item.section}` : ""}: “${item.excerpt}”${item.relevance ? ` (${item.relevance})` : ""}`).join(" | ") : "No exact passage established this area."} PROPOSITIONS: ${audit.propositions.map(item => { const validation = audit.validation?.find(result => result.propositionId === item.id); return `${item.id}=${item.state}: ${item.condition}${item.explanation ? ` (${item.explanation})` : ""}; evidence ${item.evidenceIds.join(", ") || "none"}; validation ${validation?.valid === false ? "failed" : "passed"}${validation?.adjudicated ? " after targeted adjudication" : ""}`; }).join(" | ")}. SORP TEST: ${audit.sorpTest.requirement}; references ${audit.sorpTest.references.join(", ")}. LOGICAL TEST: ${audit.logicalTest}; approved rule ${audit.ruleVersion}. CLASSIFICATION: ${audit.classification}. WHY: ${audit.why} WHY NOT HIGHER: ${audit.whyNotHigher}` : "STRUCTURED AUDIT TRAIL: unavailable for this earlier assessment result.";
      return { title: `${question.code} · ${question.title}`, detail: `Methodology V${methodologyVersion}. ${auditText} Requirement status: ${finding.classification}. Confidence (separate from classification): ${finding.confidence}. ${finding.contradictions ? `Qualifying or contradictory evidence: ${finding.contradictions}. ` : ""}${finding.needsHumanReview ? "Applicable MUST: human review advised. " : ""}${finding.msiInsight ? `MSI INSIGHT: ${finding.msiInsight}. ` : ""}CURRENT POSITION: ${answer?.answer ? label(answer.answer) : "Not confirmed"}; charity-supplied, not independently verified. ${answer?.savedContext ? `Charity comment: ${answer.savedContext}. ` : ""}${answer?.widerSource ? `EVIDENCE ELSEWHERE: ${answer.widerSource}${answer.widerNote ? `, ${answer.widerNote}` : ""}; this does not rewrite the historical TAR. ` : ""}FOR NEXT TAR: ${finding.action}` };
    });
    const correctionTrail = (value.tar.historicalCorrections || []).map(item => ({
      title: `HISTORICAL CORRECTION / ${item.questionId}`,
      detail: `Human-confirmed correction to the historical TAR assessment, not a current-position change. Original answer: ${item.originalAnswer}. Original evidence: ${item.originalEvidence}. Original reasoning: ${item.originalReason}. Corrected answer: ${item.correctedAnswer}. Corrected evidence: ${item.correctedEvidence}. Reason for correction: ${item.correctionReason}. Reviewer: ${item.reviewer}. Confirmed: ${item.confirmedAt}.`,
    }));
    const wider = questions.filter(({ question }) => saved.corrections[String(question.id)]?.widerSource).map(({ question }) => {
      const input = saved.corrections[String(question.id)];
      return `${question.code} · ${input.widerSource}${input.widerNote ? ` — ${input.widerNote}` : ""}. Identified by the charity; not independently verified and not a retrospective change to the TAR.`;
    });
    const issues = value.tar.findings.filter(finding => finding.classification.startsWith("MUST") && finding.answer !== "yes");
    return {
      methodologyVersion: value.tar.methodologyVersion || methodologyVersion,
      methodologyStructure: value.tar.methodologySnapshot ? { groups: value.tar.methodologySnapshot.groups.map(group => ({ prefix: group.prefix, title: group.title })), questionIds: value.tar.methodologySnapshot.tests.map(test => test.id) } : undefined,
      score: value.tar.score ?? 0, band: band(value.tar.score), confidence: value.tar.confidence as "HIGH" | "MEDIUM" | "LOW",
      historicalSnapshot: {
        reportingStrengthExplanation: snapshot.reportingStrengthExplanation,
        mandatoryApplicable: snapshot.applicable,
        mandatoryClearlyDemonstrated: snapshot.clearlyDemonstrated,
        mandatoryDistribution: mandatoryAnswerOrder.map(answer => ({ answer, label: mandatoryAnswerLabels[answer], count: snapshot.distribution[answer] })),
        interpretation: snapshot.interpretation,
        distinction: snapshot.distinction,
      },
      currentReadiness: { answered: currentKnowledge.answered, notSure: currentKnowledge.notSure, total: currentKnowledge.total, insufficientConfirmedInformation: currentKnowledge.insufficient, interpretation: currentKnowledge.message },
      overview: `CANONICAL MSI METHODOLOGY V${methodologyVersion}. HISTORICAL TAR REPORTING STRENGTH: ${value.tar.score ?? "not established"} / 100 — ${band(value.tar.score)} REPORTING STRENGTH. This is not a SORP compliance percentage. HISTORICAL MANDATORY SORP STATUS: ${summary(historical)} ${snapshot.interpretation} ${snapshot.distinction} CURRENT REPORTING STRENGTH: ${currentScore ?? "not established"} / 100${currentKnowledge.insufficient ? " — NOT YET KNOWN: insufficient confirmed information to judge current readiness confidently." : ` — ${band(currentScore)}.`} ${currentKnowledge.message} CURRENT SORP READINESS STATUS: ${summary(currentMandatory)} Current information was supplied or confirmed by the charity and has not been independently verified. Wider evidence is a separate unscored layer. This is an automated readiness assessment based on MSI’s published methodology. It is not an audit or professional assurance opinion. A human should review the underlying evidence and conclusions before relying on them.`,
      sectionScores: (currentAreaScores || []).map(area => ({ section: area.section, label: area.title, score: area.score, narrative: "Current charity-supplied position, not independently verified. Historical and wider evidence remain separate." })),
      strong: strong.map(finding => `${finding.questionId || finding.fieldId}: ${finding.finding}`), attention: gaps.map(finding => `${finding.questionId || finding.fieldId}: ${finding.finding}`),
      must: issues.map(finding => `${finding.questionId}: ${finding.action}`), should: value.tar.findings.filter(finding => finding.classification === "SHOULD" && finding.answer !== "yes").map(finding => `${finding.questionId}: ${finding.action}`), may: value.tar.findings.filter(finding => finding.classification === "MAY" && finding.answer !== "yes").map(finding => `${finding.questionId}: ${finding.action}`), judgement: currentUnknown.map(({ question }) => `${question.code}: current position needs confirmation.`),
      additionalChecks: [], trusteesReportReadiness: [`Validated source: ${value.tar.title} · ${value.tar.period} · ${value.tar.sourceUrl}`, `Historical Reporting Strength: ${value.tar.score ?? "not established"} / 100 — ${band(value.tar.score)} REPORTING STRENGTH. This is not a SORP compliance percentage.`, `Historical mandatory status: ${summary(historical)}`, `Mandatory distribution: ${mandatoryAnswerOrder.map(answer => `${snapshot.distribution[answer]} ${mandatoryAnswerLabels[answer]}`).join("; ")}.`, `What this means: ${snapshot.interpretation}`, snapshot.distinction, ...value.tar.findings.map(finding => `${finding.questionId}: ${label(finding.answer)}; ${finding.reason}`)],
      widerImpactEvidence: wider, userConfirmedPractice: questions.map(({ question }) => { const input = saved.corrections[String(question.id)]; return `${question.code}: ${input?.answer ? label(input.answer) : "Not confirmed"}. ${input?.savedContext || "No further comment."} Charity-supplied and not independently verified.`; }),
      priorities: [...currentActions.doNow, ...currentActions.improve].map(finding => `${finding.questionId || finding.fieldId}: ${finding.answer === "not_sure" ? "Confirm what can be evidenced before deciding action." : priorityAction(finding)}`),
      priorityHierarchy: {
        doNow: currentActions.doNow.map(finding => `${finding.questionId || finding.fieldId}: ${finding.answer === "not_sure" ? "Not yet known — confirm what can be evidenced." : priorityAction(finding)}`),
        improveWhenPractical: currentActions.improve.map(finding => `${finding.questionId || finding.fieldId}: ${priorityAction(finding)}`),
        alreadyStrongNoAction: currentActions.noAction.map(finding => `${finding.questionId || finding.fieldId}: No immediate action indicated.`),
      },
      publishedEvidence: { scoreAvailable: value.tar.score !== null, methodology: `Canonical MSI Methodology V${methodologyVersion}; deterministic decision rules V${value.tar.ruleVersion || "not recorded"}. ${tests.length} questions, tier-weighted deterministic Reporting Strength score. ${Object.entries(answerScores).map(([answer, points]) => `${answer.toUpperCase().replaceAll("_", " ")}=${points}`).join("; ")}. Evidence is retrieved first, then interpreted into propositions; approved rules assign classifications; confidence is recorded separately. Only canonical genuine N/A is excluded. Mandatory status is reported separately: an applicable MUST is clearly demonstrated only at the top answer threshold. MOSTLY and PARTLY contribute to Reporting Strength without being classed as clearly demonstrated. The public methodology is at https://sorp2026.org/are-you-sorp-ready/review/. Historical TAR, current position and wider evidence are distinct layers. Run ${value.tar.assessmentRun?.id || "not recorded"}; source SHA-256 ${value.tar.assessmentRun?.sourceDigest || "not recorded"}; engine ${value.tar.assessmentRun?.engineVersion || "not recorded"}; model ${value.tar.assessmentRun?.modelVersion || "not recorded"}; assessed ${value.tar.assessmentRun?.assessedAt || "not recorded"}.`, traceability: [...trail, ...correctionTrail] },
    };
  }
  async function buildReport() {
    if (!report || busy || !saved.email || !currentResult) return;
    const started = performance.now();
    setBusy("email"); setError(""); setGeneration([]); setReportSlide(0); setGenerationReady(false); go("generating"); event("full_report_generation_started");
    try {
      setGenerationReady(true);
      await revealSteps(reportSteps);
      await pause(Math.max(0, 15000 - (performance.now() - started)));
      setSaved(state => ({ ...state, step: "report-ready", reportView: 0 }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Report preparation failed. Please retry."); setSaved(state => ({ ...state, step: "complete" })); }
    finally { setBusy(""); setGenerationReady(false); }
  }
  async function sendFinalReport(receiptKey: string) {
    if (!["final-feedback", "support", "before-go", "next", "help", "done"].includes(saved.step) || !report || !saved.email || saved.emailSent) return;
    const send = async () => {
      try {
        if (localStorage.getItem(receiptKey) === "sent") {
          setSaved(state => ({ ...state, emailSent: true }));
          return;
        }
        setEmailSending(true);
        setError("");
        const data = await post("/api/readiness/review-report-email", { deliveryStage: "report-complete", productStatus: "BETA", sessionId: saved.sessionId, email: saved.email, name: saved.name, role: saved.role === "OTHER" ? saved.roleOther : saved.role, shareRequestWithMsi: true, organisation: saved.candidate?.name, result: resultWithContext(report), impactMode: false });
        if (!data.ok || !data.attachment?.endsWith(".pdf")) throw new Error("The full PDF was not confirmed as attached. Please retry.");
        // Persist the receipt before rendering success, including across tabs/history.
        localStorage.setItem(receiptKey, "sent");
        setSaved(state => ({ ...state, emailSent: true }));
        event("pdf_email_sent");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Email failed. No success was confirmed."); }
      finally { setEmailSending(false); }
    };
    // The provider also deduplicates the unchanged report if a tab closes mid-send.
    if (navigator.locks) await navigator.locks.request(receiptKey, send);
    else await send();
  }
  async function contribute() {
    const amountMinor = supportPence(support, custom);
    if (!amountMinor || busy) return; setBusy("support"); setError(""); event("support_payment_started", { amountMinor, currency: "GBP", paymentType: "voluntary_support" });
    try { const data = await post("/api/sorp-payments/checkout", { paymentType: "voluntary_support", presentation: "embedded", band: null, amountMinor, sessionId: saved.sessionId, organisation: saved.candidate?.name, email: saved.email, idempotencyKey: `${saved.sessionId}:support:${amountMinor}:${crypto.randomUUID()}` }); if (data.presentation !== "embedded" || !data.clientSecret || !data.id) throw new Error("Inline payment could not be opened. No payment was taken."); setCheckout({ clientSecret: data.clientSecret, sessionId: data.id }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Inline payment could not open. No payment was taken."); }
    finally { setBusy(""); }
  }

  function back() {
    const previous = navigation.past.at(-1);
    if (!previous || busy) return;
    setCheckout(null); setError("");
    setNavigation(history => ({ past: history.past.slice(0, -1), current: previous, future: [history.current, ...history.future] }));
    setSaved(state => ({ ...state, ...previous }));
  }
  function forward() {
    const next = navigation.future[0];
    if (!next || busy) return;
    setCheckout(null); setError("");
    setNavigation(history => ({ past: [...history.past, history.current], current: next, future: history.future.slice(1) }));
    setSaved(state => ({ ...state, ...next }));
  }

  function guide() {
    if (saved.step === "scope") return <SorpScopeGuide />;
    if (saved.step === "public-methodology") return <><SorpMethodologyGuide /><SorpMarcus variant="methodology" /></>;
    if (saved.step === "benefits") return null;
    if (saved.step === "intro") return <div className="scr-intro-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2><p className="scr-intro-vision-context">This requirement is an opportunity to understand, evidence and improve impact throughout the year.</p></div>;
    if (saved.step === "quick-generating" || saved.step === "quick-ready" || saved.step === "tar-recovery") return <><p className="scr-kicker">HOW THIS WORKS</p><h2>SORP 2026 IS OUR SOURCE OF TRUTH.</h2><p>We compare your latest published Trustees’ Annual Report and accounts against {tests.length} questions mapped to SORP 2026.</p><p>My Social Impact’s methodology interprets the published evidence and applies a fixed scoring approach to give you a historical SORP-readiness starting point.</p><p>Next, you’ll tell us what has changed since then.</p></>;
    if (saved.step === "quick") return <div className="scr-quick-language"><p className="scr-kicker">THE LANGUAGE OF SORP</p><dl>{[["MUST", "Required to comply with the SORP."], ["SHOULD", "Good-practice recommendations that charities are encouraged to follow."], ["MAY", "Options or approaches a charity can choose where appropriate."]].map(([label, description]) => <div key={label}><dt className={`scr-quick-term--${label.toLowerCase()}`}>{label}</dt><dd>{description}</dd></div>)}</dl><p className="scr-quick-language-note">Some areas require judgement when applying the SORP to real evidence.</p><p>My Social Impact Intelligence assesses the published evidence against these requirements. You can inspect the SORP source behind each assessment in the next stage.</p></div>;
    if (saved.step === "quick-feedback") return null;
    if (saved.step === "final-feedback") return <><p className="scr-kicker">OPTIONAL FEEDBACK</p><h2>Help the next charity.</h2><p>One quick piece of feedback helps us improve the tool. Skip for now if this is not a good moment.</p></>;
    if (saved.step === "method") return <div className="scr-current-flow"><p className="scr-current-flow-note">You add what the historic evidence cannot tell us.</p></div>;
    if (saved.step === "criterion") return <><p className="scr-kicker">YOUR PROGRESS</p><h2>{reviewedCount} of {tests.length} reviewed.</h2><div className="scr-rail-meter"><span style={{ width: `${reviewedCount / tests.length * 100}%` }} /></div><ol className="scr-rail-areas">{areaLabels.map((label, index) => <li key={label} className={index === saved.criterion ? "is-current" : index < saved.criterion || saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : ""}><span>{saved.corrections[String(index + 1)]?.reviewed ? "✓" : index + 1}</span>{label}</li>)}</ol><p className="scr-guide-note">{saved.criterion < 7 ? "Good impact reporting starts with information you can use throughout the year." : saved.criterion < 14 ? "MUST is required. SHOULD is recommended. MAY is optional. MSI judgement is labelled separately." : "Better evidence supports better decisions, not just a stronger annual report."}</p></>;
    if (saved.step === "complete") return <><p className="scr-kicker">WHAT HAPPENS NOW</p><h2>From two views to priorities.</h2><p>We’ll compare the Historical Snapshot with your self-reported position, then include your saved comments as context for what comes next.</p></>;
    if (saved.step === "generating" || saved.step === "report-ready") return <><p className="scr-kicker">YOUR PERSONALISED REPORT</p><h2>Useful information, not just compliance.</h2><p>Better evidence helps trustees and managers make decisions during the year, not only write a report afterwards.</p></>;
    if (saved.step === "report") return saved.reportView === 0 ? <div className="scr-report-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2><p>That means reviewing impact regularly throughout the year, not just reporting it at year-end.</p><div className="scr-report-support"><h3>HUMAN REVIEW</h3><p>This assessment identifies the important areas worth discussing. A human review is where MSI agrees what work, if any, your charity actually needs.</p></div></div> : <div className="scr-agenda-guide"><p className="scr-kicker">USE IT. DON’T JUST FILE IT.</p><ol className="scr-agenda-cycle"><li>REVIEW<span aria-hidden="true">↓</span></li><li>ACT<span aria-hidden="true">↓</span></li><li>REVISIT</li></ol><p className="scr-agenda-principle">Impact is something to manage throughout the year, not reconstruct at year-end.</p><div className="scr-agenda-hand"><h3>WANT A HAND?</h3><p>You can book a professional review with My Social Impact at the end of this process.</p></div></div>;
    if (saved.step === "email-ready") return <><p className="scr-kicker">KEEP YOUR REPORT</p><h2>Share it and use it.</h2><p>The PDF is yours to share with trustees or colleagues, use as an action plan, or bring to a conversation with My Social Impact.</p></>;
    if (saved.step === "support") return <><p className="scr-kicker">YOUR REPORT IS YOURS</p><h2>Optional support.</h2><p>No contribution is needed to receive your report. Supporting the free tool helps us offer it to more charities.</p></>;
    if (saved.step === "before-go") return <div className="scr-beyond"><p className="scr-kicker">BEYOND COMPLIANCE</p><div className="scr-beyond-words"><span>SORP READY</span><span>Better impact.</span><span>Social Impact Excellence</span></div><p className="scr-beyond-caption">Being SORP ready is the starting point. Better impact is the opportunity.</p></div>;
    if (saved.step === "help") return <><p className="scr-kicker">IMPACT THROUGHOUT THE YEAR</p><h2>Beyond the annual report.</h2><p>Useful evidence. Better decisions. Stronger impact.</p></>;
    if (saved.step === "next") return <div className="scr-report-vision"><p className="scr-kicker">OUR VISION</p><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2></div>;
    if (saved.step === "done") return <><p className="scr-kicker">REVIEW COMPLETE</p><h2>Your report is ready to use.</h2><p>Return to it when planning your next Trustees’ Annual Report or discussing priorities with colleagues.</p><p className="scr-beta-thanks">Thanks for helping us improve Are You SORP Ready? while it’s in beta.</p></>;
    return <><p className="scr-kicker">THE RIGHT ENTITY</p><h2>Let’s check the charity record.</h2><p>A non-charity entity should not be assessed as if SORP applies to it.</p></>;
  }

  if (!loaded) return <main className="sorp-conversation-page scr-page"><header className="sorp-workspace-brand"><Link className="scr-header-brand" href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready? <small className="scr-beta-badge">BETA</small><small className="scr-inline-build" aria-label={BUILD}><span>{BUILD}</span><i>{BUILD_COMPACT}</i></small></strong></Link>{GOOGLE_ACCOUNT_SIGN_IN_ENABLED && <a className="scr-header-login" href="/api/readiness-account/google/start"><GoogleMark/><span>LOG IN <b>WITH GOOGLE</b></span></a>}</header><p className="scr-loading">Opening your SORP review…</p></main>;
  const introScreen = introductionScreens.find(screen => screen === saved.step);
  const discoveryScreen = ["find", "confirmation", "account", "homework", "assessment"].includes(saved.step);
  const snapshotScreen = ["quick-generating", "quick-ready", "quick"].includes(saved.step);
  const journeyScreen = saved.step === "report" && saved.reportView === 1 ? "report-agenda" : saved.step;
  return <main id="main" className={`sorp-conversation-page scr-page scr-screen--${journeyScreen}${snapshotScreen ? " scr-page--snapshot" : ""}${discoveryScreen ? ` scr-page--discovery scr-discovery--${saved.step}` : ""}${introScreen ? " scr-page--opening" : ""}${saved.step === "scope" ? " scr-page--scope" : saved.step === "public-methodology" ? " scr-page--public-methodology" : saved.step === "benefits" ? " scr-page--benefits" : saved.step === "intro" ? " scr-page--intro" : saved.step === "find" ? " scr-page--find" : saved.step === "quick" ? " scr-page--quick" : saved.step === "quick-feedback" ? " scr-page--quick-feedback" : saved.step === "method" ? " scr-page--method" : saved.step === "help" ? " scr-page--help" : saved.step === "tar-recovery" ? " scr-page--tar-recovery" : ""}`}>
    <header className="sorp-workspace-brand"><Link className="scr-header-brand" href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready? <small className="scr-beta-badge">BETA</small><small className="scr-inline-build" aria-label={BUILD}><span>{BUILD}</span><i>{BUILD_COMPACT}</i></small></strong></Link><div className="scr-header-actions"><div className="sorp-workspace-brand-meta"><p>SORP is the requirement.<br /><strong>Better impact is the opportunity.</strong></p></div>{account ? <div className="scr-header-account"><span><i aria-hidden="true">✓</i><span><b>SIGNED IN</b><small title={account.email}>{account.email}</small></span></span><button type="button" disabled={accountActionBusy} onClick={() => void signOutAccount()}>{accountActionBusy ? "SIGNING OUT…" : "SIGN OUT"}</button></div> : GOOGLE_ACCOUNT_SIGN_IN_ENABLED && <a className="scr-header-login" href="/api/readiness-account/google/start" onClick={() => { setGoogleSignInStarting(true); event("header_google_sign_in_started"); }}><GoogleMark/><span>{googleSignInStarting ? "OPENING GOOGLE…" : <>LOG IN <b>WITH GOOGLE</b></>}</span></a>}</div></header>
    <div className="scr-top">{saved.step !== "scope" && saved.step !== "intro" && saved.step !== "find" && <div><small>{BUILD}</small><h2>{saved.step === "done" ? "You’re done" : phases[phase]}</h2></div>}<nav aria-label="Review progress">{phases.map((label, index) => <span key={label} className={saved.step === "done" || index < phase ? "is-complete" : index === phase ? "is-current" : ""}><i>{saved.step === "done" || index < phase ? "✓" : index + 1}</i><b>{label}</b></span>)}</nav></div>
    <div key={["scope", "public-methodology", "intro", "benefits", "find"].includes(saved.step) ? saved.step : "assessment"} className={`scr-workspace${["scope", "public-methodology", "intro", "benefits", "find"].includes(saved.step) ? " scr-opening-enter" : ""}`}>
      <SorpScreenContext.Provider value={journeyScreen}><section className="scr-main" aria-live={["homework", "assessment"].includes(saved.step) ? undefined : "polite"}>
        {introScreen && <SorpIntroduction screen={introScreen} />}
        {milestone && <div className="scr-milestone" role="status">{milestone}</div>}
        {["find", "confirmation"].includes(saved.step) && <div className="si-progress"><span>FIND CHARITY · {saved.step === "find" ? 1 : 2} OF 2</span><span className="si-progress-dots" aria-hidden="true"><i className={saved.step === "find" ? "is-active" : "is-past"} /><i className={saved.step === "confirmation" ? "is-active" : ""} /></span></div>}
        {saved.step === "find" && <><div className="sd-find-hero"><SorpScreenHero><p className="scr-kicker">YOUR ORGANISATION. YOUR STARTING POINT.</p><h1>Let’s find{" "}your charity.</h1></SorpScreenHero><p>Enter your registered charity name or charity number. We’ll confirm we’ve found the right organisation before reviewing anything.</p><form id="scr-find-form" onSubmit={find} className="scr-find"><label htmlFor="scr-query">Charity name or number</label><input id="scr-query" value={saved.query} onChange={e => setSaved(state => ({ ...state, query: e.target.value, research: null, candidate: null, state: null }))} placeholder="e.g. Interim Spaces or 1165694"/><button type="submit" disabled={!!busy || !saved.query.trim() || !!saved.research}>{busy ? "FINDING YOUR CHARITY…" : "FIND MY CHARITY →"}</button></form></div>{busy && <div className="scr-search-progress" role="status"><h2>FINDING YOUR CHARITY…</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy phase="identity" /></div>}{saved.candidate && saved.research && !busy && <div className="scr-search-progress" role="status"><h2>WE FOUND A MATCH ✓</h2><EvidenceChecklist candidate={saved.candidate} research={saved.research} tier={reportingTier} busy={false} phase="identity" /></div>}{saved.research && !saved.candidate && !busy && <div className="scr-results"><h2>{saved.research.candidates.length ? "Choose the right registered organisation" : "We need one more clue."}</h2>{saved.research.candidates.map(candidate => <article key={`${candidate.registrationNumber}-${candidate.name}`}><div><strong>{candidate.name}</strong><p>{candidate.locality} · {candidate.registrationNumber || candidate.entityType}</p></div><button type="button" onClick={() => confirmCandidate(candidate)}>VIEW THIS CHARITY →</button></article>)}{!saved.research.candidates.length && <p>Try the registered name, charity number or a location.</p>}</div>}<section className="sd-tiers" aria-label="SORP reporting tiers"><div className="sd-tier-intro"><p className="scr-kicker">GOOD TO KNOW</p><p>Your tier affects which SORP reporting requirements apply.</p></div><div className="sd-tier"><span>TIER 1</span><strong>£500k or less</strong><i aria-hidden="true" /></div><div className="sd-tier"><span>TIER 2</span><strong>Over £500k to £15m</strong><i aria-hidden="true" /></div><div className="sd-tier"><span>TIER 3</span><strong>Over £15m</strong><i aria-hidden="true" /></div></section></>}
        {saved.step === "confirmation" && saved.candidate && <><div className="sd-found"><SorpScreenHero><p className="scr-kicker"><span className="sd-found-mark" aria-hidden="true">✓</span> WE FOUND YOU ✓</p><h1>{saved.candidate.name}</h1></SorpScreenHero><SorpIdentityPreview key={saved.candidate.website} website={saved.candidate.website} name={saved.candidate.name} /></div><div className="sd-identity-facts"><div className="scr-fact"><span>Charity number</span><strong>{saved.candidate.registrationNumber || "Not established"}</strong></div><div className="scr-fact"><span>Charity Commission record</span><strong>{safeLink(saved.candidate.officialUrl) ? <a href={saved.candidate.officialUrl} target="_blank" rel="noreferrer">VIEW OFFICIAL RECORD ↗</a> : "Not available"}</strong></div><div className="scr-fact"><span>Official website</span><strong>{safeLink(saved.candidate.website) ? <a href={saved.candidate.website} target="_blank" rel="noreferrer">VIEW WEBSITE ↗</a> : "Not found"}</strong></div>{saved.candidate.locality && <div className="scr-fact"><span>Location</span><strong>{saved.candidate.locality}</strong></div>}</div><p className="sd-confirm-prompt">Check the details to confirm we’ve found the right charity.</p></>}
        {saved.step === "account" && saved.candidate && <div className="scr-account"><SorpScreenHero><p className="scr-kicker">SAVE YOUR FREE REVIEW</p><h1>{account ? "YOUR REVIEW IS SAVED TO YOUR ACCOUNT." : accountMode === "signup" ? "CREATE YOUR FREE ACCOUNT." : "WELCOME BACK."}</h1></SorpScreenHero><p className="scr-lead">Your account saves your progress securely, so you can leave and continue on this or another device.</p><div className="scr-account-organisation"><span>ORGANISATION</span><strong>{saved.candidate.name}</strong><small>Charity number {saved.candidate.registrationNumber}</small></div>{!account && <button type="button" className="scr-account-switch" onClick={() => { setAccountMode(mode => mode === "signup" ? "login" : "signup"); setAccountError(""); }}><span>{accountMode === "signup" ? "ALREADY HAVE AN ACCOUNT?" : "NEW TO ARE YOU SORP READY?"}</span><strong>{accountMode === "signup" ? "SIGN IN →" : "CREATE A FREE ACCOUNT →"}</strong></button>}{!account && GOOGLE_ACCOUNT_SIGN_IN_ENABLED && <><a className={`scr-google-signin${googleSignInStarting ? " is-starting" : ""}`} aria-busy={googleSignInStarting} href="/api/readiness-account/google/start" onClick={() => { setGoogleSignInStarting(true); setAccountError(""); event("google_sign_in_started"); }}><GoogleMark/><span>{googleSignInStarting ? "OPENING GOOGLE…" : "SIGN IN WITH GOOGLE"}</span></a><div className="scr-account-divider"><span>OR USE EMAIL</span></div></>}<form className="scr-account-form" onSubmit={submitAccount}>{account ? <div className="scr-account-signed"><strong>✓ SIGNED IN SECURELY</strong><span>{account.email}</span></div> : null}{accountMode === "signup" || account ? <><label>Your name<input required maxLength={120} autoComplete="name" value={saved.name} onChange={event => setSaved(state => ({ ...state, name: event.target.value }))}/></label><label>Your role<select required value={saved.role} onChange={event => setSaved(state => ({ ...state, role: event.target.value }))}><option value="">Choose your role</option>{roles.map(role => <option key={role} value={role}>{role}</option>)}</select></label>{saved.role === "OTHER" && <label>Describe your role<input required maxLength={120} autoComplete="organization-title" value={saved.roleOther} onChange={event => setSaved(state => ({ ...state, roleOther: event.target.value }))}/></label>}</> : null}{!account && <><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={saved.email} onChange={event => setSaved(state => ({ ...state, email: event.target.value }))}/></label>{accountMode === "signup" && <label>Confirm email address<input required type="email" maxLength={254} autoComplete="email" value={saved.emailConfirm} onChange={event => setSaved(state => ({ ...state, emailConfirm: event.target.value }))}/></label>}<label>Password<input required type="password" minLength={10} maxLength={200} autoComplete={accountMode === "signup" ? "new-password" : "current-password"} value={accountPassword} onChange={event => setAccountPassword(event.target.value)}/></label>{accountMode === "signup" && <label>Confirm password<input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={accountPasswordConfirm} onChange={event => setAccountPasswordConfirm(event.target.value)}/></label>}</>}{accountError && <div className="scr-account-error" role="alert"><strong>We couldn’t complete that yet.</strong><span>{accountError}</span><span>Your charity selection is still safe on this device.</span></div>}<button type="submit" disabled={accountBusy}>{accountBusy ? "SAVING SECURELY…" : account ? "CONTINUE TO THE PUBLIC REPORT →" : accountMode === "signup" ? "CREATE MY FREE ACCOUNT →" : "SIGN IN AND CONTINUE →"}</button></form><p className="scr-account-note">The assessment and personalised report are free. Your details let us save your work and deliver your report; they do not commit you to paid support.</p></div>}
        {saved.step === "homework" && <><SorpHomeworkExperience key={homeworkStarted} candidate={saved.state ? saved.candidate : null} tier={saved.state ? reportingTier : "Not yet confirmed"} document={validPreparedDocument(saved.preparedDocument) ? saved.preparedDocument! : null} lens={verifiedCanonicalTar(saved.verifiedTar) ? saved.verifiedTar : null} waiting={!!busy} startedAt={homeworkStarted} sessionId={saved.sessionId} />{homeworkComplete && !busy && <div className="scr-account-confirmed"><strong>✓ PROGRESS SAVED TO {saved.email}</strong><span>Your personalised report will be sent here when the journey is complete.</span></div>}</>}
        {saved.step === "assessment" && <SorpAssessmentExperience key={homeworkStarted} lens={verifiedCanonicalTar(saved.verifiedTar) ? saved.verifiedTar : null} waiting={busy === "tar"} startedAt={homeworkStarted} sessionId={saved.sessionId} resumed={Boolean(saved.walkthroughSeen)} onReady={() => setSaved(state => ({ ...state, walkthroughSeen: true }))}/>}

        {saved.step === "quick-generating" && <SnapshotBuilding verified={verifiedCanonicalTar(saved.verifiedTar)}/>}
        {saved.step === "quick-ready" && <SnapshotReady/>}
        {saved.step === "quick" && tar && <QuickReviewResult lens={tar} onMethodology={() => go("public-methodology")}/>}
        {saved.step === "quick-feedback" && <><SorpScreenHero><h1>HOW’S THE EXPERIENCE SO FAR?</h1></SorpScreenHero><FeedbackPanel quick rating={saved.quickRating} comment={saved.quickComment} status={feedbackStatus.quick} onRating={value => { setSaved(state => ({ ...state, quickRating: value })); void saveFeedback("quick", value, saved.quickComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, quick: "" })); setSaved(state => ({ ...state, quickComment: value })); }} onCommentBlur={() => void saveFeedback("quick", saved.quickRating, saved.quickComment)}/></>}
        {saved.step === "method" && <><SorpScreenHero><h1>YOUR HISTORICAL SNAPSHOT WAS THE STARTING POINT.{" "}NOW BRING IT UP TO DATE.</h1></SorpScreenHero><div className="scr-method-intro"><p>We’ve already assessed 19 questions using your historic published evidence.</p><p>Now review each one and tell us what has changed, where you think things stand today, and anything important the old information does not show.</p><p>Your answers and comments will help us build a fuller report showing your current strengths, gaps and priorities.</p></div><div className="scr-method-comment"><h2>WHY ADD COMMENTS?</h2><p>Your comments make the report more useful internally and can also form the starting agenda if you choose to review the results with My Social Impact afterwards.</p></div><details className="scr-details scr-method-details"><summary>HOW DID WE ARRIVE AT THE HISTORICAL SNAPSHOT? <span>+</span></summary><div className="scr-method-flow"><div><b>01</b><strong>SORP 2026</strong><span>Our source of truth.</span></div><div><b>02</b><strong>19 canonical questions</strong><span>Mapped to relevant requirements and guidance.</span></div><div><b>03</b><strong>Your published evidence</strong><span>AI interprets what the TAR and accounts show.</span></div><div><b>04</b><strong>Fixed scoring method</strong><span>The score is calculated consistently from those assessments.</span></div></div><div className="scr-method-legend"><span>MUST</span><span>SHOULD</span><span>MAY</span><span>MSI / HUMAN JUDGEMENT</span></div><p>Each question lets you open the relevant SORP basis and published evidence. Your current view does not change the historical published score.</p></details></>}
        {saved.step === "criterion" && current && currentTest && <>
          <SorpScreenHero><p className="scr-kicker">QUESTION {saved.criterion + 1} OF {tests.length} · {current.question.code} · {classificationLabel(current.finding.classification)}</p><h1>{current.question.title}</h1></SorpScreenHero>
          <div className="scr-area-progress" aria-label={`${reviewedCount} of ${tests.length} questions reviewed`}>{areaLabels.map((label, index) => <span key={`${index}-${label}`} className={saved.corrections[String(index + 1)]?.reviewed ? "is-reviewed" : index === saved.criterion ? "is-current" : ""} />)}</div>
          {currentArea && <div className={`scr-current-area${current.question.id === currentArea.first ? " is-new" : ""}`}><strong>{currentArea.title}</strong><span>Questions {currentArea.first}–{currentArea.last}</span></div>}
          <p className="scr-lead">{current.question.question}</p>
          <p className="scr-muted">SORP {currentTest.sorp} · Your tier: {tier ? requirementFor(currentTest, tier, setup?.jurisdiction).status : "to confirm"}</p>
          <p className="scr-subhead">WHY THIS MATTERS</p><p>{currentTest.why}</p>
          <p className="scr-subhead">WHAT YOUR LAST TAR DEMONSTRATED</p><strong className={`scr-assessment ${current.finding.answer === "not_sure" || current.finding.confidence === "LOW" ? "is-uncertain" : ""}`}>{scale.find(item => item.value === current.finding.answer)?.label}</strong>
          <p className="scr-subhead">WHY WE SAID THIS</p><p>{current.finding.reason}</p><p className="scr-confidence">Evidence confidence: {current.finding.confidence}</p>
          {current.finding.needsHumanReview && <p className="scr-confidence"><strong>HUMAN REVIEW ADVISED:</strong> This applicable MUST finding has low-confidence or unassessable evidence.</p>}
          {current.finding.contradictions && <p><strong>QUALIFYING OR CONTRADICTORY EVIDENCE:</strong> {current.finding.contradictions}</p>}
          <details className="scr-details"><summary>SEE THE SORP BASIS <span>+</span></summary><FindingSource finding={current.finding} /></details>
          <details className="scr-details"><summary>HOW WE ASSESS THIS <span>+</span></summary><ol>{currentTest.rubric.map((description, index) => <li key={description}>{4 - index} — {scale[index].label}: {description}</li>)}</ol><p>NOT SURE — 0 FOR SCORING: {currentTest.notSure}</p>{currentTest.na && <p>NOT APPLICABLE: {currentTest.na}</p>}</details>
          <p className="scr-subhead">YOUR POSITION NOW</p><p className="scr-muted">Confirm the historical answer or choose what is true today. Your current position is self-reported and does not change the historical result.</p>
          <div className="scr-answer-grid">{scale.filter(option => option.value !== "not_applicable" || !!currentTest.na).map(option => { const selected = correction?.answer === option.value; const suggested = current.finding.answer === option.value; return <button type="button" key={option.value} aria-pressed={selected} onClick={() => updateCorrection({ answer: option.value, reviewed: false })} className={`${selected ? "is-selected" : ""} ${suggested ? "is-suggested" : ""} ${suggested && option.value === "not_sure" ? "is-uncertain" : ""}`}><span>{option.label}{suggested && <small>LAST TAR</small>}{selected && <small>YOUR CURRENT VIEW</small>}</span><span>{selected ? "✓" : "→"}</span></button>; })}</div>
          <label className="scr-context" htmlFor="scr-context">ADD A COMMENT<textarea id="scr-context" value={correction?.context || ""} onChange={e => updateCorrection({ context: e.target.value })} rows={3} maxLength={4000} placeholder="What has changed, or what should we know?" /></label>
          <div className="scr-context-actions"><button type="button" className="scr-clear" disabled={!correction?.context?.trim() || correction.savedContext === correction.context} onClick={() => updateCorrection({ savedContext: correction?.context || "" })}>SAVE MY COMMENT</button>{correction?.context?.trim() && correction.savedContext === correction.context && <span role="status">✓ COMMENT SAVED</span>}</div>
          <label className="scr-context">EVIDENCE ELSEWHERE (OPTIONAL)<select value={correction?.widerSource || ""} onChange={event => updateCorrection({ widerSource: event.target.value })}><option value="">No wider source selected</option><option value="IMPACT REPORT">Impact Report</option><option value="WEBSITE">Website</option><option value="OTHER PUBLISHED REPORT">Other published report</option><option value="INTERNAL EVIDENCE / MEASUREMENT">Internal evidence / measurement</option><option value="OTHER">Other</option></select></label>
          {correction?.widerSource && <label className="scr-context">WHERE CAN IT BE FOUND? (OPTIONAL)<textarea rows={2} maxLength={1200} value={correction.widerNote || ""} onChange={event => updateCorrection({ widerNote: event.target.value })} placeholder="A short reference or link" /></label>}
          {correction?.answer && <div className="scr-current-view"><p><b>Your current view:</b> {scale.find(item => item.value === correction.answer)?.label}</p>{correction.savedContext && <p><b>Your saved comment:</b> {correction.savedContext}</p>}</div>}
        </>}
        {saved.step === "complete" && <><SorpScreenHero><p className="scr-kicker">CURRENT READINESS COMPLETE ✓</p><h1>Thank you. Your current view is in.</h1></SorpScreenHero><p className="scr-lead">We now have two clearly labelled views:</p><div className="scr-confirmed"><p>✓ What your published reporting showed</p><p>✓ Where you say things stand now</p></div><p>We’ll compare them with the wider-evidence sources you identified and bring your saved comments into your personalised report.</p><p className="scr-muted">Your current answers do not rewrite the historical published-report score.</p></>}
        {saved.step === "generating" && <><SorpScreenHero><p className="scr-kicker">BUILDING YOUR PERSONALISED REPORT…</p><h1>Explore while we bring everything together.</h1></SorpScreenHero><p>Move through these short slides at your own pace. Your report continues building in the background.</p><ReportBuildingPresentation slide={reportSlide} onSlide={setReportSlide} complete={generation.length} active={generationReady ? Math.min(generation.length, reportSteps.length - 1) : 0}/></>}
        {saved.step === "report-ready" && <div className="scr-quick-ready"><SorpScreenHero><h1>YOUR PERSONALISED REPORT IS READY <span>✓</span></h1></SorpScreenHero><p>We’ve combined your Historical Snapshot with the answers and comments you added about where things stand now.</p><p>You can now compare your Historical Snapshot with your current self-reported readiness and see what matters most next.</p></div>}
        {saved.step === "report" && report && <>
          <p className="scr-screen-eyebrow">YOUR PERSONALISED REPORT · {saved.reportView + 1} OF 2</p>
          {saved.reportView === 0 && <>
            <SorpScreenHero><h1>YOUR CURRENT SORP READINESS</h1></SorpScreenHero>
            <p>Your Historical Snapshot showed what your latest published reporting demonstrated. This view adds the answers and comments you provided about where things stand today.</p>
            <section className="scr-readiness-visual" aria-label="Your current SORP readiness by area">
              <div className="scr-readiness-overall"><span>YOUR CURRENT SORP READINESS</span><strong>{currentScore ?? "—"}<small>{currentScore === null ? "" : " / 100"}</small></strong>{currentKnowledge.insufficient && <b>NOT YET KNOWN</b>}<p>Current self-reported position · not independently verified.</p><p className={currentKnowledge.insufficient ? "is-insufficient" : ""}>{currentKnowledge.message}</p></div>
              <div className="scr-readiness-bars">{currentAreaScores?.map(area => <div className="scr-readiness-bar" key={area.section}><div><strong>{area.title}</strong><span>{currentKnowledge.insufficient ? "NOT YET KNOWN" : area.label}</span></div><i aria-hidden="true"><b style={{ width: `${currentKnowledge.insufficient ? 0 : area.score}%` }} /></i><strong>{area.score}<small> / 100 confirmed evidence</small></strong></div>) || <p>There are not enough reviewed current answers to calculate area scores.</p>}</div>
            </section>
            <p className="scr-readiness-comparison">Historical Reporting Strength: <strong>{tar?.score ?? "—"} / 100</strong><span aria-hidden="true"> · </span>Current self-reported readiness: <strong>{currentKnowledge.insufficient ? `NOT YET KNOWN (${currentScore ?? 0} / 100 confirmed evidence)` : `${currentScore ?? "—"}${currentScore === null ? "" : " / 100"}`}</strong></p>
            <section className="scr-report-score-context"><h2>HOW THESE TWO VIEWS WORK TOGETHER</h2><p>Reporting Strength measures how much strong reporting is present across the full framework. Mandatory status asks whether each required area is evidenced clearly enough to be treated as clearly demonstrated.</p><button type="button" className="scr-clear" onClick={() => go("public-methodology")}>SEE HOW THIS SCORE WAS CALCULATED →</button></section>
            <div className="scr-report-mandatory-grid">
              {historicalSnapshot && <div><p className="scr-report-view-label">HISTORICAL · PUBLISHED EVIDENCE</p><MandatoryStatus distribution={historicalSnapshot.distribution}/></div>}
              {currentMandatoryDistribution && <div><p className="scr-report-view-label">CURRENT · YOUR ANSWERS TODAY</p><MandatoryStatus distribution={currentMandatoryDistribution} selfReported insufficient={currentKnowledge.insufficient}/></div>}
            </div>
            {currentScore === null ? <p className="scr-muted">There are not enough reviewed current answers to calculate a meaningful second score. We will not invent one.</p> : <p className="scr-score-explanation">{currentKnowledge.insufficient ? `The evidenced score remains ${currentScore}/100 because Not sure contributes zero, but it is not a confident judgement of readiness. Confirm the unanswered areas before treating them as gaps.` : scoreDifference === null ? "The published-reporting score was unavailable, so there is no numerical comparison." : scoreDifference > 0 ? "Your current view suggests that you have moved further towards SORP readiness since the Historical Snapshot. The next challenge is making sure future reporting can evidence that progress." : scoreDifference < 0 ? "Your current view is more cautious than the Historical Snapshot. That may highlight areas where practice has changed, where gaps are now clearer, or where more work is needed before the next reporting period." : "Your current view broadly confirms the Historical Snapshot. The value now lies in identifying the strongest areas, remaining gaps and priorities before the next reporting period."}</p>}
            {tar && <ReportHighlights lens={tar}/>}
            <p><strong>WHAT HAS CHANGED:</strong> {improvedCount} stronger current answers; {worsenedCount} more cautious; {tests.length - changedAnswers.length} unchanged; {currentUnknown.length} still NOT SURE. Current changes are charity-supplied, not independently verified.</p>
            {changedAnswers.length > 0 && <><h2>What changed between the two views</h2><div className="scr-report-list">{changedAnswers.map(({ question, finding }) => <p key={question.id}>{question.question}<br /><strong>{scale.find(item => item.value === finding.answer)?.label} → {scale.find(item => item.value === saved.corrections[String(question.id)]?.answer)?.label}</strong></p>)}</div></>}
            {tar && <details className="scr-details"><summary>SEE THE FULL {tests.length}-QUESTION REVIEW <span>+</span></summary><CanonicalFindings lens={tar} corrections={saved.corrections}/></details>}
            <section><h2>EVIDENCE YOU ALREADY HAVE ELSEWHERE</h2><p>You may already have evidence that was not reflected in your last TAR. This is not independently verified and does not automatically satisfy a SORP requirement.</p>{widerEvidence.length ? <ul>{widerEvidence.map(({ question }) => { const source = saved.corrections[String(question.id)]; return <li key={question.id}><strong>{question.code} · {source.widerSource}</strong>{source.widerNote && ` — ${source.widerNote}`}</li>; })}</ul> : <p>No wider evidence sources were identified in your answers.</p>}</section>
            <section><h2>FOR YOUR NEXT TAR</h2><h3>BRING THROUGH</h3><p>{widerEvidence.length ? widerEvidence.map(({ question }) => question.code).join(" · ") : "No wider source identified yet."} — consider whether relevant evidence should appear or be appropriately referenced in the next TAR.</p><h3>STRENGTHEN</h3><p>{actionCodes(currentActions.improve) || "No practical improvement item was identified."}</p><h3>ADDRESS</h3><p>{actionCodes(currentActions.doNow.filter(finding => finding.answer !== "not_sure")) || "No confirmed immediate gap was identified."}</p><h3>CONFIRM</h3><p>{actionCodes(currentActions.doNow.filter(finding => finding.answer === "not_sure")) || "No current question remains NOT SURE."}</p></section>
            <p className="scr-muted">This is an automated readiness assessment based on MSI’s published methodology. It is not an audit or professional assurance opinion. A human should review the underlying evidence and conclusions before relying on them.</p>
          </>}
          {saved.reportView === 1 && <div className="scr-agenda">
            <SorpScreenHero><h1>YOUR ACTION AGENDA</h1></SorpScreenHero><p className="scr-lead">Use this with colleagues or trustees, or as the starting agenda for a review with My Social Impact.</p><ActionAgenda groups={currentActions}/>
            {savedComments.length > 0 && <><h2>Your comments and questions</h2><p>These are the issues you highlighted. Use them internally or as a starting agenda if you talk the results through with us.</p>{savedComments.map(({ question }) => <article className="scr-user-note" key={question.id}><h3>{question.id}. {question.question}</h3><p>{saved.corrections[String(question.id)].savedContext}</p></article>)}</>}
            <section className="scr-agenda-next"><h2>BEFORE YOUR NEXT REPORTING PERIOD</h2><p>Work through these priorities and keep evidence of what changes.</p><p>Impact should become part of normal management throughout the year, not something reconstructed at year-end.</p></section>
            <aside className="scr-agenda-review"><h2>WANT TO TALK THIS THROUGH?</h2><p>You’ll have the option at the end to book a professional review with My Social Impact.</p><p>We’ll already have your assessment, comments and priorities, so you won’t need to start from scratch.</p></aside>
          </div>}
        </>}
        {saved.step === "email-ready" && <><SorpScreenHero><p className="scr-kicker">YOUR PERSONALISED REPORT IS READY ✓</p><h1>Your report is yours.</h1></SorpScreenHero><div className="scr-email-celebration"><small>YOUR REPORT IS READY</small><span aria-hidden="true">✓</span></div><p>It includes your Historical Snapshot, current self-reported readiness, the {tests.length} canonical questions, your comments, SORP sources and your priorities.</p><p>Share it with colleagues or trustees, use it as an internal action plan, or bring it to a conversation with My Social Impact.</p></>}
        {saved.step === "final-feedback" && <><SorpScreenHero><p className="scr-kicker">OPTIONAL · A FEW SECONDS</p><h1>HELP THE NEXT CHARITY</h1></SorpScreenHero><p>One quick piece of feedback helps us improve the tool. Skip it if now is not a good moment.</p><FeedbackPanel overall rating={saved.finalRating} comment={saved.finalComment} status={feedbackStatus.final} onRating={value => { setSaved(state => ({ ...state, finalRating: value })); void saveFeedback("final", value, saved.finalComment); }} onComment={value => { setFeedbackStatus(current => ({ ...current, final: "" })); setSaved(state => ({ ...state, finalComment: value })); }} onCommentBlur={() => void saveFeedback("final", saved.finalRating, saved.finalComment)}/></>}
        {saved.step === "support" && <><SorpScreenHero><p className="scr-kicker">WHAT NEXT · OPTIONAL CONTRIBUTION</p><h1>ENJOYED THIS?{" "}PLEASE HELP US KEEP IT FREE.</h1></SorpScreenHero><p className="scr-lead">If this has been useful, a small contribution helps us keep building and running free tools like this, particularly for smaller charities.</p><p>Your report is already yours. This is completely optional.</p>{saved.supportPaid ? <p className="scr-mail">THANK YOU. THAT GENUINELY HELPS ✓</p> : checkout ? <><SorpPublicSupportCheckout clientSecret={checkout.clientSecret} sessionId={checkout.sessionId} onPaid={() => { setSaved(state => ({ ...state, supportPaid: true })); setCheckout(null); }}/><button type="button" className="scr-clear" onClick={() => setCheckout(null)}>CLOSE PAYMENT AND STAY HERE</button></> : <><div className="scr-amounts">{([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={support === amount} onClick={() => setSupport(amount)}>{amount === "other" ? "OTHER" : `£${amount}`}</button>)}</div>{support === "other" && <label className="scr-context">Amount in pounds<input inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} /></label>}</>}</>}
        {saved.step === "before-go" && <div className="scr-ending-intro"><SorpScreenHero><p className="scr-kicker">YOUR REPORT IS COMPLETE ✓</p><h1>ONE USEFUL IDEA BEFORE YOU GO.</h1></SorpScreenHero><p className="scr-lead">Your personalised report is already yours. Nothing that follows changes that.</p><p>There are two short, optional screens about using impact information throughout the year and the human help available if you want it.</p><p className="scr-ending-promise">{saved.emailSent ? `We’ve also emailed the PDF to ${saved.email}.` : emailSending ? `We’re emailing the PDF to ${saved.email} now.` : `The PDF will be sent to ${saved.email}; your report remains available here.`}</p></div>}
        {saved.step === "next" && <><SorpScreenHero><p className="scr-kicker">BEYOND THE ANNUAL REPORT</p><h1>Better impact is the opportunity.</h1></SorpScreenHero><p className="scr-lead">SORP readiness matters. But useful impact information should also help your organisation make better decisions every month, not be reconstructed at year-end.</p><div className="scr-next-list">{[{title:"PURPOSE",text:"Be clear about the change you exist to create."},{title:"LEADERSHIP",text:"Put impact into governance, accountability and everyday decisions."},{title:"DATA",text:"Gather useful evidence and measure what matters."},{title:"DELIVERY",text:"Use evidence to improve programmes, services and results."},{title:"COMMUNICATION",text:"Explain the difference clearly, credibly and transparently."}].map((item,index)=><article key={item.title}><small>{String(index+1).padStart(2,"0")}</small><div><h2>{item.title}</h2><p>{item.text}</p></div></article>)}</div><div className="scr-next-value"><h2>WHY THIS MATTERS</h2><p>It gives trustees better oversight, helps managers learn and prioritise, and gives funders and donors clearer evidence of the value their support creates.</p><p>We call this <strong>Social Impact Excellence</strong>: treating impact as a practical management discipline throughout the year.</p></div></>}
        {saved.step === "help" && <><SorpReviewBooking reviewHeading={<SorpScreenHero><h1>WANT TO TALK THROUGH YOUR RESULTS?</h1></SorpScreenHero>} humanIntroduction={<SorpMarcus variant="booking" />} onSelect={() => event("book_conversation_clicked")} /><section className="scr-implementation-support"><p className="scr-kicker">AFTER THE HUMAN REVIEW · OPTIONAL</p><h2>NEED HELP MAKING THE CHANGES?</h2><p>After your review, we can help you implement what is needed. Practical SORP-readiness and Social Impact Excellence support starts from £250, depending on the work required.</p><p>This can include addressing reporting priorities and starting a practical year-round approach to defining, measuring, managing and communicating impact.</p><p>The assessment identifies areas worth discussing. The human review is where MSI agrees what work, if any, your charity actually needs. The AI does not prescribe a service.</p><div className="scr-implementation-links"><a href="mailto:marcus@mysocialimpact.org?subject=Social%20Impact%20Report%20review" onClick={() => event("social_impact_report_review_clicked")}>ASK US TO REVIEW YOUR SOCIAL IMPACT REPORT →</a><a href="mailto:marcus@mysocialimpact.org?subject=Implementation%20support%20from%20%C2%A3250" onClick={() => event("implementation_support_clicked")}>ASK ABOUT SUPPORT FROM £250 →</a></div></section></>}
        {saved.step === "done" && <div className="scr-ending-finish"><SorpScreenHero><p className="scr-kicker">THANK YOU ✓</p><h1>YOUR REVIEW IS COMPLETE.</h1></SorpScreenHero><div className="scr-email-celebration" role="status"><small>{saved.emailSent ? "YOUR REPORT HAS BEEN EMAILED ✓" : emailSending ? "SENDING YOUR PERSONALISED REPORT…" : "YOUR REPORT IS READY"}</small>{saved.emailSent ? <p>We’ve sent your personalised SORP 2026 review to <strong>{saved.email}</strong>.</p> : <p>{emailSending ? "We’re sending the PDF to the address you gave us." : "Your report remains available here. Email delivery has not yet been confirmed."}</p>}<span aria-hidden="true">{saved.emailSent ? "✓" : "→"}</span></div>{saved.email && !saved.emailSent && !emailSending && error && <button type="button" className="scr-email-retry" onClick={() => void sendFinalReport(`msi-review-email:${saved.sessionId}:${saved.email.trim().toLowerCase()}`)}>TRY SENDING MY REPORT AGAIN →</button>}<p>We hope it helps you get ready for SORP 2026 and, more importantly, strengthen the impact information you use throughout the year.</p><p>Share it with colleagues or trustees, use it as an action plan, or choose any optional next step below.</p><CompletionActions onViewReport={() => setSaved(state => ({ ...state, step: "report", reportView: 0 }))} onBook={() => setSaved(state => ({ ...state, step: "help" }))} onTrack={type => event(type)} /><section className="scr-done-note"><p className="scr-kicker">BUILT BY THE IDEAS SHED</p><p>Are You SORP Ready? was built by The Ideas Shed, where we create useful digital tools for organisations and the people who run them.</p><p>More tools are coming soon.</p></section><section className="scr-done-note scr-done-full-sorp"><p className="scr-kicker">COMING SOON</p><h2>NEED THE FULL SORP 2026 PICTURE?</h2><p>This review focuses on impact and sustainability reporting.</p><p>We’re also developing a full SORP 2026 readiness tool covering the wider narrative, financial and accounting requirements.</p><p>If you’d like access when it’s ready, email us.</p><a className="scr-done-full-sorp-cta" href="mailto:marcus@mysocialimpact.org?subject=Full%20SORP%202026%20tool%20early%20access">EMAIL US FOR EARLY ACCESS →</a></section><footer className="scr-done-legal">My Social Impact is a trading name of The Ideas Shed Limited. Company No. 17380053. Registered in England and Wales.</footer></div>}
        {saved.step === "non-sorp" && <><SorpScreenHero><p className="scr-kicker">LEGAL STATUS CHECK</p><h1>We need to pause this SORP review.</h1></SorpScreenHero><p>The entity identified is not a registered charity. Please check the legal entity and charity number before we assess SORP applicability.</p></>}
        {saved.step === "tar-recovery" && <div className="scr-homework-failure">
          <SorpScreenHero line={false}><p className="scr-kicker">PUBLIC REPORT · TEMPORARY DOWNLOAD PROBLEM</p><h1>LET’S GET THE REPORT AND KEEP GOING.</h1></SorpScreenHero>
          <div className="scr-failure-explanation"><strong>The report exists. The Charity Commission did not deliver the PDF on this attempt.</strong><p>Sadly, its public document service sometimes does this. It is outside your control and ours — and trying again can often work.</p></div>
          <section className="scr-retry-card" aria-labelledby="scr-retry-heading">
            <div><small>FASTEST OPTION</small><h2 id="scr-retry-heading">TRY AGAIN NOW</h2><p>We’ll make a fresh request to the Charity Commission and continue automatically if the PDF comes through.</p></div>
            <button type="button" onClick={() => void startHomework()} disabled={!!busy}>{busy ? "TRYING THE CHARITY COMMISSION AGAIN…" : "TRY AGAIN →"}</button>
          </section>
          <section className="scr-manual-report" aria-labelledby="scr-manual-report-heading">
            <p className="scr-kicker">RELIABLE FALLBACK</p><h2 id="scr-manual-report-heading">DOWNLOAD IT YOURSELF, THEN DROP IT HERE.</h2>
            <p>Sometimes the report downloads normally in your browser even when our system cannot access it. Open this charity’s exact Charity Commission record, download its latest Trustees’ Annual Report and accounts PDF, then add it below.</p>
            <ol className="scr-manual-steps"><li><span>1</span><div><strong>OPEN THE CHARITY COMMISSION RECORD</strong><p>We’ve linked the exact charity—there is no need to search for it again.</p></div></li><li><span>2</span><div><strong>DOWNLOAD THE LATEST REPORT PDF</strong><p>Choose the latest Trustees’ Annual Report and accounts.</p></div></li><li><span>3</span><div><strong>DROP THE PDF HERE</strong><p>We’ll validate it before continuing. We never score a report we have not read.</p></div></li></ol>
            <div className="scr-commission-links">{charityCommissionRecord && <a href={charityCommissionRecord} target="_blank" rel="noreferrer">OPEN EXACT CHARITY COMMISSION RECORD ↗</a>}{charityCommissionReport && charityCommissionReport !== charityCommissionRecord && <a href={charityCommissionReport} target="_blank" rel="noreferrer">OPEN THE REPORT DOWNLOAD ↗</a>}</div>
            <label className={`scr-report-dropzone${reportDragActive ? " is-dragging" : ""}${busy ? " is-busy" : ""}`} onDragEnter={event => { event.preventDefault(); if (!busy) setReportDragActive(true); }} onDragOver={event => { event.preventDefault(); if (!busy) setReportDragActive(true); }} onDragLeave={event => { event.preventDefault(); setReportDragActive(false); }} onDrop={event => { event.preventDefault(); setReportDragActive(false); const file = Array.from(event.dataTransfer.files).find(item => item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf")); if (file) void uploadTar(file); }}>
              <span className="scr-dropzone-icon" aria-hidden="true">↓</span><strong>{busy ? "READING YOUR REPORT…" : reportDragActive ? "DROP THE PDF HERE" : "DRAG & DROP THE REPORT PDF"}</strong><span>or click to choose the PDF from your device</span><em>PDF only</em><input type="file" accept="application/pdf,.pdf" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadTar(file); }} />
            </label>
          </section>
          <details className="scr-failure-detail-panel"><summary>Technical details and what we already tried</summary><ul className="scr-failure-summary">
            <li>{canUploadForFailure ? "The copy we reached could not be validated as a complete, readable Trustees’ Annual Report." : `The public filing exists, but ${homeworkFailure?.diagnostic?.source || "the Charity Commission public file service"} did not deliver the PDF on this attempt.`}</li>
            <li>{homeworkFailure?.diagnostic?.attemptCount ? `We made ${homeworkFailure.diagnostic.attemptCount} public download attempts, including the approved fallback route, before pausing.` : "We tried the approved public retrieval and fallback routes before pausing."}</li>
            <li>Your charity selection and completed progress are saved on this device.</li>
          </ul>{homeworkFailure?.diagnostic && <p className="scr-failure-detail">SOURCE: {homeworkFailure.diagnostic.source || "Published report"} · STAGE: {homeworkFailure.diagnostic.stage || "report reading"}{homeworkFailure.diagnostic.httpStatus ? ` · RESPONSE: HTTP ${homeworkFailure.diagnostic.httpStatus}` : ""}{homeworkFailure.diagnostic.attemptCount ? ` · ATTEMPTS: ${homeworkFailure.diagnostic.attemptCount}` : ""}</p>}</details>
          <p className="scr-incident-status">{homeworkFailure?.incidentId ? <>We’ve logged this with My Social Impact as <strong>{homeworkFailure.incidentId}</strong>.</> : <>If this keeps happening, <a href={supportEmailHref}>email My Social Impact</a> and we’ll help.</>}</p>
          <form className="scr-problem-form" onSubmit={submitHomeworkProblem}>
            <h2>SEND US A MESSAGE</h2><p>Tell us what you saw or what you were trying to do. This goes to My Social Impact.</p>
            <label>Your email (optional — only if you want a reply)<input type="email" value={problemEmail} onChange={event => setProblemEmail(event.target.value)} /></label>
            <label>Message<textarea required minLength={3} maxLength={2000} value={problemMessage} onChange={event => setProblemMessage(event.target.value)} placeholder="Tell us what happened…" /></label>
            <button type="submit" disabled={problemSending || problemMessage.trim().length < 3}>{problemSending ? "SENDING…" : "SEND ERROR REPORT →"}</button>
            {problemStatus && <p className="scr-problem-status" role="status">{problemStatus}</p>}
          </form>
          <p className="scr-beta-recovery"><strong>Are You SORP Ready? is still in beta.</strong> We’re genuinely sorry this attempt failed. Reports like this help us improve the tool, and it will keep getting better and more reliable.</p>
        </div>}
        {error && saved.step !== "tar-recovery" && <div className="scr-error" role="alert">{["homework", "assessment"].includes(saved.step) && <p>We’re genuinely sorry this step could not finish.</p>}{error}{["homework", "assessment"].includes(saved.step) && <><p>Your completed progress is saved. You can retry using the button below, or <a href={supportEmailHref}>email My Social Impact about this problem</a>.</p><p>This tool is still in beta. Reports of problems help us improve the experience.</p></>}</div>}
      </section></SorpScreenContext.Provider>{!introScreen && !discoveryScreen && !snapshotScreen && saved.step !== "quick-feedback" && <aside className="scr-guide scr-supporting-guide">{guide()}</aside>}</div>
    <footer className="scr-bottom">
      <div><button type="button" className="scr-back" disabled={!navigation.past.length || !!busy} onClick={back}>← BACK</button><button type="button" className="scr-forward" disabled={!navigation.future.length || !!busy} onClick={forward}>FORWARD →</button></div>
      <div>
        {saved.step === "scope" && <button onClick={() => go("public-methodology")}>NEXT <span>→</span></button>}
        {saved.step === "public-methodology" && <button onClick={() => go("intro")}>NEXT <span>→</span></button>}
        {saved.step === "intro" && <button onClick={() => go("benefits")}>NEXT <span>→</span></button>}
        {saved.step === "benefits" && <button onClick={() => go("find")}>LET’S GET STARTED <span>→</span></button>}
        {saved.step === "find" && <button type="submit" form="scr-find-form" disabled={!!busy || !saved.query.trim() || !!saved.research}>FIND MY CHARITY <span>→</span></button>}
        {saved.step === "confirmation" && <><button type="button" className="is-secondary" onClick={() => setSaved(state => ({ ...state, step: "find", research: null }))}>NOT MY CHARITY — TRY AGAIN</button><button onClick={() => { go("account"); event("account_step_viewed"); }}>YES, THIS IS MY CHARITY <span>→</span></button></>}
        {saved.step === "account" && <span className="scr-bottom-status">Create or sign in to your free account to continue.</span>}
        {saved.step === "homework" && (busy ? <span className="scr-bottom-status">Locating and reading your published report…</span> : homeworkComplete ? <button onClick={() => void review()}>CONTINUE TO ASSESSMENT <span>→</span></button> : <button onClick={() => void startHomework()}>LOCATE AND READ MY REPORT <span>→</span></button>)}
        {saved.step === "assessment" && (busy ? <span className="scr-bottom-status">Applying the SORP methodology to your saved report…</span> : saved.report && verifiedCanonicalTar(saved.verifiedTar) ? <button onClick={() => { setSaved(state => ({ ...state, walkthroughSeen: true, step: "quick" })); }}>{saved.walkthroughSeen ? "VIEW MY HISTORICAL SNAPSHOT" : "SKIP EXPLANATION & VIEW SNAPSHOT"} <span>→</span></button> : <button onClick={() => void review()}>RESUME ASSESSMENT <span>→</span></button>)}
        {saved.step === "quick-generating" && <span className="scr-bottom-status">Building your Historical Snapshot…</span>}
        {saved.step === "tar-recovery" && <span className="scr-bottom-status">Your progress is saved. Try again or add the report PDF above.</span>}
        {saved.step === "quick-ready" && <button onClick={() => go("quick")}>VIEW MY HISTORICAL SNAPSHOT <span>→</span></button>}
        {saved.step === "quick" && <button onClick={() => { go("quick-feedback"); event("snapshot_viewed"); }}>CONTINUE TO CURRENT READINESS <span>→</span></button>}
        {saved.step === "quick-feedback" && <><button className="is-secondary" onClick={() => go("method")}>SKIP FOR NOW</button><button onClick={() => go("method")}>SEE WHERE WE ARE NOW <span>→</span></button></>}
        {saved.step === "method" && <button onClick={() => { go("criterion"); event("guided_conversation_started"); }}>START MY CURRENT READINESS REVIEW <span>→</span></button>}
        {saved.step === "criterion" && <button onClick={nextCriterion}>{saved.criterion === tests.length - 1 ? "COMPLETE MY CURRENT READINESS" : `GO TO QUESTION ${saved.criterion + 2} OF ${tests.length}`}<span>→</span></button>}
        {saved.step === "complete" && (saved.emailSent ? <button onClick={() => go("report")}>RETURN TO MY REPORT <span>→</span></button> : <button onClick={() => void buildReport()} disabled={!!busy}>BUILD MY PERSONALISED REPORT <span>→</span></button>)}
        {saved.step === "generating" && <span className="scr-bottom-status">Preparing your personalised report…</span>}
        {saved.step === "report-ready" && <button onClick={() => { go("report"); event("full_report_viewed"); }}>VIEW MY PERSONALISED REPORT<span>→</span></button>}
        {saved.step === "report" && <button onClick={() => { if (saved.reportView === 0) setSaved(state => ({ ...state, reportView: 1 })); else go("final-feedback"); }}>{saved.reportView === 0 ? "SEE MY PRIORITIES" : "FINISH MY REVIEW"}<span>→</span></button>}
        {saved.step === "email-ready" && <button onClick={() => go("final-feedback")}>CONTINUE <span>→</span></button>}
        {saved.step === "final-feedback" && <><button className="is-secondary" onClick={() => { go("support"); event("support_ask_viewed"); }}>SKIP FOR NOW</button><button onClick={() => { go("support"); event("support_ask_viewed"); }}>CONTINUE <span>→</span></button></>}
        {saved.step === "support" && (saved.supportPaid ? <button onClick={() => go("before-go")}>SEE WHAT COMES NEXT <span>→</span></button> : <><button className="is-secondary" onClick={() => { setCheckout(null); go("before-go"); }}>NOT NOW <span>→</span></button>{!checkout && <button disabled={!!busy || !supportPence(support, custom)} onClick={() => void contribute()}>{busy === "support" ? "OPENING PAYMENT…" : "CONTRIBUTE"}<span>→</span></button>}</>)}
        {saved.step === "next" && <button className="is-secondary" onClick={() => go("done")}>SKIP TO FINISH <span>→</span></button>}
        {saved.step === "help" && <div className="scr-booking-actions">
          {[["10 MIN — FREE", "BOOK FREE CALL", "ten_minute_call_clicked"], ["30 MIN — £50", "BOOK £50 REVIEW", "review_cta_clicked"], ["60 MIN — £100", "BOOK £100 REVIEW", "social_impact_report_review_clicked"]].map(([label, action, eventType], index) => <button type="button" className="scr-booking-choice" key={label} onClick={() => { event(eventType); document.querySelectorAll<HTMLButtonElement>(".sorp-meetings-options .sorp-meeting-book")[index]?.click(); }}><small>{label}</small><strong>{action} →</strong></button>)}
          <button type="button" className="is-secondary scr-booking-skip" onClick={() => go("done")}>SKIP TO FINISH →</button>
        </div>}
        {saved.step === "before-go" && <><button className="is-secondary" onClick={() => go("done")}>SKIP TO FINISH</button><button onClick={() => go("next")}>CONTINUE <span>→</span></button></>}
        {saved.step === "next" && <button onClick={() => go("help")}>HOW CAN YOU HELP US? <span>→</span></button>}
        {saved.step === "non-sorp" && <button onClick={() => go("find")}>SEARCH ANOTHER CHARITY <span>→</span></button>}
      </div>
    </footer>
  </main>;
}
