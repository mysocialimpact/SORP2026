"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const roles = [
  "CEO / SENIOR LEADER", "TRUSTEE / CHAIR", "FINANCE / TREASURER", "IMPACT / EVALUATION",
  "PROGRAMME / DELIVERY", "FUNDRAISING / DEVELOPMENT", "COMMUNICATIONS / MARKETING",
  "ACCOUNTANT / AUDITOR / ADVISER", "OTHER",
];

type Mode = "login" | "signup";

function safeReturn(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/";
}

function signedInDestination(destination: string) {
  if (!destination.startsWith("/dashboard")) return destination;
  const url = new URL(destination, "https://sorp2026.org");
  url.searchParams.set("signed-in", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

function invitationTokenFromDestination(destination: string) {
  const match = new URL(destination, "https://sorp2026.org").pathname.match(/^\/invitation\/([a-f0-9]{64})\/?$/);
  return match?.[1] || "";
}

function returnToEmbeddedProduct(destination: string) {
  // A hash-only navigation does not reload account state. Keep the product
  // address and anchor, then refresh so its assessment and shared header agree.
  window.history.replaceState(null, "", destination);
  window.location.reload();
}

export function AccountPortal({ returnTo, embedded = false }: { returnTo?: string; embedded?: boolean } = {}) {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({ name: "", role: "", roleOther: "", email: "", password: "", confirm: "" });
  const destination = useMemo(() => safeReturn(returnTo ?? params.get("return") ?? params.get("next")), [params, returnTo]);
  const invitationToken = useMemo(() => invitationTokenFromDestination(destination), [destination]);
  const [invitationChecking, setInvitationChecking] = useState(Boolean(invitationToken));
  const [invitationName, setInvitationName] = useState("");
  const [invitationEmail, setInvitationEmail] = useState("");
  const hasExplicitDestination = Boolean(returnTo || params.get("return") || params.get("next"));

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.signedIn === true) {
          if (embedded) returnToEmbeddedProduct(destination);
          else window.location.replace(data.platformAccess?.founder === true && !hasExplicitDestination ? "/founder/" : destination);
        }
      })
      .catch(() => undefined)
      .finally(() => setChecking(false));
    return () => controller.abort();
  }, [destination, embedded, hasExplicitDestination]);

  useEffect(() => {
    if (!invitationToken) return;
    const controller = new AbortController();
    void fetch("/api/readiness-account/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "invitation-preview", invitationToken }), cache: "no-store", signal: controller.signal,
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "This invitation could not be opened.");
      const invitedEmail = String(data.invitation?.email || "").toLowerCase();
      setInvitationName(String(data.invitation?.organisationName || "the organisation"));
      setInvitationEmail(invitedEmail);
      setFields(current => ({ ...current, email: invitedEmail }));
    }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "This invitation could not be opened."); })
      .finally(() => { if (!controller.signal.aborted) setInvitationChecking(false); });
    return () => controller.abort();
  }, [invitationToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = fields.email.trim().toLowerCase();
    const role = fields.role === "OTHER" ? fields.roleOther.trim() : fields.role;
    if (mode === "signup" && fields.password !== fields.confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = mode === "login"
        ? { action: "login", email, password: fields.password }
        : {
            action: "signup", name: fields.name.trim(), position: role, email, password: fields.password, invitationToken: invitationToken || undefined,
            progress: { sessionId: crypto.randomUUID(), step: "scope" },
          };
      const response = await fetch("/api/readiness-account/", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We could not complete that request. Please try again.");
      if (embedded) {
        // Refresh the existing shared session and all account controls together.
        returnToEmbeddedProduct(destination);
      } else {
        // A full navigation ensures the newly issued secure session cookie is
        // present when server-side founder/adviser guards run. A client-only
        // transition can race the cookie update and bounce back to sign-in.
        window.location.assign(data.platformAccess?.founder === true && !hasExplicitDestination ? "/founder/" : signedInDestination(destination));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not complete that request. Please try again.");
      setBusy(false);
    }
  }

  return <div className="account-portal">
    <div className="account-tabs" role="tablist" aria-label="Account action">
      <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Log in</button>
      <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
    </div>
    {invitationName ? <p className="account-note"><strong>Invitation to join {invitationName}</strong><br/>Use {invitationEmail} to continue.</p> : null}
    {checking || invitationChecking ? <p className="account-checking" role="status">Checking your account and invitation…</p> : <form onSubmit={submit}>
      {mode === "signup" && <>
        <label>Your name<input required maxLength={120} autoComplete="name" value={fields.name} onChange={event => setFields(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Your role<select required value={fields.role} onChange={event => setFields(current => ({ ...current, role: event.target.value }))}>
          <option value="">Choose your role</option>{roles.map(role => <option value={role} key={role}>{role}</option>)}
        </select></label>
        {fields.role === "OTHER" && <label>Describe your role<input required maxLength={120} autoComplete="organization-title" value={fields.roleOther} onChange={event => setFields(current => ({ ...current, roleOther: event.target.value }))} /></label>}
      </>}
      <label>Email address<input required readOnly={Boolean(invitationEmail)} type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={event => setFields(current => ({ ...current, email: event.target.value }))} /></label>
      <label>Password<input required type="password" minLength={10} maxLength={200} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={fields.password} onChange={event => setFields(current => ({ ...current, password: event.target.value }))} /></label>
      {mode === "signup" && <label>Confirm password<input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={fields.confirm} onChange={event => setFields(current => ({ ...current, confirm: event.target.value }))} /></label>}
      {error && <div className="account-error" role="alert"><strong>We couldn’t complete that yet.</strong><span>{error}</span></div>}
      {mode === "login" && <Link className="account-forgot" href="/forgot-password/">Forgotten your password?</Link>}
      <button className="gateway-action account-submit" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "login" ? "Log in to SORP2026 →" : "Create my SORP2026 account →"}</button>
    </form>}
    <p className="account-note">{embedded ? "One free account for your eligible SORP2026 and My Social Impact tools. You’ll return straight to this assessment. No SORP review required." : "One account for every SORP2026 product. If you previously used Social Impact Excellence, sign up with the same email address and eligible saved work will reconnect automatically. Google sign-in remains unavailable until its existing configuration is fully verified."}</p>
  </div>;
}
