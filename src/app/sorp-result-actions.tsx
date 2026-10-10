"use client";
/* Result tracking is intentionally tied to report lifecycle milestones. */
/* eslint-disable react-hooks/exhaustive-deps */

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { trackSorpEvent } from "./sorp-growth";
import { supportPence, type SupportChoice } from "./sorp-payment-amounts";

type ReviewBand = "small" | "medium" | "large";
type Choice = "review" | "support" | "free" | null;
type Role = "" | "Trustee" | "CEO" | "Employee" | "Adviser" | "Other";
type ReportResult = {
  score: number; band: string; confidence: "HIGH" | "MEDIUM" | "LOW"; overview: string;
  sectionScores: { section: string; label: string; score: number; narrative: string }[];
  strong: string[]; attention: string[]; must: string[]; should: string[]; may: string[]; judgement: string[];
  additionalChecks: string[]; trusteesReportReadiness: string[]; widerImpactEvidence: string[]; userConfirmedPractice: string[]; priorities: string[];
};

const reviewBands: Array<{ id: ReviewBand; label: string; income: string; amount: number }> = [
  { id: "small", label: "Small charity", income: "Up to £500,000 income", amount: 50 },
  { id: "medium", label: "Medium charity", income: "£500,000–£15 million income", amount: 100 },
  { id: "large", label: "Large charity", income: "Over £15 million income", amount: 200 },
];

function suggestedBand(income: string): ReviewBand {
  if (income === "tier2") return "medium";
  if (income === "tier3") return "large";
  return "small";
}

