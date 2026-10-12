"use client";
import { useRef, useState } from "react";
import Link from "next/link";

export function PartnerEnquiry({ firmName = "" }: { firmName?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const submissionId = useRef("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (state === "sending" || state === "sent") return;
    const form = new FormData(event.currentTarget);
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    setState("sending"); setFeedback("");
    try {
      const response = await fetch("/api/hello", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        email: form.get("email"), audience: "adviser", newsletter: false, website: form.get("website"), submissionId: submissionId.current,
        message: `Directory ${firmName ? "listing claim" : "professional partner enquiry"}\nFirm: ${form.get("firm")}\nName: ${form.get("name")}\nRole: ${form.get("role")}\n${form.get("message")}\nThis is an enquiry for manual verification, not a transfer of listing ownership.`,
      }) });
      const result = await response.json();
      if (!response.ok || !result.accepted) throw new Error(result.error || "We couldn’t accept your enquiry. Please try again.");
      setState("sent"); setFeedback(result.emailSent ? "Your enquiry has been emailed to My Social Impact. We’ll review the details before changing a listing." : result.queued ? "Your enquiry has been saved and queued for delivery. We’ll review the details before changing a listing." : "Your enquiry has been logged for review. No listing ownership has changed.");
    } catch (error) { setState("error"); setFeedback(error instanceof Error ? error.message : "Please try again."); }
  }
  return <form className="directory-enquiry" method="post" onSubmit={submit}>
    <noscript><p>This form needs JavaScript. Please email <a href="mailto:marcus@mysocialimpact.org">marcus@mysocialimpact.org</a> instead.</p></noscript>
    <div><label htmlFor="partner-name">Your name<input id="partner-name" name="name" required autoComplete="name" maxLength={120}/></label><label htmlFor="partner-email">Work email<input id="partner-email" name="email" required type="email" autoComplete="email" maxLength={254}/></label></div>
    <div><label htmlFor="partner-firm">Firm<input id="partner-firm" name="firm" required defaultValue={firmName} maxLength={160}/></label><label htmlFor="partner-role">Your role<input id="partner-role" name="role" required maxLength={120}/></label></div>
    <label htmlFor="partner-message">How can we help?<textarea id="partner-message" name="message" rows={3} maxLength={1600} placeholder={firmName ? "Tell us your relationship to this firm and any corrections needed." : "Tell us about your charity practice and your interest in the directory."}/></label>
    <label className="directory-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <p>No payment or subscription is created. We’ll verify your relationship to the firm before updating its profile. <Link href="/privacy/">Privacy notice</Link>.</p>
    <button type="submit" disabled={state === "sending" || state === "sent"}>{state === "sending" ? "Sending…" : state === "sent" ? "Enquiry received ✓" : "Send enquiry →"}</button>
    {feedback && <p role={state === "error" ? "alert" : "status"}>{feedback}</p>}
    {state === "error" && <a href="mailto:marcus@mysocialimpact.org?subject=Charity%20accountants%20directory">Email Marcus directly ↗</a>}
  </form>;
}
