"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Arrow } from "@/components/ui";

type Account = { name: string; email: string; position: string; organisation?: string; lastSavedAt?: string };
type Progress = { step?: string; candidate?: { name?: string }; report?: unknown; sessionId?: string };
type AccountResponse = { signedIn?: boolean; account?: Account; progress?: Progress; error?: string };
type ExcellenceProgress = { status?: string; data?: { answers?: Array<number | null>; result?: unknown; purpose?: { status?: string; progress?: number } } };
type ReportReview = { id: string; filename: string; status: string; feedbackReady?: boolean };

const completeSteps = new Set(["report-ready", "report", "email-ready", "final-feedback", "support", "before-go", "next", "help", "done"]);
const untouchedSteps = new Set([undefined, "scope", "public-methodology", "intro", "benefits", "find"]);

export function PlatformDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AccountResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [excellence, setExcellence] = useState<ExcellenceProgress | null>(null);
  const [reportReviews, setReportReviews] = useState<ReportReview[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401 || payload.signedIn === false) setData({ signedIn: false });
        else if (!response.ok) throw new Error(payload.error || "Your account could not be loaded.");
        else setData(payload);
      })
      .catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Your account could not be loaded."); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!data?.signedIn) return;
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), signal: controller.signal, cache: "no-store" }).then(async response => ({ response, payload: await response.json() })),
      fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "list-report-reviews" }), signal: controller.signal, cache: "no-store" }).then(async response => ({ response, payload: await response.json() })),
    ]).then(([excellenceResult, reviewResult]) => {
      if (excellenceResult.response.ok) setExcellence(excellenceResult.payload.productProgress || null);
      if (reviewResult.response.ok) setReportReviews(reviewResult.payload.reviews || []);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [data?.signedIn]);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    const response = await fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    if (response.ok) { router.push("/"); router.refresh(); }
    else { setError("Sign out did not complete. Please try again."); setBusy(false); }
  }
  if (error) return <div className="dashboard-state" role="alert"><h2>We couldn’t open your dashboard.</h2><p>{error}</p><Link href="/login/">Try logging in again</Link></div>;
  if (!data) return <div className="dashboard-state" role="status"><h2>Opening your dashboard…</h2></div>;
  if (!data.signedIn || !data.account) return <div className="dashboard-state"><h2>Log in to see your dashboard.</h2><p>Your existing readiness review will still be there.</p><Link className="gateway-action" href="/login/?return=/dashboard/">Log in <Arrow /></Link></div>;
  const progress = data.progress || {};
  const readinessComplete = completeSteps.has(progress.step || "");
  const readinessStarted = Boolean(progress.sessionId) && !untouchedSteps.has(progress.step);
  const readinessHref = readinessComplete ? "/are-you-sorp-ready/review/" : readinessStarted ? "/are-you-sorp-ready/review/" : "/are-you-sorp-ready/review/?entry=intro";
  const readinessLabel = readinessComplete ? "Open your report" : readinessStarted ? "Continue assessment" : "Start free review";
  const firstName = data.account.name.split(/\s+/)[0];
  const excellenceAnswered = excellence?.data?.answers?.filter(answer => answer !== null).length || 0;
  const excellenceComplete = excellence?.status === "complete" && Boolean(excellence.data?.result);
  const purposeStatus = excellence?.data?.purpose?.status;
  const excellenceLabel = purposeStatus === "complete" ? "Purpose pathway complete" : purposeStatus && purposeStatus !== "not_started" ? `Purpose · ${excellence.data?.purpose?.progress || 0}%` : excellenceComplete ? "Baseline complete" : excellenceAnswered ? `${excellenceAnswered} of 25 answered` : "Ready to start";
  const latestReportReview = reportReviews[0];
  return <>
    <header className="dashboard-welcome">
      <div><p className="gateway-kicker">My SORP2026</p><h1>Welcome back, <span>{firstName}.</span></h1><p>{data.account.organisation || data.account.email}</p></div>
      <button type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
    </header>
    <section className="dashboard-products" aria-label="Your products">
      <article className="dashboard-card is-ready">
        <div className="dashboard-card-top"><span>01 · Live beta</span><b>{readinessComplete ? "Review complete" : readinessStarted ? "In progress" : "Ready to start"}</b></div>
        <h2>Are You<br/>SORP Ready?</h2>
        {progress.candidate?.name && <p className="dashboard-context">{progress.candidate.name}</p>}
        <Link href={readinessHref}>{readinessLabel} <Arrow /></Link>
      </article>
      <article className="dashboard-card is-ask"><div className="dashboard-card-top"><span>02</span><b>Coming soon</b></div><h2>Ask SORP.</h2><p>Whole-SORP guidance is in development. No inactive chatbot, no fictional history.</p><Link href="/ask-sorp/">See what’s coming <Arrow /></Link></article>
      <article className="dashboard-card is-director"><div className="dashboard-card-top"><span>03</span><b>Explore</b></div><h2>My <em>Impact</em><br/>Director</h2><p>Ongoing senior impact expertise for charities.</p><Link href="/my-impact-director/">Explore support <Arrow /></Link></article>
      <article className="dashboard-card is-excellence"><div className="dashboard-card-top"><span>04</span><b>{excellenceLabel}</b></div><Image src="/product/social-impact-excellence.svg" alt="Social Impact Excellence" width={1600} height={500}/><p>{excellenceComplete ? "Your five-pillar baseline and deeper Purpose pathway are connected to this account." : "Assess your charity across Purpose, Leadership, Data, Delivery and Communication."}</p><Link href={excellenceComplete ? "/social-impact-excellence/journey/" : "/social-impact-excellence/assessment/"}>{excellenceComplete ? "Continue your journey" : excellenceAnswered ? "Continue assessment" : "Start assessment"} <Arrow /></Link></article>
      <article className="dashboard-card is-reports"><div className="dashboard-card-top"><span>05</span><b>{latestReportReview ? latestReportReview.feedbackReady ? "Feedback ready" : latestReportReview.status === "awaiting_payment" ? "Report uploaded" : latestReportReview.status.replaceAll("_", " ") : "Available"}</b></div><Image src="/product/charity-impact-reports.png" alt="Charity Impact Reports" width={1787} height={887}/><p>{latestReportReview ? latestReportReview.filename : "£100 written review and a 60-minute expert discussion."}</p><Link href="/charity-impact-reports/review/">{latestReportReview ? "View review status" : "Start report review"} <Arrow /></Link></article>
      <article className="dashboard-card is-purpose"><div className="dashboard-card-top"><span>06</span><b>Explore</b></div><Image src="/product/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809}/><p>Turn purpose into meaningful action and credible communication.</p><Link href="/purpose-works/">Explore Purpose Works <Arrow /></Link></article>
    </section>
  </>;
}
