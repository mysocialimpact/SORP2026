"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Arrow } from "@/components/ui";

export function SayHello() {
  const pathname = usePathname();
  const founderMode = pathname === "/founder" || pathname.startsWith("/founder/");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [message, setMessage] = useState("");
  const [recognised, setRecognised] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (founderMode) return;
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
  }, [founderMode]);

  useEffect(() => {
    if (founderMode) return;
    function applyContactIntent(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) setMessage(detail.message);
    }
    window.addEventListener("sorp2026:contact-intent", applyContactIntent);
    return () => window.removeEventListener("sorp2026:contact-intent", applyContactIntent);
  }, [founderMode]);

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
        body: JSON.stringify({ email, message, newsletter, source: window.location.pathname, website: String(form.get("website") || ""), submissionId }),
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

  async function copyFounderEmail() {
    const address = "marcus@mysocialimpact.org";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const fallback = document.createElement("textarea");
        fallback.value = address;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.appendChild(fallback);
        fallback.select();
        const copied = document.execCommand("copy");
        fallback.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  if (founderMode) return null;

  return <section className="shared-hello" id="say-hello" aria-labelledby="say-hello-title">
    <div className="gateway-width shared-hello-layout">
      <div className="shared-hello-invitation">
        <h2 id="say-hello-title">Talk to us.</h2>
      </div>
      <form className="shared-hello-form" onSubmit={submit}>
        {recognised && <p className="shared-hello-account">We’ve used the email from your account.</p>}
        <div className="shared-hello-field">
          <label htmlFor="shared-hello-email">Your email address</label>
          <input id="shared-hello-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
        </div>
        <div className="shared-hello-field">
          <label htmlFor="shared-hello-message">Message <span>Optional</span></label>
          <textarea id="shared-hello-message" name="message" rows={3} maxLength={3000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Request a demo, ask a question, share an idea, give feedback, or just say hello…" />
        </div>
        <div className="shared-hello-details" aria-label="My Social Impact contact details">
          <button className={`shared-hello-copy is-${copyStatus}`} type="button" onClick={() => void copyFounderEmail()} aria-label="Copy marcus@mysocialimpact.org to clipboard">
            <span>{copyStatus === "copied" ? "Email copied" : copyStatus === "error" ? "Couldn’t copy — tap the address" : "Copy email address"}</span>
            <strong>marcus@mysocialimpact.org</strong>
            <b aria-hidden="true">{copyStatus === "copied" ? "✓" : "Copy"}</b>
          </button>
          <div className="shared-hello-offices">
            <address><span>Somerset</span>10 Market Place, Shepton Mallet</address>
            <address><span>London</span>POPHub, Whitcomb Street, London</address>
          </div>
          <p className="shared-hello-copy-status" aria-live="polite">{copyStatus === "copied" ? "Marcus’s email address has been copied to your clipboard." : copyStatus === "error" ? <><a href="mailto:marcus@mysocialimpact.org">Email Marcus directly</a> if copying is unavailable.</> : ""}</p>
        </div>
        <label className="shared-hello-consent"><input type="checkbox" checked={newsletter} onChange={event => setNewsletter(event.target.checked)} /><span>I’d also like occasional updates about SORP 2026 and the free tools.</span></label>
        <label className="shared-hello-honeypot" htmlFor="shared-hello-website" aria-hidden="true">Website<input id="shared-hello-website" name="website" tabIndex={-1} autoComplete="off" /></label>
        <button className="shared-hello-submit" type="submit" disabled={status === "sending" || status === "sent"}>{status === "sending" ? "Sending…" : status === "sent" ? "Message sent ✓" : "Send message"} <Arrow /></button>
        {feedback && <p className={`shared-hello-feedback is-${status}`} role={status === "error" ? "alert" : "status"}>{feedback}</p>}
        {status === "error" && <p className="shared-hello-fallback">Or email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a>.</p>}
      </form>
    </div>
  </section>;
}
