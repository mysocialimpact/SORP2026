"use client";
/* Growth tracking reads the current context at the guarded workflow milestones. */
/* eslint-disable react-hooks/exhaustive-deps */

import { FormEvent, type DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SorpResultActions } from "./sorp-result-actions";
import { SorpMobilePanes } from "./sorp-mobile-panes";
import { trackSorpEvent } from "./sorp-growth";
import { buildActivitySubmission, toggleActivityChoice } from "./sorp-activity-selection";
import { SorpJourneyProgress, SorpKnownContext, SorpBasisDrawer, type PublicReadinessFinding, type PublicReadinessReview, type ReadinessWorkflow } from "./sorp-journey";
import { additionalChecks, coreQuestions, readinessStages, stageForQuestion, type AdditionalAnswerValue, type AnswerValue, type AssessmentSetup } from "./sorp-questionnaire";

const SNAPSHOT_RESULT_KEY = "msi-sorp-readiness-result-v2";
const CONVERSATION_KEY = "msi-sorp-readiness-conversation-v1";

type Citation = { reference: string; module: string; page: number; extract: string };
type PublicSource = { label: string; url: string; detail: string; kind: "official_register" | "organisation_website" | "annual_report" | "other_public" };
type OrganisationCard = { name: string; locality: string };
type MessageAction = { label: string; value: string };
type FieldState = { answer: AnswerValue | null; evidence: string; confidence: number };
type AdditionalState = { answer: AdditionalAnswerValue | null; evidence: string; relevant: boolean };
type ContextEvidence = { basis: "publicly_observed" | "user_confirmed"; detail: string; sources: string[] };
type PendingStructuredAnswer = { target: `field:${number}` | `check:${string}`; answer: AnswerValue; label: string; selectedAt: string };
type IntelligenceProvenance = {
  registry: string;
  assistantId: string;
  effectiveVersion: string;
  resolvedAt: string;
  mode: "CURRENT" | "PINNED" | "LAST_KNOWN_PUBLISHED";
  usedFallback: boolean;
  layers: { id: string; name: string; kind: string; relationship: "INHERITED" | "EXTENDED" | "OVERRIDDEN"; version: number; label: string; status: "ACTIVE" | "ARCHIVED"; publishedAt: string | null }[];
  runtimeControls: { name: string; type: string; representedBy: string }[];
};

export type ReadinessState = {
  charityName: string;
  assessmentMode: "sorp_readiness" | "impact_readiness";
  sorpApplicability: "unknown" | "likely_applies" | "not_applicable" | "uncertain";
  setup: AssessmentSetup;
  organisationResearch: unknown;
  contextEvidence: Record<string, ContextEvidence>;
  uncertainty: string[];
  fields: Record<string, FieldState>;
  additional: Record<string, AdditionalState>;
  stageSevenScreening?: Record<string, "yes" | "no" | "not_sure">;
  completedStages: number[];
  currentStage: number;
  score: number | null;
  inheritedSnapshot: boolean;
  publicSearchCheckpointAcknowledged: boolean;
  publicReviewAcknowledged: boolean;
  impactReportInput: "none" | "awaiting_link" | "skipped" | "uploaded";
  impactReportConfirmation: "unconfirmed" | "confirmed" | "replacement_requested";
  pendingStructuredAnswer: PendingStructuredAnswer | null;
};

type Result = {
  score: number;
  band: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  overview: string;
  sectionScores: { section: string; label: string; score: number; narrative: string }[];
  strong: string[];
  attention: string[];
  must: string[];
  should: string[];
  may: string[];
  judgement: string[];
  additionalChecks: string[];
  trusteesReportReadiness: string[];
  widerImpactEvidence: string[];
  userConfirmedPractice: string[];
  priorities: string[];
};

type Message = {
  conversation?: boolean;
  workflow?: ReadinessWorkflow;
  responseKind?: "assessment" | "detour" | "result";
  role: "user" | "assistant";
  content: string;
  label?: "MUST" | "SHOULD" | "MAY" | "JUDGEMENT" | "MSI READINESS" | null;
  citations?: Citation[];
  publicSources?: PublicSource[];
  organisation?: OrganisationCard | null;
  actions?: MessageAction[];
};

type ConversationCheckpoint = {
  state: ReadinessState;
  messagesLength: number;
  workflow: ReadinessWorkflow | null;
  result: Result | null;
  intelligence: IntelligenceProvenance | null;
  completionNotice: string;
  activitySelections: string[];
  composer: string;
  answerText?: string;
  note?: string;
};

type ReadinessResponse = {
  workflow: ReadinessWorkflow;
  state: ReadinessState;
  assistant: { message: string; conversation?: boolean; label: Message["label"]; citations: Citation[]; publicSources?: PublicSource[]; organisation?: OrganisationCard | null; actions?: MessageAction[]; responseKind: "assessment" | "detour" | "result" };
  result: Result | null;
  intelligence: IntelligenceProvenance | null;
  sessionId: string;
};

type SavedProgress = { started: boolean; state: ReadinessState; messages: Message[]; result: Result | null; intelligence: IntelligenceProvenance | null; sessionId: string; workflow: ReadinessWorkflow | null; checkpoints: ConversationCheckpoint[]; quickReviewFeedbackStep?: boolean; quickReviewFeedback?: number | null; quickReviewFeedbackComment?: string; fullReviewEntered?: boolean; fullReviewFeedbackStep?: boolean; fullReviewFeedback?: number | null; fullReviewFeedbackComment?: string };
type ReadinessAccount = { id: string; email: string; name: string; position: string; organisation: string; currentStage: number; completedStages: number[]; createdAt: string; lastSavedAt: string };

const emptySetup: AssessmentSetup = { role: "", jurisdiction: "", startDate: "", endDate: "", accounts: "", accountsReview: "", income: "", nearBoundary: false, activities: [] };

function blankState(): ReadinessState {
  return {
    charityName: "",
    assessmentMode: "sorp_readiness",
    sorpApplicability: "unknown",
    setup: emptySetup,
    organisationResearch: { status: "unsearched", query: "", candidates: [], selected: null, checkedAt: "", enrichedAt: "" },
    contextEvidence: {},
    uncertainty: [],
    fields: Object.fromEntries(coreQuestions.map((question) => [String(question.id), { answer: null, evidence: "", confidence: 0 }])),
    additional: Object.fromEntries(additionalChecks.map((check) => [check.id, { answer: null, evidence: "", relevant: false }])),
    stageSevenScreening: {},
    completedStages: [],
    currentStage: 1,
    score: null,
    inheritedSnapshot: false,
    publicSearchCheckpointAcknowledged: false,
    publicReviewAcknowledged: false,
    impactReportInput: "none",
    impactReportConfirmation: "unconfirmed",
    pendingStructuredAnswer: null,
  };
}

const structuredAnswerValues: Record<string, AnswerValue> = {
  "YES, CLEARLY": "yes",
  "MOSTLY": "mostly",
  "PARTLY": "partly",
  "NOT YET": "not_yet",
  "NOT SURE": "not_sure",
};

function structuredAnswerFromAction(value: string, target: string): PendingStructuredAnswer | null {
  if (!/^(?:field:\d+|check:[a-z_]+)$/.test(target)) return null;
  const label = value.trim().toUpperCase().replace(/^KEEP\s+/, "").replace(/[.!]+$/g, "");
  const answer = structuredAnswerValues[label];
  return answer ? { target: target as PendingStructuredAnswer["target"], answer, label, selectedAt: new Date().toISOString() } : null;
}

function looksLikeQuestion(value: string) {
  return /\?$/.test(value.trim()) || /^(?:why|what|how|when|where|who|can|could|would|should|does|do|is|are)\b/i.test(value.trim());
}

function isDeterministicSetupReply(value: string, stepId = "") {
  const answer = value.trim();
  if (/^field:\d+$/.test(stepId) && /^skip for now$/i.test(answer)) return true;
  if (/^(?:screen:|check:)/.test(stepId) && /^(?:yes|no|not sure)$/i.test(answer)) return true;
  if (["accountsConfirmation", "startDateConfirmation"].includes(stepId)) {
    return /^(?:yes|yep|yeah|correct|right|no|nope|i\s+(?:don[’']?t|do not)\s+know|not sure|skip|move on)\b/i.test(answer);
  }
  if (stepId === "accounts") {
    return /(?:\baccrual|\breceipts?\s*(?:and|&)\s*payments?|^skip\b|^move on\b)/i.test(answer);
  }
  if (stepId === "publicReview") {
    return /^(?:yes\b.*latest impact report|no\b.*newer impact report|add a public report link|skip adding|continue to|go deeper)/i.test(answer);
  }
  if (stepId === "impactReportLink") return /^(?:skip adding|continue without)/i.test(answer);
  if (stepId === "publicSearchCheckpoint") return /^(?:continue to quick review|see my quick review)\b/i.test(answer);
  return false;
}

function organisationResearchStatus(value: unknown) {
  if (!value || typeof value !== "object" || !("status" in value)) return "";
  return typeof value.status === "string" ? value.status : "";
}

function workingStatusFor(value: string, state: ReadinessState, workflow: ReadinessWorkflow | null) {
  const answer = value.trim();
  if (looksLikeQuestion(answer)) return "Thinking about your question and checking the relevant SORP guidance…";
  const researchStatus = organisationResearchStatus(state.organisationResearch);
  if (researchStatus === "needs_confirmation") {
    if (/^(?:no|nope|not us|try again|different|wrong)\b/i.test(answer)) return "Looking again for the right organisation…";
    return "Checking the Charity Commission record, latest accounts and Trustees’ Annual Report…";
  }
  const step = workflow?.next.id || "";
  if (step === "organisation" || (!state.charityName && state.currentStage === 1)) return "Looking for the right organisation…";
  if (["accounts", "accountsConfirmation", "startDate", "startDateConfirmation", "income", "activities", "publicReview", "impactReportLink"].includes(step)) return "Checking the organisation’s public information and what applies…";
  if (/^(?:field:|check:)/.test(step)) return "Understanding your answer and checking the relevant SORP guidance…";
  if (step === "result") return "Bringing your readiness report together…";
  return "Understanding what you’ve said and checking what matters next…";
}

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sorp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stateFromSnapshot(raw: string): { state: ReadinessState; result: Result | null } | null {
  try {
    const snapshot = JSON.parse(raw) as {
      setup?: AssessmentSetup;
      setupState?: ReadinessState;
      coreQuestions?: { id: number; answer?: AnswerValue; context?: string }[];
      additionalChecks?: { id: string; answer?: AdditionalAnswerValue }[];
      result?: { score?: number; band?: string; sectionScores?: { section: string; label: string; score: number }[]; flags?: { must?: string[]; should?: string[]; may?: string[]; judgement?: string[] } };
    };
    if (!snapshot.setup || !snapshot.coreQuestions?.length || typeof snapshot.result?.score !== "number") return null;
    const state = { ...blankState(), ...snapshot.setupState };
    state.setup = { ...emptySetup, ...snapshot.setup };
    state.inheritedSnapshot = true;
    state.completedStages = [1, 2, 3, 4, 5, 6, 7];
    state.currentStage = 8;
    state.score = snapshot.result.score;
    for (const field of snapshot.coreQuestions) {
      state.fields[String(field.id)] = { answer: field.answer ?? null, evidence: field.context ?? "Snapshot answer", confidence: field.context ? .95 : .8 };
    }
    for (const check of snapshot.additionalChecks ?? []) {
      state.additional[check.id] = { answer: check.answer ?? null, evidence: "Snapshot answer", relevant: true };
    }
    const sectionScores = snapshot.result.sectionScores ?? [];
    const result: Result = {
      score: snapshot.result.score,
      band: snapshot.result.band ?? "Initial readiness picture",
      confidence: "MEDIUM",
      overview: "This is your Quick Snapshot result. The conversation can add context and nuance without asking all 15 questions again.",
      sectionScores: sectionScores.map((section) => ({ ...section, narrative: "The conversation can add a more specific explanation of this area." })),
      strong: sectionScores.filter((section) => section.score >= 70).map((section) => section.label),
      attention: sectionScores.filter((section) => section.score < 60).map((section) => section.label),
      must: snapshot.result.flags?.must ?? [],
      should: snapshot.result.flags?.should ?? [],
      may: snapshot.result.flags?.may ?? [],
      judgement: snapshot.result.flags?.judgement ?? [],
      additionalChecks: (snapshot.additionalChecks ?? []).map((check) => additionalChecks.find((item) => item.id === check.id)?.title ?? check.id),
      trusteesReportReadiness: [],
      widerImpactEvidence: [],
      userConfirmedPractice: snapshot.coreQuestions.filter((question) => Boolean(question.answer)).slice(0, 6).map((question) => `Question ${question.id}: ${question.answer?.replaceAll("_", " ")}`),
      priorities: [],
    };
    return { state, result };
  } catch {
    return null;
  }
}

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={`${index}-${part.slice(0, 18)}`}>{part.slice(2, -2)}</strong>
    : part)}</>;
}

function MessageContent({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <>{blocks.map((block, index) => {
    const heading = block.match(/^\*\*(.+)\*\*$/);
    if (heading) return <h3 className="readiness-message-heading" key={`${index}-${heading[1]}`}>{heading[1]}</h3>;
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith("- "))) {
      return <ul className="readiness-message-list" key={`${index}-${block.slice(0, 18)}`}>{lines.map((line) => <li key={line}><InlineText text={line.slice(2)} /></li>)}</ul>;
    }
    return <p key={`${index}-${block.slice(0, 24)}`}>{lines.map((line, lineIndex) => <span key={`${lineIndex}-${line.slice(0, 18)}`}><InlineText text={line} />{lineIndex < lines.length - 1 && <br />}</span>)}</p>;
  })}</>;
}

function recordingTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function sourceKindLabel(kind: PublicSource["kind"]) {
  return {
    official_register: "Official register",
    organisation_website: "Organisation website",
    annual_report: "Annual report",
    other_public: "Public source",
  }[kind];
}

function confirmationSourceLabel(source: PublicSource) {
  if (source.kind === "organisation_website") return "Website";
  if (/compan(?:y|ies)house|company-information/i.test(source.url)) return "Companies House";
  return "Charity register";
}

function intelligenceLayerLabel(layer: IntelligenceProvenance["layers"][number]) {
  if (layer.id === "msi-core") return "MSI Intelligence";
  if (layer.id === "sorp-readiness-intelligence") return "SORP Intelligence";
  return layer.name;
}

function HeadlineReviewSection({ id, title, items, empty, ordered = false }: { id: string; title: string; items: string[]; empty: string; ordered?: boolean }) {
  const contents = items.length ? items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>) : null;
  return <section className="sorp-stage-eight-section" id={id}><h2>{title}</h2>{contents ? ordered ? <ol>{contents}</ol> : <ul>{contents}</ul> : <p>{empty}</p>}</section>;
}