export function SorpResultActions({ sessionId, organisation, income, result, impactMode, children, onBackToAssessment, onSurfaceChange }: { sessionId: string; organisation: string; income: string; result: ReportResult; impactMode: boolean; children: ReactNode; onBackToAssessment: () => void; onSurfaceChange?: (surface: "full_report" | "next_actions") => void }) {
  const storageKey = `msi-sorp-report-mode:${sessionId}`;
  const [choice, setChoice] = useState<Choice>(null);
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => { onSurfaceChange?.(reportOpen ? "full_report" : "next_actions"); }, [reportOpen, onSurfaceChange]);
  const [band, setBand] = useState<ReviewBand>(() => suggestedBand(income));
  const [supportChoice, setSupportChoice] = useState<SupportChoice>(5);
  const [customSupport, setCustomSupport] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [emailError, setEmailError] = useState("");
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [emailedFile, setEmailedFile] = useState("");
  const reportRef = useRef<HTMLElement>(null);
  const actionEmailRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);
  const chosenBand = reviewBands.find((item) => item.id === band)!;
  const tier = band === "small" ? "Tier 1" : band === "medium" ? "Tier 2" : "Tier 3";
  const finalSupportMinor = supportPence(supportChoice, customSupport);
  const contactHref = `mailto:marcus@marcuswarry.com?subject=${encodeURIComponent(`SORP readiness conversation — ${organisation || "your organisation"}`)}`;
  function trackResult(eventType: string, extras: { paymentType?: string; band?: string; amountMinor?: number; currency?: string } = {}, once = true) {
    return trackSorpEvent(sessionId, eventType, { organisation, charityTier: tier, readinessScore: result.score, evidenceConfidence: result.confidence, currentStage: 8, ...extras }, once);
  }

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as { reportOpen?: boolean; choice?: Choice } | null;
        if (saved?.reportOpen) setReportOpen(true);
        if (saved?.choice) setChoice(saved.choice);
      } catch { /* A damaged local preference should not block the free report. */ }
    });
    void trackResult("assessment_completed");
    void trackResult("result_preview_viewed");
  }, [sessionId, storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ reportOpen, choice })); } catch { /* The report remains available in the current tab. */ }
    if (reportOpen) {
      void trackResult("report_opened");
      window.setTimeout(() => reportRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 80);
    }
  }, [choice, reportOpen, sessionId, storageKey]);

  useEffect(() => {
    if (emailPanelOpen) actionEmailRef.current?.focus({ preventScroll: true });
  }, [emailPanelOpen]);

  function openReport(nextChoice: Exclude<Choice, null>, eventType: "human_review_selected" | "support_selected" | "free_report_selected") {
    setChoice(nextChoice);
    setReportOpen(true);
    setError("");
    setIdempotencyKey("");
    void trackResult(eventType, nextChoice === "review" ? { paymentType: "human_review", band } : nextChoice === "support" ? { paymentType: "voluntary_support", band: "none" } : {});
  }

  function showReview() {
    openReport("review", "human_review_selected");
    window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function showSupport(custom = false) {
    setSupportChoice(custom ? "other" : 5);
    setCustomSupport("");
    openReport("support", "support_selected");
    window.setTimeout(() => supportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  async function checkout(paymentType: "human_review" | "voluntary_support") {
    const amountMinor = paymentType === "human_review" ? chosenBand.amount * 100 : finalSupportMinor;
    if (amountMinor === null) { setError("Sorry — please enter a GBP amount between £1 and £1,000, with no more than two decimal places."); return; }
    setBusy(true); setError("");
    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    const startedEvent = paymentType === "human_review" ? "human_review_payment_started" : "support_payment_started";
    void trackResult(startedEvent, { paymentType, band: paymentType === "human_review" ? band : "none", amountMinor, currency: "GBP" }, false);
    try {
      const response = await fetch("/api/sorp-payments/checkout", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentType, band: paymentType === "human_review" ? band : null, amountMinor, sessionId, organisation, idempotencyKey: key }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "We could not open secure checkout just now.");
      window.location.assign(data.url);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "We could not open secure checkout just now.";
      setError(`Sorry — ${detail} No payment was taken. Please try again shortly.`);
      setBusy(false);
    }
  }

  async function sendReport(event: FormEvent) {
    event.preventDefault();
    setEmailError(""); setEmailState("sending");
    try {
      const response = await fetch("/api/readiness/report-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, email, role, organisation, result, impactMode }) });
      const data = await response.json() as { ok?: boolean; attachment?: string; error?: string };
      if (!response.ok || !data.ok || !data.attachment?.endsWith(".pdf")) throw new Error(data.error || "The full PDF attachment could not be confirmed. Please try again.");
      setEmailedFile(data.attachment);
      setEmailState("sent");
      setEmailPanelOpen(false);
      void trackResult("report_emailed");
    } catch (caught) {
      setEmailState("idle");
      setEmailError(caught instanceof Error ? caught.message : "We could not send your report just now.");
    }
  }

  const reviewPanel = <div ref={reviewRef} id="human-review" className="readiness-checkout-panel">
    <div><span>Human review · £{chosenBand.amount}</span><h4>SORP 2026 Impact Readiness Review</h4><p>We review your assessment and relevant reporting before the meeting, discuss the important gaps and judgement areas, and provide short written priorities afterwards.</p><ul><li>Assessment review</li><li>Latest Trustees’ Annual Report</li><li>Impact Report or Annual Review, if supplied</li><li>60-minute discussion</li><li>Strengths, gaps and judgement areas</li><li>Three priority actions</li><li>Short written summary</li></ul></div>
    <fieldset><legend>Charity size</legend>{reviewBands.map((item) => <label key={item.id} className={band === item.id ? "is-selected" : ""}><input type="radio" name="review-band" checked={band === item.id} onChange={() => { setBand(item.id); setIdempotencyKey(""); }} /><span><b>{item.label}</b><small>{item.income}</small></span><strong>£{item.amount}</strong></label>)}</fieldset>
    <p className="readiness-review-credit">If we subsequently work together on a My Social Impact project, we’ll credit the cost of your review against that work. There is no obligation to buy anything afterwards.</p>
    <button className="readiness-pay-button" type="button" disabled={busy} onClick={() => void checkout("human_review")}>{busy ? "OPENING SECURE CHECKOUT…" : `BOOK MY HUMAN REVIEW — £${chosenBand.amount}`} <span>→</span></button>
    {error && <p className="readiness-payment-error" role="alert">{error}</p>}
    <p className="readiness-payment-note">One-off payment through Stripe. Your email is collected securely in checkout. Cost genuinely a barrier? Email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>.</p>
  </div>;

  const supportPanel = <div ref={supportRef} className="readiness-checkout-panel is-support">
    <div><span>Voluntary contribution</span><h4>Support the free tool</h4><p>Help us keep improving this and building useful free tools for charities. Payment is entirely optional and your report is already open below.</p></div>
    <div className="readiness-support-selection"><div className="readiness-support-amounts" aria-label="Choose a voluntary support amount">{([5, 10, 20] as const).map((amount) => <button type="button" aria-pressed={supportChoice === amount} className={supportChoice === amount ? "is-selected" : ""} key={amount} onClick={() => { setSupportChoice(amount); setCustomSupport(""); setError(""); setIdempotencyKey(""); }}>£{amount}</button>)}<button type="button" aria-pressed={supportChoice === "other"} className={supportChoice === "other" ? "is-selected" : ""} onClick={() => { setSupportChoice("other"); setError(""); setIdempotencyKey(""); }}>Other amount</button></div>{supportChoice === "other" && <label className="readiness-support-custom" htmlFor="sorp-custom-support"><span>Amount in GBP</span><span className="readiness-support-custom-input"><b>£</b><input id="sorp-custom-support" aria-label="Other support amount in pounds" type="text" inputMode="decimal" autoComplete="off" placeholder="11.00" value={customSupport} onChange={(event) => { setCustomSupport(event.target.value); setError(""); setIdempotencyKey(""); }} /></span><small>£1–£1,000 · up to two decimal places</small></label>}</div>
    <button className="readiness-pay-button" type="button" disabled={busy} onClick={() => void checkout("voluntary_support")}>{busy ? "OPENING SECURE CHECKOUT…" : finalSupportMinor === null ? "ENTER AN AMOUNT TO CONTINUE" : `CONTRIBUTE £${(finalSupportMinor / 100).toFixed(finalSupportMinor % 100 ? 2 : 0)} SECURELY`} <span>→</span></button>
    {error && <p className="readiness-payment-error" role="alert">{error}</p>}
    <p className="readiness-payment-note">This is optional support for the free tool.</p>
  </div>;

  const postReportChoices = <section className="sorp-value-choice sorp-post-report-choices" aria-labelledby="sorp-next-actions-title">
    <header><span>Optional next steps</span><h2 id="sorp-next-actions-title">What would you like to do next?</h2><p>Your report is yours. If you’d like human judgement or want to help keep this tool free, those options are here when you need them.</p></header>
    <div className="sorp-value-choice-grid is-post-report">
      <article>
        <span>Human review</span><h3>Talk it through — £{chosenBand.amount}</h3>
        <p className="sorp-choice-tier">{tier} charity</p>
        <p className="sorp-choice-price-note">£{chosenBand.amount} because your charity falls within SORP {tier}.</p>
        <p>60 minutes with Marcus Warry, Chartered Accountant and social impact consultant.</p>
        <p>We’ll review the judgement areas, gaps and priorities with you and help you decide what actually needs doing.</p>
        <details className="sorp-choice-included"><summary>What’s included? <span aria-hidden="true">+</span></summary><ul><li>Review of your assessment and relevant reporting</li><li>Discussion of judgement areas</li><li>Strengths and gaps</li><li>Three priority actions</li><li>Short written summary</li><li>Fee credited against any subsequent MSI project work</li></ul></details>
        <p className="sorp-choice-affordability">Cost genuinely a barrier? Email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>. We don’t want cost to stop a charity getting useful help.</p>
        <div className="sorp-choice-actions"><button type="button" onClick={showReview}>Book my review <b>→</b></button></div>
      </article>
      <article>
        <span>Voluntary contribution</span><h3>Support the free tool — £5</h3>
        <p>If this has been useful, £5 genuinely helps us keep improving it and building more free tools for charities.</p>
        <div className="sorp-choice-actions"><button className="is-text" type="button" onClick={() => showSupport(true)}>Choose another amount</button><button type="button" onClick={() => showSupport(false)}>Chuck in £5 <b>→</b></button></div>
      </article>
    </div>
  </section>;

  return <main className={`sorp-completion-flow${reportOpen ? " is-report-open" : ""}`}>
    {!reportOpen && <section className="sorp-report-bridge" aria-labelledby="sorp-report-bridge-title">
      <header className="sorp-bridge-opening"><span>Assessment complete</span><h1 id="sorp-report-bridge-title">You’ve completed your SORP readiness assessment.</h1><p>Your full personalised report is ready.</p></header>
      <section className="sorp-bridge-belief" aria-label="My Social Impact philosophy"><span>The bigger picture</span><h2>SORP is the requirement.<br /><em>Better impact is the opportunity.</em></h2></section>
      <section className="sorp-bridge-vision"><div><span>Why we exist</span><h2>Imagine a world where social impact was taken as seriously as financial performance.</h2></div><p>SORP asks charities to report better. The bigger opportunity is to understand what they are trying to change, gather useful evidence, learn what works, make better decisions, improve delivery and communicate impact with confidence.</p></section>
      <section className="sorp-bridge-practice"><span>That’s what My Social Impact does.</span><h2>We help charities turn clearer reporting into stronger impact practice.</h2><p>Purpose <b aria-hidden="true">→</b> Evidence <b aria-hidden="true">→</b> Learning <b aria-hidden="true">→</b> Better decisions <b aria-hidden="true">→</b> Better impact</p></section>
      <section className="sorp-bridge-human"><span>Where people matter</span><h2>Some questions need more than a mechanical answer.</h2><p>Your report may highlight incomplete evidence, SORP judgement calls or opportunities to strengthen how you work. Sometimes a good conversation is the useful next step. After you’ve seen your report, you can choose to talk it through with My Social Impact if you’d like human help.</p></section>
      <footer className="sorp-bridge-finish"><div><span>Your report comes first</span><h2>Your full report is free.</h2><p>No card. No paywall. See your report first.</p></div><button type="button" onClick={() => openReport("free", "free_report_selected")}>View my full report <span aria-hidden="true">→</span></button></footer>
    </section>}
    {reportOpen && <section className="sorp-report-mode" ref={reportRef}>
      <button type="button" className="sorp-back-to-assessment is-on-report" onClick={onBackToAssessment}>← Back to assessment</button>
      <header className="sorp-report-mode-header">
        <div className="sorp-report-hero-copy"><span>Your assessment is complete</span><h1>Your SORP Readiness Report</h1><p className="sorp-report-organisation">{organisation || "Your charity"}</p><p className="sorp-report-conclusion">{result.overview}</p></div>
        <div className="sorp-report-hero-result"><strong>{result.score}<small> / 100</small></strong><b>{result.band}</b><span>Confidence: {result.confidence}</span><button type="button" onClick={() => window.print()}>Print / save PDF ↗</button></div>
      </header>
      <div className="sorp-full-report">{children}</div>
      <section className="sorp-report-email" aria-labelledby="sorp-report-email-title"><div><span>Keep your report</span><h2 id="sorp-report-email-title">Keep your report</h2><p>Want the full report as a PDF in your inbox?</p><small>Your full report is already open and free. Email is optional.</small></div>{emailState === "sent" ? <p className="sorp-report-email-success" role="status">✓ Your full report PDF ({emailedFile}) has been emailed to {email}.</p> : <form onSubmit={sendReport}><label htmlFor="sorp-report-email">Email address<input id="sorp-report-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" /></label><label htmlFor="sorp-report-role">Your role — optional<select id="sorp-report-role" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="">Prefer not to say</option><option>Trustee</option><option>CEO</option><option>Employee</option><option>Adviser</option><option>Other</option></select></label><button type="submit" disabled={emailState === "sending"}>{emailState === "sending" ? "Sending full PDF…" : "Email my report"} <span>→</span></button>{emailError && <p role="alert"><strong>Sorry — we couldn’t email your full PDF report just now.</strong> {emailError} Your report is still available here; please try again.</p>}</form>}</section>
      <section className="sorp-report-beyond"><span>The next opportunity</span><h2>SORP is the requirement.<br />Better impact is the opportunity.</h2><div><p>My Social Impact would love to help you go beyond compliance — strengthening how impact is measured, managed, evidenced and communicated.</p><a href={contactHref} onClick={() => { void trackResult("book_conversation_clicked"); }}>Book a conversation <span>→</span></a><small><a href={contactHref} onClick={() => { void trackResult("contact_email_clicked"); }}>marcus@marcuswarry.com</a></small></div></section>
      {postReportChoices}
      {choice === "review" && reviewPanel}{choice === "support" && supportPanel}
      <div className="sorp-report-action-bar" role="region" aria-label="Your report actions"><div className="sorp-report-action-inner">
        <div className="sorp-report-action is-email"><span>Keep this</span><button type="button" aria-expanded={emailPanelOpen} aria-controls="sorp-action-email-panel" disabled={emailState === "sent"} onClick={() => { setEmailError(""); setEmailPanelOpen((open) => !open); }}>{emailState === "sent" ? "Sent ✓" : "Email my PDF"}<b aria-hidden="true">{emailState === "sent" ? "" : "→"}</b></button></div>
        <div className="sorp-report-action is-human"><span>Want help with it?</span><button type="button" onClick={showReview}>Book a human review — £{chosenBand.amount}<b aria-hidden="true">→</b></button></div>
        <div className="sorp-report-action is-support"><span>Want to support us?</span><button type="button" onClick={() => showSupport(false)}>Support the free tool — £5+<b aria-hidden="true">→</b></button></div>
        {emailPanelOpen && emailState !== "sent" && <form id="sorp-action-email-panel" className="sorp-action-email-panel" onSubmit={sendReport}><label htmlFor="sorp-action-email">Where should we send your full PDF?<input ref={actionEmailRef} id="sorp-action-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.org" /></label><button type="submit" disabled={emailState === "sending"}>{emailState === "sending" ? "Sending full PDF…" : "Send my PDF →"}</button>{emailError && <p role="alert">Sorry — {emailError} Please try again.</p>}</form>}
        {emailState === "sent" && <span className="sorp-action-email-sent" role="status">Your full PDF is on its way to {email}.</span>}
      </div></div>
    </section>}
  </main>;
}
