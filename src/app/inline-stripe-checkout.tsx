"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_live_51TmpEHFnN1aHQF6IYpnh7DW0aYI7LTsdKZRpIGG6zJnSPyNPYiUzgfx1CuLM4hLtXHUMhjMlCXLhTUcl8nyIpOtF00BLC5lNlM");

export function InlineStripeCheckout({ clientSecret, onComplete }: { clientSecret: string; onComplete: () => void | Promise<void> }) {
  const mount = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  const [error, setError] = useState("");
  useEffect(() => { complete.current = onComplete; }, [onComplete]);
  useEffect(() => {
    let cancelled = false;
    let checkout: StripeEmbeddedCheckout | null = null;
    void (async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe || !mount.current || cancelled) throw new Error("Secure payment could not be opened.");
        checkout = await stripe.initEmbeddedCheckout({ clientSecret, onComplete: () => { void complete.current(); } });
        if (cancelled || !mount.current) { checkout.destroy(); return; }
        checkout.mount(mount.current);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Secure payment could not be opened.");
      }
    })();
    return () => { cancelled = true; checkout?.destroy(); };
  }, [clientSecret]);
  return <div className="sp-inline-payment"><div ref={mount} aria-label="Secure inline Stripe payment"/>{error && <p role="alert" className="sp-error">{error}</p>}</div>;
}
