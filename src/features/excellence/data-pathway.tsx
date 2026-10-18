"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DATA_STAGES, normaliseDataWorkspace, type DataWorkspace } from "./data";
import { PillarStartLink } from "./pillar-start-link";

type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: { result?: unknown; data?: unknown } }; error?: string };

export function DataPathway() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<DataWorkspace>();
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/data/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Data pathway could not be loaded."); setWorkspace(normaliseDataWorkspace(payload.productProgress?.data?.data, payload.account)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Data pathway could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open Data.</h1><p>{error}</p><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Data pathway…</p></section></main>;
  const assessmentComplete = workspace.status === "assessment_complete" || workspace.status === "evidence_submitted";
  const primaryHref = assessmentComplete ? "/social-impact-excellence/data/evidence/" : "/social-impact-excellence/data/assessment/";
  const primaryLabel = workspace.status === "evidence_submitted" ? "Review submitted pathway" : assessmentComplete ? "Continue to supporting evidence" : workspace.status === "draft" ? "Continue Data Assessment" : "Start Data Assessment";
  return <main className="sie-report sie-purpose-home sie-data-home">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/journey/">Your journey</Link></header>
    <section className="sie-purpose-hero"><div><p className="sie-eyebrow">Pillar 03 · Data</p><h1>Understand the <em>difference you make.</em></h1><p>Credible information helps you understand what is changing, for whom, and how your organisation may be contributing. It also helps you recognise what you do not yet know and decide where better evidence would be useful.</p><PillarStartLink pillar="data" href={primaryHref} label={primaryLabel} /></div><div className="sie-purpose-mark"><span>03</span><strong>DATA</strong><small>{workspace.progress}% complete</small></div></section>
    <section className="sie-leadership-intro"><div><p className="sie-eyebrow">Data Pillar</p><h2>Technology-enabled.<br/><em>Expert-led.</em></h2><p className="sie-leadership-time">Estimated questionnaire completion time: approximately 20–30 minutes.</p></div><div>
      <p>The Data Pillar explores how you select indicators, gather evidence, maintain its quality, interpret findings and use what you learn. It values people&apos;s experiences alongside numbers and takes a proportionate approach: useful, trustworthy evidence matters more than the volume of data or sophistication of your software.</p>
      <p>Start with 20 maturity questions and five reflective questions. Your answers provide a provisional self-assessment, which My Social Impact considers alongside any supporting evidence and stakeholder interviews. We provide guidance, constructive challenge and professional review throughout.</p>
      <p>The process supports a Data Diagnostic explaining your strengths, gaps and priorities, followed by a Data Blueprint recommending practical improvements. Completing the questionnaire alone does not produce a verified diagnostic.</p>
      <blockquote><strong>Rating guidance.</strong> Choose the description that best reflects your usual current practice across the relevant work. Rate what happens in practice, rather than what is planned or achieved occasionally. Read the question-specific star descriptions if you are unsure.<br/><br/>If practice varies, choose the closest overall fit and explain the variation in the optional comment. If you cannot judge a question, leave it unanswered and tell us why. My Social Impact can help you work through it.<br/><br/><strong>Proportionality note.</strong> Consistent practice means practice applied when it is relevant and useful. It does not mean collecting the same information for every activity or person.</blockquote>
    </div></section>
    <section className="sie-purpose-stages"><div><p className="sie-eyebrow">Your Data workflow</p><h2>From assessment to Blueprint.</h2><p>A bespoke implementation roadmap can be developed through a later consulting engagement.</p></div>{DATA_STAGES.map((stage, index) => { const evidenceComplete = workspace.status === "evidence_submitted"; const complete = index === 0 ? assessmentComplete : index === 1 ? evidenceComplete : false; const current = index === 0 ? !assessmentComplete : index === 1 ? assessmentComplete && !evidenceComplete : false; return <article key={stage.title} className={complete ? "complete" : current ? "current" : "future"}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div><b>{complete ? index === 1 ? "Submitted" : "Complete" : current ? "Current stage" : stage.available ? "Available after previous stage" : "Coming later · adviser-led"}</b></article>; })}</section>
    <section className="sie-leadership-participants"><p className="sie-eyebrow">Additional Participants</p><h2>Coming Soon</h2><p>Multi-participant Data assessment and perspective comparison are not yet available.</p><button type="button" disabled>Add participants</button></section>
    {workspace.score !== null && <section className="sie-purpose-score"><p>Provisional self-assessed Data maturity — subject to MSI review.</p><strong>{workspace.score.toFixed(1)} <small>/ 5</small></strong><h2>{workspace.maturity}</h2><span>Not yet reviewed or verified by MSI.</span></section>}
  </main>;
}
