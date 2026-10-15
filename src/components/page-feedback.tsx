"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

type SubmissionState = "idle" | "sending" | "sent" | "error";

const thankYouMessages = {
  1: {
    heading: "We’re sorry we missed the mark.",
    body: "This isn’t the experience we want you to have. Thank you for taking the time to tell us — your feedback will help us improve.",
  },
  2: {
    heading: "Thank you for being honest with us.",
    body: "We’re sorry we haven’t quite got this right. We appreciate you helping us understand where we can do better.",
  },
  3: {
    heading: "Thank you — that’s really helpful.",
    body: "It sounds like there’s room for improvement. We appreciate you taking the time to help us make this better.",
  },
  4: {
    heading: "Lovely to hear. Thank you!",
    body: "We’re really pleased you’ve found this useful. Your feedback helps us keep improving.",
  },
  5: {
    heading: "Brilliant! Thank you so much.",
    body: "We’re delighted you’ve enjoyed the experience. It’s wonderful to know we’re heading in the right direction!",
  },
} as const;

function freshId() {
  try { return `feedback:${crypto.randomUUID()}`; }
  catch { return `feedback:${Date.now()}:${Math.random().toString(36).slice(2)}`; }
}

export function PageFeedback() {
  const pathname = usePathname();
  const founderMode = pathname === "/founder" || pathname.startsWith("/founder/");
  if (founderMode) return null;
  return <PageFeedbackForm key={pathname} pathname={pathname} />;
}

function PageFeedbackForm({ pathname }: { pathname: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState("");
  const submissionId = useRef(freshId());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating || state === "sending") return;
    setState("sending");
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/continuous-improvement/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          submissionId: submissionId.current,
          rating,
          category: "general",
          comment,
          contactEmail,
          pagePath: pathname,
          website: String(form.get("website") || ""),
        }),
      });
      const result = await response.json() as { accepted?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your feedback was not stored.");
      setState("sent");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Your feedback could not be stored. Please try again.");
    }
  }

  return <section className="page-feedback" id="page-feedback" aria-labelledby="page-feedback-title">
    <div className="gateway-width page-feedback-inner">
      <div className="page-feedback-heading">
        <p className="page-feedback-kicker">Continuous improvement</p>
        <h2 id="page-feedback-title">Help us make this better.</h2>
        <p>We love hearing what works, what doesn’t and what we’ve missed. Your feedback goes directly to Marcus, our co-founder, and helps us make this better for the next charity or adviser who uses it.</p>
        <div className="page-feedback-signoff">
          <p>Thanks for helping us build something better.</p>
          <strong>Marcus Warry</strong>
          <span>Co-founder, My Social Impact</span>
        </div>
      </div>
      {state === "sent" ? <div className="page-feedback-success" role="status">
        <div aria-hidden="true">{[1, 2, 3, 4, 5].map(value => <span className={value <= (rating || 0) ? "is-filled" : ""} key={value}>★</span>)}</div>
        <strong>{thankYouMessages[(rating || 3) as keyof typeof thankYouMessages].heading}</strong>
        <p>{thankYouMessages[(rating || 3) as keyof typeof thankYouMessages].body}</p>
        <button type="button" onClick={() => { setRating(null); setComment(""); setContactEmail(""); setState("idle"); submissionId.current = freshId(); }}>Leave another rating</button>
      </div> : <form className="page-feedback-form" onSubmit={submit}>
        <fieldset className="page-feedback-rating">
          <legend>How useful was this page?</legend>
          <div role="radiogroup" aria-label="Page usefulness from 1 to 5 stars" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map(value => <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              className={value <= (hoverRating || rating || 0) ? "is-filled" : ""}
              onMouseEnter={() => setHoverRating(value)}
              onFocus={() => setHoverRating(value)}
              onBlur={() => setHoverRating(null)}
              onClick={() => setRating(value)}
            >★</button>)}
          </div>
          <span aria-live="polite">{rating ? `${rating} out of 5` : "Choose a rating"}</span>
        </fieldset>
        <div className="page-feedback-comment">
          <label htmlFor="page-feedback-comment">Anything you’d like to add? <span>Optional</span></label>
          <textarea id="page-feedback-comment" rows={3} maxLength={3000} value={comment} onChange={event => setComment(event.target.value)} placeholder="What worked well, or what would make this page more useful?" />
        </div>
        <div className="page-feedback-contact">
          <label htmlFor="page-feedback-email">Would you like us to get back to you? Leave your email address here.</label>
          <input id="page-feedback-email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={contactEmail} onChange={event => setContactEmail(event.target.value)} />
        </div>
        <label className="page-feedback-honeypot" htmlFor="page-feedback-website" aria-hidden="true">Website<input id="page-feedback-website" name="website" tabIndex={-1} autoComplete="off" /></label>
        <button className="page-feedback-submit" type="submit" disabled={!rating || state === "sending"}>{state === "sending" ? "Sending…" : "Submit feedback →"}</button>
        {error && <p className="page-feedback-error" role="alert">{error}</p>}
      </form>}
    </div>
  </section>;
}
