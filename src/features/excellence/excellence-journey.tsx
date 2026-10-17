"use client";
import { currentAccountDestination, registrationHref } from "@/lib/account-navigation";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PILLARS } from "./questions";
import { normalisePurposeWorkspace } from "./purpose";
import { normaliseLeadershipWorkspace } from "./leadership";
import { normaliseDataWorkspace } from "./data";
import type { ScoredAssessment } from "./models";

type ProductData = { result?: ScoredAssessment; purpose?: unknown; leadership?: unknown; data?: unknown };
type Payload = { account?: { name?: string; email?: string; organisation?: string }; productProgress?: { data?: ProductData }; error?: string };

export function ExcellenceJourney() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload>();
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/readiness-account/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "load-product", productId: "social-impact-excellence" }), cache: "no-store" })
      .then(async response => { const next = await response.json() as Payload; if (response.status === 401) { router.replace(registrationHref(currentAccountDestination("/social-impact-excellence/journey/"))); return; } if (!response.ok) throw new Error(next.error || "Your journey could not be loaded."); setPayload(next); })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Your journey could not be loaded."));
  }, [router]);
  if (error) return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t open your journey.</h1><p>{error}</p><Link href="/dashboard/">Return to dashboard</Link></section></main>;
  if (!payload) return <main className="sie-report"><section className="sie-state" role="status"><p>Opening your Social Impact Excellence journey…</p></section></main>;
  const result = payload.productProgress?.data?.result;
  if (!result) return <main className="sie-report"><section className="sie-state"><p className="sie-eyebrow">Your starting point</p><h1>Begin with an honest baseline.</h1><p>Complete the 25-question Social Impact Maturity Assessment before moving into deeper pillar work.</p><Link href="/social-impact-excellence/assessment/">Start or continue the assessment →</Link></section></main>;
  const purpose = normalisePurposeWorkspace(payload.productProgress?.data?.purpose, payload.account);
  const leadership = normaliseLeadershipWorkspace(payload.productProgress?.data?.leadership, payload.account);
  const data = normaliseDataWorkspace(payload.productProgress?.data?.data, payload.account);
  return <main className="sie-report sie-journey">
    <header><Link href="/social-impact-excellence/" className="sie-wordmark">SOCIAL IMPACT <strong>EXCELLENCE</strong></Link><Link href="/dashboard/">My dashboard</Link></header>
    <section className="sie-journey-hero"><div><p className="sie-eyebrow">{payload.account?.organisation || "Your charity"}</p><h1>Your path to <em>excellence.</em></h1><p>Your baseline is complete. Use it to decide where deeper work will make the greatest difference.</p></div><div><strong>{result.overall.toFixed(1)}</strong><span>{result.maturity}</span><Link href="/social-impact-excellence/results/">View baseline report →</Link></div></section>
    <section className="sie-journey-map" aria-label="Social Impact Excellence pathways">
      {PILLARS.map(pillar => {
        const score = result.pillarScores.find(item => item.pillar === pillar.key)?.score || 0;
        const isPurpose = pillar.key === "purpose";
        const isLeadership = pillar.key === "leadership";
        const isData = pillar.key === "data";
        const available = isPurpose || isLeadership || isData;
        const pathway = isPurpose ? purpose : isLeadership ? leadership : data;
        const submitted = isPurpose ? purpose.status === "complete" : pathway.status === "evidence_submitted";
        const status = available ? submitted ? isPurpose ? "Complete" : "Evidence submitted" : pathway.status === "not_started" ? "Ready to begin" : "In progress" : "Not yet available";
        const href = isPurpose ? "/social-impact-excellence/purpose/" : isLeadership ? "/social-impact-excellence/leadership/" : "/social-impact-excellence/data/";
        return <article className={available ? "available" : "future"} key={pillar.key}><div><span>{pillar.number}</span><b>{status}</b></div><h2>{pillar.label}</h2><p>{pillar.strapline}</p><div className="sie-journey-score"><i style={{ width: `${score * 20}%` }} /><strong>{score.toFixed(1)}</strong></div>{available ? <Link href={href}>{pathway.status === "not_started" ? `Begin ${pillar.label} pathway` : `Continue ${pillar.label} pathway`} →</Link> : <span>This deeper pathway is not yet available.</span>}</article>;
      })}
    </section>
    <section className="sie-next-step"><p>What is available today</p><h2>Purpose, Leadership and Data now include structured assessments, detailed guidance, secure supporting evidence and an MSI review checkpoint.</h2><div><Link href="/social-impact-excellence/purpose/">Open Purpose pathway →</Link><Link href="/social-impact-excellence/leadership/">Open Leadership pathway →</Link><Link href="/social-impact-excellence/data/">Open Data pathway →</Link></div></section>
  </main>;
}
