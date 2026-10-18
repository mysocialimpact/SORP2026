"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FounderConsoleLink } from "./console/founder-link";
import { Arrow } from "@/components/ui";
import { dashboardRecommendation } from "@/lib/dashboard-recommendation";
import { isReadinessComplete, isReadinessStarted } from "@/lib/readiness-status";

type Permissions = { progress:boolean; answers:boolean; edit:boolean; invitations:boolean };
type Membership = { organisationId:string; name:string; type:"Charity"|"Adviser"|"Other"; role:"owner"|"admin"|"member"; entitlement?:{ plan?:string; status?:string; payablePrice?:number; publishedPrice?:number } };
type Access = { id:string; adviserName:string; charityName:string; permissions:Permissions };
type PlatformAccess = { founder?:boolean; memberships?:Membership[]; approvalRequests?:Access[]; activeClientAccess?:Access[] };
type Account = { id?:string; name:string; email:string; position:string; organisation?:string; lastSavedAt?:string };
type Finding = { answer?:string; applicability?:string };
type Progress = { step?:string; candidate?:{name?:string}; report?:{tar?:{findings?:Finding[]}}; sessionId?:string; corrections?:Record<string,{reviewed?:boolean}> };
type AccountResponse = { signedIn?:boolean; account?:Account; progress?:Progress; platformAccess?:PlatformAccess; error?:string };
type ExcellenceProgress = { status?:string; data?:{ answers?:Array<number|null>; result?:{overall?:number}; updatedAt?:string; completedAt?:string; purpose?:{status?:string;progress?:number} } };
type ReportReview = { id:string; filename:string; status:string; feedbackReady?:boolean; createdAt?:string; updatedAt?:string };
type TeamWorkspaceSummary = { organisation?:{programme?:string;name?:string}; invitations?:Array<{status?:string}> };
type DirectorProgress = { data:{ratings:number[];completed:boolean} };
type AdviserClient = { organisationId:string; name:string; status:string; permissions:Permissions; memberCount:number; updatedAt?:string };
type AdviserAssessment = { accountId:string; currentStage:number; completedStages:number[]; lastSavedAt?:string; status:string };
type AdviserOverview = { organisation:{name:string}; clients:AdviserClient[]; assessments:Record<string,AdviserAssessment[]> };

const readinessPhases = [
  ["scope","public-methodology","intro","benefits"], ["find","confirmation","account"], ["homework","tar-recovery"],
  ["assessment","quick-generating"], ["quick-ready","quick","quick-feedback"], ["method","criterion","complete"],
  ["generating","report-ready","report","email-ready"], ["final-feedback","support","before-go","next","help","done"],
];

function readinessPercentage(progress:Progress, started:boolean, complete:boolean) {
  if (complete) return 100;
  if (!started || !progress.step) return 0;
  const phase=Math.max(0,readinessPhases.findIndex(steps=>steps.includes(progress.step||"")));
  const reviewed=Object.values(progress.corrections||{}).filter(item=>item.reviewed).length;
  return Math.min(99,Math.max(1,Math.round(((phase+(progress.step==="criterion"?Math.min(reviewed/21,1):.35))/readinessPhases.length)*100)));
}

function reportPercentage(review?:ReportReview) {
  if (!review) return 0;
  if (review.feedbackReady) return 100;
  if (review.status==="awaiting_payment") return 25;
  if (review.status.includes("paid")) return 55;
  if (review.status.includes("review")) return 80;
  return 40;
}

function formatDate(value?:string) {
  if (!value) return "";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"":date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}

async function accountPost(body:Record<string,unknown>, signal?:AbortSignal) {
  const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),cache:"no-store",signal});
  const payload=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(payload.error||"That account information could not be loaded.");
  return payload;
}

