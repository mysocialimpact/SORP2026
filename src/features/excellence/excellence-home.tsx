"use client";

import Link from "next/link";
import { FolderHero } from "@/components/folder-hero";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Arrow } from "@/components/ui";
import { PILLARS, QUESTIONS } from "./questions";
import { SNAPSHOT_MATURITY_LABELS } from "./snapshot-maturity";
import type { ScoredAssessment } from "./models";

type Account = { id?: string; name?: string; email?: string; organisation?: string };
type ProductData = {
  answers?: Array<number | null>;
  result?: ScoredAssessment & { commentary?: string; recommendation?: string };
  purpose?: { status?: string; progress?: number };
  leadership?: { status?: string; progress?: number; reviewStatus?: string };
  data?: { status?: string; progress?: number; reviewStatus?: string };
  delivery?: { status?: string; progress?: number; reviewStatus?: string };
  migration?: { source?: string };
};
type ProductPayload = { signedIn?: boolean; account?: Account; productProgress?: { status?: string; data?: ProductData } | null; error?: string };
type TeamWorkspace = {
  organisation?: { name?: string; programme?: "snapshot" | "team" | "excellence"; seatLimit?: number };
  invitations?: Array<{ status?: "invited" | "started" | "completed" }>;
  aggregate?: { available?: boolean; completed?: number; required?: number; overall?: number; maturity?: string };
};

function answerLabel(answer: number | null | undefined) {
  return answer ? `${answer} / 5 · ${SNAPSHOT_MATURITY_LABELS[answer - 1]}` : "Not answered yet";
}

