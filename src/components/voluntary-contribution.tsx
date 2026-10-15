"use client";

import { useState } from "react";
import Link from "next/link";
import { SorpPublicSupportCheckout } from "@/app/sorp-public-support-checkout";
import { supportPence, type SupportChoice } from "@/app/sorp-payment-amounts";

type Checkout = { clientSecret: string; sessionId: string };

export function useVoluntaryContribution({
  sessionId,
  organisation,
  email,
  onStarted,
  onPaid,
}: {
  sessionId: string;
  organisation?: string;
  email?: string;
  onStarted?: (amountMinor: number) => void;
  onPaid?: () => void;
}) {
  const [support, setSupport] = useState<SupportChoice>(5);
  const [custom, setCustom] = useState("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amountMinor = supportPence(support, custom);

  async function contribute() {
    if (!amountMinor || !sessionId || busy) return;
    setBusy(true);
    setError("");
    onStarted?.(amountMinor);
    try {
      const response = await fetch("/api/sorp-payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentType: "voluntary_support",
          presentation: "embedded",
          band: null,
          amountMinor,
          sessionId,
          organisation,
          email,
          idempotencyKey: `${sessionId}:support:${amountMinor}:${crypto.randomUUID()}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.presentation !== "embedded" || !data.clientSecret || !data.id) {
        throw new Error(data.error || "Inline payment could not be opened. No payment was taken.");
      }
      setCheckout({ clientSecret: data.clientSecret, sessionId: data.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inline payment could not open. No payment was taken.");
    } finally {
      setBusy(false);
    }
  }

  function paid() {
    setCheckout(null);
    setError("");
    onPaid?.();
  }

  return {
    support,
    setSupport,
    custom,
    setCustom,
    checkout,
    busy,
    error,
    amountMinor,
    contribute,
    paid,
    close: () => setCheckout(null),
  };
}

type Contribution = ReturnType<typeof useVoluntaryContribution>;

export function VoluntaryContributionControls({
  contribution,
  paid,
  variant,
  showSubmit = false,
}: {
  contribution: Contribution;
  paid: boolean;
  variant: "assessment" | "homepage";
  showSubmit?: boolean;
}) {
  if (paid) {
    return <p className={variant === "assessment" ? "scr-mail" : "gateway-contribution-thanks"} role="status">Thank you. That genuinely helps ✓</p>;
  }
  if (contribution.checkout) {
    return <div className={variant === "homepage" ? "gateway-contribution-checkout" : undefined}>
      <SorpPublicSupportCheckout clientSecret={contribution.checkout.clientSecret} sessionId={contribution.checkout.sessionId} onPaid={contribution.paid} />
      <button type="button" className={variant === "assessment" ? "scr-clear" : "gateway-contribution-close"} onClick={contribution.close}>{variant === "assessment" ? "CLOSE PAYMENT AND STAY HERE" : "Close payment and stay here"}</button>
    </div>;
  }
  return <div className={variant === "homepage" ? "gateway-contribution-controls" : undefined}>
    <div className={variant === "assessment" ? "scr-amounts" : "gateway-contribution-amounts"} aria-label="Choose a voluntary contribution">
      {([5, 10, 20, "other"] as const).map(amount => <button key={amount} type="button" aria-pressed={contribution.support === amount} onClick={() => contribution.setSupport(amount)}>{amount === "other" ? (variant === "assessment" ? "OTHER" : "Other") : `£${amount}`}</button>)}
    </div>
    {contribution.support === "other" && <label className={variant === "assessment" ? "scr-context" : "gateway-contribution-custom"}>Amount in pounds<div><span aria-hidden="true">£</span><input aria-label="Custom contribution amount in pounds" inputMode="decimal" value={contribution.custom} onChange={event => contribution.setCustom(event.target.value)} /></div><small>Between £1 and £1,000</small></label>}
    {contribution.error && <p className="gateway-contribution-error" role="alert">{contribution.error}</p>}
    {showSubmit && <button className="gateway-contribution-submit" type="button" disabled={contribution.busy || !contribution.amountMinor} onClick={() => void contribution.contribute()}>{contribution.busy ? "Opening secure payment…" : "Make a voluntary contribution →"}</button>}
  </div>;
}

export function HomepageContribution({ mission = false }: { mission?: boolean }) {
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    const key = "sorp2026-home-contribution-session";
    try {
      const id = window.localStorage.getItem(key) || crypto.randomUUID();
      window.localStorage.setItem(key, id);
      return id;
    } catch {
      return crypto.randomUUID();
    }
  });
  const [paid, setPaid] = useState(false);
  const contribution = useVoluntaryContribution({ sessionId, onPaid: () => setPaid(true) });
  return <section className="gateway-contribution" id="home-support" aria-labelledby="contribution-title">
    <div className="gateway-width gateway-contribution-inner">
      <div className="gateway-contribution-copy">
        <p className="gateway-kicker">Help the next charity</p>
        <h2 id="contribution-title">{mission ? "Found the tools useful? Help us make more." : <>Help the next charity find this useful.<br />Help us keep it free.</>}</h2>
        {mission ? <>
          <p>You don’t need to use our consultancy services to be part of this. If our free tools give you what you need, that’s a result we’re proud of.</p>
          <p>If you’d like to support our mission, a few pounds helps us keep these tools free, improve them and build more for smaller charities and organisations.</p>
          <p>Use what helps. Give if you can. Every contribution is entirely voluntary.</p>
        </> : <>
          <p>We make as much of this platform free as we possibly can. Human review is there if you want it.</p>
          <p>If the free tools have helped you, an entirely voluntary contribution helps us keep them free and reach more charities, especially smaller ones.</p>
          <Link className="gateway-mission-cta" href="/our-mission/">New here? Discover our mission →</Link>
        </>}
      </div>
      <div className="gateway-contribution-panel">
        <span>Entirely voluntary</span>
        <h3>Help the next charity.</h3>
        <p>Give only if you want to. The tools remain free either way.</p>
        <VoluntaryContributionControls contribution={contribution} paid={paid} variant="homepage" showSubmit />
        <small>One-off voluntary contribution through Stripe. This is not described as a charitable donation or Gift Aid contribution.</small>
      </div>
    </div>
  </section>;
}
