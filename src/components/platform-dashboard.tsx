"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FounderConsoleLink } from "./console/founder-link";
import { Arrow } from "@/components/ui";

type Account = { name: string; email: string; position: string; organisation?: string; lastSavedAt?: string };
type Progress = { step?: string; candidate?: { name?: string }; report?: unknown; sessionId?: string; criterion?: number; corrections?: Record<string, { reviewed?: boolean }> };
type AccountResponse = { signedIn?: boolean; account?: Account; progress?: Progress; error?: string };
type ExcellenceProgress = { status?: string; data?: { answers?: Array<number | null>; result?: unknown; purpose?: { status?: string; progress?: number }; migration?: { source?: string } } };
type ReportReview = { id: string; filename: string; status: string; feedbackReady?: boolean };
type TeamWorkspaceSummary = { organisation?: { programme?: string; name?: string }; invitations?: Array<{ status?: string }> };

const completeSteps = new Set(["report-ready", "report", "email-ready", "final-feedback", "support", "before-go", "next", "help", "done"]);
const untouchedSteps = new Set([undefined, "scope", "public-methodology", "intro", "benefits", "find"]);
const readinessPhases = [
  ["scope", "public-methodology", "intro", "benefits"],
  ["find", "confirmation", "account"],
  ["homework", "tar-recovery"],
  ["assessment", "quick-generating"],
  ["quick-ready", "quick", "quick-feedback"],
  ["method", "criterion", "complete"],
  ["generating", "report-ready", "report", "email-ready"],
  ["final-feedback", "support", "before-go", "next", "help", "done"],
];

function readinessPercentage(progress: Progress, started: boolean, complete: boolean) {
  if (complete) return 100;
  if (!started || !progress.step) return 0;
  const phase = Math.max(0, readinessPhases.findIndex(steps => steps.includes(progress.step || "")));
  const reviewed = Object.values(progress.corrections || {}).filter(item => item.reviewed).length;
  const withinPhase = progress.step === "criterion" ? Math.min(reviewed / 21, 1) : 0.35;
  return Math.min(99, Math.max(1, Math.round(((phase + withinPhase) / readinessPhases.length) * 100)));
}

function reportReviewPercentage(review?: ReportReview) {
  if (!review) return 0;
  if (review.feedbackReady) return 100;
  if (review.status === "awaiting_payment") return 25;
  if (review.status.includes("paid")) return 55;
  if (review.status.includes("review")) return 80;
  return 40;
}

type ProductProgress = { number: string; name: string; status: string; percentage: number; unavailable?: boolean };

