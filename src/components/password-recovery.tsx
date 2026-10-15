"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const started = useRef(false);
  const [available, setAvailable] = useState<"checking" | "yes" | "no">("checking");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [independentLink, setIndependentLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const link = new URLSearchParams(window.location.hash.slice(1));
    const value = link.get("token") || "";
    // Keep a reset token only in this tab's memory, never URLs/history/storage.
    if (reset) window.history.replaceState(window.history.state, "", window.location.pathname);
    queueMicrotask(() => {
      setToken(/^[A-Za-z0-9_-]{20,128}$/.test(value) ? value : "");
      setIndependentLink(link.get("sorp-auth") === "1");
      try {
        const saved = JSON.parse(localStorage.getItem("msi-sorp-canonical-methodology-v1") || "null");
        if (typeof saved?.email === "string") setEmail(saved.email);
      } catch { /* Recovery must still work without local storage. */ }
    });
    void fetch("/api/readiness-account/?feature=password-reset", { cache: "no-store", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(15000) })
      .then(async response => setAvailable(response.ok && (await response.json()).available === true ? "yes" : "no"))
      .catch(() => setAvailable("no"));
  }, [reset]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || available !== "yes" || complete) return;
    setError("");
    if (reset && password !== confirmation) { setError("Those passwords do not match."); return; }
    setBusy(true);
    try {
      const independentReset = reset && independentLink;
      const body = independentReset ? { token, newPassword: password } : reset ? { action: "reset-password", token, password } : { action: "request-reset", email: email.trim() };
      const response = await fetch(independentReset ? "/api/sorp-auth/reset-password" : "/api/readiness-account/", {
        method: "POST", headers: { "content-type": "application/json" },
        cache: "no-store", referrerPolicy: "no-referrer", body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
      });
      const data = await response.json();
      if (!response.ok || (independentReset ? data.status !== true : data.ok !== true)) throw new Error(data.error || "We couldn’t complete that request. Please try again.");
      setComplete(true);
      setToken(""); setPassword(""); setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "The request took too long. Please try again shortly.");
    } finally { setBusy(false); }
  }

  return <main id="main" className="gateway gateway-recovery">
    <section className="gateway-recovery-panel" aria-labelledby="recovery-title">
      <p className="gateway-kicker">Are You SORP Ready?</p>
      <h1 id="recovery-title">{complete ? reset ? "Password changed." : "Request received." : reset ? "Choose a new password." : "Forgot password?"}</h1>
      {complete ? <div role="status">
        <p>{reset ? "Sign in with your new password to continue. Your saved assessment is unchanged." : "If this address has an account, check your inbox and spam folder for a reset link. If nothing arrives, wait a few minutes and try again."}</p>
        {!reset && <p>The link expires in 30 minutes and can be used once.</p>}
      </div> : <>
        <p>{reset ? "Choose a password of at least 10 characters. Your saved work will stay with your account." : "Enter your account email address to request a secure reset link. Your saved assessment will not be changed."}</p>
        {available === "checking" && <p role="status">Checking password reset availability…</p>}
        {available === "no" && <p role="alert">Password reset is temporarily unavailable. Your saved assessment has not been changed. Please try again later.</p>}
        {available === "yes" && (reset && !token ? <p role="alert">This reset link is missing or invalid. Open the link from your email again, or request a new one.</p> :
          <form onSubmit={submit} className="gateway-recovery-form" aria-busy={busy}>
            {reset ? <>
              <label>New password<input autoComplete="new-password" type="password" minLength={10} maxLength={200} required value={password} onChange={e => setPassword(e.target.value)} /></label>
              <label>Confirm new password<input autoComplete="new-password" type="password" minLength={10} maxLength={200} required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
            </> : <label>Email address<input autoComplete="email" type="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} /></label>}
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="gateway-action" disabled={busy}>{busy ? "Please wait…" : reset ? "Save new password →" : "Send reset link →"}</button>
          </form>)}
      </>}
      <div className="gateway-recovery-links">
        <Link href="/are-you-sorp-ready/review/?entry=login">Back to sign in</Link>
        {reset && !complete && <Link href="/forgot-password/">Request a new reset link</Link>}
        {!reset && complete && <button type="button" onClick={() => { setComplete(false); setError(""); }}>Try another email address</button>}
      </div>
    </section>
  </main>;
}
