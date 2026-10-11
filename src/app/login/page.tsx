import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPortal } from "@/components/account-portal";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <main id="main" className="gateway account-page">
    <section className="gateway-width account-page-grid">
      <div className="account-page-intro">
        <p className="gateway-kicker">One login · One platform</p>
        <h1>Your work.<br/><span>Ready when you are.</span></h1>
        <p>Continue your SORP readiness review and find every product in one clear place.</p>
      </div>
      <Suspense fallback={<p>Opening account…</p>}><AccountPortal /></Suspense>
    </section>
  </main>;
}
