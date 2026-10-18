"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DELIVERY_STAGES, normaliseDeliveryWorkspace, type DeliveryWorkspace } from "./delivery";
import { PillarStartLink } from "./pillar-start-link";

type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: { result?: unknown; delivery?: unknown } }; error?: string };

export function DeliveryPathway() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<DeliveryWorkspace>();
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/delivery/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Delivery pathway could not be loaded."); setWorkspace(normaliseDeliveryWorkspace(payload.productProgress?.data?.delivery, payload.account)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Delivery pathway could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open Delivery.</h1><p>{error}</p><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Delivery pathway…</p></section></main>;
  const assessmentComplete = workspace.status === "assessment_complete" || workspace.status === "evidence_submitted";
  const primaryHref = assessmentComplete ? "/social-impact-excellence/delivery/evidence/" : "/social-impact-excellence/delivery/assessment/";
  const primaryLabel = workspace.status === "evidence_submitted" ? "Review submitted pathway" : assessmentComplete ? "Continue to supporting evidence" : workspace.status === "draft" ? "Continue Delivery Assessment" : "Start Delivery Assessment";
  return <main className="sie-report sie-purpose-home sie-delivery-home">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/journey/">Your journey</Link></header>
    <section className="sie-purpose-hero"><div><p className="sie-eyebrow">Pillar 04 · Delivery</p><h1>Where impact meets <em>operational and financial reality.</em></h1><p>The Delivery Pillar assesses how effectively your organisation translates its social impact ambitions into practical, financially informed action.</p><PillarStartLink pillar="delivery" href={primaryHref} label={primaryLabel} /></div><div className="sie-purpose-mark"><span>04</span><strong>DELIVERY</strong><small>{workspace.progress}% complete</small></div></section>
    <section className="sie-leadership-intro"><div><p className="sie-eyebrow">Delivery Pillar</p><h2>Technology-enabled.<br/><em>Expert-led.</em></h2><p className="sie-leadership-time">Estimated questionnaire completion time: approximately 20–30 minutes.</p></div><div>
      <p>Delivery is where social impact meets operational and financial reality. This pillar explores how people, money, programmes and operational resources are managed to create meaningful and sustainable social value.</p>
      <p>It examines whether budgets, programme costs, management information, forecasts and resource decisions genuinely inform delivery, alongside capacity, partnerships, quality, efficiency and adaptation.</p>
      <p>Start with 20 maturity questions and five reflective questions. Your answers provide a provisional self-assessment, which My Social Impact considers alongside any supporting evidence and stakeholder interviews. We provide guidance, constructive challenge and professional review throughout.</p>
      <p>The process supports a Delivery Diagnostic explaining your strengths, gaps and priorities, followed by a Delivery Blueprint recommending practical improvements. Completing the questionnaire alone does not produce a verified diagnostic.</p>
      <blockquote><strong>Proportionate by design.</strong> Mature practice does not require a large finance team or sophisticated software. A small organisation using reliable spreadsheets and thoughtful management discussions can demonstrate excellent delivery when its information is useful and consistently informs decisions.</blockquote>
    </div></section>
    <section className="sie-purpose-stages"><div><p className="sie-eyebrow">Your Delivery workflow</p><h2>From assessment to Blueprint.</h2><p>A bespoke implementation roadmap can be developed through a later consulting engagement.</p></div>{DELIVERY_STAGES.map((stage, index) => { const evidenceComplete = workspace.status === "evidence_submitted"; const complete = index === 0 ? assessmentComplete : index === 1 ? evidenceComplete : false; const current = index === 0 ? !assessmentComplete : index === 1 ? assessmentComplete && !evidenceComplete : false; return <article key={stage.title} className={complete ? "complete" : current ? "current" : "future"}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div><b>{complete ? index === 1 ? "Submitted" : "Complete" : current ? "Current stage" : stage.available ? "Available after previous stage" : "Coming later · adviser-led"}</b></article>; })}</section>
    <section className="sie-leadership-participants"><p className="sie-eyebrow">Additional Participants</p><h2>Coming Soon</h2><p>Multi-participant Delivery assessment and perspective comparison are not yet available.</p><button type="button" disabled>Add participants</button></section>
    {workspace.score !== null && <section className="sie-purpose-score"><p>Provisional self-assessed Delivery maturity — subject to MSI review.</p><strong>{workspace.score.toFixed(1)} <small>/ 5</small></strong><h2>{workspace.maturity}</h2><span>Not yet reviewed or verified by MSI.</span></section>}
  </main>;
}
