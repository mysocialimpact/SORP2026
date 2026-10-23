"use client";

import { useEffect, useRef, useState } from "react";

export function DemoRequest({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const submissionId = useRef("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (data.signedIn && typeof data.account?.email === "string") {
        setEmail(data.account.email); setName(data.account.name || ""); setSignedIn(true);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || status === "sent") return;
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    setStatus("sending"); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/demo-request/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, name, source: window.location.pathname, submissionId: submissionId.current, website: form.get("website") }) });
      const result = await response.json() as { accepted?: boolean; error?: string };
      if (!response.ok || !result.accepted) throw new Error(result.error || "Your request was not accepted. Please try again.");
      setStatus("sent");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); setStatus("error"); }
  }
  return <section className={`demo-request${compact ? " is-compact" : ""}`} id="request-demo" aria-labelledby="demo-request-title">
    <div><p className="gateway-kicker">See it with your own questions</p><h2 id="demo-request-title">Request a free demo</h2><p>Marcus will reply personally to arrange a suitable time. This request does not book a time.</p></div>
    {status === "sent" ? <p role="status" className="demo-request-success">Your request has been accepted. Marcus will reply personally at <strong>{email}</strong>.</p> : <form onSubmit={submit}>
      {signedIn ? <p>Request using your account email: <strong>{email}</strong></p> : <><label htmlFor="demo-email">Email address</label><input id="demo-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /><label htmlFor="demo-name">Name <span>(optional)</span></label><input id="demo-name" type="text" autoComplete="name" maxLength={160} value={name} onChange={event => setName(event.target.value)} /></>}
      <label className="demo-request-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button type="submit" disabled={status === "sending" || !email}>{status === "sending" ? "Sending request…" : "Request a free demo →"}</button>
      {status === "error" && <p role="alert">{error}</p>}
    </form>}
  </section>;
}
