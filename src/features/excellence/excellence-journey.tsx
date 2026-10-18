"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PILLARS } from "./questions";
import { normalisePurposeWorkspace } from "./purpose";
import { normaliseLeadershipWorkspace } from "./leadership";
import { normaliseDataWorkspace } from "./data";
import { normaliseDeliveryWorkspace } from "./delivery";
import { normaliseCommunicationsWorkspace } from "./communications";
import type { ScoredAssessment } from "./models";
import { useExcellenceAccess } from "./use-excellence-access";
import { EXCELLENCE_STAGES } from "@/lib/excellence/access-policy";

type ProductData = { result?: ScoredAssessment; purpose?: unknown; leadership?: unknown; data?: unknown; delivery?: unknown; communications?: unknown };
type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: ProductData }; error?: string };

export function ExcellenceJourney() {
  const { access, error: accessError } = useExcellenceAccess();
  const router = useRouter();
  const [payload, setPayload] = useState<Payload>();
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const next = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/journey/"))); return; } if (!response.ok) throw new Error(next.error || "Your journey could not be loaded."); setPayload(next); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your journey could not be loaded."));
  }, [router]);
  if (error || accessError) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open your journey.</h1><p>{error || accessError}</p><Link href="/dashboard/">Return to dashboard</Link></section></main>;
  if (!payload || !access) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Social Impact Excellence journey…</p></section></main>;
  const result = payload.productProgress?.data?.result;
  const purpose = normalisePurposeWorkspace(payload.productProgress?.data?.purpose, payload.account);
  const leadership = normaliseLeadershipWorkspace(payload.productProgress?.data?.leadership, payload.account);
  const data = normaliseDataWorkspace(payload.productProgress?.data?.data, payload.account);
  const delivery = normaliseDeliveryWorkspace(payload.productProgress?.data?.delivery, payload.account);
  const communications = normaliseCommunicationsWorkspace(payload.productProgress?.data?.communications, payload.account);
  return <main className="sie-report sie-journey">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/dashboard/">My dashboard</Link></header>
    <section className="sie-journey-hero"><div><p className="sie-eyebrow">{access.organisation?.name || payload.account?.organisation || "Your charity"}</p><h1>Your path to <em>excellence.</em></h1><p>{access.maturity.completed ? "Your baseline is complete. Explore the stages and see which deeper pathways are available to your organisation." : "Begin with your Social Impact Maturity Assessment. You can explore every stage and pillar while your work is saved."}</p></div><div><strong>{result?.overall.toFixed(1) || `${access.maturity.percentage}%`}</strong><span>{result?.maturity || "Maturity Assessment"}</span>{result ? <Link href="/social-impact-excellence/results/">View baseline report →</Link> : access.maturity.available ? <Link href="/social-impact-excellence/assessment/">Start or continue baseline →</Link> : <span>Assessment awaiting activation</span>}</div></section>
    <section className="sie-journey-stages" aria-label="The five stages"><h2>The five stages</h2><div>{EXCELLENCE_STAGES.map((key, index) => {
      const names = ["Social Impact Maturity Assessment", "Diagnostic Review", "Social Impact Blueprint", "Roadmap", "Social Impact Excellence"];
      const descriptions = ["Understand where you stand.", "Explore strengths, gaps and opportunities.", "Shape a clear vision for improvement.", "Prioritise practical actions.", "Embed social impact as a management discipline."];
      return <article key={key}><span>0{index + 1}</span><div><h3>{names[index]}</h3><p>{descriptions[index]}</p></div><strong>{access.access.stages[key] ? index === 0 ? "Available" : "Activated · workflow not yet online" : "Locked · not yet available for your organisation"}</strong></article>;
    })}</div></section>
    <section className="sie-journey-map" aria-label="Social Impact Excellence pathways">
      {PILLARS.map(pillar => {
        const score = result?.pillarScores.find(item => item.pillar === pillar.key)?.score || 0;
        const isPurpose = pillar.key === "purpose";
        const isLeadership = pillar.key === "leadership";
        const isData = pillar.key === "data";
        const isDelivery = pillar.key === "delivery";
        const available = access.pillars[pillar.key === "communication" ? "communications" : pillar.key].available;
        const pathway = isPurpose ? purpose : isLeadership ? leadership : isData ? data : isDelivery ? delivery : communications;
        const submitted = isPurpose ? purpose.status === "complete" : pathway.status === "evidence_submitted";
        const status = available ? submitted ? isPurpose ? "Complete" : "Evidence submitted" : pathway.status === "not_started" ? "Ready to begin" : "In progress" : "Locked";
        const href = isPurpose ? "/social-impact-excellence/purpose/" : isLeadership ? "/social-impact-excellence/leadership/" : isData ? "/social-impact-excellence/data/" : isDelivery ? "/social-impact-excellence/delivery/" : "/social-impact-excellence/communications/";
        return <article className={available ? "available" : "future"} key={pillar.key}><div><span>{pillar.number}</span><b>{status}</b></div><h2>{pillar.label}</h2><p>{pillar.strapline}</p>{result && <div className="sie-journey-score"><i style={{ width: `${score * 20}%` }} /><strong>{score.toFixed(1)}</strong></div>}{available ? <Link href={href}>{pathway.status === "not_started" ? `Begin ${pillar.label} pathway` : `Continue ${pillar.label} pathway`} →</Link> : <span>{!access.maturity.completed ? "Complete your Social Impact Maturity Assessment before beginning the pillar deep dives." : "Your Maturity Assessment is complete. This deep dive is awaiting activation."}</span>}</article>;
      })}
    </section>
    <section className="sie-next-step"><p>Explore before you begin</p><h2>Each pillar has a guided overview. Assessment access is activated separately for your organisation.</h2><div>{PILLARS.map(pillar => <Link key={pillar.key} href={`/social-impact-excellence/${pillar.key === "communication" ? "communications" : pillar.key}/`}>Explore {pillar.label} →</Link>)}</div></section>
  </main>;
}
