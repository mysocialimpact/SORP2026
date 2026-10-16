"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { safeDestination } from "@/lib/onboarding/state";
import { currentAccountDestination, registrationHref, rememberAccountReturn } from "@/lib/account-navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export function AccountPortal({ returnTo, embedded = false }: { returnTo?: string; embedded?: boolean } = {}) {
  const params = useSearchParams();
  const router = useRouter();
  const destination = useMemo(() => safeDestination(returnTo ?? params.get("return") ?? params.get("next"), true), [params, returnTo]);
  const hasExplicitDestination = Boolean(returnTo || params.get("return") || params.get("next"));
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.signedIn === true && !controller.signal.aborted) window.location.replace(data.platformAccess?.founder === true && !hasExplicitDestination ? "/founder/" : destination);
      }).catch(() => undefined).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [destination, hasExplicitDestination]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/readiness-account/", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We could not sign you in. Please try again.");
      const target = data.platformAccess?.founder === true && !hasExplicitDestination ? "/founder/" : embedded ? currentAccountDestination(destination) : destination;
      // Full navigation ensures secure session cookies reach server-side guards.
      window.location.assign(target);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); setBusy(false); }
  }
  return <div className="account-portal">
    <div className="account-tabs" role="tablist" aria-label="Account action">
      <button type="button" role="tab" aria-selected="true">Log in</button>
      <button type="button" role="tab" aria-selected="false" onClick={() => router.push(registrationHref(embedded ? currentAccountDestination(destination) : destination))}>Create account</button>
    </div>
    {checking ? <p className="account-checking" role="status">Checking your account…</p> : <form onSubmit={submit}>
      <label>Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Password<input required type="password" minLength={10} maxLength={200} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <div className="account-error" role="alert"><strong>We couldn’t sign you in yet.</strong><span>{error}</span></div>}
      <Link className="account-forgot" href={`/forgot-password/?return=${encodeURIComponent(destination)}`} onClick={() => rememberAccountReturn(destination)}>Forgotten your password?</Link>
      <button className="gateway-action account-submit" disabled={busy} type="submit">{busy ? "Please wait…" : "Log in to SORP2026 →"}</button>
    </form>}
    <p className="account-note">{embedded ? "One account for your SORP2026 tools. You’ll return straight to this assessment." : "One account for your SORP2026 tools. If you previously used Social Impact Excellence, contact support before creating a new account so your saved work can be checked. Google sign-in is currently unavailable."}</p>
  </div>;
}