function HeadlineReadinessReview({ result, impactMode }: { result: Result; impactMode: boolean }) {
  const priorities = result.priorities.length ? result.priorities.slice(0, 3) : result.attention.slice(0, 3);
  const importantMust = result.must.filter((item) => result.priorities.some((priority) => priority.trim().toLowerCase() === item.trim().toLowerCase())).slice(0, 3);
  const must = importantMust.length ? importantMust : result.must.slice(0, 3);
  return <div className="sorp-stage-eight-headlines">
    <p className="sorp-stage-eight-caveat">{impactMode ? "SORP does not apply in the circumstances established. This is a headline view of your wider narrative and impact-reporting readiness." : "This is a headline readiness view, not a declaration of full SORP compliance. Your detailed personalised report is next."}</p>
    <HeadlineReviewSection id="full-review-strong" title="What looks strong" items={result.strong.slice(0, 3)} empty="No clear strength has been evidenced yet." />
    <HeadlineReviewSection id="full-review-gaps" title="Most important gaps" items={result.attention.slice(0, 3)} empty="No immediate weaker area was identified." />
    <HeadlineReviewSection id="full-review-must" title="MUST address" items={must} empty="No important MUST gap was flagged by this assessment." />
    <HeadlineReviewSection id="full-review-judgement" title="Where human judgement may help" items={result.judgement.slice(0, 3)} empty="No specific judgement area was flagged, although context can still matter." />
    <HeadlineReviewSection id="full-review-priorities" title="Your top 3 priorities" items={priorities} empty="Add more context to build practical priorities." ordered />
  </div>;
}

function finalPriorityCategory(priority: string, result: Result) {
  const normalised = priority.trim().toLowerCase();
  if (result.must.some((item) => item.trim().toLowerCase() === normalised) || /^must\b/i.test(priority)) return "MUST";
  if (result.should.some((item) => item.trim().toLowerCase() === normalised) || /^should\b/i.test(priority)) return "SHOULD";
  if (result.judgement.some((item) => item.trim().toLowerCase() === normalised) || /^(?:msi )?judgement\b/i.test(priority)) return "MSI JUDGEMENT";
  if (result.may.some((item) => item.trim().toLowerCase() === normalised) || /^may\b/i.test(priority)) return "MAY";
  return "ASSESSMENT PRIORITY";
}

function finalPriorityGuidance(category: string) {
  if (category === "MUST") return { why: "This concerns reporting that SORP requires in the Trustees’ Annual Report.", next: "Check the relevant requirement against your draft report, gather the supporting evidence and assign an owner." };
  if (category === "SHOULD") return { why: "Strengthening this would make the statutory narrative clearer and better supported.", next: "Agree what better evidence or explanation you can include in the next reporting cycle." };
  if (category === "MSI JUDGEMENT") return { why: "The right treatment depends on your context and the strength of the evidence available.", next: "Discuss the claim or reporting decision with the relevant trustees and document the reasoning." };
  if (category === "MAY") return { why: "This is an optional opportunity to add useful context.", next: "Decide whether it would genuinely help readers understand your work, then include it only if proportionate." };
  return { why: "The assessment identified this as an area that could improve your next report.", next: "Review the underlying evidence, agree an owner and decide what needs to change." };
}

