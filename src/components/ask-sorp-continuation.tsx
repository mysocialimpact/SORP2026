"use client";

import { FormEvent, useEffect, useState } from "react";

type Citation = { reference: string; module: string; page: number; extract: string };
type Turn = { question: string; answer: { short_answer: string; citations: Citation[]; interpretation: string; human_judgement: string } };
type Identity = { name: string; email: string; organisationName: string; charityName: string; charityNumber: string; role: string; contactConsent: boolean; shareConversation: boolean };
type Offer = { professionalName: string; practiceName: string; professionalAllowance: number; fairUse: string; foundingActive: boolean; foundingAvailable: boolean; prices: Record<string, Record<string, { standard: number; founding: number }>> };

const identityKey = "sorp2026-ask-sorp-identity";
const original = "https://asksorp.mysocialimpact.org/";
const emptyIdentity: Identity = { name: "", email: "", organisationName: "", charityName: "", charityNumber: "", role: "", contactConsent: false, shareConversation: false };

export function AskSorpContinuation({ turns, sessionId }: { turns: Turn[]; sessionId: string }) {
  const [identity, setIdentity] = useState<Identity>(emptyIdentity);
  const [offers, setOffers] = useState<Offer | null>(null);
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">("idle");
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "sent">("idle");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(identityKey) || "null");
      if (saved && typeof saved.email === "string") setIdentity({ ...emptyIdentity, ...saved });
    } catch { /* Keep the form usable when storage is unavailable. */ }
    let cancelled = false;
    fetch("/api/ask-sorp/continuation/", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!cancelled && data?.offers) setOffers(data.offers); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function update<K extends keyof Identity>(key: K, value: Identity[K]) {
    setIdentity(current => {
      const next = { ...current, [key]: value };
      try { sessionStorage.setItem(identityKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const conversation = turns.map(turn => ({
    question: turn.question,
    shortAnswer: turn.answer.short_answer,
    references: turn.answer.citations.map(citation => citation.reference),
    modules: [...new Set(turn.answer.citations.map(citation => citation.module))],
    interpretation: turn.answer.interpretation,
    humanJudgement: turn.answer.human_judgement,
  }));

  async function sendSummary(event: FormEvent) {
    event.preventDefault();
    if (emailState !== "idle") return;
    setError("");
    setEmailState("sending");
    try {
      const response = await fetch("/api/ask-sorp/continuation/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "summary", sessionId, ...identity, conversation }),
      });
      const result = await response.json();
      if (!response.ok || !result.customerSummary) throw new Error(result.error || "The email did not send.");
      setEmailState("sent");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The email did not send. Please try again.");
      setEmailState("idle");
    }
  }

  async function sendFeedback(event: FormEvent) {
    event.preventDefault();
    if (feedbackState !== "idle" || (!rating && !comment.trim())) return;
    setFeedbackError("");
    setFeedbackState("sending");
    try {
      const response = await fetch("/api/ask-sorp/continuation/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "feedback", kind: "session", sessionId, feedbackId, rating, comment, ...identity,
          conversation: turns.map(turn => ({
            question: turn.question,
            answer: [turn.answer.short_answer, turn.answer.interpretation, turn.answer.human_judgement,
              "SORP evidence: " + turn.answer.citations.map(citation => citation.reference).join(", ")].filter(Boolean).join("\n\n"),
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Feedback did not send.");
      setFeedbackState("sent");
    } catch (cause) {
      setFeedbackError(cause instanceof Error ? cause.message : "Feedback did not send. Please try again.");
      setFeedbackState("idle");
    }
  }

  return <section className="ask-continuation" aria-labelledby="ask-continuation-title">
    <p className="ask-eyebrow">Your three free answers are ready</p>
    <h2 id="ask-continuation-title">Keep your SORP conversation moving.</h2>
    <p>Your questions, answers and references remain above. Choose what helps you next.</p>
    <div className="ask-continuation-grid">
      <section className="ask-continuation-card">
        <span>01 / Continue using Ask SORP</span>
        <h3>Ask more questions</h3>
        <p>The original Ask SORP account offers ongoing access. Your free answers stay here; email yourself a copy before moving between websites.</p>
        {offers ? <div className="ask-continuation-offers">
          {(["professional", "practice"] as const).map(plan => {
            const price = offers.prices[plan]?.month;
            if (!price) return null;
            const founding = offers.foundingActive && offers.foundingAvailable;
            return <p key={plan}><strong>{plan === "professional" ? offers.professionalName : offers.practiceName}</strong> · £{((founding ? price.founding : price.standard) / 100).toFixed(0)}/month{founding ? " Founding 100" : ""}<small>{plan === "professional" ? `${offers.professionalAllowance} questions per month` : offers.fairUse}</small></p>;
          })}
        </div> : <p>See current access and pricing on the original Ask SORP site.</p>}
        <a className="ask-continuation-action" href={original} target="_blank" rel="noopener noreferrer">See ongoing access ↗</a>
      </section>
      <section className="ask-continuation-card">
        <span>02 / Human help</span>
        <h3>Talk to Marcus</h3>
        <p>Discuss a SORP, impact reporting or evidence question with a person. The original journey offers a free 10 minute discovery option and longer sessions.</p>
        <a className="ask-continuation-action" href="https://mysocialimpact.org/are-you-sorp-ready/review/booking?source=ask-sorp&session=free" target="_blank" rel="noopener noreferrer">Explore a conversation ↗</a>
      </section>
    </div>
    <form className="ask-continuation-card ask-continuation-form" onSubmit={sendSummary}>
      <span>03 / Keep your research</span>
      <h3>Email your conversation</h3>
      <p>Receive your questions, answers and SORP paragraph references. Your organisation can differ from the charity you are researching.</p>
      <div className="ask-continuation-fields">
        <label>Work email *<input type="email" required maxLength={254} autoComplete="email" value={identity.email} onChange={event => update("email", event.target.value)} /></label>
        <label>Your name <input maxLength={120} autoComplete="name" value={identity.name} onChange={event => update("name", event.target.value)} /></label>
        <label>Your organisation or firm <input maxLength={240} value={identity.organisationName} onChange={event => update("organisationName", event.target.value)} /></label>
        <label>Charity discussed <input maxLength={240} value={identity.charityName} onChange={event => update("charityName", event.target.value)} /></label>
      </div>
      <label className="ask-continuation-check"><input type="checkbox" checked={identity.contactConsent} onChange={event => update("contactConsent", event.target.checked)} /> My Social Impact may contact me about SORP support, tools and services.</label>
      <label className="ask-continuation-check"><input type="checkbox" checked={identity.shareConversation} onChange={event => update("shareConversation", event.target.checked)} /> Include my full transcript in the My Social Impact follow-up email. My own copy includes it either way.</label>
      <button type="submit" className="ask-continuation-action" disabled={emailState !== "idle"}>{emailState === "sent" ? "Conversation sent ✓" : emailState === "sending" ? "Sending…" : "Email my conversation →"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
    <form className="ask-continuation-card ask-continuation-form" onSubmit={sendFeedback}>
      <span>04 / Help us improve</span>
      <h3>How was Ask SORP?</h3>
      <div className="ask-continuation-stars" role="group" aria-label="Rate your experience from one to five">
        {[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-label={`Rate ${value} out of 5`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? "★" : "☆"}</button>)}
      </div>
      <label>What should we improve?<textarea maxLength={2000} rows={3} value={comment} onChange={event => setComment(event.target.value)} /></label>
      <button type="submit" className="ask-continuation-action" disabled={feedbackState !== "idle" || (!rating && !comment.trim())}>{feedbackState === "sent" ? "Feedback sent ✓" : feedbackState === "sending" ? "Sending…" : "Send feedback →"}</button>
      {feedbackError && <p role="alert">{feedbackError}</p>}
    </form>
  </section>;
}
