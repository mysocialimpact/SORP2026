"use client";

import { useEffect, useState } from "react";

type Status = { status: "paid" | "pending" | "expired"; paymentType: "human_review" | "voluntary_support"; band: string; amountMinor: number; email: string };

export function SorpPaymentReturn() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "cancelled") { // eslint-disable-next-line react-hooks/set-state-in-effect
      setCancelled(true); setChecking(false); return;
    }
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setError("That payment reference is missing."); setChecking(false); return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/sorp-payments/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
        const data = await response.json() as Status & { error?: string };
        if (!response.ok) throw new Error(data.error || "We could not verify that payment.");
        setStatus(data);
      } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not verify that payment yet."); }
      finally { setChecking(false); }
    })();
  }, []);

  if (cancelled) return <main className="sorp-payment-return"><section><span>Checkout cancelled</span><h1>No payment was taken.</h1><p>Your free readiness result and conversation are still saved in this browser.</p><a href="/are-you-sorp-ready/conversation">Return to my result <b>→</b></a></section></main>;
  if (checking) return <main className="sorp-payment-return"><section><span>Secure payment</span><h1>Checking your payment…</h1><p>We’re confirming it with Stripe before showing it as paid.</p></section></main>;
  if (error || !status || status.status !== "paid") return <main className="sorp-payment-return"><section><span>Payment not yet confirmed</span><h1>We haven’t marked this as paid.</h1><p>{error || "Stripe has not confirmed this payment yet. If you completed checkout, wait a moment and refresh this page."}</p><button type="button" onClick={() => window.location.reload()}>Check again</button><a href="/are-you-sorp-ready/conversation">Return to my result <b>→</b></a></section></main>;

  const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(status.amountMinor / 100);
  if (status.paymentType === "voluntary_support") return <main className="sorp-payment-return"><section><span>Payment confirmed · {amount}</span><h1>Thank you. Genuinely.</h1><p>Your support helps us keep the readiness tool free and useful for smaller charities. No further action is needed.</p><a href="/are-you-sorp-ready/conversation">Return to my free result <b>→</b></a></section></main>;
  return <main className="sorp-payment-return"><section><span>Payment confirmed · {amount}</span><h1>Your human review is paid.</h1><p>We’ll now arrange your 60-minute SORP 2026 Impact Readiness Review. Your free result remains saved in this browser.</p><a href={`mailto:marcus@mysocialimpact.org?subject=${encodeURIComponent("Arrange my SORP 2026 Impact Readiness Review")}`}>Email Marcus to arrange a time <b>↗</b></a><a href="/are-you-sorp-ready/conversation">Return to my result <b>→</b></a></section></main>;
}