function ProductProgressBar({ products }: { products: ProductProgress[] }) {
  return <section className="dashboard-progress" aria-labelledby="dashboard-progress-title">
    <header>
      <p className="gateway-kicker">Your progress across all six products</p>
      <h2 id="dashboard-progress-title">Where you are.</h2>
    </header>
    <ol>
      {products.map(product => <li key={product.number} className={product.unavailable ? "is-unavailable" : product.percentage > 0 ? "is-started" : ""}>
        <div><span>{product.number}</span><strong>{product.name}</strong></div>
        <div className="dashboard-progress-track" role="progressbar" aria-label={`${product.name}: ${product.status}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={product.percentage}>
          <span style={{ width: `${product.percentage}%` }} />
        </div>
        <p>{product.status}<b>{product.unavailable ? "—" : `${product.percentage}%`}</b></p>
      </li>)}
    </ol>
  </section>;
}

export function PlatformDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AccountResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [excellence, setExcellence] = useState<ExcellenceProgress | null>(null);
  const [reportReviews, setReportReviews] = useState<ReportReview[]>([]);
  const [teamWorkspace, setTeamWorkspace] = useState<TeamWorkspaceSummary | null>(null);
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
      fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "team-workspace" }), signal: controller.signal, cache: "no-store" }).then(async response => ({ response, payload: await response.json() })),
    ]).then(([excellenceResult, reviewResult, teamResult]) => {
      if (excellenceResult.response.ok) setExcellence(excellenceResult.payload.productProgress || null);
      if (reviewResult.response.ok) setReportReviews(reviewResult.payload.reviews || []);
      if (teamResult.response.ok) setTeamWorkspace(teamResult.payload);
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
  const purposeStarted = Boolean(purposeStatus && purposeStatus !== "not_started");
  const purposeProgress = Math.max(0, Math.min(100, excellence?.data?.purpose?.progress || 0));
  const excellenceLabel = purposeStatus === "complete" ? "Purpose pathway complete" : purposeStarted ? `Baseline complete · Purpose started` : excellenceComplete ? "Baseline complete" : excellenceAnswered ? `${excellenceAnswered} of 25 answered` : "Ready to start";
  const teamActive = ["team", "excellence"].includes(teamWorkspace?.organisation?.programme || "");
  const teamCompleted = teamWorkspace?.invitations?.filter(item => item.status === "completed").length || 0;
  const latestReportReview = reportReviews[0];
  const readinessPercent = readinessPercentage(progress, readinessStarted, readinessComplete);
  // The baseline is a completed first stage, so opening Purpose must never make
  // the product appear to fall backwards from complete to zero progress.
  const excellencePercent = excellenceComplete
    ? purposeStatus === "complete" ? 100 : purposeStarted ? Math.round(20 + purposeProgress * 0.8) : 20
    : Math.round(excellenceAnswered / 25 * 20);
  const reportPercent = reportReviewPercentage(latestReportReview);
  const productProgress: ProductProgress[] = [
    { number: "01", name: "Are You SORP Ready?", status: readinessComplete ? "Complete" : readinessStarted ? "In progress" : "Not started", percentage: readinessPercent },
    { number: "02", name: "Ask SORP", status: "Live beta · separate service", percentage: 0, unavailable: true },
    { number: "03", name: "Charity Impact Reports", status: reportPercent === 100 ? "Complete" : reportPercent > 0 ? "In progress" : "Not started", percentage: reportPercent },
    { number: "04", name: "Social Impact Excellence", status: excellencePercent === 100 ? "Complete" : excellencePercent > 0 ? "In progress" : "Not started", percentage: excellencePercent },
    { number: "05", name: "Purpose Works", status: "Not started", percentage: 0 },
    { number: "06", name: "My Impact Director", status: "Not started", percentage: 0 },
  ];
  return <>
    <FounderConsoleLink />
    <header className="dashboard-welcome">
      <div><p className="gateway-kicker">My SORP2026</p><h1>Welcome back, <span>{firstName}.</span></h1><p>{data.account.organisation || data.account.email}</p></div>
      <button type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
    </header>
    <ProductProgressBar products={productProgress} />
    <section className="dashboard-product-group dashboard-product-group--sorp" aria-labelledby="dashboard-sorp-title">
      <header><p className="gateway-kicker">SORP 2026</p><h2 id="dashboard-sorp-title">Your SORP tools.</h2><p>Understand the new reporting requirements and see how ready your charity is.</p></header>
      <div className="dashboard-products">
        <article className="dashboard-card is-ready">
          <div className="dashboard-card-top"><span>01 · Live beta</span><b>{readinessComplete ? "Review complete" : readinessStarted ? "In progress" : "Ready to start"}</b></div>
          <h2>Are You<br/>SORP Ready?</h2>
          {progress.candidate?.name && <p className="dashboard-context">{progress.candidate.name}</p>}
          <Link href={readinessHref}>{readinessLabel} <Arrow /></Link>
        </article>
        <article className="dashboard-card is-ask"><div className="dashboard-card-top"><span>02 · Live beta</span><b>Available now</b></div><h2>Ask SORP.</h2><p>Ask evidence-led questions across the whole SORP. The live beta currently keeps its conversation access separate, so no fictional history is shown here.</p><Link href="/ask-sorp/">Open Ask SORP <Arrow /></Link></article>
      </div>
    </section>
    <section className="dashboard-product-group dashboard-product-group--impact" aria-labelledby="dashboard-impact-title">
      <header><p className="gateway-kicker">Beyond reporting</p><h2 id="dashboard-impact-title">Strengthen your impact.</h2><p>Practical tools and human expertise for understanding, improving and communicating the difference you make.</p></header>
      <div className="dashboard-products">
        <article className="dashboard-card is-reports"><div className="dashboard-card-top"><span>03</span><b>{latestReportReview ? latestReportReview.feedbackReady ? "Feedback ready" : latestReportReview.status === "awaiting_payment" ? "Report uploaded" : latestReportReview.status.replaceAll("_", " ") : "Available"}</b></div><Image src="/product/charity-impact-reports.png" alt="Charity Impact Reports" width={1787} height={887}/><p>{latestReportReview ? latestReportReview.filename : "£100 written review and a 60-minute expert discussion."}</p><Link href="/charity-impact-reports/review/">{latestReportReview ? "View review status" : "Start report review"} <Arrow /></Link></article>
        <article className="dashboard-card is-excellence"><div className="dashboard-card-top"><span>04</span><b>{teamActive ? `Team · ${teamCompleted} complete` : excellenceLabel}</b></div><Image src="/assets/social-impact-excellence-transparent.png" alt="Social Impact Excellence" width={1200} height={1200}/>{excellence?.data?.migration?.source === "legacy-social-impact-excellence" ? <p className="dashboard-context">Your previous assessment has been brought into this account.</p> : null}<p>{teamActive ? `${teamWorkspace?.organisation?.name || "Your organisation"} has a shared Team Perspective. Invite colleagues and see the protected combined result here.` : excellenceComplete ? purposeStarted ? "Your completed baseline is safe here. Continue with the Purpose pathway when you are ready." : "Your five-pillar baseline and deeper Purpose pathway are connected to this account." : "Assess your charity across Purpose, Leadership, Data, Delivery and Communication."}</p><Link href={teamActive ? "/social-impact-excellence/team/" : excellenceComplete ? "/social-impact-excellence/journey/" : "/social-impact-excellence/assessment/"}>{teamActive ? "Open Team Perspective" : excellenceComplete ? "Continue your journey" : excellenceAnswered ? "Continue assessment" : "Start assessment"} <Arrow /></Link></article>
        <article className="dashboard-card is-purpose"><div className="dashboard-card-top"><span>05</span><b>Explore</b></div><Image src="/product/purpose-works-wordmark.png" alt="Purpose Works" width={1942} height={809}/><p>Turn purpose into meaningful action and credible communication.</p><Link href="/purpose-works/">Explore Purpose Works <Arrow /></Link></article>
        <article className="dashboard-card is-director"><div className="dashboard-card-top"><span>06</span><b>Explore</b></div><h2>My <em>Impact</em><br/>Director</h2><p>Ongoing senior impact expertise for charities.</p><Link href="/my-impact-director/">Explore support <Arrow /></Link></article>
      </div>
    </section>
  </>;
}
