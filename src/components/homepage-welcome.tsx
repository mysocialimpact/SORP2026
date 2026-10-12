"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Arrow } from "@/components/ui";

const audienceKey = "sorp2026.homepage-audience";
type Audience = "charity" | "adviser";
let memoryAudience: Audience | null = null;
function readAudience(): Audience | null {
  try {
    const value = sessionStorage.getItem(audienceKey);
    return value === "charity" || value === "adviser" ? value : null;
  } catch { return memoryAudience; }
}
function subscribeAudience(listener: () => void) {
  window.addEventListener(audienceKey, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(audienceKey, listener);
    window.removeEventListener("storage", listener);
  };
}
const serverAudience = () => null;
function writeAudience(next: Audience | null) {
  memoryAudience = next;
  try {
    if (next) sessionStorage.setItem(audienceKey, next);
    else sessionStorage.removeItem(audienceKey);
  } catch { /* Retain the selection in memory for this visit. */ }
  window.dispatchEvent(new Event(audienceKey));
}

export function HomepageAudience() {
  const audience = useSyncExternalStore(subscribeAudience, readAudience, serverAudience);

  function select(value: Audience) {
    const next = audience === value ? null : value;
    writeAudience(next);
  }

  return (
    <section className="homepage-audience" aria-labelledby="audience-title">
      <div className="homepage-audience-heading">
        <p className="gateway-kicker">Your work. Your starting point.</p>
        <h2 id="audience-title">Who are you here as?</h2>
        <p>Helping charities make a difference? You’re in the right place.</p>
      </div>
      <div className="homepage-audience-options">
        {([
          ["charity", "I work in a charity", "For charity employees, leadership teams, trustees, finance teams and volunteers."],
          ["adviser", "I advise charities", "For accountants, auditors, consultants, lawyers and other professional advisers supporting charities."],
        ] as const).map(([value, title, description]) => (
          <button key={value} type="button" aria-pressed={audience === value} onClick={() => select(value)}>
            <span className="homepage-audience-marker" aria-hidden="true">{audience === value ? "✓" : "+"}</span>
            <span><strong>{title}</strong><span className="homepage-audience-description">{description}</span></span>
          </button>
        ))}
      </div>
      <p className="homepage-audience-note" aria-live="polite">
        {audience ? "Noted for this visit. Select again to clear — all six products are still yours to explore." : "No sign-up needed. Explore the tools below at your own pace."}
      </p>
    </section>
  );
}

/** Design preview only: Growth's existing events API deliberately excludes contacts.
 * Keep sending disabled until a durable contact + explicit-consent endpoint exists.
 * Never post personal information to the assessment analytics endpoint.
 */
export function HomepageHello() {
  const [email, setEmail] = useState("");
  const [recognised, setRecognised] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.signedIn && typeof data.account?.email === "string") {
          setEmail(current => current || data.account.email);
          setRecognised(true);
        }
      }).catch(() => { /* Public visitors do not need an account. */ });
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || status === "sent") return;
    setStatus("sending");
    setFeedback("");
    const form = new FormData(event.currentTarget);
    let audience: Audience | null = null;
    try { audience = readAudience(); } catch { /* Audience remains optional. */ }
    let submissionId = "";
    try {
      submissionId = sessionStorage.getItem("sorp2026.hello-submission") || crypto.randomUUID();
      sessionStorage.setItem("sorp2026.hello-submission", submissionId);
    } catch { submissionId = crypto.randomUUID(); }
    try {
      const response = await fetch("/api/hello", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          message: String(form.get("message") || ""),
          audience,
          newsletter: form.get("newsletter") === "on",
          website: String(form.get("website") || ""),
          submissionId,
        }),
      });
      const result = await response.json() as { accepted?: boolean; emailSent?: boolean; queued?: boolean; logged?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your message was not accepted.");
      setStatus("sent");
      setFeedback(result.emailSent
        ? "Thank you — your hello has been emailed to My Social Impact."
        : result.queued
          ? "Thank you — your hello is saved and queued for delivery to My Social Impact."
          : "Thank you — your hello has been securely logged for My Social Impact.");
    } catch (cause) {
      setStatus("error");
      setFeedback(cause instanceof Error ? cause.message : "We could not send your message. Please try again.");
    }
  }

  return (
    <section className="homepage-hello" id="say-hello" aria-labelledby="hello-title">
      <div className="gateway-width homepage-hello-layout">
        <div className="homepage-hello-invitation">
          <p className="gateway-kicker">A little conversation can go a long way</p>
          <h2 id="hello-title">Just looking around?<br /><em>Say hello.</em></h2>
          <p>We’d love to know who’s visiting. Whether you have a question, an idea, some feedback or simply want to introduce yourself, we’d love to hear from you.</p>
          <p className="homepage-hello-signature">Marcus &amp; Chris<span>My Social Impact</span></p>
        </div>
        <form className="homepage-hello-form" onSubmit={submit}>
          {recognised && <p className="homepage-hello-account">We’ve filled in the email from your existing account.</p>}
          <label htmlFor="hello-email">Email address <span>Required</span></label>
          <input id="hello-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="hello-message">Anything you’d like to share? <span>Optional</span></label>
          <textarea id="hello-message" name="message" rows={3} maxLength={3000} placeholder="A question, an idea, some feedback — or just hello!" />
          <label className="homepage-hello-honeypot" htmlFor="hello-website" aria-hidden="true">Website<input id="hello-website" name="website" tabIndex={-1} autoComplete="off" /></label>
          <label className="homepage-hello-consent" htmlFor="hello-newsletter">
            <input id="hello-newsletter" type="checkbox" name="newsletter" />
            <span>I’d also like occasional updates about SORP 2026 and our free tools.</span>
          </label>
          <p className="homepage-hello-privacy">Saying hello doesn’t create an account or sign you up for updates. <Link href="/privacy/">Privacy notice</Link>.</p>
          <button className="gateway-action" type="submit" disabled={status === "sending" || status === "sent"}>{status === "sending" ? "Sending…" : status === "sent" ? "Hello sent ✓" : "Say hello"} <Arrow /></button>
          {feedback && <p className={`homepage-hello-feedback is-${status}`} role={status === "error" ? "alert" : "status"}>{feedback}</p>}
          {status === "error" && <p className="homepage-hello-small">You can also <a href="mailto:marcus@mysocialimpact.org">email Marcus directly</a>.</p>}
        </form>
      </div>
    </section>
  );
}
