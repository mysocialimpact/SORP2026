import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeDestination } from "@/lib/onboarding/state";
import { Suspense } from "react";
import { AccountPortal } from "@/components/account-portal";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const value = typeof params.return === "string" ? params.return : typeof params.next === "string" ? params.next : "/dashboard/";
  if (params.mode === "signup" && !value.startsWith("/invitation/")) redirect(`/get-started/?next=${encodeURIComponent(safeDestination(value))}`);
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
