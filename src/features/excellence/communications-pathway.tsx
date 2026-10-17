"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COMMUNICATIONS_STAGES, normaliseCommunicationsWorkspace, type CommunicationsWorkspace } from "./communications";

type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: { result?: unknown; communications?: unknown } }; error?: string };

export function CommunicationsPathway() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<CommunicationsWorkspace>();
  const [hasBaseline, setHasBaseline] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/communications/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Communications pathway could not be loaded."); setHasBaseline(Boolean(payload.productProgress?.data?.result)); setWorkspace(normaliseCommunicationsWorkspace(payload.productProgress?.data?.communications, payload.account)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Communications pathway could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open Communications.</h1><p>{error}</p><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Communications pathway…</p></section></main>;
  if (!hasBaseline) return <main className="sie-report"><section className="sie-state"><h1>Complete your baseline first.</h1><p>The five-pillar assessment gives your deeper Communications work the right context.</p><Link href="/social-impact-excellence/assessment/">Continue baseline assessment →</Link></section></main>;
  const assessmentComplete = workspace.status === "assessment_complete" || workspace.status === "evidence_submitted";
  const primaryHref = assessmentComplete ? "/social-impact-excellence/communications/evidence/" : "/social-impact-excellence/communications/assessment/";
  const primaryLabel = workspace.status === "evidence_submitted" ? "Review submitted pathway" : assessmentComplete ? "Continue to supporting evidence" : workspace.status === "draft" ? "Continue Communications Assessment" : "Start Communications Assessment";
  return <main className="sie-report sie-purpose-home sie-communications-home">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/journey/">Your journey</Link></header>
    <section className="sie-purpose-hero"><div><p className="sie-eyebrow">Pillar 05 · Communications</p><h1>Make your impact <em>clear, credible and understood.</em></h1><p>The Communications Pillar assesses how effectively your organisation explains its purpose, work, performance and social impact to the people who need to understand them.</p><Link href={primaryHref}>{primaryLabel} →</Link></div><div className="sie-purpose-mark"><span>05</span><strong>COMMUNICATIONS</strong><small>{workspace.progress}% complete</small></div></section>
    <section className="sie-leadership-intro"><div><p className="sie-eyebrow">Communications Pillar</p><h2>Technology-enabled.<br/><em>Expert-led.</em></h2><p className="sie-leadership-time">Estimated questionnaire completion time: approximately 20–30 minutes.</p></div><div>
      <p>Communications is how an organisation explains and demonstrates its work and impact to stakeholders. It includes both sharing information and listening, responding and engaging.</p>
      <p>This pillar examines clarity, evidence, transparency, accessibility, stakeholder dialogue, responsible storytelling, reporting and continuous improvement. It rewards effective, proportionate practice rather than publication volume, marketing spend or sophisticated software.</p>
      <p>Start with 20 maturity questions and five reflective questions. Your answers provide a provisional self-assessment, which My Social Impact considers alongside any supporting evidence and stakeholder interviews. We provide guidance, constructive challenge and professional review throughout.</p>
      <p>The process supports a Communications Diagnostic explaining your strengths, gaps and priorities, followed by a Communications Blueprint recommending practical improvements. Completing the questionnaire alone does not produce a verified diagnostic.</p>
      <blockquote><strong>Proportionate by design.</strong> A small organisation can demonstrate excellent communications through clear language, honest evidence, accessible dialogue and visible learning. A large budget, communications department or sophisticated software is never required for five-star maturity.</blockquote>
    </div></section>
    <section className="sie-purpose-stages"><div><p className="sie-eyebrow">Your Communications workflow</p><h2>From assessment to Blueprint.</h2><p>A bespoke implementation roadmap can be developed through a later consulting engagement.</p></div>{COMMUNICATIONS_STAGES.map((stage, index) => { const evidenceComplete = workspace.status === "evidence_submitted"; const complete = index === 0 ? assessmentComplete : index === 1 ? evidenceComplete : false; const current = index === 0 ? !assessmentComplete : index === 1 ? assessmentComplete && !evidenceComplete : false; return <article key={stage.title} className={complete ? "complete" : current ? "current" : "future"}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div><b>{complete ? index === 1 ? "Submitted" : "Complete" : current ? "Current stage" : stage.available ? "Available after previous stage" : "Coming later · adviser-led"}</b></article>; })}</section>
    <section className="sie-leadership-participants"><p className="sie-eyebrow">Additional Participants</p><h2>Coming Soon</h2><p>Multi-participant Communications assessment and perspective comparison are not yet available.</p><button type="button" disabled>Add participants</button></section>
    {workspace.score !== null && <section className="sie-purpose-score"><p>Provisional self-assessed Communications maturity — subject to MSI review.</p><strong>{workspace.score.toFixed(1)} <small>/ 5</small></strong><h2>{workspace.maturity}</h2><span>Not yet reviewed or verified by MSI.</span></section>}
  </main>;
}