function FinalReportFindings({ title, items, empty, id }: { title: string; items: string[]; empty: string; id?: string }) {
  return <section className="sorp-final-findings" id={id}><h3>{title}</h3>{items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

function FinalReadinessReport({ result, impactMode }: { result: Result; impactMode: boolean }) {
  const priorities = result.priorities.length ? result.priorities.slice(0, 3) : result.attention.slice(0, 3);
  return <div className="sorp-final-report">
    <section className="sorp-final-priorities" aria-labelledby="sorp-final-priorities-title">
      <div className="sorp-final-section-heading"><span>01 / Where to focus</span><h2 id="sorp-final-priorities-title">Your three biggest priorities</h2><p>The most useful next steps from this assessment, before the next relevant reporting period.</p></div>
      {priorities.length ? <ol>{priorities.map((priority, index) => { const category = finalPriorityCategory(priority, result); const guidance = finalPriorityGuidance(category); return <li key={`${index}-${priority}`}><span className="sorp-final-priority-number">0{index + 1}</span><div><span className="sorp-final-category">{category}</span><h3>{priority}</h3><p><strong>Why it matters</strong> {guidance.why}</p><p><strong>What to do next</strong> {guidance.next}</p></div></li>; })}</ol> : <p className="sorp-final-empty">No specific priority action was identified from the information available. Review the supporting detail below for areas that may need clarification.</p>}
    </section>

    <section className="sorp-final-method" aria-labelledby="sorp-final-method-title"><div className="sorp-final-section-heading"><span>02 / The basis</span><h2 id="sorp-final-method-title">How we reached this view</h2></div><div><p><strong>SORP 2026 is our primary source of truth.</strong> This view combines {result.trusteesReportReadiness.length ? "your latest Trustees’ Annual Report" : "the statutory-reporting evidence available to us"}, relevant wider public impact evidence where available, your answers and corrections, and the additional SORP checks.</p><dl><div><dt>MUST</dt><dd>Required by SORP</dd></div><div><dt>SHOULD</dt><dd>Recommended or expected by SORP</dd></div><div><dt>MAY</dt><dd>Optional or permitted by SORP</dd></div><div><dt>MSI JUDGEMENT</dt><dd>Where context, evidence, proportionality or interpretation matters</dd></div></dl><p className="sorp-final-method-note">MSI JUDGEMENT is our explanatory label, not an official fourth SORP category. {impactMode ? "SORP does not apply in the circumstances established; the findings offer wider impact-reporting guidance." : "This is a readiness assessment of narrative and impact reporting, not a declaration of full SORP compliance."}</p></div></section>

    <section className="sorp-final-strengths" aria-labelledby="sorp-final-strengths-title"><div className="sorp-final-section-heading"><span>03 / Your foundation</span><h2 id="sorp-final-strengths-title">What already looks strong</h2></div>{result.strong.length ? <ul>{result.strong.map((item, index) => <li key={`${index}-${item}`}><span aria-hidden="true">✓</span>{item}</li>)}</ul> : <p>The evidence reviewed did not establish a clear strength yet. That is a reason to add context, not a judgement that the work is absent.</p>}</section>

    <section className="sorp-final-requirements" aria-labelledby="sorp-final-requirements-title"><div className="sorp-final-section-heading"><span>04 / The SORP lens</span><h2 id="sorp-final-requirements-title">What the findings mean</h2></div><div className="sorp-final-requirements-list"><FinalReportFindings title="MUST address" items={result.must} empty="No specific MUST gap was flagged by this assessment." /><FinalReportFindings title="SHOULD strengthen" items={result.should} empty="No specific SHOULD opportunity was flagged by this assessment." /><FinalReportFindings title="MAY / opportunities" items={result.may} empty="No additional MAY option was identified." /><FinalReportFindings title="Human judgement may help" items={result.judgement} empty="No specific judgement area was flagged, though context can still matter." /></div></section>

    <section className="sorp-final-judgement" aria-labelledby="sorp-final-judgement-title"><div className="sorp-final-section-heading"><span>05 / Where nuance matters</span><h2 id="sorp-final-judgement-title">Where human judgement may be most valuable</h2></div><div><p>Some SORP questions need more than a mechanical answer: the strength of evidence, proportionality, support for impact claims and what belongs in the Trustees’ Annual Report all depend on context.</p>{result.judgement.length ? <ul>{result.judgement.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>No specific judgement issue was identified from the information supplied.</p>}</div></section>

    <section className="sorp-final-evidence" aria-labelledby="sorp-final-evidence-title"><div className="sorp-final-section-heading"><span>06 / Where the evidence sits</span><h2 id="sorp-final-evidence-title">Statutory report &amp; wider evidence</h2></div><div className="sorp-final-evidence-columns"><FinalReportFindings title="Trustees’ Annual Report" items={result.trusteesReportReadiness} empty="The statutory-report view remains limited by the evidence available." /><FinalReportFindings title="Wider impact evidence" items={result.widerImpactEvidence} empty="No separate wider impact evidence materially changed this view." /></div><p>Wider evidence can support and expand the story, but it does not automatically satisfy a requirement that needs appropriate coverage in the Trustees’ Annual Report.</p></section>

    <section className="sorp-final-detail" aria-labelledby="sorp-final-detail-title"><div className="sorp-final-section-heading"><span>07 / Supporting detail</span><h2 id="sorp-final-detail-title">Your assessment by area</h2></div><div className="sorp-final-areas">{result.sectionScores.map((section, index) => <article key={section.section}><span>0{index + 1}</span><div><h3>{section.label}</h3><p>{section.narrative}</p></div><strong>{section.score}<small> / 100</small></strong></article>)}</div><FinalReportFindings title="Additional SORP checks" items={result.additionalChecks} empty="No additional requirement was triggered by the information supplied." /><FinalReportFindings title="Your confirmed practice" items={result.userConfirmedPractice} empty="No further current practice was confirmed beyond the assessment answers." /></section>

    <section className="sorp-final-perspective"><span>My Social Impact perspective</span><h2>SORP is the requirement.<br />Better impact is the opportunity.</h2><p>Getting the reporting right matters. The bigger opportunity is building the evidence, learning and management practices that make strong impact reporting easier every year.</p></section>
  </div>;
}

function FullReviewRail() {
  const links = [
    ["full-review-strong", "✓ What looks strong"], ["full-review-gaps", "△ Important gaps"],
    ["full-review-must", "MUST address"], ["full-review-judgement", "Human judgement"],
    ["full-review-priorities", "Top 3 priorities"],
  ];
  return <aside className="sorp-full-review-rail" aria-label="Full Readiness Review summary">
    <span>Your Full Readiness Review</span>
    <nav aria-label="Jump to a review section">{links.map(([id, label]) => <a key={id} href={`#${id}`}>{label} <span aria-hidden="true">↗</span></a>)}</nav>
  </aside>;
}

const answerLabels: Record<PublicReadinessFinding["suggestedAnswer"], string> = { yes: "YES, CLEARLY", mostly: "MOSTLY", partly: "PARTLY", not_yet: "NOT YET", not_sure: "NOT SURE" };
const readinessAnswerOrder = ["YES, CLEARLY", "MOSTLY", "PARTLY", "NOT YET", "NOT SURE", "SKIP FOR NOW"];

function displayedAnswerLabel(label: string) {
  return label.replace(/^KEEP\s+/i, "").trim();
}

function orderReadinessActions(actions: MessageAction[]) {
  return [...actions].sort((first, second) => {
    const firstPosition = readinessAnswerOrder.indexOf(displayedAnswerLabel(first.label).toUpperCase());
    const secondPosition = readinessAnswerOrder.indexOf(displayedAnswerLabel(second.label).toUpperCase());
    return (firstPosition < 0 ? readinessAnswerOrder.length : firstPosition) - (secondPosition < 0 ? readinessAnswerOrder.length : secondPosition);
  });
}

function reportYear(title: string, url: string) {
  const match = `${title} ${url}`.match(/(?:19|20)\d{2}(?:[\s-]+(?:19|20)?\d{2})?/);
  return match?.[0] || "Latest published report";
}

const preliminaryAnswerScores: Record<PublicReadinessFinding["suggestedAnswer"], number> = { yes: 100, mostly: 75, partly: 50, not_yet: 0, not_sure: 25 };

function deriveTarScore(review: PublicReadinessReview) {
  if (typeof review.tarScore === "number") return review.tarScore;
  const supported = review.findings.filter((finding) => finding.trusteesReportEvidence.trim() && finding.suggestedAnswer !== "not_sure");
  if (supported.length) return Math.round(supported.reduce((total, finding) => total + preliminaryAnswerScores[finding.suggestedAnswer], 0) / supported.length);
  if (!review.trusteesReport.reviewed) return null;
  return review.readinessStatus === "likely_ready" ? 80 : review.readinessStatus === "partly_ready" ? 55 : review.readinessStatus === "not_yet_ready" ? 30 : 50;
}

function quickReviewBand(status?: PublicReadinessReview["readinessStatus"]) {
  return status === "likely_ready" ? "Looking strong" : status === "not_yet_ready" ? "Needs attention" : status === "partly_ready" ? "Getting ready" : "Starting point";
}

function ImpactReportFound({ review, confirmed, uploaded = false }: { review: PublicReadinessReview; confirmed: boolean; uploaded?: boolean }) {
  if (!review.impactReport.found) return null;
  const title = review.impactReport.title || "Impact Report / Annual Review";
  return <section className="sorp-impact-report-found" aria-label="Impact report found">
    <p className="sorp-impact-report-kicker">{uploaded ? "Impact Report added by you" : "Latest public Impact Report used"}</p>
    <h3>{title}</h3>
    <p className="sorp-impact-report-year">{reportYear(title, review.impactReport.url)}</p>
    {review.impactReport.url && <a className="sorp-impact-report-view" href={review.impactReport.url} target="_blank" rel="noreferrer">View report ↗</a>}
    {uploaded ? <p className="sorp-impact-report-provenance">Supplied by you · wider impact evidence</p> : confirmed ? <p className="sorp-impact-report-confirmed">✓ Confirmed with you <span>Publicly found + user confirmed · wider impact evidence</span></p> : <p className="sorp-impact-report-provenance">Publicly found · wider impact evidence</p>}
  </section>;
}

function QuickReviewFeedback({ value, comment, onSelect, onComment, full = false, hideIntro = false }: { value: number | null; comment: string; onSelect: (value: number) => void; onComment: (value: string) => void; full?: boolean; hideIntro?: boolean }) {
  return <section className={`sorp-quick-review-feedback${full ? " is-full-review" : ""}`} aria-label={full ? "Full Readiness Review feedback" : "Quick Readiness Review feedback"}>
    {!hideIntro && <p><strong>{full ? "How useful was this?" : "How’s this going?"}</strong>{!full && <span>This is a free tool and we genuinely want to make it as useful as possible.</span>}</p>}
    <div className="sorp-feedback-scale"><span>{full ? "1 · Not useful yet" : "1 = Not useful yet"}</span><span>{full ? "5 · Extremely useful" : "5 = Extremely useful"}</span></div>
    <div className="sorp-feedback-stars" role="group" aria-label={`How useful was this ${full ? "Full" : "Quick"} Readiness Review?`}>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={value === rating ? "is-selected" : undefined} aria-label={`${rating} out of 5`} aria-pressed={value === rating} onClick={() => onSelect(rating)}>{value !== null && rating <= value ? "★" : "☆"}</button>)}</div>
    <label><strong>Anything we could improve?</strong><span>Optional</span><textarea value={comment} maxLength={800} rows={2} onChange={(event) => onComment(event.target.value)} placeholder="Add a short comment if useful…" /></label>
  </section>;
}

function QuickReviewExplanation({ review, onReplaceImpactReport }: { review: PublicReadinessReview; onReplaceImpactReport: () => void }) {
  if (!review.trusteesReport.reviewed) return null;
  const widerAddsValue = typeof review.tarScore === "number" && typeof review.widerEvidenceScore === "number" && Math.abs(review.widerEvidenceScore - review.tarScore) >= 5;
  return <div className="sorp-quick-review-explanation">
    <p>This is a historical starting point from your latest published reporting, not a verdict on future SORP 2026 readiness.</p>
    {widerAddsValue && <p>{review.widerEvidenceScore! > review.tarScore! ? "Encouragingly, your wider impact evidence is stronger than your Trustees’ Annual Report alone suggests." : "Your wider impact evidence adds context, but does not strengthen the picture shown by your Trustees’ Annual Report."}</p>}
    <p>For SORP, the required narrative needs to be appropriately covered in the Trustees’ Annual Report. Make it strong enough to stand on its own.{review.impactReport.found ? " Your Impact Report and website can support and expand that story." : " Wider material, where available, can support and expand that story."}</p>
    <p>Go deeper to check whether this historical picture still reflects your current practice and where the real gaps are.</p>
    {review.impactReport.found && <button type="button" className="sorp-replace-impact-report" onClick={onReplaceImpactReport}>Have a newer Impact Report? Replace it →</button>}
  </div>;
}

function DeepDiveIntroduction() {
  return <section className="sorp-deep-dive-introduction" aria-label="Before the deeper review">
    <h2>Go a little deeper</h2>
    <p>Your Quick Readiness Review was based mainly on the public reporting and evidence we could find. Now we’ll work through the relevant SORP areas in more detail.</p>
    <p>We’ve suggested answers wherever the evidence gives us a reasonable starting point, so you’re not starting from scratch.</p>
    <p>For each question, you can:</p>
    <ul><li>✓ Keep our suggested answer</li><li>↔ Change it</li><li>💬 Explain or qualify your answer</li><li>❓ Ask us about the requirement</li></ul>
    <p>Use this however suits you — part questionnaire, part conversation. We’ll explain what SORP is looking for, help identify gaps and flag where judgement may be needed.</p>
    <small>If human judgement could genuinely help, we’ll flag that too.</small>
  </section>;
}

function ProvisionalReadinessView({ review, impactReportConfirmed = false, impactReportUploaded = false }: { review: PublicReadinessReview; impactReportConfirmed?: boolean; impactReportUploaded?: boolean }) {
  if (!review.trusteesReport.reviewed) return <ImpactReportFound review={review} confirmed={impactReportConfirmed} uploaded={impactReportUploaded} />;
  const tarScore = deriveTarScore(review);
  const widerScore = typeof review.widerEvidenceScore === "number" && tarScore !== null && Math.abs(review.widerEvidenceScore - tarScore) >= 5 ? review.widerEvidenceScore : null;
  const tarFindings = review.findings.filter((finding) => finding.trusteesReportEvidence.trim() && finding.reason.trim() && finding.reason.trim() !== finding.trusteesReportEvidence.trim());
  const strongFindings = tarFindings.filter((finding) => finding.suggestedAnswer === "yes" || finding.suggestedAnswer === "mostly");
  const attentionFindings = tarFindings.filter((finding) => finding.suggestedAnswer === "partly" || finding.suggestedAnswer === "not_yet");
  const findings = [...strongFindings.slice(0, 2), ...attentionFindings.slice(0, 2), ...strongFindings.slice(2), ...attentionFindings.slice(2)].slice(0, 4);
  return <section className="sorp-provisional-view" aria-label="Provisional SORP readiness starting point">
    <header><div><h3>ARE YOU SORP READY?</h3><span className="sorp-quick-review-subtitle">Quick Readiness Review · based on your latest published reporting</span></div></header>
    <h4 className="sorp-tar-label">Trustees’ Annual Report readiness</h4>
    <div className="sorp-quick-score"><strong>{tarScore === null ? "—" : tarScore}<small>/100</small></strong><div><b>{quickReviewBand(review.readinessStatus)}</b><span>How ready the existing statutory reporting looks.</span></div></div>
    <p className="sorp-evidence-confidence">Evidence confidence: <strong>{review.overallConfidence}</strong><span>How strongly the available evidence supports this first view.</span></p>
    {findings.length > 0 && <ul className="sorp-quick-findings">{findings.map((finding) => <li className={`is-${finding.suggestedAnswer === "yes" || finding.suggestedAnswer === "mostly" ? "strong" : "attention"}`} key={finding.fieldId}><span aria-hidden="true">{finding.suggestedAnswer === "yes" || finding.suggestedAnswer === "mostly" ? "✓" : "△"}</span><div><p>{finding.reason}</p><small>{finding.trusteesReportEvidence}</small></div></li>)}</ul>}
    {widerScore !== null && <section className="sorp-wider-score" aria-label="Wider impact evidence view"><p><strong>Wider evidence view</strong><span>{review.widerEvidenceReason || "The Impact Report and website add materially useful evidence beyond the Trustees’ Annual Report."}</span></p><strong>{widerScore}<small>/100</small></strong></section>}
    {review.impactReport.found && <ImpactReportFound review={review} confirmed={impactReportConfirmed} uploaded={impactReportUploaded} />}
    {review.trusteesReport.url && <a className="sorp-trustees-report-link" href={review.trusteesReport.url} target="_blank" rel="noreferrer">View the Trustees’ Annual Report used ↗</a>}
  </section>;
}

function PublicSearchCheckpoint({ workflow, impactReportMissing, uploadedReport }: { workflow: ReadinessWorkflow; impactReportMissing: boolean; uploadedReport: string }) {
  const accountsFound = Boolean(workflow.known.find((item) => item.id === "accounts")?.established);
  const trusteesReportFound = Boolean(workflow.known.find((item) => item.id === "trusteesReport")?.established);
  return <section className="sorp-public-search-checkpoint" aria-label="Public information checkpoint">
    <p className="sorp-impact-report-kicker">{accountsFound && trusteesReportFound ? "Great — we found what we need." : "Great — we found enough to get started."}</p>
    <h3>Your Quick Readiness Review is ready.</h3>
    <p className="sorp-public-search-note">{accountsFound && trusteesReportFound ? "We found your latest accounts, reporting context and Trustees’ Annual Report, so we can give you a first readiness view based on your latest published reporting." : "We can give you a first readiness view using the public information we could review. We’ll make clear where published reporting was unavailable."}</p>
    <p className="sorp-quick-review-ready">✓ SORP 2026 appears to apply to you</p>
    {uploadedReport && <p className="sorp-impact-upload-confirmation" role="status">✓ IMPACT REPORT ADDED <span>{uploadedReport}</span></p>}
    {impactReportMissing && <section className="sorp-stage-one-impact-offer" aria-label="Optional Impact Report">
      <h4>We couldn’t find a separate Impact Report or Annual Review online.</h4>
      <p>You do not need one for your Quick Readiness Review.</p>
      <p>If you have one, adding it before the deeper assessment can give us richer evidence about your impact, outcomes and learning — and help us see whether your current practice is stronger than your latest Trustees’ Annual Report alone suggests.</p>
    </section>}
  </section>;
}

function ImpactReportUploader({ onChoose, dragging, onDragEnter, onDragLeave, onDragOver, onDrop, busy }: {
  onChoose: () => void;
  dragging: boolean;
  onDragEnter: (event: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  busy: boolean;
}) {
  return <section className={`sorp-impact-report-uploader${dragging ? " is-dragging" : ""}`} aria-label="Add your latest Impact Report">
    <p className="sorp-impact-report-kicker">Add your latest Impact Report</p>
    <button type="button" className="sorp-impact-report-dropzone" onClick={onChoose} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop} disabled={busy}>
      <strong>{busy ? "Reading your report…" : "Drag your report here"}</strong>
      <span>{busy ? "Please keep this window open while we review it." : "or"}</span>
      <b>{busy ? "Upload in progress" : "Choose file"}</b>
    </button>
    <small>PDF preferred · Word documents supported · maximum 4 MB</small>
  </section>;
}

function PublicAnswerProposal({ proposal }: { proposal: PublicReadinessFinding }) {
  return <section className="sorp-answer-proposal" aria-label="Public-evidence suggested answer">
    <span>{proposal.trusteesReportEvidence ? "Based on your latest Trustees’ Annual Report, we think:" : "Based on the wider public evidence, we think:"}</span>
    <strong>{answerLabels[proposal.suggestedAnswer]}</strong>
    <h4>Why</h4><p>{proposal.reason}</p>
    <div className="sorp-public-evidence-split"><p><b>Trustees’ Annual Report</b><span>{proposal.trusteesReportEvidence || "We could not establish this from the Trustees’ Annual Report."}</span></p>{proposal.widerImpactEvidence && <p><b>Wider impact evidence</b><span>{proposal.widerImpactEvidence}</span></p>}</div>
  </section>;
}

const stageCheckLabels: Record<number, string> = {
  1: "Purpose and activities", 2: "Activities and public benefit", 3: "Period objectives", 4: "Programmes and intended change",
  5: "Measures of success", 6: "Outputs and outcomes", 7: "Evidence of impact", 8: "Main achievements", 9: "Aims and results", 10: "Impact and longer-term effects",
  11: "Balanced reporting", 12: "Factors affecting results", 13: "Future plans", 14: "A consistent report story", 15: "Information ready to report",
};

const stageSevenProgress = [
  { id: "volunteers", label: "Volunteers" },
  { id: "grant_making", label: "Grant-making" },
  { id: "fundraising", label: "Fundraising" },
  { id: "social_investment", label: "Social investment" },
  { id: "investments", label: "Financial investments" },
  { id: "group", label: "Subsidiaries / group" },
];

function DeepDiveStageRail({ workflow, state }: { workflow: ReadinessWorkflow; state: ReadinessState }) {
  const checks = workflow.currentStage === 7
    ? stageSevenProgress.map((check) => ({ ...check, complete: Boolean(state.stageSevenScreening?.[check.id]) && !(workflow.next.id === `check:${check.id}`), current: workflow.next.id === `screen:${check.id}` || workflow.next.id === `check:${check.id}` }))
    : coreQuestions.filter((question) => stageForQuestion(question) === workflow.currentStage).map((question) => ({ id: String(question.id), label: stageCheckLabels[question.id], complete: state.fields[String(question.id)]?.answer !== null && state.fields[String(question.id)]?.answer !== undefined, current: workflow.next.id === `field:${question.id}` }));
  const complete = checks.filter((check) => check.complete).length;
  return <section className="sorp-stage-coach" aria-label={`${workflow.stageTitle} progress`}>
    <span>Your progress</span><h2>{workflow.stageTitle}</h2>
    {checks.length > 0 && <><p className="sorp-stage-coach-count">{complete} of {checks.length} checks complete</p><ol>{checks.map((check) => <li key={check.id} className={check.complete ? "is-complete" : check.current ? "is-current" : undefined}><span aria-hidden="true">{check.complete ? "✓" : "○"}</span>{check.label}</li>)}</ol></>}
    <p className="sorp-stage-coach-note">{workflow.currentStage === 7 ? "Nearly there. These final checks help us make sure we haven’t missed any additional SORP requirements relevant to your charity." : complete > 0 ? "Good progress — keep confirming what still reflects your current practice." : "Your published reporting gives us a starting point. You can confirm or correct it as we go."}</p>
  </section>;
}

function DeepDiveQuestionContext({ workflow }: { workflow: ReadinessWorkflow }) {
  return <section className="sorp-deep-dive-context" aria-label="Suggested answer and evidence">
    {workflow.next.proposal && <PublicAnswerProposal proposal={workflow.next.proposal} />}
    {workflow.next.why && <div className="sorp-deep-dive-meaning"><h4>{workflow.next.proposal ? "What this means" : "Why we’re asking"}</h4><p>{workflow.next.why}</p></div>}
    <SorpBasisDrawer basis={workflow.next.basis} />
    <p className="sorp-proposal-confirm">Does that seem right?<span>Keep it, change it below, or tell us in your own words.</span></p>
  </section>;
}

function SorpStageContext({ workflow, state, impactReportConfirmed, impactReportUploaded, accountEmail, organisation, publicSources = [] }: { workflow: ReadinessWorkflow; state: ReadinessState; impactReportConfirmed: boolean; impactReportUploaded: boolean; accountEmail?: string; organisation?: OrganisationCard | null; publicSources?: PublicSource[] }) {
  const showKnownContext = workflow.currentStage === 1 || workflow.next.id === "publicSearchCheckpoint";
  return <>
    {workflow.currentStage >= 3 && workflow.currentStage <= 7 ? <DeepDiveStageRail workflow={workflow} state={state} /> : organisation ? <section className="sorp-stage-context is-organisation" aria-label="Organisation found"><span>Organisation found</span><h2>{organisation.name}</h2>{organisation.locality && <p>{organisation.locality}</p>}{publicSources.length ? <nav aria-label="Organisation sources">{publicSources.slice(0, 2).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{confirmationSourceLabel(source)}</a>)}</nav> : null}</section> : workflow.next.provisional ? <ProvisionalReadinessView review={workflow.next.provisional} impactReportConfirmed={impactReportConfirmed} impactReportUploaded={impactReportUploaded} /> : showKnownContext ? <SorpKnownContext workflow={workflow} /> : <section className="sorp-stage-context" aria-label="MSI guidance and evidence">
      <span>MSI guidance &amp; evidence</span>
      <h2>{workflow.stageTitle}</h2><p>{workflow.next.why}</p>
      <SorpBasisDrawer basis={workflow.next.basis} />
    </section>}
    <p className="sorp-journey-assurance">Your free SORP readiness report<br /><span>{accountEmail ? `Account: ${accountEmail} · saved securely` : "Narrative and impact reporting · saved on this device until you create an account"}</span></p>
  </>;
}

