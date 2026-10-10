"use client";

import { useState } from "react";
import type { Lens } from "./sorp-public-model";
import { assessmentExample, completedEvent } from "./sorp-journey-progress";
import { useReportEvents, SuccessMark } from "./sorp-homework-experience";

const labels: Record<string, string> = { yes: "Clearly evidenced", mostly: "Mostly evidenced", partly: "Partly evidenced", limited: "Limited evidence", not_yet: "Not yet evidenced", not_sure: "Not yet known", not_applicable: "Not applicable" };
const chapters = ["The question", "The evidence", "The conditions", "The answer"];

export function SorpAssessmentExperience({ lens, waiting, sessionId, startedAt, onReady, resumed }: { lens: Lens | null; waiting: boolean; sessionId: string; startedAt: number; onReady: () => void; resumed: boolean }) {
  const { events, elapsed } = useReportEvents(sessionId, waiting, startedAt);
  const [chapter, setChapter] = useState(0);
  const [finished, setFinished] = useState(resumed);
  const example = assessmentExample(lens);
  const trail = example?.assessmentTrail;
  const quote = trail?.evidence.filter(item => item.excerpt.trim().length >= 40 && item.excerpt.length <= 650 && Number.isInteger(item.page) && item.page > 0 && item.page <= (lens?.diagnostics?.pageCount || 0)).sort((a, b) => a.excerpt.length - b.excerpt.length)[0];
  const current = events.at(-1);
  const evidenceReady = events.some(event => event.stage === "requirement-matching" && completedEvent(event));
  return <div className={`sj-journey sj-assessment ${lens ? "is-assessed" : ""} ${finished ? "is-finished" : ""}`}>
    <div className="sj-eyebrow"><span>ASSESSMENT</span><span>{lens ? "19 OF 19 ASSESSED" : "19 QUESTIONS · ONE APPROVED METHODOLOGY"}</span></div>
    <header className="sj-heading"><h1>{finished ? "Your historical\nsnapshot is ready." : lens ? "Here’s how we\nreached one answer." : "From published words\nto a clearer picture."}</h1><p>{lens ? "Assessment complete. Follow one real question through your report’s evidence and the approved decision rules." : waiting ? "Your report is read and validated. We’re now assessing what its evidence demonstrates." : "Your validated report is saved. Resume the assessment when you’re ready."}</p></header>
    <div className="sj-question-map" aria-label={lens ? "All 19 questions assessed" : "The 19 questions being assessed; completion not yet confirmed"}>{Array.from({ length: 19 }, (_, index) => <span key={index} className={lens ? example?.fieldId === index + 1 ? "is-example" : "is-complete" : ""}>{lens ? example?.fieldId === index + 1 ? String(index + 1).padStart(2, "0") : "✓" : String(index + 1).padStart(2, "0")}</span>)}</div>
    {!lens ? <div className="sj-assessment-wait"><div className="sj-evidence-orbit" aria-hidden="true"><span>19</span><small>SORP QUESTIONS</small></div><div><p className="sj-kicker">{evidenceReady ? "EVIDENCE MATCHED" : "APPLYING THE METHODOLOGY"}</p><h2>{evidenceReady ? "Checking what the evidence establishes." : "Every answer starts with your report."}</h2><p role="status">{current?.message || (waiting ? "Matching the validated report to the approved SORP questions. A completed-question count is not available yet." : "Select Resume assessment below. We have not started a new assessment request.")}</p>{waiting && elapsed > 60000 && <p>We’re sorry this is taking longer. Your validated document is saved; the assessment has not finished yet.</p>}<p className="sj-footnote">MUST: required · SHOULD: recommended · MAY: optional</p></div></div> : trail && quote && example ? <>
      <div className="sj-chapters" aria-label="Explanation steps">{chapters.map((label, index) => <button key={label} type="button" className={index === chapter ? "is-current" : index < chapter ? "is-seen" : ""} aria-current={index === chapter ? "step" : undefined} onClick={() => { setChapter(index); setFinished(false); }}><span>0{index + 1}</span>{label}</button>)}</div>
      <div className="sj-example" key={chapter}>
        <div className="sj-example-question"><p className="sj-kicker">QUESTION {example.fieldId} OF 19 · {example.classification}</p><h2>{trail.sorpTest.requirement}</h2><p className="sj-footnote">SORP {trail.sorpTest.references.join(" · ")}</p></div>
        <div className="sj-example-detail" role="status" aria-atomic="true">
          {chapter === 0 && <><span className="sj-large-step">01</span><h3>One question. A traceable answer.</h3><p>This is the actual question applied to your published report. Follow the quotation, the conditions it establishes and the final answer.</p></>}
          {chapter === 1 && <><p className="sj-kicker">EXACT PUBLISHED EVIDENCE · PDF PAGE {quote.page}</p><blockquote>“{quote.excerpt}”</blockquote>{trail.source.url.startsWith("https://") && <a href={`${trail.source.url.split("#")[0]}#page=${quote.page}`} target="_blank" rel="noreferrer">Read this PDF page ↗</a>}<p className="sj-footnote">{trail.source.document} · {trail.source.reportingPeriod || "Period not stated"}</p></>}
          {chapter === 2 && <><p className="sj-kicker">THE APPROVED CONDITIONS</p><ol className="sj-conditions">{trail.propositions.map(proposition => <li key={proposition.id}><span aria-hidden="true">{proposition.state === "established" ? "✓" : "—"}</span><div>{proposition.condition}<small>{proposition.state === "established" ? "Established in the cited evidence" : proposition.state === "not_established" ? "Not established in the report" : "Not yet known"}{proposition.evidenceIds.includes(quote.id) ? ` · includes page ${quote.page}` : ""}</small></div></li>)}</ol><p className="sj-footnote">The complete evidence trail may cite other passages. Missing evidence does not prove the practice is absent.</p></>}
          {chapter === 3 && <><p className="sj-kicker">THE ACTUAL ASSESSMENT RESULT</p><div className="sj-answer"><SuccessMark/><h3>{labels[example.answer]}</h3></div><p>{trail.why}</p><p className="sj-footnote">{trail.whyNotHigher}</p><p className="sj-footnote">This answer reflects what the published report demonstrates. You’ll tell us about current practice next.</p></>}
        </div>
      </div>
      <div className="sj-playback"><button type="button" disabled={chapter === 0} onClick={() => { setChapter(value => Math.max(0, value - 1)); setFinished(false); }}>← PREVIOUS</button><span>{finished ? "Explanation complete. Your snapshot is ready." : `Read at your own pace · ${chapter + 1} of ${chapters.length}`}</span><button type="button" onClick={() => { if (chapter < chapters.length - 1) setChapter(value => value + 1); else { setFinished(true); onReady(); } }}>{chapter < chapters.length - 1 ? "NEXT →" : "FINISH EXPLANATION ✓"}</button></div>
    </> : <div className="sj-no-example"><SuccessMark/><h2>Your assessment is complete.</h2><p>No single concise evidence example met the validation checks for this walkthrough. You can inspect all 19 assessment trails in your Historical Snapshot.</p></div>}
  </div>;
}
