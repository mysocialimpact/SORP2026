"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LEADERSHIP_STAGES, normaliseLeadershipWorkspace, type LeadershipWorkspace } from "./leadership";

type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: { result?: unknown; leadership?: unknown } }; error?: string };

export function LeadershipPathway() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<LeadershipWorkspace>();
  const [hasBaseline, setHasBaseline] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/leadership/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Leadership pathway could not be loaded."); setHasBaseline(Boolean(payload.productProgress?.data?.result)); setWorkspace(normaliseLeadershipWorkspace(payload.productProgress?.data?.leadership, payload.account)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Leadership pathway could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open Leadership.</h1><p>{error}</p><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Leadership pathway…</p></section></main>;
  if (!hasBaseline) return <main className="sie-report"><section className="sie-state"><h1>Complete your baseline first.</h1><p>The five-pillar assessment gives your deeper Leadership work the right context.</p><Link href="/social-impact-excellence/assessment/">Continue baseline assessment →</Link></section></main>;
  const assessmentComplete = workspace.status === "assessment_complete" || workspace.status === "evidence_submitted";
  const primaryHref = assessmentComplete ? "/social-impact-excellence/leadership/evidence/" : "/social-impact-excellence/leadership/assessment/";
  const primaryLabel = workspace.status === "evidence_submitted" ? "Review submitted pathway" : assessmentComplete ? "Continue to supporting evidence" : workspace.status === "draft" ? "Continue Leadership assessment" : "Begin Leadership assessment";
  return <main className="sie-report sie-purpose-home sie-leadership-home">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/journey/">Your journey</Link></header>
    <section className="sie-purpose-hero"><div><p className="sie-eyebrow">Pillar 02 · Leadership</p><h1>Turning commitment into <em>accountability.</em></h1><p>Strong social impact requires more than a compelling purpose. It requires leaders who take responsibility for making impact a genuine organisational priority.</p><Link href={primaryHref}>{primaryLabel} →</Link></div><div className="sie-purpose-mark"><span>02</span><strong>LEADERSHIP</strong><small>{workspace.progress}% complete</small></div></section>
    <section className="sie-leadership-intro"><div><p className="sie-eyebrow">Leadership: Turning Commitment into Accountability</p><h2>Technology-enabled.<br/><em>Expert-led.</em></h2><p className="sie-leadership-time">Estimated questionnaire completion time: 20–30 minutes.</p></div><div>
      <p>Leadership influences the decisions organisations make, the resources they allocate, the responsibilities they establish and the culture they create. Without effective leadership, even the strongest social impact ambitions can struggle to translate into meaningful progress.</p>
      <p>This diagnostic explores how your organisation&apos;s leadership approaches social impact, including governance, accountability, decision-making, organisational commitment and leadership capability.</p>
      <p>It combines your responses with supporting evidence and expert review by My Social Impact.</p>
      <p>The objective is to establish a more robust understanding of your current Leadership maturity, expressed as a score out of five stars.</p>
      <p>This will help identify strengths, gaps and opportunities, providing the foundation for a Leadership Blueprint and practical recommendations for improvement.</p>
      <blockquote>My Social Impact provides guidance, challenge and professional review throughout the process. Completing the questionnaire alone does not produce a verified diagnostic.</blockquote>
    </div></section>
    <section className="sie-purpose-stages"><div><p className="sie-eyebrow">Your Leadership workflow</p><h2>From assessment to Blueprint.</h2><p>MSI provides professional review, leadership interviews, governance assessment, constructive challenge, interpretation and recommendations. A bespoke implementation roadmap remains a later consulting engagement.</p></div>{LEADERSHIP_STAGES.map((stage, index) => { const evidenceComplete = workspace.status === "evidence_submitted"; const complete = index === 0 ? assessmentComplete : index === 1 ? evidenceComplete : false; const current = index === 0 ? !assessmentComplete : index === 1 ? assessmentComplete && !evidenceComplete : false; return <article key={stage.title} className={complete ? "complete" : current ? "current" : "future"}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div><b>{complete ? index === 1 ? "Submitted" : "Complete" : current ? "Current stage" : stage.available ? "Available after previous stage" : "Coming later · adviser-led"}</b></article>; })}</section>
    <section className="sie-leadership-participants"><p className="sie-eyebrow">Additional Participants</p><h2>Coming Soon</h2><p>Multi-participant Leadership assessment and perspective comparison are not yet available.</p><button type="button" disabled>Add participants</button></section>
    {workspace.score !== null && <section className="sie-purpose-score"><p>Provisional self-assessed Leadership maturity — subject to MSI review.</p><strong>{workspace.score.toFixed(1)} <small>/ 5</small></strong><h2>{workspace.maturity}</h2><span>Not yet reviewed or verified by MSI.</span></section>}
  </main>;
}