export function SorpReadinessConversation({ setupOnly = false, onSetupComplete }: { setupOnly?: boolean; onSetupComplete?: (state: ReadinessState, workflow: ReadinessWorkflow) => void }) {
  const router = useRouter();
  const storageKey = setupOnly ? "msi-sorp-snapshot-setup-v1" : CONVERSATION_KEY;
  const [started, setStarted] = useState(false);
  const [welcomeQuestionOpen, setWelcomeQuestionOpen] = useState(false);
  const [state, setState] = useState<ReadinessState>(() => blankState());
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [workingStatus, setWorkingStatus] = useState("Understanding what you’ve said and checking what matters next…");
  const [quickAdvancing, setQuickAdvancing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceProvenance | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [workflow, setWorkflow] = useState<ReadinessWorkflow | null>(null);
  const [completionNotice, setCompletionNotice] = useState("");
  const [checkpoints, setCheckpoints] = useState<ConversationCheckpoint[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [activitySelections, setActivitySelections] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveProfile, setSaveProfile] = useState({ name: "", position: "", email: "", password: "", confirmPassword: "" });
  const [account, setAccount] = useState<ReadinessAccount | null>(null);
  const [accountMode, setAccountMode] = useState<"signup" | "login">("signup");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");
  const [reportDragging, setReportDragging] = useState(false);
  const [quickReviewFeedback, setQuickReviewFeedback] = useState<number | null>(null);
  const [quickReviewFeedbackComment, setQuickReviewFeedbackComment] = useState("");
  const [quickReviewFeedbackStep, setQuickReviewFeedbackStep] = useState(false);
  const [fullReviewFeedback, setFullReviewFeedback] = useState<number | null>(null);
  const [fullReviewFeedbackComment, setFullReviewFeedbackComment] = useState("");
  const [fullReviewFeedbackStep, setFullReviewFeedbackStep] = useState(false);
  const [stageEightReportMode, setStageEightReportMode] = useState(false);
  const [reportSurface, setReportSurface] = useState<"full_report" | "next_actions">("next_actions");
  const [fullReviewEntry, setFullReviewEntry] = useState<"completion" | "revealing" | "ready" | "open">("open");
  const [deepDiveIntroOpen, setDeepDiveIntroOpen] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<(MessageAction & { questionId: string }) | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function growthContext(nextState = state, nextResult: Result | null = result) {
    const tier = nextState.setup.income === "tier1" ? "Tier 1" : nextState.setup.income === "tier2" ? "Tier 2" : nextState.setup.income === "tier3" ? "Tier 3" : "tier uncertain";
    return { organisation: nextState.charityName || undefined, charityTier: tier, readinessScore: nextResult?.score, evidenceConfidence: nextResult?.confidence, currentStage: Math.min(8, Math.max(1, nextState.currentStage || 1)) };
  }

  function recordJourneyProgress(data: ReadinessResponse, previous: ReadinessWorkflow | null) {
    const id = data.sessionId || sessionId;
    const context = { ...growthContext(data.state, data.result), currentStage: data.workflow.currentStage };
    if (data.assistant.organisation) void trackSorpEvent(id, "organisation_found", { ...context, organisation: data.assistant.organisation.name });
    if (data.workflow.known.some(item => item.id === "charityName" && item.established)) void trackSorpEvent(id, "organisation_confirmed", context);
    if (data.workflow.currentStage === 2) void trackSorpEvent(id, "quick_review_reached", context);
    if (data.workflow.currentStage >= 3) void trackSorpEvent(id, "deep_dive_started", context);
    if (data.result && data.workflow.currentStage === 8) void trackSorpEvent(id, "assessment_completed", context);
    if (data.workflow.next.provisional?.impactReport.found) void trackSorpEvent(id, "impact_report_found", context);
    if (data.workflow.currentStage !== previous?.currentStage) void trackSorpEvent(id, "last_stage_reached", context, false);
  }

  useEffect(() => {
    const viewport = window.visualViewport;
    const stamp = document.querySelector<HTMLElement>(".global-build-stamp");
    const resize = () => {
      document.documentElement.style.setProperty("--sorp-viewport-height", `${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty("--sorp-stamp-height", `${stamp ? stamp.getBoundingClientRect().height : 0}px`);
      document.documentElement.classList.toggle("sorp-keyboard-open", Boolean(viewport && window.innerHeight - viewport.height > 150));
      if ((viewport?.height || window.innerHeight) < 550 && document.activeElement === composerRef.current) {
        requestAnimationFrame(() => composerRef.current?.scrollIntoView({ block: "nearest" }));
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (stamp) observer.observe(stamp);
    viewport?.addEventListener("resize", resize);
    return () => { observer.disconnect(); viewport?.removeEventListener("resize", resize); document.documentElement.style.removeProperty("--sorp-viewport-height"); document.documentElement.style.removeProperty("--sorp-stamp-height"); document.documentElement.classList.remove("sorp-keyboard-open"); };
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const wantsSnapshot = !setupOnly && new URLSearchParams(window.location.search).get("from") === "snapshot";
        const snapshotRaw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
        const snapshot = snapshotRaw ? stateFromSnapshot(snapshotRaw) : null;
        if (wantsSnapshot && snapshot) {
          setSessionId(newSessionId());
          setState(snapshot.state);
          setResult(snapshot.result);
          setStarted(true);
          setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll use those answers and focus on the areas where richer context would genuinely improve the result.\n\nTell me what feels least certain—or ask me about any part of your result.` }]);
        } else {
          const saved = window.localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved) as { started?: boolean; state?: ReadinessState; messages?: Message[]; result?: Result | null; intelligence?: IntelligenceProvenance | null; sessionId?: string; workflow?: ReadinessWorkflow; checkpoints?: ConversationCheckpoint[]; quickReviewFeedbackStep?: boolean; quickReviewFeedback?: number | null; quickReviewFeedbackComment?: string; fullReviewEntered?: boolean; fullReviewFeedbackStep?: boolean; fullReviewFeedback?: number | null; fullReviewFeedbackComment?: string; saveProfile?: { name: string; position: string; email: string } };
            if (parsed.state && parsed.messages?.length) {
              setStarted(Boolean(parsed.started));
              setState({ ...blankState(), ...parsed.state, charityName: parsed.state.charityName ?? "", contextEvidence: parsed.state.contextEvidence ?? {} });
              setMessages(parsed.messages);
              setResult(parsed.result ?? null);
              setFullReviewEntry(parsed.result && parsed.fullReviewEntered === false ? "completion" : "open");
              setWorkflow(parsed.workflow ?? null);
              setIntelligence(parsed.workflow?.version === 2 ? parsed.intelligence ?? null : null);
              setSessionId(parsed.sessionId || newSessionId());
              setQuickReviewFeedback(typeof parsed.quickReviewFeedback === "number" ? parsed.quickReviewFeedback : null);
              setQuickReviewFeedbackComment(typeof parsed.quickReviewFeedbackComment === "string" ? parsed.quickReviewFeedbackComment : "");
              setQuickReviewFeedbackStep(Boolean(parsed.quickReviewFeedbackStep));
              setFullReviewFeedback(typeof parsed.fullReviewFeedback === "number" ? parsed.fullReviewFeedback : null);
              setFullReviewFeedbackComment(typeof parsed.fullReviewFeedbackComment === "string" ? parsed.fullReviewFeedbackComment : "");
              setFullReviewFeedbackStep(Boolean(parsed.fullReviewFeedbackStep));
              if (parsed.saveProfile) setSaveProfile((current) => ({ ...current, ...parsed.saveProfile }));
              setCheckpoints(Array.isArray(parsed.checkpoints) ? parsed.checkpoints.map((checkpoint) => ({
                ...checkpoint,
                answerText: checkpoint.answerText || parsed.messages?.[checkpoint.messagesLength]?.content || "Saved answer",
              })) : []);
              if (parsed.started && parsed.sessionId) void trackSorpEvent(parsed.sessionId, "assessment_resumed", growthContext(parsed.state, parsed.result ?? null));
            }
          }
        }
      } catch {
        setError("We could not restore the local conversation, so you can start cleanly.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [setupOnly, storageKey]);

  useEffect(() => {
    if (!hydrated || setupOnly) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/readiness-account", { cache: "no-store", signal: abort.signal });
        if (!response.ok) return;
        const data = await response.json() as { signedIn?: boolean; account?: ReadinessAccount; progress?: Partial<SavedProgress> };
        if (!data.signedIn || !data.account) return;
        setAccount(data.account);
        setSaveProfile((current) => ({ ...current, name: data.account!.name, position: data.account!.position, email: data.account!.email }));
        const saved = data.progress;
        if (saved?.started && saved.state && saved.messages?.length) {
          setStarted(true);
          setState({ ...blankState(), ...saved.state, charityName: saved.state.charityName ?? "", contextEvidence: saved.state.contextEvidence ?? {} });
          setMessages(saved.messages);
          setResult(saved.result ?? null);
          setFullReviewEntry(saved.result && saved.fullReviewEntered === false ? "completion" : "open");
          setFullReviewFeedbackStep(Boolean(saved.fullReviewFeedbackStep));
          setQuickReviewFeedbackStep(Boolean(saved.quickReviewFeedbackStep));
          setQuickReviewFeedback(typeof saved.quickReviewFeedback === "number" ? saved.quickReviewFeedback : null);
          setQuickReviewFeedbackComment(saved.quickReviewFeedbackComment || "");
          setFullReviewFeedback(typeof saved.fullReviewFeedback === "number" ? saved.fullReviewFeedback : null);
          setFullReviewFeedbackComment(saved.fullReviewFeedbackComment || "");
          setWorkflow(saved.workflow ?? null);
          setIntelligence(saved.intelligence ?? null);
          setSessionId(saved.sessionId || newSessionId());
          setCheckpoints(Array.isArray(saved.checkpoints) ? saved.checkpoints : []);
          if (saved.sessionId) void trackSorpEvent(saved.sessionId, "assessment_resumed", growthContext(saved.state, saved.result ?? null));
        }
      } catch (caught) {
        if (!abort.signal.aborted) console.error("Saved SORP account could not be restored", caught);
      }
    })();
    return () => abort.abort();
  }, [hydrated, setupOnly]);

  useEffect(() => {
    if (!hydrated || (!started && !messages.length)) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedbackStep, quickReviewFeedback, quickReviewFeedbackComment, fullReviewEntered: fullReviewEntry === "open", fullReviewFeedbackStep, fullReviewFeedback, fullReviewFeedbackComment, saveProfile: { name: saveProfile.name, position: saveProfile.position, email: saveProfile.email } })); } catch { queueMicrotask(() => setError("Your browser could not save this conversation. Keep this page open to retain your progress.")); }
  }, [hydrated, started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedbackStep, quickReviewFeedback, quickReviewFeedbackComment, fullReviewEntry, fullReviewFeedbackStep, fullReviewFeedback, fullReviewFeedbackComment, saveProfile, storageKey]);

  useEffect(() => {
    if (!hydrated || !started || !account || setupOnly) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/readiness-account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", progress: { started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedbackStep, quickReviewFeedback, quickReviewFeedbackComment, fullReviewEntered: fullReviewEntry === "open", fullReviewFeedbackStep, fullReviewFeedback, fullReviewFeedbackComment } }) });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [hydrated, started, account, setupOnly, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedbackStep, quickReviewFeedback, quickReviewFeedbackComment, fullReviewEntry, fullReviewFeedbackStep, fullReviewFeedback, fullReviewFeedbackComment]);

  useEffect(() => {
    if (fullReviewEntry !== "revealing" || !result) return;
    // The result was generated with the final Stage 7 answer; this is a brief reveal, not a second calculation.
    const timer = window.setTimeout(() => setFullReviewEntry("ready"), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 1450);
    return () => window.clearTimeout(timer);
  }, [fullReviewEntry, result]);

  useEffect(() => {
    if (fullReviewEntry !== "ready") return;
    const timer = window.setTimeout(() => setFullReviewEntry("open"), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 850);
    return () => window.clearTimeout(timer);
  }, [fullReviewEntry]);

  useEffect(() => {
    if (result && workflow?.currentStage === 8 && fullReviewEntry === "open") void trackSorpEvent(sessionId, "full_review_viewed", growthContext());
  }, [result, workflow?.currentStage, fullReviewEntry, sessionId]);

  useEffect(() => {
    const restoreReviewPosition = (event: PopStateEvent) => {
      const candidate = event.state?.sorpReviewIndex;
      setReviewIndex(Number.isInteger(candidate) && candidate >= 0 && candidate < checkpoints.length ? candidate : null);
      setSelectedQuickAction(null);
      setState((current) => ({ ...current, pendingStructuredAnswer: null }));
      setComposer("");
      setError("");
    };
    window.addEventListener("popstate", restoreReviewPosition);
    return () => window.removeEventListener("popstate", restoreReviewPosition);
  }, [checkpoints.length]);

  useEffect(() => {
    const body = document.querySelector<HTMLElement>(".sorp-journey-body");
    const target = document.querySelector<HTMLElement>(completionNotice ? ".sorp-completion-notice" : "#readiness-current-question");
    if (body && target) body.scrollTo({ top: window.innerWidth > 900 || completionNotice.includes("Organisation confirmed") ? 0 : body.scrollTop + target.getBoundingClientRect().top - body.getBoundingClientRect().top - 20, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages, busy, result, completionNotice]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function startConversation(useSnapshot = false) {
    if (!useSnapshot && messages.length) {
      if ((state.organisationResearch as { status?: string })?.status === "unsearched") setMessages((current) => [...current, { role: "assistant", content: "Let’s find your charity. What is it called? A location or a few words about its work can help." }]);
      setStarted(true);
      void trackSorpEvent(sessionId, "assessment_started", { currentStage: 1, charityTier: "tier uncertain" });
      return;
    }
    setFullReviewEntry("open");
    setWorkflow(null);
    setSelectedQuickAction(null);
    setCompletionNotice("");
    setCheckpoints([]);
    setReviewIndex(null);
    setActivitySelections([]);
    setQuickReviewFeedback(null);
    setQuickReviewFeedbackComment("");
    setQuickReviewFeedbackStep(false);
    setFullReviewFeedbackStep(false);
    const id = newSessionId();
    setSessionId(id);
    void trackSorpEvent(id, "assessment_started", { currentStage: 1, charityTier: "tier uncertain" });
    if (useSnapshot) {
      const raw = window.localStorage.getItem(SNAPSHOT_RESULT_KEY);
      const snapshot = raw ? stateFromSnapshot(raw) : null;
      if (snapshot) {
        setState(snapshot.state);
        setResult(snapshot.result);
        setIntelligence(null);
        setMessages([{ role: "assistant", content: `I’ve got your Snapshot, so we don’t need to start again.\n\nYour initial score is ${snapshot.result?.score}/100. I’ll focus on the weaker areas, uncertainty and any context that could change the interpretation.\n\nWhich part would you most like to talk through?` }]);
        setStarted(true);
        return;
      }
    }
    setState(blankState());
    setResult(null);
    setIntelligence(null);
    setMessages([{ role: "assistant", content: "Let’s find your charity.\n\nWhat is the charity called? A location or a few words about its work can help us find the right one." }]);
    setStarted(true);
  }

  async function submitSave(event: FormEvent) {
    event.preventDefault();
    setSaveStatus("saving");
    setSaveError("");
    try {
      const progress: SavedProgress = { started, state, messages, result, intelligence, sessionId, workflow, checkpoints, quickReviewFeedbackStep, quickReviewFeedback, quickReviewFeedbackComment, fullReviewEntered: fullReviewEntry === "open", fullReviewFeedbackStep, fullReviewFeedback, fullReviewFeedbackComment };
      const action: "signup" | "login" | "save" = account ? "save" : accountMode;
      if (!account && action === "signup" && saveProfile.password !== saveProfile.confirmPassword) throw new Error("The two passwords do not match. Please re-enter them and try again.");
      const response = await fetch("/api/readiness-account", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "save" ? { action, progress } : action === "signup" ? { action, name: saveProfile.name, position: saveProfile.position, email: saveProfile.email, password: saveProfile.password, progress } : { action, email: saveProfile.email, password: saveProfile.password }),
      });
      const raw = await response.text();
      let data: { account?: ReadinessAccount; progress?: Partial<SavedProgress>; error?: string };
      try { data = raw ? JSON.parse(raw) as typeof data : {}; } catch { throw new Error("The secure saving service sent an incomplete response. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again."); }
      if (!response.ok || !data.account) throw new Error(data.error || "The secure saving service could not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again.");
      setAccount(data.account);
      if (action === "login") {
        const saved = data.progress;
        if (saved?.started && saved.state && saved.messages?.length) {
          setStarted(true);
          setState({ ...blankState(), ...saved.state, charityName: saved.state.charityName ?? "", contextEvidence: saved.state.contextEvidence ?? {} });
          setMessages(saved.messages);
          setResult(saved.result ?? null);
          setFullReviewEntry(saved.result && saved.fullReviewEntered === false ? "completion" : "open");
          setFullReviewFeedbackStep(Boolean(saved.fullReviewFeedbackStep));
          setQuickReviewFeedbackStep(Boolean(saved.quickReviewFeedbackStep));
          setQuickReviewFeedback(typeof saved.quickReviewFeedback === "number" ? saved.quickReviewFeedback : null);
          setQuickReviewFeedbackComment(saved.quickReviewFeedbackComment || "");
          setFullReviewFeedback(typeof saved.fullReviewFeedback === "number" ? saved.fullReviewFeedback : null);
          setFullReviewFeedbackComment(saved.fullReviewFeedbackComment || "");
          setWorkflow(saved.workflow ?? null);
          setIntelligence(saved.intelligence ?? null);
          setSessionId(saved.sessionId || newSessionId());
          setCheckpoints(Array.isArray(saved.checkpoints) ? saved.checkpoints : []);
        }
      }
      const storedProgress = action === "login" && data.progress?.started ? data.progress : progress;
      window.localStorage.setItem(storageKey, JSON.stringify({ ...storedProgress, saveProfile: { name: saveProfile.name, position: saveProfile.position, email: saveProfile.email } }));
      setSaveProfile((current) => ({ ...current, password: "", confirmPassword: "" }));
      setSaveStatus("saved");
      if (action === "login") {
        setCompletionNotice("✓ Signed in. Your saved assessment has been restored.");
        window.setTimeout(() => setSaveDialogOpen(false), 700);
      } else {
        void trackSorpEvent(sessionId, "save_and_exit", growthContext());
        window.setTimeout(() => router.push("/are-you-sorp-ready?progress=saved"), 900);
      }
    } catch (caught) {
      setSaveStatus("idle");
      setSaveError(caught instanceof Error ? caught.message : "The secure saving service could not complete the request. Your assessment is still safe on this device and nothing has been lost. Please wait a moment and try again.");
    }
  }

  function selectStructuredAnswer(value: string, label = value) {
    const selectedWorkflow = reviewIndex === null ? workflow : checkpoints[reviewIndex]?.workflow;
    if (!selectedWorkflow || busy || quickAdvancing) return;
    if (reviewIndex !== null && !selectedWorkflow.next.id.match(/^(?:field:\d+|check:)/)) return;
    if (selectedWorkflow.next.id === "publicReview" && /go deeper/i.test(label) && !deepDiveIntroOpen) {
      setDeepDiveIntroOpen(true);
      setError("");
      return;
    }
    if (value === "__UPLOAD_REPORT__") {
      reportInputRef.current?.click();
      return;
    }
    if (selectedWorkflow.next.id === "activities") {
      setActivitySelections((current) => toggleActivityChoice(current, value));
      setError("");
      return;
    }
    if (/^field:\d+$/.test(selectedWorkflow.next.id) || (selectedWorkflow.next.id.startsWith("check:") && selectedWorkflow.currentStage !== 7)) {
      setSelectedQuickAction({ questionId: selectedWorkflow.next.id, value, label });
      setError("");
      return;
    }
    const pending = selectedWorkflow.currentStage === 7 && selectedWorkflow.next.id.startsWith("check:") ? null : structuredAnswerFromAction(value, selectedWorkflow.next.id);
    if (!pending) {
      void sendMessage(value, value, false, "button_action");
      return;
    }
    setState((current) => ({ ...current, pendingStructuredAnswer: pending }));
    setComposer("");
    setError("");
    window.setTimeout(() => composerRef.current?.focus(), 40);
  }

  async function uploadReport(file: File) {
    if (busy || quickAdvancing || !workflow) return;
    const supported = file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.(pdf|doc|docx)$/i.test(file.name);
    if (!supported) {
      setError("Sorry — that file type is not supported. Please choose a PDF or Word document.");
      return;
    }
    if (file.size > 4_000_000) {
      setError("Sorry — that report is larger than 4 MB. Please choose a smaller PDF or Word document.");
      return;
    }
    const userMessage: Message = { role: "user", content: `Added report: ${file.name}` };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setWorkingStatus("Reading the report you added and checking what it changes…");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file, file.name);
      form.set("state", JSON.stringify(state));
      form.set("sessionId", sessionId || newSessionId());
      if (intelligence?.effectiveVersion) form.set("intelligenceVersion", intelligence.effectiveVersion);
      const response = await fetch("/api/readiness/report", { method: "POST", body: form });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "That report could not be reviewed yet.");
      setCheckpoints((current) => [...current, {
        state,
        messagesLength: messages.length,
        workflow,
        result,
        intelligence,
        completionNotice,
        activitySelections,
        composer,
        answerText: `Added report: ${file.name}`,
        note: "",
      }].slice(-30));
      setState(data.state);
      setWorkflow(data.workflow);
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      setMessages([...nextMessages, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
        conversation: data.assistant.conversation,
      }]);
      setCompletionNotice(`✓ IMPACT REPORT ADDED · ${file.name}`);
      void trackSorpEvent(data.sessionId || sessionId, "impact_report_uploaded", growthContext(data.state, data.result));
    } catch (caught) {
      setMessages(messages);
      setError(caught instanceof Error ? caught.message : "That report could not be reviewed yet.");
    } finally {
      setBusy(false);
      if (reportInputRef.current) reportInputRef.current.value = "";
    }
  }

  function chooseReportFile() {
    reportInputRef.current?.click();
  }

  function recordQuickReviewFeedback(value: number) {
    setQuickReviewFeedback(value);
    void trackSorpEvent(sessionId, "quick_review_feedback_submitted", { ...growthContext(), rating: value }, false);
  }

  function recordQuickReviewFeedbackComment(value: string) {
    setQuickReviewFeedbackComment(value);
    // Written feedback stays in the assessment; Grow needs only the rating.
  }

  function recordFullReviewFeedback(value: number) {
    setFullReviewFeedback(value);
    void trackSorpEvent(sessionId, "full_review_feedback_submitted", { ...growthContext(), rating: value }, false);
  }

  function recordFullReviewFeedbackComment(value: string) {
    setFullReviewFeedbackComment(value);
  }

  function dropReport(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setReportDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadReport(file);
  }

  async function confirmStructuredAnswer(rawNote: string, selectedAnswer?: PendingStructuredAnswer) {
    const pending = selectedAnswer || state.pendingStructuredAnswer;
    if (!pending || busy || quickAdvancing || recordingState !== "idle") return;
    const submissionState = selectedAnswer ? { ...state, pendingStructuredAnswer: selectedAnswer } : state;
    const note = rawNote.trim();
    const userMessage: Message = { role: "user", content: note ? `${pending.label}\n\n${note}` : pending.label };
    const reviewing = reviewIndex !== null;
    const activeCheckpoint = reviewing ? checkpoints[reviewIndex] : null;
    const activeHistory = activeCheckpoint ? messages.slice(0, activeCheckpoint.messagesLength) : messages;
    const nextMessages = [...activeHistory, userMessage];
    if (!reviewing) setMessages(nextMessages);
    setComposer("");
    setQuickAdvancing(true);
    setError("");
    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: note || "Continue",
          interaction: "confirm_structured_answer",
          state: submissionState,
          history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })),
          sessionId: sessionId || newSessionId(),
          intelligencePin: intelligence?.effectiveVersion ? { effectiveVersion: intelligence.effectiveVersion } : null,
        }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "That answer could not be saved yet.");
      if (reviewing) {
        setCheckpoints((current) => current.map((checkpoint, index) => index === reviewIndex ? { ...checkpoint, answerText: pending.label, note } : checkpoint));
      } else {
        setCheckpoints((current) => [...current, {
          state: { ...submissionState, pendingStructuredAnswer: null },
          messagesLength: messages.length,
          workflow,
          result,
          intelligence,
          completionNotice,
          activitySelections: [],
          composer: "",
          answerText: pending.label,
          note,
        }].slice(-30));
      }
      setState(data.state);
      recordJourneyProgress(data, workflow);
      if (!reviewing) setWorkflow(data.workflow);
      const newlyCompleted = data.workflow.completedStages.filter(stage => !workflow?.completedStages.includes(stage));
      setCompletionNotice(reviewing ? "✓ Answer updated. Later answers have been kept." : newlyCompleted.includes(7) && data.workflow.currentStage === 8 ? "✓ 7 STAGES COMPLETE · YOUR FULL READINESS REVIEW IS READY" : newlyCompleted.length ? `✓ ${newlyCompleted.map(stage => `Stage ${stage}`).join(" & ")} complete. One more part of your readiness picture established.` : "");
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      if (!reviewing) setMessages([...nextMessages, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
        conversation: data.assistant.conversation,
      }]);
      if (data.result) {
        setResult(data.result);
        if (!reviewing && workflow?.currentStage === 7 && data.workflow.currentStage === 8) {
          setFullReviewEntry("completion");
          setFullReviewFeedbackStep(false);
        }
      }
      setSelectedQuickAction(null);
    } catch (caught) {
      if (!reviewing) setMessages(messages);
      setComposer(note);
      setError(caught instanceof Error ? caught.message : "That answer could not be saved yet.");
    } finally {
      setQuickAdvancing(false);
    }
  }

  async function sendMessage(rawValue: string, displayValue = rawValue, preserveActivitySelections = false, interaction: "conversation_first" | "button_action" = "conversation_first") {
    const value = rawValue.trim();
    if (!value || busy || quickAdvancing || recordingState !== "idle") return;
    const deterministicSetupReply = interaction === "button_action" && isDeterministicSetupReply(value, workflow?.next.id);
    const userMessage: Message = { role: "user", content: displayValue.trim() || value };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setComposer("");
    if (deterministicSetupReply) setQuickAdvancing(true);
    else {
      setWorkingStatus(interaction === "conversation_first" ? workflow?.next.id === "organisation" && !looksLikeQuestion(value) ? "Searching for your charity — hang on a sec…" : "Listening to what you mean and answering before we move on…" : workingStatusFor(value, state, workflow));
      setBusy(true);
    }
    setError("");
    try {
      const response = await fetch("/api/readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: value,
          interaction,
          surface: !started ? "welcome" : state.inheritedSnapshot ? "snapshot" : stageEightReportMode ? reportSurface : fullReviewFeedbackStep || quickReviewFeedbackStep ? "feedback" : deepDiveIntroOpen ? "transition" : result ? "full_review" : "assessment",
          displayedReport: result,
          viewedQuestion: reviewIndex !== null ? checkpoints[reviewIndex]?.workflow?.next : null,
          draftActivitySelections: interaction === "conversation_first" && workflow?.next.id === "activities" ? activitySelections : undefined,
          state,
          history: nextMessages.slice(-40).map(({ role, content }) => ({ role, content })),
          sessionId: sessionId || newSessionId(),
          intelligencePin: intelligence?.effectiveVersion ? { effectiveVersion: intelligence.effectiveVersion } : null,
        }),
      });
      const data = await response.json() as ReadinessResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "The readiness conversation is temporarily unavailable.");
      // A new reply must remain visible even when the user was viewing a saved
      // question. Keep their progress/history and return to the live thread.
      if (interaction === "conversation_first" && reviewIndex !== null) setReviewIndex(null);
      if (workflow && (data.workflow.next.id !== workflow.next.id || data.result)) setCheckpoints((current) => [...current, {
          state,
          messagesLength: messages.length,
          workflow,
          result,
          intelligence,
          completionNotice,
          activitySelections,
          composer,
          answerText: displayValue.trim() || value,
          note: "",
        }].slice(-30));
      if (workflow?.next.id === "activities" && !preserveActivitySelections) setActivitySelections([]);
      setState(data.state);
      setWorkflow(data.workflow);
      if (started) recordJourneyProgress(data, workflow);
      if (deepDiveIntroOpen && data.workflow.currentStage >= 3) setDeepDiveIntroOpen(false);
      if (setupOnly && data.workflow.completedStages.includes(2)) onSetupComplete?.(data.state, data.workflow);
      const newlyKnown = data.workflow.known.filter(item => item.established && !workflow?.known.find(previous => previous.id === item.id)?.established);
      const newlyCompleted = data.workflow.completedStages.filter(stage => !workflow?.completedStages.includes(stage));
      setCompletionNotice(newlyCompleted.includes(1) ? "✓ YOUR CHARITY & SORP CONTEXT COMPLETE · SORP 2026 APPEARS TO APPLY TO YOU" : newlyCompleted.length ? `✓ ${newlyCompleted.map(stage => `Stage ${stage}`).join(" & ")} complete. ${data.workflow.currentStage === 3 ? "Your Quick Readiness Review is complete." : data.workflow.currentStage === 8 ? "Seven stages complete. Your Full Readiness Review is ready." : "One more part of your readiness picture established."}` : !workflow?.known.find(item => item.id === "charityName")?.established && data.workflow.known.find(item => item.id === "charityName")?.established ? "✓ Organisation confirmed. Here’s what we’ve found so far." : newlyKnown.length ? `✓ ${newlyKnown.map(item => item.label).join(" · ")} established. Good — that’s one more thing sorted.` : "");
      if (data.intelligence) setIntelligence(data.intelligence);
      setSessionId(data.sessionId || sessionId || newSessionId());
      setMessages((current) => [...current, {
        role: "assistant",
        content: data.assistant.message,
        label: data.assistant.label,
        citations: data.assistant.citations,
        publicSources: data.assistant.publicSources,
        organisation: data.assistant.organisation,
        actions: data.assistant.actions,
        workflow: data.workflow,
        responseKind: data.assistant.responseKind,
        conversation: data.assistant.conversation,
      }]);
      if (data.result) {
        setResult(data.result);
        if (workflow?.currentStage === 7 && data.workflow.currentStage === 8) setFullReviewEntry("completion");
      }
      if (data.workflow.next.id !== workflow?.next.id || state.pendingStructuredAnswer && !data.state.pendingStructuredAnswer) setSelectedQuickAction(null);
    } catch (caught) {
      setMessages(messages);
      setComposer(value);
      setError(caught instanceof Error ? caught.message : "The readiness conversation is temporarily unavailable.");
    } finally {
      if (deterministicSetupReply) setQuickAdvancing(false);
      else setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    // Text and voice are conversation, even beside an uncommitted button choice.
    if (composer.trim()) {
      void sendMessage(composer, composer, true, "conversation_first");
      return;
    }
    if (isReadinessScale) {
      const choice = activeQuickAction || suggestedQuickAction;
      if (composer.trim() && (!activeQuickAction || looksLikeQuestion(composer))) {
        void sendMessage(composer, composer, false, "conversation_first");
      } else if (choice && displayedAnswerLabel(choice.label).toUpperCase() === "SKIP FOR NOW") {
        void sendMessage(composer.trim() ? `${choice.value}\n\n${composer.trim()}` : choice.value, composer.trim() ? `${displayedAnswerLabel(choice.label)}\n\n${composer.trim()}` : displayedAnswerLabel(choice.label), false, "button_action");
      } else if (choice) {
        const pending = structuredAnswerFromAction(choice.value, responseQuestionId);
        if (pending) void confirmStructuredAnswer(composer, pending);
      } else if (composer.trim()) void sendMessage(composer);
    } else if (reviewIndex !== null && state.pendingStructuredAnswer) {
      void confirmStructuredAnswer(composer);
    } else if (workflow?.next.id === "activities" && composer.trim()) {
      void sendMessage(composer, composer, true, "conversation_first");
    } else if (workflow?.next.id === "activities" && activitySelections.length) {
      const actions = messages.at(-1)?.actions ?? [];
      const submission = buildActivitySubmission(activitySelections, actions, "");
      void sendMessage(submission.value, submission.display, false, "button_action");
    } else if (state.pendingStructuredAnswer && composer.trim()) {
      void sendMessage(composer, composer, false, "conversation_first");
    } else if (state.pendingStructuredAnswer) void confirmStructuredAnswer("");
    else void sendMessage(composer);
  }

  function goBack() {
    if (busy || quickAdvancing || recordingState !== "idle") return;
    if (deepDiveIntroOpen) {
      setDeepDiveIntroOpen(false);
      return;
    }
    const previous = checkpoints.at(-1);
    if (reviewIndex === null && workflow?.next.id === "impactReportLink" && state.impactReportConfirmation === "replacement_requested" && previous?.workflow?.next.id === "publicReview") {
      setState(previous.state);
      setWorkflow(previous.workflow);
      setResult(previous.result);
      setMessages(messages.slice(0, previous.messagesLength));
      setCheckpoints((current) => current.slice(0, -1));
      setSelectedQuickAction(null);
      setCompletionNotice(previous.completionNotice);
      setComposer("");
      setError("");
      return;
    }
    if (!checkpoints.length) return;
    const nextIndex = reviewIndex === null ? checkpoints.length - 1 : Math.max(0, reviewIndex - 1);
    setReviewIndex(nextIndex);
    setSelectedQuickAction(null);
    window.history.pushState({ sorpReviewIndex: nextIndex }, "");
    setCompletionNotice("");
    setComposer("");
    setError("");
  }

  function goNext() {
    if (reviewIndex === null || busy || quickAdvancing || recordingState !== "idle") return;
    const nextIndex = reviewIndex < checkpoints.length - 1 ? reviewIndex + 1 : null;
    setReviewIndex(nextIndex);
    setSelectedQuickAction(null);
    window.history.pushState({ sorpReviewIndex: nextIndex }, "");
    setCompletionNotice("");
    setComposer("");
    setState((current) => ({ ...current, pendingStructuredAnswer: null }));
    setError("");
  }

  async function startRecording() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is not available in this browser. You can still type your answer.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => void transcribe(recorder.mimeType || preferred || "audio/webm");
      recorder.start(250);
      setRecordingSeconds(0);
      setRecordingState("recording");
      timerRef.current = setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not start the microphone.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecordingState("transcribing");
  }

  async function transcribe(mimeType: string) {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      const audio = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", audio, mimeType.includes("mp4") ? "readiness.m4a" : "readiness.webm");
      const response = await fetch("/api/readiness/transcribe", { method: "POST", body: form });
      const data = await response.json() as { transcript?: string; error?: string };
      if (!response.ok || !data.transcript) throw new Error(data.error || "We could not transcribe that recording.");
      setComposer((current) => [current.trim(), data.transcript?.trim()].filter(Boolean).join(" "));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not transcribe that recording.");
    } finally {
      chunksRef.current = [];
      setRecordingState("idle");
      window.setTimeout(() => composerRef.current?.focus(), 60);
    }
  }

  const reviewCheckpoint = reviewIndex === null ? null : checkpoints[reviewIndex] || null;
  const activeWorkflow = reviewCheckpoint?.workflow || workflow;
  const activeMessages = reviewCheckpoint ? messages.slice(0, reviewCheckpoint.messagesLength) : messages;
  const currentStage = activeWorkflow?.currentStage || 1;
  const isStageOnePayoff = activeWorkflow?.next.id === "publicSearchCheckpoint";
  const progressCurrentStage = isStageOnePayoff ? 1 : currentStage;
  const progressCompletedStages = isStageOnePayoff ? (activeWorkflow?.completedStages || []).filter((stage) => stage !== 1) : activeWorkflow?.completedStages || [];
  const impactMode = state.assessmentMode === "impact_readiness";
  const pendingStructuredAnswer = state.pendingStructuredAnswer;
  const activityQuestion = activeWorkflow?.next.id === "activities" && reviewIndex === null;
  const activitySelectionCount = activitySelections.length;
  const conversationFirstMessage = Boolean((activityQuestion || pendingStructuredAnswer) && composer.trim().length > 0);
  const activeResponseMessage = activeMessages[activeMessages.length - 1]?.role === "assistant" ? activeMessages[activeMessages.length - 1] : null;
  const contextMessage = activeResponseMessage || [...activeMessages].reverse().find((message) => message.role === "assistant");
  const responseQuestionId = activeResponseMessage?.workflow?.next.id || activeWorkflow?.next.id || "";
  const isQuickReviewResponse = responseQuestionId === "publicReview" && !deepDiveIntroOpen;
  const messageResponseActions = activeResponseMessage?.actions || [];
  const quickReviewAction = messageResponseActions.find((action) => /quick review/i.test(`${action.label} ${action.value}`))?.value || "See my quick review";
  const goDeeperAction = messageResponseActions.find((action) => /go deeper/i.test(`${action.label} ${action.value}`))?.value || "Go deeper";
  const responseActions = isStageOnePayoff
    ? [{ label: "SEE MY QUICK REVIEW", value: quickReviewAction }]
    : deepDiveIntroOpen && responseQuestionId === "publicReview"
    ? [{ label: "START THE DEEPER REVIEW", value: goDeeperAction }]
    : activeResponseMessage?.workflow?.next.provisional && responseQuestionId === "publicReview" && !messageResponseActions.some((action) => /go deeper/i.test(action.label))
    ? [{ label: "GO DEEPER", value: goDeeperAction }, ...messageResponseActions]
    : messageResponseActions;
  const orderedResponseActions = /^field:\d+$/.test(responseQuestionId) ? orderReadinessActions(responseActions) : responseActions;
  const suggestedAnswer = /^field:\d+$/.test(responseQuestionId) ? activeWorkflow?.next.proposal?.suggestedAnswer : undefined;
  const suggestedQuickAction = suggestedAnswer && !reviewCheckpoint ? orderedResponseActions.find((action) => displayedAnswerLabel(action.label).toUpperCase() === answerLabels[suggestedAnswer]) : undefined;
  const isReadinessScale = /^field:\d+$/.test(responseQuestionId) || responseQuestionId.startsWith("check:") && currentStage !== 7;
  const activeQuickAction = selectedQuickAction?.questionId === responseQuestionId ? selectedQuickAction : pendingStructuredAnswer?.target === responseQuestionId ? { questionId: responseQuestionId, value: pendingStructuredAnswer.label, label: pendingStructuredAnswer.label } : null;
  const impactReportMissingAtPayoff = isStageOnePayoff && !activeWorkflow?.known.find((item) => item.id === "impactReport")?.established && state.impactReportInput !== "uploaded";
  const showResponseActions = responseActions.length > 0 && (!pendingStructuredAnswer || isReadinessScale) && (reviewIndex === null || /^(?:field:\d+|check:)/.test(responseQuestionId));
  const saveDialog = saveDialogOpen && <div className="sorp-save-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && saveStatus !== "saving") setSaveDialogOpen(false); }}><section className="sorp-save-dialog" role="dialog" aria-modal="true" aria-labelledby="sorp-save-title">
    <button type="button" className="sorp-save-close" onClick={() => setSaveDialogOpen(false)} disabled={saveStatus === "saving"} aria-label="Close finish another time form">×</button>
    <span>Finish another time</span><h2 id="sorp-save-title">{account ? "Save your assessment" : accountMode === "signup" ? "Create your account" : "Sign in to your account"}</h2><p>{account ? `You’re signed in as ${account.email}. Save now and your assessment will be available when you return.` : accountMode === "signup" ? "Create an account so your answers and conversation are saved securely and you can continue on this or another device." : "Sign in to reopen the assessment already saved to your account."}</p>
    <form onSubmit={submitSave}>
      {!account && accountMode === "signup" && <><label htmlFor="save-name">Your name<input id="save-name" name="name" autoComplete="name" required maxLength={120} value={saveProfile.name} onChange={(event) => setSaveProfile((current) => ({ ...current, name: event.target.value }))} /></label>
      <label htmlFor="save-position">Position / role<input id="save-position" name="position" autoComplete="organization-title" required maxLength={120} value={saveProfile.position} onChange={(event) => setSaveProfile((current) => ({ ...current, position: event.target.value }))} /></label></>}
      {!account && <>
      <label htmlFor="save-email">Email address<input id="save-email" name="email" type="email" autoComplete="email" required maxLength={254} value={saveProfile.email} onChange={(event) => setSaveProfile((current) => ({ ...current, email: event.target.value }))} /></label>
      <label htmlFor="save-password">Password<input id="save-password" name="password" type="password" autoComplete={accountMode === "signup" ? "new-password" : "current-password"} required minLength={10} maxLength={200} value={saveProfile.password} onChange={(event) => setSaveProfile((current) => ({ ...current, password: event.target.value }))} /></label>
      {accountMode === "signup" && <label htmlFor="save-confirm-password">Confirm password<input id="save-confirm-password" name="confirm-password" type="password" autoComplete="new-password" required minLength={10} maxLength={200} value={saveProfile.confirmPassword} onChange={(event) => setSaveProfile((current) => ({ ...current, confirmPassword: event.target.value }))} /></label>}
      <p className="sorp-save-security">Your password is protected server-side. Your account lets you return to this assessment without relying on this browser.</p>
      <button type="button" className="sorp-account-switch" onClick={() => { setAccountMode((current) => current === "signup" ? "login" : "signup"); setSaveError(""); }}>{accountMode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one"}</button>
      </>}
      {saveError && <div className="sorp-save-error" role="alert" aria-live="assertive"><strong>Sorry — we couldn’t save your account.</strong><span>{saveError}</span><span>You can correct anything above and try again without losing your place.</span></div>}
      {saveStatus === "saved" ? <p className="sorp-save-success" role="status">✓ {accountMode === "login" && !account ? "Signed in." : "Saved to your account. You can finish another time."}</p> : <button type="submit" disabled={saveStatus === "saving"}>{saveStatus === "saving" ? "Saving…" : account ? "Save and finish another time" : accountMode === "signup" ? "Create account and save" : "Sign in and continue"} <span>→</span></button>}
    </form>
  </section></div>;

  // Questionnaire answers remain saved, but only actual conversations belong beside the review.
  const reviewStartIndex = messages.findLastIndex((message) => message.responseKind === "result");
  const reviewChatMessages = messages.flatMap((message, index) => index > reviewStartIndex && message.role === "assistant" && (message.conversation || message.responseKind === "detour")
    ? [...(messages[index - 1]?.role === "user" ? [messages[index - 1]] : []), message]
    : []);
  const reviewConversation = reviewChatMessages.length || busy || error ? <section className="sorp-review-conversation" aria-live="polite">{reviewChatMessages.map((message, index) => <article key={`${index}-${message.content.slice(0, 24)}`}><small>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</small><MessageContent text={message.content} /></article>)}{busy && <p role="status">{workingStatus}</p>}{error && <p role="alert">{error}</p>}</section> : null;
  const reviewChatInput = <form className="sorp-review-chat-input" onSubmit={submit}><label htmlFor="readiness-answer">Anything you’d like to discuss about your report?</label><textarea ref={composerRef} id="readiness-answer" rows={2} value={composer} onChange={event => setComposer(event.target.value)} placeholder="Type or say what you’d like to ask…" maxLength={4000} /><div className="readiness-submit-row"><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || recordingState === "transcribing"}>{recordingState === "recording" ? "Stop recording" : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" disabled={busy || composer.trim().length < 2 || recordingState !== "idle"}>{busy ? "Understanding…" : "Send message"} <span>→</span></button></div></form>;

  if (!setupOnly && result && state.score !== null && sessionId && reviewIndex === null) {
    if (fullReviewEntry === "revealing" || fullReviewEntry === "ready") return <div className={`readiness-chat is-full-review-building${fullReviewEntry === "ready" ? " is-ready" : ""}`}>
      <div className="sorp-full-review-building" role="status" aria-live="polite">
        <header><span>My Social Impact Intelligence</span><strong>Are You SORP Ready?</strong></header>
        <div className="sorp-full-review-building-grid">
          <main><p className="sorp-full-review-building-kicker">✓ Assessment complete</p><h1>{fullReviewEntry === "ready" ? "✓ Your Full Readiness Review is ready." : "Building your Full Readiness Review…"}</h1><ol aria-label="How your review was assembled"><li>Bringing together your answers</li><li>Checking the public evidence</li><li>Comparing your reporting with the relevant SORP requirements</li><li>Identifying strengths and gaps</li><li>Prioritising what matters next</li></ol></main>
          <aside><h2>SORP is the requirement.<br /><em>Better impact is the opportunity.</em></h2><p>For My Social Impact, this isn’t just about compliance.</p><p>Better impact information should help charities understand what is working, learn what isn’t, make better decisions and ultimately create more impact.</p></aside>
        </div>
        <footer><div><strong>Thank you for using Are You SORP Ready?</strong><p>If this has been useful, please share it with another charity. We want to help as many organisations as possible get ready for SORP 2026 — and strengthen their impact practice too.</p></div><div><strong>Built with The Ideas Shed</strong><p>The Ideas Shed creates useful digital tools that help charities and purpose-led organisations do better work. More tools are coming.</p></div></footer>
      </div>
    </div>;
    if (fullReviewEntry === "completion") return <div className="readiness-chat is-full-review-handoff">
      <SorpJourneyProgress current={7} completed={[1, 2, 3, 4, 5, 6]} />
      <div className="sorp-journey-body">
        <aside className="sorp-full-review-handoff-rail"><span>Additional SORP checks</span><strong>6 of 6 complete</strong><p>You’ve worked through the final checks. Your answers and the public evidence are ready for the Full Readiness Review.</p></aside>
        <main className="sorp-full-review-handoff-main" aria-live="polite"><p className="sorp-full-review-handoff-tick">✓ You’ve completed the assessment</p><h1>Brilliant — thank you.</h1><p>We’ve now got your answers, the public evidence we found, and the relevant SORP checks.</p><p>Your Full Readiness Review is nearly ready.</p></main>
      </div>
      <div className="readiness-composer sorp-full-review-handoff-response">
        <div className="sorp-response-utility"><nav className="sorp-bottom-navigation" aria-label="Assessment navigation"><span className="sorp-bottom-utility"><button type="button" className="is-back" onClick={goBack} disabled={!checkpoints.length}>← Back</button><button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span><small className="sorp-save-hint">Save to an account anytime and pick up where you left off.</small></nav></div>
        <section className="sorp-response-fields"><button className="sorp-stage-eight-continue" type="button" onClick={() => setFullReviewEntry("revealing")}>Build my Full Review <span>→</span></button></section>
      </div>
      {saveDialog}
    </div>;
    if (stageEightReportMode) return <div className="readiness-chat is-result-mode">
      <SorpResultActions onSurfaceChange={setReportSurface} sessionId={sessionId} organisation={state.charityName} income={state.setup.income} result={result} impactMode={impactMode} onBackToAssessment={() => { setStageEightReportMode(false); setFullReviewFeedbackStep(false); }}>
        <FinalReadinessReport result={result} impactMode={impactMode} />
        {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
          <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
          <div><p><strong>{intelligence.registry} · {intelligence.effectiveVersion}</strong><span>Published intelligence only · {intelligence.mode === "CURRENT" ? "latest for this new session" : intelligence.mode === "PINNED" ? "pinned for this conversation" : "last known published — Cow Console was temporarily unavailable"}</span></p>{intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · {layer.status.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}{intelligence.runtimeControls.map((control) => <p key={`${control.name}-${control.type}`}><strong>{control.name} · {control.type}</strong><span>Represented by {control.representedBy}</span></p>)}</div>
        </details>}
      </SorpResultActions>
      <div className="sorp-report-conversation">{reviewConversation}<div className="readiness-composer"><div className="sorp-response-utility"><button type="button" onClick={() => { setStageEightReportMode(false); setFullReviewFeedbackStep(false); }}>← Back to assessment</button><button type="button" onClick={() => setSaveDialogOpen(true)}>Save &amp; exit</button><small className="sorp-save-hint">Save to an account anytime and pick up where you left off.</small></div><section className="sorp-response-fields">{reviewChatInput}</section></div></div>
      {saveDialog}
    </div>;
    if (fullReviewFeedbackStep) return <div className="readiness-chat is-full-review-feedback">
      <SorpJourneyProgress current={8} completed={readinessStages.map((_, index) => index + 1)} result />
      <SorpMobilePanes>
        <aside className="sorp-feedback-rail"><span>Assessment complete</span><strong>Your Full Readiness Review is ready.</strong><p>Your detailed personalised report and next actions are just ahead.</p></aside>
        <main className="sorp-feedback-main"><span>One last thing · optional</span><h1>Help us make this better.</h1><p>This tool is free because we want charities to have genuinely useful help with SORP 2026.</p><p>Your feedback helps us improve the questions, explanations and recommendations for the charities that use it after you.</p><p>It takes a few seconds and is completely optional.</p>{reviewConversation}</main>
      </SorpMobilePanes>
      <div className="readiness-composer sorp-stage-eight-response sorp-feedback-response">
        <div className="sorp-response-utility"><nav className="sorp-bottom-navigation" aria-label="Assessment navigation"><span className="sorp-bottom-utility"><button type="button" className="is-back" onClick={() => setFullReviewFeedbackStep(false)}>← Back</button><button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span></nav></div>
        <section className="sorp-response-fields" aria-label="Optional feedback before your full report"><QuickReviewFeedback full value={fullReviewFeedback} comment={fullReviewFeedbackComment} onSelect={recordFullReviewFeedback} onComment={recordFullReviewFeedbackComment} /><details className="sorp-feedback-chat"><summary>Want to ask MSI something first?</summary>{reviewChatInput}</details><button className="sorp-stage-eight-continue" type="button" onClick={() => setStageEightReportMode(true)}>Continue to my full report &amp; next actions <span>→</span></button></section>
      </div>
      {saveDialog}
    </div>;
    return <div className="readiness-chat is-stage-eight">
      <SorpJourneyProgress current={readinessStages.length} completed={Array.from({ length: readinessStages.length - 1 }, (_, index) => index + 1)} result />
      <SorpMobilePanes>
        <FullReviewRail />
        <main className="sorp-stage-eight-main"><header className="sorp-stage-eight-heading"><span>Your Full Readiness Review</span><h1>So — where do you now stand?</h1><p className="sorp-stage-eight-verdict"><strong>{result.score} / 100</strong> · {result.band} <span>Confidence: {result.confidence}</span></p></header><HeadlineReadinessReview result={result} impactMode={impactMode} />{reviewConversation}</main>
      </SorpMobilePanes>
      <div className="readiness-composer sorp-stage-eight-response">
        <div className="sorp-response-utility"><nav className="sorp-bottom-navigation" aria-label="Assessment navigation"><span className="sorp-bottom-utility"><button type="button" className="is-back" onClick={goBack} disabled={!checkpoints.length}>← Back</button><button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span><small className="sorp-save-hint">Save to an account anytime and pick up where you left off.</small></nav></div>
        <section className="sorp-response-fields" aria-label="Respond to your Full Readiness Review"><details className="sorp-feedback-chat"><summary>Want to ask MSI about this review?</summary>{reviewChatInput}</details><button className="sorp-stage-eight-continue" type="button" onClick={() => setFullReviewFeedbackStep(true)}>Continue <span>→</span></button></section>
      </div>
      {saveDialog}
    </div>;
  }

  if (!started && setupOnly) return <section className="readiness-intro">
    <p className="readiness-kicker">SORP 2026<br /><strong>Completely free</strong></p>
    <h1>{setupOnly ? <>A quick route.<br />The right context first.</> : <>Talk it through.<br />Get your free report.</>}</h1>
    <div className="readiness-intro-copy">{setupOnly && <p>We’ll find your organisation and establish what applies, then take you straight to the 15-question snapshot.</p>}<p>You’re about to talk to <strong>My Social Impact Intelligence</strong>: specialist guidance built from MSI’s SORP and social impact expertise.</p><p>First we’ll establish whether SORP 2026 applies, then gather the context and explore your readiness for its narrative and impact-reporting expectations. You’ll see what we know, why we’re asking and the SORP basis as we go.</p><p>At the end, you’ll receive your personalised SORP readiness report. <strong>There is no charge, no card and no surprise paywall.</strong></p></div>
    <div className="readiness-intro-actions"><button type="button" onClick={() => startConversation(false)}>Find my organisation <span>→</span></button></div>
  </section>;

  if (!started) return <div className="readiness-chat sorp-welcome">
    <div className="sorp-welcome-scroll">
      <div className="sorp-welcome-grid">
        <main className="sorp-welcome-story">
          <p className="sorp-welcome-eyebrow">My Social Impact Intelligence · SORP 2026</p>
          <h1>Know where you stand.<br /><em>See what comes next.</em></h1>
          <p className="sorp-welcome-lead">We’ll find and read the public reporting you already have, then talk through what SORP 2026 asks of your charity. You get a useful first view quickly—and a full personalised review when you’re done.</p>
          <p className="sorp-welcome-promise"><strong>Your full assessment and personalised report are free.</strong> No card. No paywall at the end.</p>
          <div className="sorp-welcome-journey" aria-label="How your readiness check works">
            <section><span>01</span><div><h2>We do the homework</h2><p>Your charity record, latest accounts and Trustees’ Annual Report—plus wider impact evidence where available.</p></div></section>
            <section><span>02</span><div><h2>We talk it through</h2><p>A short, intelligent conversation about what the public evidence cannot tell us. Answer quickly, explain in your own words or ask why.</p></div></section>
            <section><span>03</span><div><h2>You get a clear way forward</h2><p>Your SORP readiness review shows what looks strong, what needs attention and what to do next.</p></div></section>
          </div>
        </main>
        <aside className="sorp-welcome-outcome" aria-label="Illustrative preview of your readiness review">
          <div className="sorp-welcome-report">
            <header><span>What you’ll receive</span><small>Illustrative preview — not your result</small></header>
            <div className="sorp-welcome-report-title"><p>My Social Impact</p><h2>Your SORP<br />readiness review.</h2><span>Evidence-led · Personal to your charity</span></div>
            <dl><div className="is-score"><dt>Readiness score</dt><dd>68 <small>/ 100</small></dd><p>Getting there</p></div><div><dt>Evidence confidence</dt><dd>High</dd><p>How strongly the available reporting supports this view</p></div></dl>
            <div className="sorp-welcome-report-findings"><p><span>✓</span><strong>What’s already working</strong><small>Clear purpose and activity reporting</small></p><p><span>△</span><strong>What needs attention</strong><small>Stronger outcome evidence</small></p><p><span>→</span><strong>Top priority</strong><small>Make the link between activities, outcomes and achievements clearer</small></p></div>
            <footer>SORP is the requirement.<br />Better impact reporting is the opportunity.</footer>
          </div>
        </aside>
      </div>
      <section className="sorp-welcome-choices" aria-label="What happens after your free report"><header><span>Yes, it really is free</span><h2>Your report is yours. What comes after is your choice.</h2></header><div className="sorp-welcome-choice-grid"><article><strong>£0</strong><h3>Your full report</h3><p>Complete the assessment and receive your personalised SORP readiness report. No card or paywall.</p></article><article><strong>£50–£200</strong><h3>Optional human review</h3><p>Book a 60-minute SORP 2026 Impact Readiness Review with My Social Impact. Our fee reflects your charity’s income, so smaller charities pay less. If the fee would be difficult, <a href="mailto:marcus@mysocialimpact.org">email us</a> and we’ll talk it through.</p></article><article><strong>£5</strong><h3>Support the free tool</h3><p>If it was useful, you can make a voluntary contribution—or choose another amount—to help us keep improving it for charities.</p></article></div><p>Neither payment option is required to receive your report.</p></section>
    </div>
    <form className="readiness-composer sorp-welcome-composer" onSubmit={(event) => { event.preventDefault(); if (composer.trim()) { setWelcomeQuestionOpen(true); void sendMessage(composer, composer, false, "conversation_first"); } }}>
      <div className="sorp-response-utility"><p>Quick answers + conversation</p><button type="button" className="readiness-sign-in-link" onClick={() => { setAccountMode("login"); setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Already have an account? Sign in</button></div>
      <section className="sorp-response-fields" aria-label="Start or ask a question"><label htmlFor="sorp-welcome-input">GOT A QUESTION FOR US BEFORE YOU START?</label><textarea ref={composerRef} id="sorp-welcome-input" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Type or say what you’d like to know…" maxLength={4000} />{error && !welcomeQuestionOpen && <p className="sorp-welcome-error" role="alert">Sorry, {error}</p>}<div className="sorp-welcome-controls"><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={recordingState === "transcribing" || busy}>{recordingState === "recording" ? `Stop · ${recordingTime(recordingSeconds)}` : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" className="sorp-welcome-ask" disabled={!composer.trim() || busy || recordingState !== "idle"}>Ask question →</button><button type="button" className="sorp-welcome-start" disabled={busy || recordingState !== "idle"} onClick={() => startConversation(false)}>Start my free SORP readiness check <span aria-hidden="true">→</span></button></div></section>
    </form>
    {welcomeQuestionOpen && <div className="sorp-welcome-question-backdrop"><section className="sorp-welcome-question" role="dialog" aria-modal="true" aria-labelledby="sorp-welcome-question-title" onKeyDown={(event) => { if (event.key === "Escape") setWelcomeQuestionOpen(false); }}><header><div><span>My Social Impact Intelligence</span><h2 id="sorp-welcome-question-title">Ask a quick SORP question.</h2><p>Your readiness check won’t start until you choose Start.</p></div><button type="button" aria-label="Close question" onClick={() => setWelcomeQuestionOpen(false)}>Close ×</button></header><div className="sorp-welcome-thread" aria-live="polite">{messages.length ? messages.map((message, index) => <article key={index} className={`readiness-message is-${message.role}`}><span>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</span><MessageContent text={message.content} />{message.organisation && <p><strong>{message.organisation.name}</strong>{message.organisation.locality ? ` · ${message.organisation.locality}` : ""}</p>}{message.actions?.length ? <div className="sorp-welcome-candidates">{message.actions.map((action) => <button type="button" key={action.value} disabled={busy} onClick={() => void sendMessage(action.value, action.label, false, "button_action")}>{action.label} →</button>)}</div> : null}</article>) : <p>Ask about SORP 2026, the check or a charity you have in mind.</p>}{busy && <p role="status">Thinking that through…</p>}</div><form onSubmit={(event) => { event.preventDefault(); if (composer.trim()) void sendMessage(composer, composer, false, "conversation_first"); }}><label htmlFor="sorp-welcome-question-input">Your question</label><textarea id="sorp-welcome-question-input" autoFocus rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Type your question…" maxLength={4000} />{error && <p className="sorp-welcome-error" role="alert">Sorry, {error}</p>}<button type="submit" disabled={!composer.trim() || busy}>Send question <span aria-hidden="true">→</span></button></form></section></div>}
    {saveDialog}
  </div>;

  if (quickReviewFeedbackStep && activeWorkflow?.next.id === "publicReview" && reviewIndex === null && !deepDiveIntroOpen) {
    const quickReviewChatMessages = messages.flatMap((message, index) => message.role === "assistant" && (message.conversation || message.responseKind === "detour") && message.workflow?.next.id === "publicReview"
      ? [...(messages[index - 1]?.role === "user" ? [messages[index - 1]] : []), message]
      : []).slice(-4);
    return <div className="readiness-chat is-quick-review-feedback-step">
      <SorpJourneyProgress current={2} completed={activeWorkflow.completedStages || []} />
      <SorpMobilePanes>
        <aside className="sorp-feedback-rail"><span>Quick Readiness Review</span><strong>Your first readiness view is ready.</strong><p>The deeper review is just ahead.</p></aside>
        <main className="sorp-feedback-main"><span>One quick thing · optional</span><h1>How’s this going?</h1><p>This is a free tool, and your feedback genuinely helps us make it more useful for the charities that come after you.</p>{(quickReviewChatMessages.length > 0 || busy || error) && <section className="sorp-review-conversation" aria-live="polite">{quickReviewChatMessages.map((message, index) => <article key={`${index}-${message.content.slice(0, 24)}`}><small>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</small><MessageContent text={message.content} /></article>)}{busy && <p role="status">{workingStatus}</p>}{error && <p role="alert">{error}</p>}</section>}</main>
      </SorpMobilePanes>
      <div className="readiness-composer sorp-quick-feedback-response">
        <div className="sorp-response-utility"><nav className="sorp-bottom-navigation" aria-label="Assessment navigation"><span className="sorp-bottom-utility"><button type="button" className="is-back" onClick={() => setQuickReviewFeedbackStep(false)}>← Back</button><button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span></nav></div>
        <section className="sorp-response-fields" aria-label="Optional feedback before the deeper review"><QuickReviewFeedback hideIntro value={quickReviewFeedback} comment={quickReviewFeedbackComment} onSelect={recordQuickReviewFeedback} onComment={recordQuickReviewFeedbackComment} /><details className="sorp-feedback-chat"><summary>Want to ask MSI something first?</summary><form className="sorp-review-chat-input" onSubmit={submit}><label htmlFor="readiness-answer">Anything you’d like to ask before you go deeper?</label><textarea ref={composerRef} id="readiness-answer" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Type or say what you’d like to ask…" maxLength={4000} /><div className="readiness-submit-row"><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || recordingState === "transcribing"}>{recordingState === "recording" ? "Stop recording" : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button><button type="submit" disabled={busy || composer.trim().length < 2 || recordingState !== "idle"}>{busy ? "Understanding…" : "Send message"} <span>→</span></button></div></form></details><button className="sorp-stage-eight-continue" type="button" disabled={busy || recordingState !== "idle"} onClick={() => { setQuickReviewFeedbackStep(false); setDeepDiveIntroOpen(true); }}>Go deeper <span>→</span></button></section>
      </div>
      {saveDialog}
    </div>;
  }

  return <div className="readiness-chat">
    <SorpJourneyProgress current={progressCurrentStage} completed={progressCompletedStages} result={Boolean(result && reviewIndex === null)} />

    <SorpMobilePanes>
    <aside className="sorp-journey-aside">
      {activeWorkflow && <SorpStageContext workflow={activeWorkflow} state={reviewCheckpoint?.state || state} impactReportConfirmed={state.impactReportConfirmation === "confirmed"} impactReportUploaded={state.impactReportInput === "uploaded"} accountEmail={account?.email} organisation={contextMessage?.organisation} publicSources={contextMessage?.publicSources} />}
      {!contextMessage?.organisation && !activeWorkflow?.known.some((item) => item.established) && currentStage === 1 && <section className="sorp-context-intro"><span>What we’re going to do</span><h2>We’ll do the public homework first.</h2><p>We’ll use public information to do as much of the work as possible for you. We’ll look for your charity record, accounts and Trustees’ Annual Report, establish the SORP context, then give you a Quick Readiness Review.</p><small>Completely free · No card required</small></section>}
    </aside>

    <div className="readiness-thread" aria-live="polite">
      {setupOnly && workflow?.completedStages.includes(2) && <button type="button" className="sorp-setup-continue" onClick={() => onSetupComplete?.(state, workflow)}>✓ Context established — continue to the 15 questions →</button>}
      {reviewCheckpoint && <section className="sorp-reviewing-answer" aria-live="polite"><span>Reviewing saved question {reviewIndex! + 1} of {checkpoints.length}</span><strong>{reviewCheckpoint.answerText || "Saved answer"}</strong>{reviewCheckpoint.note && <p>{reviewCheckpoint.note}</p>}<small>{activeWorkflow?.next.id.match(/^(?:field:\d+|check:)/) ? "Choose another quick answer below to change this. Your later answers will be kept." : "This answer and its conversation are preserved exactly as supplied."}</small></section>}
      {activeMessages.length > 1 && <details className="sorp-conversation-history"><summary>Our conversation up to this question <span>{activeMessages.filter(message => message.role === "user").length} replies</span></summary>{activeMessages.slice(0, -1).map((message, index) => <article key={index}><small>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</small><MessageContent text={message.content} />{message.organisation && <strong>{message.organisation.name} · {message.organisation.locality}</strong>}</article>)}</details>}
      {completionNotice && !isStageOnePayoff && <p className="sorp-completion-notice" role="status">{completionNotice}</p>}
      {activeMessages.map((message, index) => index === activeMessages.length - 1 && <article id="readiness-current-question" key={`${index}-${message.content.slice(0, 24)}`} className={`readiness-message is-${message.role}${(message.conversation || message.responseKind === "detour") ? " is-detour" : ""}`}>
        <span>{message.role === "user" ? "You" : "My Social Impact Intelligence"}</span>
        {message.label && (message.conversation || message.responseKind === "detour") && <strong className={`readiness-label is-${message.label.toLowerCase().replace(" ", "-")}`}>{message.label === "JUDGEMENT" ? "MSI JUDGEMENT" : message.label}</strong>}
        {(message.conversation || message.responseKind === "detour") ? <div><MessageContent text={message.content} /></div> : deepDiveIntroOpen && responseQuestionId === "publicReview" ? <DeepDiveIntroduction /> : message.workflow?.next.id !== "publicSearchCheckpoint" && (message.workflow?.next.id === "publicReview" && message.workflow.next.provisional?.trusteesReport.reviewed
          ? <QuickReviewExplanation review={message.workflow.next.provisional} onReplaceImpactReport={() => selectStructuredAnswer("No — I have a newer Impact Report")} />
          : <div><MessageContent text={message.organisation ? "I think I’ve found you." : message.content} /></div>)}
        {message.role === "assistant" && !(message.conversation || message.responseKind === "detour") && message.workflow && (/^field:\d+/.test(message.workflow.next.id) || message.workflow.next.id.startsWith("check:") && message.workflow.currentStage !== 7) && <DeepDiveQuestionContext workflow={message.workflow} />}
        {message.role === "assistant" && !(message.conversation || message.responseKind === "detour") && message.workflow?.currentStage === 7 && /^(?:screen:|check:)/.test(message.workflow.next.id) && <section className="sorp-stage-seven-context"><p>{message.workflow.next.why}</p><SorpBasisDrawer basis={message.workflow.next.basis} /></section>}
        {!(message.conversation || message.responseKind === "detour") && message.workflow?.next.id === "publicSearchCheckpoint" && <><PublicSearchCheckpoint workflow={message.workflow} impactReportMissing={impactReportMissingAtPayoff} uploadedReport={state.impactReportInput === "uploaded" ? completionNotice.match(/^✓ IMPACT REPORT ADDED · (.+)$/)?.[1] || "" : ""} />{impactReportMissingAtPayoff && <ImpactReportUploader onChoose={chooseReportFile} dragging={reportDragging} onDragEnter={(event) => { event.preventDefault(); setReportDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setReportDragging(false); }} onDragOver={(event) => { event.preventDefault(); setReportDragging(true); }} onDrop={dropReport} busy={busy} />}</>}
        {message.organisation && <div className="sorp-mobile-organisation"><strong>{message.organisation.name}</strong><p>{message.organisation.locality}</p></div>}
        {message.organisation && !(message.conversation || message.responseKind === "detour") && <p className="sorp-confirm-question">Is this the right organisation?</p>}
        {(message.conversation || message.responseKind === "detour") && message.citations?.length ? <SorpBasisDrawer basis={{classification: message.label || "MSI JUDGEMENT", explanation: "The SORP passages relevant to your question.", citations: message.citations}} /> : null}
        {!message.organisation && message.publicSources?.length ? <details><summary>Sources</summary><div>{message.publicSources.map((source) => <article key={`${source.url}-${source.detail}`}><strong>{sourceKindLabel(source.kind)} · {source.label}</strong>{source.detail && <p>{source.detail}</p>}<a href={source.url}>View source <span>→</span></a></article>)}</div></details> : null}
      </article>)}
      {busy && <article className="readiness-message is-assistant is-loading" role="status" aria-live="polite"><span>My Social Impact Intelligence</span><div><p>{workingStatus}</p></div></article>}
      {error && <div className="readiness-error" role="alert"><strong>That step did not complete.</strong><p>{error}</p><button type="button" onClick={() => { setError(""); composerRef.current?.focus(); }}>Try again</button></div>}
      {intelligence && <details className="readiness-intelligence" aria-label="Effective intelligence provenance">
        <summary>{intelligence.layers.filter((layer) => layer.id === "msi-core" || layer.id === "sorp-readiness-intelligence").map((layer) => `${intelligenceLayerLabel(layer)} · ${layer.label}`).join(" · ")}</summary>
        <div>
          <p><strong>{intelligence.registry} · {intelligence.effectiveVersion}</strong><span>Published intelligence only · {intelligence.mode === "CURRENT" ? "latest for this new session" : intelligence.mode === "PINNED" ? "pinned for this conversation" : "last known published — Cow Console was temporarily unavailable"}</span></p>
          {intelligence.layers.map((layer) => <p key={`${layer.id}-${layer.version}`}><strong>{intelligenceLayerLabel(layer)} · {layer.label}</strong><span>{layer.relationship.toLowerCase()} · {layer.status.toLowerCase()} · published {layer.publishedAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(layer.publishedAt)) : "date unavailable"}</span></p>)}
          {intelligence.runtimeControls.map((control) => <p key={`${control.name}-${control.type}`}><strong>{control.name} · {control.type}</strong><span>Represented by {control.representedBy}</span></p>)}
        </div>
      </details>}
      <div ref={threadEndRef} />
    </div>

    </SorpMobilePanes>
    <form className={`readiness-composer${activityQuestion ? " is-activity-composer" : ""}${activitySelectionCount ? " has-activity-selections" : ""}${reviewIndex !== null ? " is-reviewing" : ""}${isStageOnePayoff ? " is-stage-one-payoff" : ""}${isQuickReviewResponse ? " is-quick-review-response" : ""}`} onSubmit={submit}>
      <input ref={reportInputRef} type="file" accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadReport(file); }} />
      <div className="sorp-response-utility">
      <nav className="sorp-bottom-navigation" aria-label="Assessment navigation">
        <span className="sorp-bottom-utility"><button type="button" className="is-back" aria-label={deepDiveIntroOpen ? "Back to Quick Readiness Review" : "Back to previous question"} onClick={goBack} disabled={(!deepDiveIntroOpen && !checkpoints.length) || busy || quickAdvancing || recordingState !== "idle"}>← Back</button>
        <button type="button" className="is-save" onClick={() => { setSaveStatus("idle"); setSaveError(""); setSaveDialogOpen(true); }}>Save &amp; exit</button></span>
        <small className="sorp-save-hint">Save to an account anytime and pick up where you left off.</small>
        {reviewIndex !== null && <button type="button" className="is-next" onClick={goNext}>{reviewIndex < checkpoints.length - 1 ? "Next →" : result ? "Return to my report →" : "Return to current question →"}</button>}
      </nav>
      </div>
      <section className="sorp-response-fields" aria-label="Respond to MSI Intelligence">
      {showResponseActions && !isQuickReviewResponse && <nav className={`readiness-message-actions${/^(?:screen:|check:)/.test(responseQuestionId) && currentStage === 7 ? " is-stage-seven-choices" : /^(?:field:\d+|check:)/.test(responseQuestionId) ? " is-assessment-scale" : ""}${responseQuestionId === "activities" ? " is-multi-select" : ""}`} aria-label={responseQuestionId === "activities" ? "Choose all activities that apply" : /^(?:screen:|field:\d+|check:)/.test(responseQuestionId) ? "Choose a quick answer" : "Choose an answer"}>{orderedResponseActions.map((action) => {
        const selected = responseQuestionId === "activities" ? activitySelections.includes(action.value) : activeQuickAction?.value === action.value;
        const saved = !activeQuickAction && reviewCheckpoint?.answerText?.toUpperCase().startsWith(action.label.toUpperCase().replace(/^KEEP\s+/, ""));
        const label = displayedAnswerLabel(action.label);
        const suggested = Boolean(suggestedAnswer && label.toUpperCase() === answerLabels[suggestedAnswer]);
        return <button aria-pressed={responseQuestionId === "activities" || isReadinessScale ? Boolean(selected || saved) : saved || undefined} aria-label={suggested ? `${label} — MSI suggested answer` : undefined} className={[label === "SKIP FOR NOW" ? "is-skip" : "", suggested ? "is-suggested" : "", selected || saved ? "is-selected" : ""].filter(Boolean).join(" ") || undefined} key={`${action.label}-${action.value}`} type="button" disabled={busy || quickAdvancing} onClick={() => selectStructuredAnswer(action.value, action.label)}><span className="sorp-action-label">{label}{suggested && <small>OUR VIEW</small>}</span><span aria-hidden="true">{selected || saved ? "✓" : "→"}</span></button>;
      })}</nav>}
      {responseQuestionId === "impactReportLink" && <ImpactReportUploader onChoose={chooseReportFile} dragging={reportDragging} onDragEnter={(event) => { event.preventDefault(); setReportDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setReportDragging(false); }} onDragOver={(event) => { event.preventDefault(); setReportDragging(true); }} onDrop={dropReport} busy={busy} />}
      {responseQuestionId === "activities" && <p className="sorp-multi-select-help"><strong>Choose all that apply.</strong><span>Select more than one if needed, then add a little detail below if it would help.</span></p>}
      <label htmlFor="readiness-answer" aria-live="polite">{isQuickReviewResponse ? "ANYTHING YOU’D LIKE TO ADD OR ASK BEFORE YOU GO DEEPER?" : isStageOnePayoff ? "ANYTHING YOU’D LIKE TO ADD, CLARIFY OR ASK BEFORE YOU SEE YOUR QUICK REVIEW?" : isReadinessScale ? "WANT TO ADD ANYTHING, OR FANCY A QUICK CHAT BEFORE YOU SUBMIT THIS ANSWER?" : `Or tell us in your own words — or ask ${impactMode ? "an impact" : "a SORP"} question.`}</label>
      <textarea ref={composerRef} id="readiness-answer" rows={2} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder={activityQuestion ? "Add detail—or ask us why this matters…" : pendingStructuredAnswer ? "Add an optional note…" : "Type or say what you know…"} maxLength={4000} />
      <div className="readiness-submit-row"><button type="button" className="readiness-mic" onClick={recordingState === "recording" ? stopRecording : () => void startRecording()} disabled={busy || quickAdvancing || recordingState === "transcribing"}>{recordingState === "recording" ? `Stop · ${recordingTime(recordingSeconds)}` : recordingState === "transcribing" ? "Transcribing…" : "Use microphone"}</button>{(!(isStageOnePayoff || isQuickReviewResponse) || composer.trim().length >= 2) && <button type="submit" className={isQuickReviewResponse ? "sorp-quick-review-chat-send" : busy || quickAdvancing ? "is-working" : undefined} disabled={busy || quickAdvancing || (!isReadinessScale && !pendingStructuredAnswer && !(activityQuestion && activitySelections.length) && composer.trim().length < 2) || isReadinessScale && !activeQuickAction && !suggestedQuickAction && !composer.trim() || recordingState !== "idle"}>{busy ? "Understanding…" : quickAdvancing ? "Saving…" : isStageOnePayoff || isQuickReviewResponse ? "Send message" : isReadinessScale ? "Continue" : reviewIndex !== null ? "Save revised answer" : conversationFirstMessage ? "Send message" : activityQuestion && activitySelections.length ? "Continue with choices" : result ? "Keep talking" : "Continue"} <span>→</span></button>}{isQuickReviewResponse && <button type="button" disabled={busy || quickAdvancing || recordingState !== "idle" || reviewIndex !== null} onClick={() => setQuickReviewFeedbackStep(true)}>Continue <span>→</span></button>}</div>
      </section>
    </form>
    {saveDialog}
  </div>;
}
