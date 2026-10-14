"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/ui";

export type AuthenticatedAccount = {
  account: { id?: string; name?: string; email?: string; organisation?: string; position?: string };
  platformAccess?: { memberships?: Array<{ organisationId?: string; name?: string; type?: string; role?: string }> };
};

type Improvement = { id: string; said: string; did: string; link_url?: string | null; published_at?: string | null };
type Sending = "idle" | "sending" | "sent" | "error";

function freshId(prefix: string) {
  try { return `${prefix}:${crypto.randomUUID()}`; }
  catch { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`; }
}

export function AuthenticatedContinuousImprovement({ identity }: { identity: AuthenticatedAccount }) {
  const pathname = usePathname();
  const [contactType, setContactType] = useState<"question" | "advice" | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactState, setContactState] = useState<Sending>("idle");
  const [contactError, setContactError] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState("general");
  const [comment, setComment] = useState("");
  const [feedbackState, setFeedbackState] = useState<Sending>("idle");
  const [feedbackError, setFeedbackError] = useState("");
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [showAll, setShowAll] = useState(false);
  const contactId = useRef(freshId("contact"));
  const feedbackId = useRef(freshId("feedback"));
  const contactField = useRef<HTMLTextAreaElement>(null);
  const name = identity.account.name?.split(/\s+/)[0] || "there";
  const organisation = identity.platformAccess?.memberships?.[0]?.name || identity.account.organisation;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/continuous-improvement/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const result = await response.json() as { improvements?: Improvement[] };
        setImprovements(Array.isArray(result.improvements) ? result.improvements : []);
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (feedbackState !== "sent") return;
    const timeout = window.setTimeout(() => {
      setRating(null); setCategory("general"); setComment(""); setFeedbackState("idle");
      feedbackId.current = freshId("feedback");
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [feedbackState]);

  function chooseContact(type: "question" | "advice") {
    setContactType(type); setContactState("idle"); setContactError("");
    requestAnimationFrame(() => contactField.current?.focus());
  }

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactType || contactState === "sending") return;
    setContactState("sending"); setContactError("");
    try {
      const response = await fetch("/api/continuous-improvement/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "contact", submissionId: contactId.current, enquiryType: contactType, message: contactMessage, pagePath: pathname }),
      });
      const result = await response.json() as { accepted?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your message was not stored.");
      setContactState("sent"); setContactMessage(""); contactId.current = freshId("contact");
    } catch (error) {
      setContactState("error");
      setContactError(error instanceof Error ? error.message : "Your message could not be sent. Please try again.");
    }
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (feedbackState === "sending") return;
    setFeedbackState("sending"); setFeedbackError("");
    try {
      const response = await fetch("/api/continuous-improvement/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "feedback", submissionId: feedbackId.current, rating, category, comment, pagePath: pathname }),
      });
      const result = await response.json() as { accepted?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your feedback was not stored.");
      setFeedbackState("sent");
    } catch (error) {
      setFeedbackState("error");
      setFeedbackError(error instanceof Error ? error.message : "Your feedback could not be stored. Please try again.");
    }
  }

  return <section className="shared-hello continuous-improvement" id="say-hello" aria-label="Talk to Marcus and help improve SORP 2026">
    <div className="gateway-width continuous-improvement-inner">
      <section className="continuous-contact" aria-labelledby="talk-to-marcus-title">
        <div className="continuous-heading">
          <p className="shared-hello-kicker">A real person is here</p>
          <h2 id="talk-to-marcus-title">Need a hand?<br/><span>Talk to Marcus.</span></h2>
          <p>Questions about SORP 2026, charity reporting or improving your social impact? I’m here to help.</p>
          <p className="continuous-recognised">Hi {name}{organisation ? ` · ${organisation}` : ""}. We’ll use the details already held in your account.</p>
        </div>
        <div className="continuous-contact-actions" aria-label="Ways to talk to Marcus">
          <Link className="continuous-action" href="/are-you-sorp-ready/review/booking/?session=free&source=contact"><span>01</span><strong>Book a conversation</strong><small>Choose an available time with Marcus.</small><Arrow /></Link>
          <button className={contactType === "question" ? "continuous-action is-active" : "continuous-action"} type="button" onClick={() => chooseContact("question")}><span>02</span><strong>Ask a question</strong><small>Send your question directly.</small><Arrow /></button>
          <button className={contactType === "advice" ? "continuous-action is-active" : "continuous-action"} type="button" onClick={() => chooseContact("advice")}><span>03</span><strong>Get some advice</strong><small>Discuss reporting, readiness or wider impact.</small><Arrow /></button>
        </div>
        {contactType && <form className="continuous-contact-form" onSubmit={submitContact}>
          {contactState === "sent" ? <div className="continuous-contact-thanks" role="status"><strong>Thanks! Your message is on its way to Marcus.</strong><button type="button" onClick={() => { setContactState("idle"); setContactType(null); }}>Close</button></div> : <>
            <label htmlFor="continuous-contact-message">{contactType === "question" ? "What would you like to ask?" : "What would you like advice about?"}</label>
            <textarea ref={contactField} id="continuous-contact-message" rows={3} maxLength={3000} required value={contactMessage} onChange={event => setContactMessage(event.target.value)} placeholder={contactType === "question" ? "Type your question for Marcus…" : "Tell Marcus briefly what you’d like help with…"} />
            <button type="submit" disabled={contactState === "sending" || !contactMessage.trim()}>{contactState === "sending" ? "Sending…" : "Send to Marcus →"}</button>
            <button type="button" className="continuous-cancel" onClick={() => setContactType(null)}>Cancel</button>
            {contactError && <p role="alert">{contactError}</p>}
          </>}
        </form>}
      </section>

      <section className="continuous-feedback" aria-labelledby="help-improve-title">
        <div className="continuous-heading">
          <p className="shared-hello-kicker">SORP 2026 · Live beta</p>
          <h2 id="help-improve-title">We’re building<br/><span>this with you.</span></h2>
          <p>SORP 2026 is in BETA. We’re constantly improving it, and your feedback helps us make it better.</p>
        </div>
        {feedbackState === "sent" ? <div className="continuous-celebration" role="status">
          <div className="continuous-celebration-stars" aria-hidden="true"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
          <p className="shared-hello-kicker">Straight into the Ideas Shed</p>
          <h3>You’re helping us build something better!</h3>
          <p>Thank you! We’ve received your feedback and we’ll use it to keep improving SORP 2026.</p>
          <button type="button" onClick={() => { setRating(null); setComment(""); setFeedbackState("idle"); feedbackId.current = freshId("feedback"); }}>Share another thought</button>
        </div> : <form className="continuous-feedback-form" onSubmit={submitFeedback}>
          <fieldset className="continuous-rating"><legend>How was your experience today?</legend><div role="radiogroup" aria-label="Experience rating from 1 to 5 stars" onMouseLeave={() => setHoverRating(null)}>{[1,2,3,4,5].map(value => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onMouseEnter={() => setHoverRating(value)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(null)} onClick={() => setRating(value)} className={value <= (hoverRating || rating || 0) ? "is-filled" : ""}>★</button>)}</div>{rating && <span>{rating} out of 5</span>}</fieldset>
          <fieldset className="continuous-categories"><legend>What kind of feedback is this?</legend>{[["general","General feedback"],["suggestion","Suggestion"],["problem","Report a problem"]].map(([value,label]) => <label key={value}><input type="radio" name="feedback-category" value={value} checked={category === value} onChange={() => setCategory(value)} /><span>{label}</span></label>)}</fieldset>
          <label htmlFor="continuous-feedback-comment">What could we do better? <span>Optional if you’ve chosen a rating</span></label>
          <textarea id="continuous-feedback-comment" rows={4} maxLength={3000} value={comment} onChange={event => setComment(event.target.value)} placeholder="Something you loved, something that didn’t work, or an idea for making SORP 2026 better…" />
          <button className="continuous-feedback-submit" type="submit" disabled={feedbackState === "sending" || (!rating && !comment.trim())}>{feedbackState === "sending" ? "Sending…" : "Send feedback →"}</button>
          {feedbackError && <p className="continuous-form-error" role="alert">{feedbackError}</p>}
        </form>}
      </section>

      {!!improvements.length && <aside className="continuous-improvements" aria-labelledby="you-said-title">
        <header><div><p className="shared-hello-kicker">We listen. We improve. You benefit.</p><h2 id="you-said-title">You said. <span>We did.</span></h2></div>{improvements.length > 2 && <button type="button" onClick={() => setShowAll(value => !value)}>{showAll ? "Show recent only" : "View previous improvements"}</button>}</header>
        <div>{improvements.slice(0, showAll ? improvements.length : 2).map(item => <article key={item.id}><p><strong>You said</strong> “{item.said}”</p><p><strong>We did</strong> {item.did}</p>{item.link_url && <Link href={item.link_url}>See the improvement →</Link>}</article>)}</div>
      </aside>}
    </div>
  </section>;
}