function StatusRow({name,status,detail,percentage,href}:{name:string;status:string;detail?:string;percentage:number;href:string}) {
  return <li>
    <div className="dashboard-progress-copy"><strong>{name}</strong><span>{status}</span>{detail&&<small>{detail}</small>}</div>
    <div className="dashboard-compact-meter" role="progressbar" aria-label={`${name}: ${status}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><i style={{width:`${percentage}%`}} /></div>
    <Link href={href} aria-label={`Open ${name}`}>Open <Arrow /></Link>
  </li>;
}

function AdviserDashboard({account,membership,access}:{account:Account;membership:Membership;access:PlatformAccess}) {
  const [overview,setOverview]=useState<AdviserOverview|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    void accountPost({action:"adviser-workspace",adviserOrganisationId:membership.organisationId},controller.signal).then(async workspace=>{
      const active=(workspace.clients||[]).filter((client:AdviserClient)=>client.status==="active");
      const pairs=await Promise.all(active.map(async(client:AdviserClient)=>{
        try { const result=await accountPost({action:"adviser-client",adviserOrganisationId:membership.organisationId,charityOrganisationId:client.organisationId},controller.signal); return [client.organisationId,result.assessments||[]] as const; }
        catch { return [client.organisationId,[]] as const; }
      }));
      setOverview({...workspace,assessments:Object.fromEntries(pairs)});
    }).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"The adviser workspace could not be loaded.");});
    return()=>controller.abort();
  },[membership.organisationId]);
  const clients=overview?.clients||[];
  const active=clients.filter(client=>client.status==="active");
  const pending=clients.filter(client=>client.status!=="active");
  const inProgress=active.filter(client=>(overview?.assessments[client.organisationId]||[]).some(item=>item.status!=="complete"));
  const recent=[...active].sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))).slice(0,4);
  const recommended=inProgress[0]||active[0];
  return <>
    <header className="dashboard-workspace-header"><div><p className="gateway-kicker">Professional adviser workspace</p><h1>Welcome back, <span>{account.name.split(/\s+/)[0]}.</span></h1><p><strong>{membership.name}</strong> · Your organisation dashboard</p></div><nav aria-label="Account"><Link href="/settings/">Settings</Link><Link href="/adviser/">Full adviser workspace</Link></nav></header>
    <section className="dashboard-overview" aria-labelledby="adviser-overview-title"><div><p className="gateway-kicker">Where you are</p><h2 id="adviser-overview-title">Your client portfolio.</h2></div><dl><div><dt>Authorised organisations</dt><dd>{active.length}</dd></div><div><dt>Assessments in progress</dt><dd>{inProgress.length}</dd></div><div><dt>Awaiting approval</dt><dd>{pending.length}</dd></div></dl></section>
    <section className="dashboard-recommendation" aria-labelledby="adviser-next-title"><div><p className="gateway-kicker">Recommended next step</p><h2 id="adviser-next-title">{recommended?`Continue with ${recommended.name}.`:"Connect your first charity workspace."}</h2><p>{recommended?inProgress.includes(recommended)?"This organisation has a genuine saved assessment still in progress.":"This authorised organisation is ready to review.":"No charity data is visible until its administrator has explicitly approved access."}</p></div><Link href={recommended?`/adviser/?client=${encodeURIComponent(recommended.organisationId)}`:"/adviser/"}>{recommended?"Open organisation workspace →":"Open adviser workspace →"}</Link></section>
    {error&&<p className="dashboard-inline-error" role="alert">{error}</p>}
    <section className="dashboard-section" aria-labelledby="organisations-title"><header><p className="gateway-kicker">What needs attention</p><h2 id="organisations-title">Accessible organisations.</h2></header><div className="dashboard-organisation-list">{clients.map(client=>{const assessments=overview?.assessments[client.organisationId]||[];const latest=assessments[0];return <article key={client.organisationId}><div><span className={client.status==="active"?"is-positive":"is-pending"}>{client.status==="active"?"Authorised":"Awaiting approval"}</span><h3>{client.name}</h3><p>{latest?latest.status==="complete"?"SORP readiness complete":`SORP readiness · Stage ${latest.currentStage} of 7`:client.status==="active"?"No saved readiness assessment":"Assessment data remains private"}</p></div><Link href={client.status==="active"?`/adviser/?client=${encodeURIComponent(client.organisationId)}`:"/settings/"}>{client.status==="active"?"Open workspace →":"View access →"}</Link></article>})}{!clients.length&&<div className="dashboard-empty"><strong>No connected charities yet.</strong><p>Invite a charity from the adviser workspace. Its data remains private until an authorised administrator approves access.</p></div>}</div></section>
    <section className="dashboard-section" aria-labelledby="adviser-activity-title"><header><p className="gateway-kicker">Recent activity</p><h2 id="adviser-activity-title">Recently updated accounts.</h2></header><ul className="dashboard-activity-list">{recent.map(client=><li key={client.organisationId}><div><strong>{client.name}</strong><span>{client.updatedAt?`Access updated ${formatDate(client.updatedAt)}`:"Authorised client workspace"}</span></div><Link href={`/adviser/?client=${encodeURIComponent(client.organisationId)}`}>Open →</Link></li>)}{!recent.length&&<li className="dashboard-empty"><strong>No recent client activity yet.</strong><span>Updates will appear here when authorised organisations save progress.</span></li>}</ul></section>
    {(access.approvalRequests?.length||0)>0&&<p className="dashboard-settings-prompt"><strong>{access.approvalRequests?.length} access request{access.approvalRequests?.length===1?"":"s"} need a decision.</strong><Link href="/settings/#access">Review in Settings →</Link></p>}
  </>;
}

export function PlatformDashboard({signedInCelebration=false,customerMode=false}:{signedInCelebration?:boolean;customerMode?:boolean}) {
  const router=useRouter();
  const [data,setData]=useState<AccountResponse|null>(null); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const [excellence,setExcellence]=useState<ExcellenceProgress|null>(null); const [reportReviews,setReportReviews]=useState<ReportReview[]>([]); const [teamWorkspace,setTeamWorkspace]=useState<TeamWorkspaceSummary|null>(null);
  const [director,setDirector]=useState<DirectorProgress|null>(null); const [directorUnavailable,setDirectorUnavailable]=useState(false); const [showSignedIn,setShowSignedIn]=useState(signedInCelebration);
  useEffect(()=>{if(!signedInCelebration)return;const url=new URL(window.location.href);url.searchParams.delete("signed-in");window.history.replaceState(window.history.state,"",`${url.pathname}${url.search}${url.hash}`);const timer=window.setTimeout(()=>setShowSignedIn(false),5000);return()=>window.clearTimeout(timer);},[signedInCelebration]);
  useEffect(()=>{const controller=new AbortController();void fetch("/api/readiness-account/",{cache:"no-store",signal:controller.signal}).then(async response=>{const payload=await response.json().catch(()=>({}));if(response.status===401||payload.signedIn===false)setData({signedIn:false});else if(!response.ok)throw new Error(payload.error||"Your account could not be loaded.");else setData(payload);}).catch(cause=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Your account could not be loaded.");});return()=>controller.abort();},[]);
  useEffect(()=>{if(data?.signedIn&&data.platformAccess?.founder===true&&!customerMode)router.replace("/founder/");},[data,router,customerMode]);
  const adviserMembership=data?.platformAccess?.memberships?.find(item=>item.type==="Adviser"&&["Adviser","Enterprise"].includes(item.entitlement?.plan||""));
  useEffect(()=>{if(!data?.signedIn||(data.platformAccess?.founder&&!customerMode)||adviserMembership)return;const controller=new AbortController();void Promise.all([accountPost({action:"load-product",productId:"social-impact-excellence"},controller.signal),accountPost({action:"list-report-reviews"},controller.signal),accountPost({action:"team-workspace"},controller.signal)]).then(([product,reviews,team])=>{setExcellence(product.productProgress||null);setReportReviews(reviews.reviews||[]);setTeamWorkspace(team);}).catch(()=>undefined);return()=>controller.abort();},[data?.signedIn,data?.platformAccess?.founder,adviserMembership,customerMode]);
  useEffect(()=>{if(!data?.signedIn||(data.platformAccess?.founder&&!customerMode)||adviserMembership)return;const controller=new AbortController();void fetch("/api/impact-director/",{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error("Unavailable");const payload=await response.json();setDirector(payload.progress);setDirectorUnavailable(false);}).catch(()=>{if(!controller.signal.aborted)setDirectorUnavailable(true);});return()=>controller.abort();},[data?.signedIn,data?.platformAccess?.founder,adviserMembership,customerMode]);
  async function signOut(){if(busy)return;setBusy(true);const response=await fetch("/api/readiness-account/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"logout"})});if(response.ok){router.push("/");router.refresh();}else{setError("Sign out did not complete. Please try again.");setBusy(false);}}
  if(error)return <div className="dashboard-state" role="alert"><h2>We couldn’t open your dashboard.</h2><p>{error}</p><Link href="/login/">Try logging in again</Link></div>;
  if(!data)return <div className="dashboard-state" role="status"><h2>Opening your dashboard…</h2></div>;
  if(!data.signedIn||!data.account)return <div className="dashboard-state"><h2>Log in to see your dashboard.</h2><p>Your existing readiness review will still be there.</p><Link className="gateway-action" href="/login/?return=/dashboard/">Log in <Arrow /></Link></div>;
  if(data.platformAccess?.founder&&!customerMode)return <div className="dashboard-state" role="status"><h2>Opening Founder Control Centre…</h2></div>;
  if(adviserMembership)return <><FounderConsoleLink/><AdviserDashboard account={data.account} membership={adviserMembership} access={data.platformAccess||{}}/></>;

  const progress=data.progress||{}; const readinessComplete=isReadinessComplete(progress); const readinessStarted=isReadinessStarted(progress); const readinessHref=readinessStarted?"/are-you-sorp-ready/review/":"/are-you-sorp-ready/review/?entry=intro";
  const excellenceAnswered=excellence?.data?.answers?.filter(answer=>answer!==null).length||0; const excellenceComplete=excellence?.status==="complete"&&Boolean(excellence.data?.result); const purposeStatus=excellence?.data?.purpose?.status; const purposeStarted=Boolean(purposeStatus&&purposeStatus!=="not_started");
  const latestReport=reportReviews[0]; const reportPercent=reportPercentage(latestReport); const readinessPercent=readinessPercentage(progress,readinessStarted,readinessComplete); const excellencePercent=excellenceComplete?100:Math.round(excellenceAnswered/25*100); const directorPercent=director?.data.completed?100:Math.round((director?.data.ratings.filter(Boolean).length||0)/21*100);
  const issueAnswers=new Set(["partly","limited","not_yet","not_sure"]); const readinessIssues=progress.report?.tar?.findings?.filter(item=>item.applicability!=="not_applicable"&&issueAnswers.has(item.answer||"")).length||0;
  const recommendation=dashboardRecommendation({readinessStarted,readinessComplete,readinessStep:progress.step,readinessIssues,reportFeedbackReady:Boolean(latestReport?.feedbackReady),excellenceAnswered,excellenceComplete});
  const attention=[readinessStarted&&!readinessComplete?{title:"Finish your saved SORP readiness assessment",detail:`Progress is ${readinessPercent}% complete.`,href:readinessHref}:null,latestReport&&!latestReport.feedbackReady?{title:"Charity Impact Report review in progress",detail:latestReport.filename,href:"/charity-impact-reports/review/"}:null,excellenceAnswered>0&&!excellenceComplete?{title:"Continue Social Impact Excellence",detail:`${excellenceAnswered} of 25 answers are saved.`,href:"/social-impact-excellence/assessment/"}:null,purposeStarted&&purposeStatus!=="complete"?{title:"Continue your Purpose pathway",detail:`${Math.max(0,Math.min(100,excellence?.data?.purpose?.progress||0))}% recorded.`,href:"/social-impact-excellence/purpose/"}:null,...(data.platformAccess?.approvalRequests||[]).map(item=>({title:`Decide whether ${item.adviserName} can access ${item.charityName}`,detail:"An access request is waiting for an authorised account owner or administrator.",href:"/settings/#access"}))].filter(Boolean) as Array<{title:string;detail:string;href:string}>;
  const activity=[data.account.lastSavedAt?{title:"SORP readiness progress saved",date:data.account.lastSavedAt,href:readinessHref}:null,excellence?.data?.completedAt?{title:"Social Impact Excellence assessment completed",date:excellence.data.completedAt,href:"/social-impact-excellence/results/"}:excellence?.data?.updatedAt?{title:"Social Impact Excellence progress saved",date:excellence.data.updatedAt,href:"/social-impact-excellence/assessment/"}:null,latestReport?.updatedAt||latestReport?.createdAt?{title:latestReport?.feedbackReady?"Charity Impact Report feedback completed":"Charity Impact Report review updated",date:latestReport.updatedAt||latestReport.createdAt||"",href:"/charity-impact-reports/review/"}:null].filter(Boolean).sort((a,b)=>String(b?.date).localeCompare(String(a?.date))) as Array<{title:string;date:string;href:string}>;
  const activeAdvisers=data.platformAccess?.activeClientAccess||[]; const firstName=data.account.name.split(/\s+/)[0];
  return <>
    <FounderConsoleLink/>
    {showSignedIn&&<section className="dashboard-signed-in" role="status" aria-live="polite"><span className="dashboard-signed-in-mark" aria-hidden="true">✓</span><div><p className="gateway-kicker">Signed in successfully</p><h2>You’re in, {firstName}.</h2><p>Your saved work is ready.</p></div><button type="button" onClick={()=>setShowSignedIn(false)} aria-label="Dismiss signed-in confirmation">×</button></section>}
    <header className="dashboard-workspace-header"><div><p className="gateway-kicker">My SORP2026</p><h1>Welcome back, <span>{firstName}.</span></h1><p><strong>{data.account.organisation||progress.candidate?.name||"Your organisation"}</strong> · Your organisation dashboard</p>{activeAdvisers.length>0&&<small>Your adviser: {activeAdvisers.map(item=>item.adviserName).join(", ")} ✓</small>}</div><nav aria-label="Account"><Link aria-current="page" href="/dashboard/">Dashboard</Link><Link href="/settings/">Settings</Link><button type="button" onClick={signOut} disabled={busy}>{busy?"Signing out…":"Sign out"}</button></nav></header>
    <section className="dashboard-overview" aria-labelledby="dashboard-progress-title"><div><p className="gateway-kicker">Your progress</p><h2 id="dashboard-progress-title">Where you are.</h2></div><ol>
      <StatusRow name="SORP Readiness" status={readinessComplete?"Assessment complete":readinessStarted?"In progress":"Not yet started"} percentage={readinessPercent} href={readinessHref}/>
      <StatusRow name="Charity Impact Reports" status={latestReport?.feedbackReady?"Expert feedback ready":latestReport?"Review in progress":"Not yet started"} detail={latestReport?.filename} percentage={reportPercent} href="/charity-impact-reports/review/"/>
      <StatusRow name="Social Impact Excellence" status={excellenceComplete?`Assessment completed${typeof excellence?.data?.result?.overall==="number"?` · ${excellence.data.result.overall.toFixed(1)}/5`:""}`:excellenceAnswered?`${excellenceAnswered} of 25 answered`:"Not yet started"} percentage={excellencePercent} href={excellenceComplete?"/social-impact-excellence/results/":"/social-impact-excellence/assessment/"}/>
      <StatusRow name="My Impact Director" status={directorUnavailable?"Progress unavailable":director?.data.completed?"Started · snapshot complete":director?"Snapshot in progress":"Not yet started"} percentage={directorUnavailable?0:directorPercent} href="/my-impact-director/#assessment"/>
    </ol></section>
    <section className="dashboard-recommendation" aria-labelledby="dashboard-next-title"><div><p className="gateway-kicker">{recommendation.eyebrow}</p><h2 id="dashboard-next-title">{recommendation.title}</h2><p>{recommendation.reason}</p></div><Link href={recommendation.href}>{recommendation.action}</Link></section>
    <div className="dashboard-two-column"><section className="dashboard-section" aria-labelledby="attention-title"><header><p className="gateway-kicker">What needs attention</p><h2 id="attention-title">Focus here.</h2></header><ul className="dashboard-action-list">{attention.map(item=><li key={item.title}><div><strong>{item.title}</strong><span>{item.detail}</span></div><Link href={item.href}>Continue →</Link></li>)}{!attention.length&&<li className="dashboard-empty"><strong>Nothing needs immediate attention.</strong><span>Your saved work is up to date. Use the recommended next step when you are ready.</span></li>}</ul></section>
      <section className="dashboard-section" aria-labelledby="activity-title"><header><p className="gateway-kicker">Recent activity</p><h2 id="activity-title">What changed.</h2></header><ul className="dashboard-activity-list">{activity.map(item=><li key={`${item.title}-${item.date}`}><div><strong>{item.title}</strong><span>{formatDate(item.date)}</span></div><Link href={item.href}>Open →</Link></li>)}{!activity.length&&<li className="dashboard-empty"><strong>No recent activity yet.</strong><span>Saved assessments and report updates will appear here.</span></li>}</ul></section></div>
    {teamWorkspace?.organisation?.programme&&<p className="dashboard-context-note">Team workspace: <strong>{teamWorkspace.organisation.name}</strong> · {(teamWorkspace.invitations||[]).filter(item=>item.status==="completed").length} completed response{(teamWorkspace.invitations||[]).filter(item=>item.status==="completed").length===1?"":"s"}. <Link href="/social-impact-excellence/team/">Open team perspective →</Link></p>}
  </>;
}
