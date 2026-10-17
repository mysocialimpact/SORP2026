"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Arrow } from "@/components/ui";
import { readAudience, serverAudience, subscribeAudience, writeAudience, type Audience } from "@/lib/audience-preference";
import { ToolLink } from "@/components/tool-link";
import { useNavigationAccount } from "@/components/navigation-account";

const audienceCopy = {
  charity: {
    heading: "To the charities making a difference, every day.",
    paragraphs: [
      "We know how hard it can be to find the time, resources and specialist advice you need — whether that’s understanding SORP, managing your finances or demonstrating your impact.",
      "We’re building practical, accessible tools to make that easier for charities of every size. SORP 2026 is just the beginning.",
      "And we’d love to hear what else would make your life easier.",
    ],
  },
  adviser: {
    heading: "To the accountants and advisers supporting our charities.",
    paragraphs: [
      "We know how much expertise, care and hard work goes into helping charities succeed.",
      "Co-founded by a chartered accountant, we’re building tools with professionals like you in mind — to make your work easier and help you deliver even more value to your clients.",
      "We’d be honoured if you used them. And if you have ideas for making them better, we’d love to hear them. We’re all ears.",
    ],
  },
} as const;

export function HomepageAudience() {
  const audience = useSyncExternalStore(subscribeAudience, readAudience, serverAudience);

  function select(value: Audience) {
    const next = audience === value ? null : value;
    writeAudience(next);
  }

  return (
    <section className="homepage-audience" id="home-audience" aria-label="Choose your audience">
      <p className="homepage-audience-intro">
        We’ve built this for
      </p>
      <div className="homepage-audience-options">
        {([
          ["charity", "CHARITIES", "Trustees · CEOs · Finance teams · Staff · Volunteers"],
          ["adviser", "ACCOUNTANTS & ADVISERS", "Accountants · Auditors · Lawyers · Consultants · Funders"],
        ] as const).map(([value, title, description]) => (
          <div className="homepage-audience-option" key={value}>
            <button type="button" aria-pressed={audience === value} aria-expanded={audience === value} aria-controls={`homepage-audience-${value}`} onClick={() => select(value)}>
              <span><strong>{title}</strong><span className="homepage-audience-description">{description}</span></span>
            </button>
            {audience === value && <div className={`homepage-audience-detail is-${value}`} id={`homepage-audience-${value}`} role="region" aria-live="polite">
              <h2>{audienceCopy[value].heading}</h2>
              <div>{audienceCopy[value].paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                <a href="/get-started/">Let’s Get Started →</a>
              </div>
            </div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomepageReviewLink() {
  const { status } = useNavigationAccount();
  return <ToolLink className="gateway-action" href="/are-you-sorp-ready/review/?entry=intro">
    {status === "signed-in" ? "Start your free review" : "Let’s Get Started"} <Arrow />
  </ToolLink>;
}

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
          newsletter: false,
          website: String(form.get("website") || ""),
          submissionId,
        }),
      });
      const result = await response.json() as { accepted?: boolean; emailSent?: boolean; queued?: boolean; logged?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your message was not accepted.");
      setStatus("sent");
      setFeedback(result.emailSent
        ? "Thank you. Your message has been emailed to My Social Impact."
        : result.queued
          ? "Thank you. Your message is saved and queued for delivery to My Social Impact."
          : "Thank you. Your message has been securely logged for My Social Impact.");
    } catch (cause) {
      setStatus("error");
      setFeedback(cause instanceof Error ? cause.message : "We could not send your message. Please try again.");
    }
  }

  return (
    <section className="homepage-hello" id="lets-talk" aria-labelledby="hello-title">
      <div className="gateway-width homepage-hello-layout">
        <div className="homepage-hello-invitation">
          <h2 id="hello-title">Let’s talk.</h2>
        </div>
        <form className="homepage-hello-form" onSubmit={submit}>
          {recognised && <p className="homepage-hello-account">We’ve filled in the email from your existing account.</p>}
          <label htmlFor="hello-email">Email address</label>
          <input id="hello-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="hello-message">Message</label>
          <textarea id="hello-message" name="message" rows={5} required maxLength={3000} placeholder="Request a demo, ask a question, share an idea, give feedback, or just say hello…" />
          <label className="homepage-hello-honeypot" htmlFor="hello-website" aria-hidden="true">Website<input id="hello-website" name="website" tabIndex={-1} autoComplete="off" /></label>
          <div className="homepage-hello-actions">
            <button className="gateway-action" type="submit" disabled={status === "sending" || status === "sent"}>{status === "sending" ? "Sending…" : status === "sent" ? "Message sent ✓" : "Send message"} <Arrow /></button>
          </div>
          {feedback && <p className={`homepage-hello-feedback is-${status}`} role={status === "error" ? "alert" : "status"}>{feedback}</p>}
          {status === "error" && <p className="homepage-hello-small">You can also <a href="mailto:marcus@mysocialimpact.org">email Marcus directly</a>.</p>}
        </form>
      </div>
    </section>
  );
}
