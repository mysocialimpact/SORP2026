"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function AccountPortal() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({ name: "", role: "", roleOther: "", email: "", password: "", confirm: "" });
  const destination = useMemo(() => safeReturn(params.get("return")), [params]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.signedIn === true) router.replace(destination);
      })
      .catch(() => undefined)
      .finally(() => setChecking(false));
    return () => controller.abort();
  }, [destination, router]);

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
            action: "signup", name: fields.name.trim(), position: role, email, password: fields.password,
            progress: { sessionId: crypto.randomUUID(), step: "scope" },
          };
      const response = await fetch("/api/readiness-account/", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We could not complete that request. Please try again.");
      router.replace(destination);
      router.refresh();
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
    {checking ? <p className="account-checking" role="status">Checking your account…</p> : <form onSubmit={submit}>
      {mode === "signup" && <>
        <label>Your name<input required maxLength={120} autoComplete="name" value={fields.name} onChange={event => setFields(current => ({ ...current, name: event.target.value }))} /></label>
        <label>Your role<select required value={fields.role} onChange={event => setFields(current => ({ ...current, role: event.target.value }))}>
          <option value="">Choose your role</option>{roles.map(role => <option value={role} key={role}>{role}</option>)}
        </select></label>
        {fields.role === "OTHER" && <label>Describe your role<input required maxLength={120} autoComplete="organization-title" value={fields.roleOther} onChange={event => setFields(current => ({ ...current, roleOther: event.target.value }))} /></label>}
      </>}
      <label>Email address<input required type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={event => setFields(current => ({ ...current, email: event.target.value }))} /></label>
      <label>Password<input required type="password" minLength={10} maxLength={200} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={fields.password} onChange={event => setFields(current => ({ ...current, password: event.target.value }))} /></label>
      {mode === "signup" && <label>Confirm password<input required type="password" minLength={10} maxLength={200} autoComplete="new-password" value={fields.confirm} onChange={event => setFields(current => ({ ...current, confirm: event.target.value }))} /></label>}
      {error && <div className="account-error" role="alert"><strong>We couldn’t complete that yet.</strong><span>{error}</span></div>}
      {mode === "login" && <Link className="account-forgot" href="/forgot-password/">Forgotten your password?</Link>}
      <button className="gateway-action account-submit" disabled={busy} type="submit">{busy ? "Please wait…" : mode === "login" ? "Log in to SORP2026 →" : "Create my SORP2026 account →"}</button>
    </form>}
    <p className="account-note">One account for every SORP2026 product. If you previously used Social Impact Excellence, sign up with the same email address and eligible saved work will reconnect automatically. Google sign-in remains unavailable until its existing configuration is fully verified.</p>
  </div>;
}
