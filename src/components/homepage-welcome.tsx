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
        <h2 id="audience-title">Who are you here as?</h2>
        <p>Entirely optional. Everyone is welcome.</p>
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

  return (
    <section className="homepage-hello" id="say-hello" aria-labelledby="hello-title">
      <div className="gateway-width homepage-hello-layout">
        <div className="homepage-hello-invitation">
          <p className="gateway-kicker">A little conversation can go a long way</p>
          <h2 id="hello-title">Just looking around?<br /><em>Say hello.</em></h2>
          <p>We’d love to know who’s visiting. Whether you have a question, an idea, some feedback or simply want to introduce yourself, we’d love to hear from you.</p>
          <p className="homepage-hello-signature">Marcus &amp; Chris<span>My Social Impact</span></p>
        </div>
        <form className="homepage-hello-form" aria-describedby="hello-availability" onSubmit={event => event.preventDefault()}>
          <p className="homepage-hello-availability" id="hello-availability">
            <strong>A first look — sending isn’t connected yet.</strong>
            This form won’t send or save your details. In the meantime, <a href="mailto:marcus@mysocialimpact.org">email Marcus directly <span aria-hidden="true">↗</span></a>.
          </p>
          {recognised && <p className="homepage-hello-account">We’ve filled in the email from your existing account.</p>}
          <label htmlFor="hello-email">Email address <span>Required</span></label>
          <input id="hello-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
          <label htmlFor="hello-message">Anything you’d like to share? <span>Optional</span></label>
          <textarea id="hello-message" name="message" rows={3} maxLength={3000} placeholder="A question, an idea, some feedback — or just hello!" />
          <label className="homepage-hello-consent" htmlFor="hello-newsletter">
            <input id="hello-newsletter" type="checkbox" name="newsletter" />
            <span>I’d also like occasional updates about SORP 2026 and our free tools.</span>
          </label>
          <p className="homepage-hello-privacy">Saying hello doesn’t create an account or sign you up for updates. <Link href="/privacy/">Privacy notice</Link>.</p>
          <button className="gateway-action" type="submit" disabled aria-describedby="hello-availability">Say hello <Arrow /></button>
          <p className="homepage-hello-small">Preview only. Nothing entered here is submitted.</p>
        </form>
      </div>
    </section>
  );
}
