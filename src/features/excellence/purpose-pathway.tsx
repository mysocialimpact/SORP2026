"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { normalisePurposeWorkspace, PURPOSE_STAGES, type PurposeWorkspace } from "./purpose";
import { PillarStartLink } from "./pillar-start-link";

type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: { result?: unknown; purpose?: unknown } }; error?: string };

export function PurposePathway() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<PurposeWorkspace>();
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const payload = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/purpose/"))); return; } if (!response.ok) throw new Error(payload.error || "Your Purpose pathway could not be loaded."); setWorkspace(normalisePurposeWorkspace(payload.productProgress?.data?.purpose, payload.account)); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your Purpose pathway could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open Purpose.</h1><p>{error}</p><Link href="/social-impact-excellence/journey/">Return to your journey</Link></section></main>;
  if (!workspace) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Purpose pathway…</p></section></main>;
  const assessmentComplete = workspace.status === "assessment_complete" || workspace.status === "complete";
  const primaryHref = assessmentComplete ? "/social-impact-excellence/purpose/evidence/" : "/social-impact-excellence/purpose/assessment/";
  const primaryLabel = assessmentComplete ? workspace.status === "complete" ? "Review completed pathway" : "Continue to supporting evidence" : workspace.status === "draft" ? "Continue Purpose assessment" : "Begin Purpose assessment";
  return <main className="sie-report sie-purpose-home">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/social-impact-excellence/journey/">Your journey</Link></header>
    <section className="sie-purpose-hero"><div><p className="sie-eyebrow">Pillar 01 · Purpose</p><h1>Define the change you <em>exist to create.</em></h1><p>Purpose is the foundation of Social Impact Excellence. A clear purpose helps charities make decisions, align people and focus on the change that matters.</p><PillarStartLink pillar="purpose" href={primaryHref} label={primaryLabel} /></div><div className="sie-purpose-mark"><span>01</span><strong>PURPOSE</strong><small>{workspace.progress}% complete</small></div></section>
    <section className="sie-purpose-intro"><div><p className="sie-eyebrow">A guided diagnostic</p><h2>Technology with <em>expert review.</em></h2></div><div><p>This established diagnostic combines 20 structured maturity questions, five open reflections and supporting evidence for review by My Social Impact.</p><blockquote>This is not an automated judgement. Your preliminary score remains subject to evidence review and constructive challenge.</blockquote></div></section>
    <section className="sie-purpose-stages"><div><p className="sie-eyebrow">Your Purpose workflow</p><h2>From assessment to Blueprint.</h2></div>{PURPOSE_STAGES.map((stage, index) => { const complete = index === 0 ? assessmentComplete : index === 1 ? workspace.status === "complete" : false; const current = index === 0 ? !assessmentComplete : index === 1 ? assessmentComplete && workspace.status !== "complete" : false; return <article key={stage.title} className={complete ? "complete" : current ? "current" : "future"}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{stage.title}</h3><p>{stage.description}</p></div><b>{complete ? "Complete" : current ? "Current stage" : stage.available ? "Available after previous stage" : "Coming later"}</b></article>; })}</section>
    {workspace.score !== null && <section className="sie-purpose-score"><p>Preliminary self-assessment</p><strong>{workspace.score.toFixed(1)} <small>/ 5</small></strong><h2>{workspace.maturity}</h2><span>Subject to MSI evidence review and challenge.</span></section>}
  </main>;
}