export function ExcellenceHome({ publicPage }: { publicPage: ReactNode }) {
  const [product, setProduct] = useState<ProductPayload>();
  const [team, setTeam] = useState<TeamWorkspace | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const post = (action: string) => fetch("/api/readiness-account/", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...(action === "load-product" ? { productId: "social-impact-excellence" } : {}) }),
      cache: "no-store", signal: controller.signal,
    }).then(async response => ({ response, payload: await response.json().catch(() => ({})) }));
    void Promise.all([post("load-product"), post("team-workspace")]).then(([productResult, teamResult]) => {
      if (productResult.response.status === 401 || productResult.payload.signedIn === false) { setProduct({ signedIn: false }); return; }
      if (!productResult.response.ok) throw new Error(productResult.payload.error || "Your Social Impact Excellence workspace could not be opened.");
      setProduct({ ...productResult.payload, signedIn: true });
      if (teamResult.response.ok && teamResult.payload?.organisation) setTeam(teamResult.payload as TeamWorkspace);
    }).catch(caught => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Your workspace could not be opened."); });
    return () => controller.abort();
  }, []);

  const answers = useMemo(() => product?.productProgress?.data?.answers || Array<number | null>(25).fill(null), [product]);
  if (error) return <main id="main" className="gateway product-page product-excellence"><section className="excellence-home-state gateway-width" role="alert"><h1>We couldn’t open your Social Impact Excellence workspace.</h1><p>{error}</p><Link href="/dashboard/">Return to your dashboard</Link></section></main>;
  if (!product) return <main id="main" className="gateway product-page product-excellence"><section className="excellence-home-state gateway-width" role="status"><p>Opening Social Impact Excellence…</p></section></main>;
  if (!product.signedIn) return publicPage;

  const data = product.productProgress?.data || {};
  const result = data.result;
  const answered = answers.filter(answer => answer !== null).length;
  const complete = Boolean(result) && answered === 25;
  const firstName = product.account?.name?.split(/\s+/)[0] || "there";
  const organisation = team?.organisation?.name || product.account?.organisation || "Your organisation";
  const teamActive = team?.organisation?.programme === "team" || team?.organisation?.programme === "excellence";
  const counts = { invited: 0, started: 0, completed: 0 };
  for (const invitation of team?.invitations || []) if (invitation.status) counts[invitation.status] += 1;
  const purposeStatus = data.purpose?.status || "not_started";
  const purposeStarted = purposeStatus !== "not_started";
  const leadershipStatus = data.leadership?.status || "not_started";
  const leadershipStarted = leadershipStatus !== "not_started";
  const dataStatus = data.data?.status || "not_started";
  const dataStarted = dataStatus !== "not_started";
  const deliveryStatus = data.delivery?.status || "not_started";
  const deliveryStarted = deliveryStatus !== "not_started";
  const primary = teamActive
    ? { href: "/social-impact-excellence/team/", label: "Open Brainstrust’s Team Perspective" }
    : !complete
      ? { href: `/social-impact-excellence/assessment/${answered ? `?question=${Math.min(answered + 1, 25)}` : ""}`, label: answered ? "Continue your baseline" : "Start your baseline" }
      : purposeStarted
        ? { href: "/social-impact-excellence/purpose/", label: "Continue the Purpose pathway" }
        : leadershipStarted
          ? { href: "/social-impact-excellence/leadership/", label: "Continue the Leadership pathway" }
        : dataStarted
          ? { href: "/social-impact-excellence/data/", label: "Continue the Data pathway" }
        : deliveryStarted
          ? { href: "/social-impact-excellence/delivery/", label: "Continue the Delivery pathway" }
        : { href: "/social-impact-excellence/journey/", label: "Choose your next pillar" };

  return <main id="main" className="gateway product-page product-excellence excellence-account-home">
    <FolderHero product="social-impact-excellence" id="excellence-overview" className="excellence-account-hero">
      <div className="gateway-width excellence-account-hero-grid">
        <div><p className="gateway-kicker">04 · Your Social Impact Excellence workspace</p><h1>Welcome back, <span>{firstName}.</span></h1><p className="excellence-account-lead">This is {organisation}’s place to see what you have completed, revisit every answer and decide what to do next.</p><div className="excellence-account-actions"><Link className="gateway-action" href={primary.href}>{primary.label} <Arrow /></Link><Link href="/dashboard/">All five products</Link></div></div>
        <aside aria-label="Your maturity baseline"><p>{complete ? "Your five-pillar baseline" : "Your baseline progress"}</p><strong>{result ? result.overall.toFixed(1) : answered}</strong><span>{result ? `${result.maturity} · out of 5` : `${answered} of 25 questions answered`}</span><i><b style={{ width: `${result ? result.overall * 20 : answered * 4}%` }}/></i>{data.migration?.source === "legacy-social-impact-excellence" ? <small>✓ Your previous MSI assessment is safely connected to this account.</small> : null}</aside>
      </div>
    </FolderHero>

    <section id="excellence-start" className="excellence-now gateway-width" aria-labelledby="excellence-now-title">
      <header><div><p className="gateway-kicker">Your next step</p><h2 id="excellence-now-title">Pick up exactly<br/>where you left off.</h2></div><p>{teamActive ? `${organisation} has an active Team Perspective. You can invite colleagues, see who has responded and view the combined result when enough people have completed it.` : complete ? "Your baseline is complete. Review any answer below, open your results or continue into deeper pillar work." : "Your answers are saved as you go. Continue the next unanswered question or open any pillar below."}</p></header>
      <div className="excellence-now-grid">
        <article className="is-primary"><span>Recommended now</span><h3>{teamActive ? "Bring in the Brainstrust team." : complete ? "Turn the baseline into action." : "Complete your honest baseline."}</h3><p>{teamActive ? `${counts.completed} completed · ${counts.started} in progress · ${counts.invited} invited` : complete ? "Use the five pillar scores to choose where focused work will make the greatest difference." : `${25 - answered} questions remain. Your existing answers will not be lost.`}</p><Link href={primary.href}>{primary.label} <Arrow /></Link></article>
        <article><span>Your evidence</span><h3>See every answer you gave.</h3><p>The questions and selected maturity levels are shown below, grouped into the five pillars.</p><a href="#excellence-pillars">Review all answers ↓</a></article>
        <article><span>Your result</span><h3>{result ? `${result.overall.toFixed(1)} · ${result.maturity}` : "Your report is still forming."}</h3><p>{result?.recommendation || "Complete all 25 questions to generate your private five-pillar report and suggested next step."}</p>{result ? <Link href="/social-impact-excellence/results/">Open baseline report <Arrow /></Link> : <Link href="/social-impact-excellence/assessment/">Continue assessment <Arrow /></Link>}</article>
      </div>
    </section>

    <section id="excellence-pillars" className="excellence-answer-section gateway-width" aria-labelledby="your-answers-title">
      <header><p className="gateway-kicker">Your five pillars · Your answers</p><h2 id="your-answers-title">Nothing hidden.<br/>Everything easy to revisit.</h2><p>Open a pillar to see the five original questions and the answer currently saved in {organisation}’s account.</p></header>
      <div className="excellence-answer-pillars">{PILLARS.map((pillar, pillarIndex) => {
        const pillarQuestions = QUESTIONS.slice(pillarIndex * 5, pillarIndex * 5 + 5);
        const pillarAnswers = answers.slice(pillarIndex * 5, pillarIndex * 5 + 5);
        const answeredInPillar = pillarAnswers.filter(answer => answer !== null).length;
        const score = result?.pillarScores.find(item => item.pillar === pillar.key)?.score;
        return <details key={pillar.key} open={pillarIndex === 0}>
          <summary><span>{pillar.number}</span><div><strong>{pillar.label}</strong><small>{pillar.strapline}</small></div><b>{score ? `${score.toFixed(1)} / 5` : `${answeredInPillar} / 5 answered`}</b></summary>
          <ol>{pillarQuestions.map((question, offset) => { const answer = pillarAnswers[offset]; return <li key={question.id}><span>{String(question.id).padStart(2, "0")}</span><div><p>{question.statement}</p><small>{question.meaning}</small></div><strong className={answer ? "is-answered" : ""}>{answerLabel(answer)}</strong><Link href={`/social-impact-excellence/assessment/?question=${question.id}`}>{answer ? "Review" : "Answer"}<span className="sr-only"> question {question.id}</span> →</Link></li>; })}</ol>
        </details>;
      })}</div>
    </section>

    <section id="excellence-account" className="excellence-pathways gateway-width" aria-labelledby="excellence-pathways-title">
      <header><p className="gateway-kicker">From baseline to improvement</p><h2 id="excellence-pathways-title">The whole journey,<br/>in one place.</h2></header>
      <div>{PILLARS.map((pillar, index) => {
        const score = result?.pillarScores.find(item => item.pillar === pillar.key)?.score;
        const isPurpose = pillar.key === "purpose";
        const isLeadership = pillar.key === "leadership";
        const isData = pillar.key === "data";
        const isDelivery = pillar.key === "delivery";
        const pathwayStatus = isPurpose ? purposeStatus : isLeadership ? leadershipStatus : isData ? dataStatus : isDelivery ? deliveryStatus : "";
        const pathwayStarted = isPurpose ? purposeStarted : isLeadership ? leadershipStarted : isData ? dataStarted : isDelivery ? deliveryStarted : false;
        const pathwayProgress = isPurpose ? data.purpose?.progress : isLeadership ? data.leadership?.progress : isData ? data.data?.progress : data.delivery?.progress;
        const submitted = isPurpose ? pathwayStatus === "complete" : pathwayStatus === "evidence_submitted";
        const available = isPurpose || isLeadership || isData || isDelivery;
        const state = available ? submitted ? isPurpose ? "Complete" : "Evidence submitted" : pathwayStarted ? `${pathwayProgress || 0}% complete` : complete ? "Ready to begin" : "Complete baseline first" : complete ? "Baseline ready to review" : `${answers.slice(index * 5, index * 5 + 5).filter(Boolean).length}/5 answered`;
        const pathwayHref = isPurpose ? "/social-impact-excellence/purpose/" : isLeadership ? "/social-impact-excellence/leadership/" : isData ? "/social-impact-excellence/data/" : "/social-impact-excellence/delivery/";
        return <article key={pillar.key}><span>{pillar.number}</span><h3>{pillar.label}</h3><p>{pillar.strapline}</p><i><b style={{ width: `${score ? score * 20 : answers.slice(index * 5, index * 5 + 5).filter(Boolean).length * 20}%` }}/></i><strong>{state}</strong>{available && complete ? <Link href={pathwayHref}>{pathwayStarted ? "Continue" : "Begin"} {pillar.label} pathway →</Link> : <a href="#excellence-pillars">Review pillar answers ↓</a>}</article>;
      })}</div>
      <p className="excellence-pathway-note">The deeper Purpose, Leadership, Data and Delivery pathways are available now. Communications retains its full baseline questions and results here; its deeper guided pathway will appear when released.</p>
    </section>

    {teamActive ? <section className="excellence-team-summary"><div className="gateway-width"><div><p className="gateway-kicker">{organisation} · Team Perspective</p><h2>More than one<br/>point of view.</h2><p>Will can invite colleagues directly, track completion and view the protected organisation result, without Marcus having to set anybody up.</p><Link className="gateway-action" href="/social-impact-excellence/team/">Manage Team Perspective <Arrow /></Link></div><dl><div><dt>Invited</dt><dd>{counts.invited}</dd></div><div><dt>In progress</dt><dd>{counts.started}</dd></div><div><dt>Completed</dt><dd>{counts.completed}</dd></div><div><dt>Combined view</dt><dd>{team?.aggregate?.available ? team.aggregate.overall?.toFixed(1) : `${team?.aggregate?.completed || 0} of ${team?.aggregate?.required || 3}`}</dd></div></dl></div></section> : null}
  </main>;
}
