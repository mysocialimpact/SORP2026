"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";

// Stripe publishable keys identify the account in browser code; the secret key
// stays only in the existing payment service. This is the account's live key.
const stripePromise = loadStripe("pk_live_51TmpEHFnN1aHQF6IYpnh7DW0aYI7LTsdKZRpIGG6zJnSPyNPYiUzgfx1CuLM4hLtXHUMhjMlCXLhTUcl8nyIpOtF00BLC5lNlM");

export function SorpPublicSupportCheckout({ clientSecret, sessionId, onPaid }: { clientSecret: string; sessionId: string; onPaid: () => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const onPaidRef = useRef(onPaid);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => { onPaidRef.current = onPaid; }, [onPaid]);

  useEffect(() => {
    let cancelled = false;
    let checkout: StripeEmbeddedCheckout | null = null;
    async function verify() {
      if (cancelled) return;
      setChecking(true);
      try {
        // Stripe may finish the UI a moment before its session is marked paid.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const response = await fetch("/api/sorp-payments/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
          const result = await response.json();
          if (response.ok && result.status === "paid" && result.paymentType === "voluntary_support") {
            if (!cancelled) onPaidRef.current();
            return;
          }
          if (!response.ok || result.status === "expired") break;
          if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 750));
        }
        if (!cancelled) setError("Payment has not been confirmed yet. Please use Check payment status before trying again.");
      } catch {
        if (!cancelled) setError("We could not confirm the payment yet. Please check its status before trying again.");
      } finally { if (!cancelled) setChecking(false); }
    }
    async function attach() {
      try {
        const stripe = await stripePromise;
        if (!stripe || !mount.current || cancelled) throw new Error("Secure payment could not be opened.");
        checkout = await stripe.initEmbeddedCheckout({ clientSecret, onComplete: () => { void verify(); } });
        if (cancelled || !mount.current) { checkout.destroy(); return; }
        checkout.mount(mount.current);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Secure payment could not be opened.");
      }
    }
    void attach();
    return () => { cancelled = true; checkout?.destroy(); };
  }, [clientSecret, sessionId]);

  return <div className="sp-inline-payment"><div ref={mount} aria-label="Secure inline Stripe payment"/>{checking && <p role="status">Checking your payment securely…</p>}{error && <p role="alert" className="sp-error">{error}</p>}{error && <button type="button" className="sp-secondary" disabled={checking} onClick={() => { setError(""); void (async () => { try { const response = await fetch("/api/sorp-payments/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) }); const result = await response.json(); if (response.ok && result.status === "paid" && result.paymentType === "voluntary_support") onPaidRef.current(); else setError("Payment has not been confirmed. Please do not start another payment until you have checked with your bank."); } catch { setError("We could not confirm the payment. Please try checking its status again."); } })(); }}>CHECK PAYMENT STATUS</button>}</div>;
}
