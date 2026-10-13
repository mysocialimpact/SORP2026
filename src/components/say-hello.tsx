"use client";

import { useEffect, useState } from "react";
import { Arrow } from "@/components/ui";

export function SayHello() {
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
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
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || status === "sent") return;
    setStatus("sending"); setFeedback("");
    const form = new FormData(event.currentTarget);
    let submissionId = "";
    try {
      submissionId = sessionStorage.getItem("sorp2026.hello-submission") || crypto.randomUUID();
      sessionStorage.setItem("sorp2026.hello-submission", submissionId);
    } catch { submissionId = crypto.randomUUID(); }
    try {
      const response = await fetch("/api/hello", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, message: String(form.get("message") || ""), newsletter, source: window.location.pathname, website: String(form.get("website") || ""), submissionId }),
      });
      const result = await response.json() as { accepted?: boolean; emailSent?: boolean; queued?: boolean; logged?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your message was not accepted.");
      setStatus("sent");
      setFeedback(result.emailSent ? "Thank you — your hello is on its way." : result.queued ? "Thank you — your hello is safely queued." : "Thank you — your hello has been safely received.");
    } catch (cause) {
      setStatus("error");
      setFeedback(cause instanceof Error ? cause.message : "We could not send your message. Please try again.");
    }
  }

  return <section className="shared-hello" id="say-hello" aria-labelledby="say-hello-title">
    <div className="gateway-width shared-hello-layout">
      <div className="shared-hello-invitation">
        <p className="shared-hello-kicker">A human is always welcome here</p>
        <h2 id="say-hello-title">Just looking around?<br/><span>Say hello.</span></h2>
        <p>A question, an idea, some feedback — or just hello. We’d love to hear from you.</p>
        <div className="shared-hello-details" aria-label="My Social Impact contact details">
          <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>
          <address><span>Somerset</span>10 Market Place, Shepton Mallet</address>
          <address><span>London</span>POPHub, Whitcomb Street, London</address>
        </div>
      </div>
      <form className="shared-hello-form" onSubmit={submit}>
        {recognised && <p className="shared-hello-account">We’ve used the email from your account.</p>}
        <label htmlFor="shared-hello-email">Email address</label>
        <input id="shared-hello-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
        <label htmlFor="shared-hello-message">Message <span>Optional</span></label>
        <textarea id="shared-hello-message" name="message" rows={3} maxLength={3000} placeholder="A question, an idea, some feedback — or just hello…" />
        <label className="shared-hello-consent"><input type="checkbox" checked={newsletter} onChange={event => setNewsletter(event.target.checked)} /><span>I’d also like occasional updates about SORP 2026 and the free tools.</span></label>
        <label className="shared-hello-honeypot" htmlFor="shared-hello-website" aria-hidden="true">Website<input id="shared-hello-website" name="website" tabIndex={-1} autoComplete="off" /></label>
        <button className="shared-hello-submit" type="submit" disabled={status === "sending" || status === "sent"}>{status === "sending" ? "Sending…" : status === "sent" ? "Hello sent ✓" : "Say hello"} <Arrow /></button>
        {feedback && <p className={`shared-hello-feedback is-${status}`} role={status === "error" ? "alert" : "status"}>{feedback}</p>}
        {status === "error" && <p className="shared-hello-fallback">Or email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>.</p>}
      </form>
    </div>
  </section>;
}
