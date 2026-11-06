"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { channels, growthPath, introduction, isKind, publicWebUrl, stages, type Kind } from "@/lib/growth/model";
import { displayDate, founderCall, type Dashboard } from "./founder-model";

type Row = {
  id:string; display_name:string; website?:string; stage:string; priority?:string; next_action?:string;
  follow_up?:string; score?:number; location?:string; relationship_id?:string; trial_active?:boolean;
  organisation_name?:string; members?:number; plan?:string;
};
type Entry = Row & {
  organisation_id?:string; owner_name:string; contact_name?:string; contact_email?:string;
  contact_review:string; contact_basis?:string; suppressed?:boolean; referred_by?:string; referral_evidence?:string;
  last_contact?:string; trial_days?:number; complimentary?:boolean; complimentary_start?:string; complimentary_end?:string;
};
type Activity = { id:string; action:string; created_at:string; actor:string; details:Record<string,string|undefined> };
type Evidence = { title:string; summary:string; url?:string; confidence:string; accessed_at?:string; category?:string };
type Detail = {
  record:Entry|null; activity:Activity[]; referrals:Row[]; organisations:Array<{id:string;name:string}>;
  partners:Array<{id:string;name:string}>; evidence:Evidence[]; people:Array<{name:string;role?:string;profile_url?:string}>;
  firm:{id:string;name:string;website?:string;location?:string;contact?:Record<string,unknown>;total?:number;
    approved_at?:string;research_completed_at?:string;scores?:Record<string,number>;listing?:{slug:string;featured?:boolean}}|null;
};
type Data = { rows?:Row[]; counts?:Array<{kind?:Kind;stage:string;total:number;trials?:number}>;
  events?:Array<{action:string;total:number}>; enquiries?:number|null; hasMore?:boolean } & Partial<Detail>;
type FormValues = Record<string,string|boolean>;
type Save = (action:string, values:FormValues) => Promise<boolean>;
const endpoint = "/api/founder/growth/";
const day = (value?:string) => value ? displayDate(value) : "—";
const getError = (error:unknown) => error instanceof Error ? error.message : "The request failed.";
function values(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string,string>;
}
async function growthRequest<T>(params:Record<string,string>, body?:FormValues):Promise<T> {
  const response = await fetch(endpoint + (body ? "" : "?" + new URLSearchParams(params)), {
    cache:"no-store", ...(body ? {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)} : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error(payload?.error || "Growth records could not be loaded.");
  return payload as T;
}
function href(view:Kind|"digital", search:Record<string,string> = {}) {
  const query = new URLSearchParams(Object.entries(search).filter(([,value])=>value));
  return `${growthPath}${view}/${query.size ? `?${query}` : ""}`;
}

export function GrowthWorkspace({ view, search = {} }: { view:Kind|"overview"|"digital"; search?:Record<string,string> }) {
  const router = useRouter();
  const query = JSON.stringify({...search,view});
  const [data,setData] = useState<Data|null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const [retry,setRetry] = useState(0);
  const [add,setAdd] = useState(false);
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    let live = true;
    if (view === "digital") return;
    void growthRequest<Data>(JSON.parse(query)).then(result=>{if(live)setData(result);}).catch(caught=>{if(live)setError(getError(caught));});
    return ()=>{ live = false; };
  },[query,retry,view]);

  const save: Save = async (action, fields) => {
    if (!isKind(view)) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await growthRequest<{id:string}>({}, {id:data?.record?.id || "", ...fields, kind:view, action});
      if (action === "create") {
        if (view === "accountants") {
          setData(await growthRequest<Data>({view,id:search.id || result.id}));
          setNotice("Firm added to the partnership pipeline.");
        } else router.push(href(view,{id:result.id}));
      } else {
        setNotice(action==="report-approved" ? "Version approved for sharing." : "Saved to the relationship history.");
        try { setData(await growthRequest<Data>(JSON.parse(query))); setRevision(n=>n+1); }
        catch { setError("Saved, but the latest record could not be loaded. Refresh before making another change."); }
      }
      return true;
    } catch(caught) { setError(getError(caught)); return false; }
    finally { setBusy(false); }
  };
  if (view === "digital") return <Digital/>;
  const channel = channels.find(item=>item.key===view);
  const detail = data && search.id && (data.record || data.firm) ? data as Detail : null;
  const retryLoad = () => {setData(null);setError("");setRetry(n=>n+1);};
  return <>
    <header className="growth-heading"><div><p className="founder-kicker">Founder · Growth</p>
      <h1>{detail ? detail.record?.display_name || detail.firm?.name : channel?.title || "Marketing & Sales"}</h1>
      <p>{detail ? channel?.title : channel?.description || "Three ways to grow SORP 2026. Start with accountancy partnerships and use the same organisation records across the workspace."}</p></div>
      {view==="charities"&&!search.id&&data&&<button className="founder-primary" onClick={()=>setAdd(!add)}>{add?"Close new prospect form":"+ Add charity prospect"}</button>}
      {search.id&&isKind(view)&&<Link href={href(view)}>Back to {view==="accountants"?"firms":"prospects"} →</Link>}
    </header>
    {(error||notice||busy)&&<div className="growth-feedback">
      {error&&<div className="founder-error" role="alert">{error} {!data&&<button onClick={retryLoad}>Retry</button>}</div>}
      {notice&&<p className="founder-notice" role="status">{notice}</p>}
      {busy&&<p className="founder-notice" role="status">Saving your changes…</p>}
    </div>}
    {!data&&!error&&<p className="growth-panel" role="status">Loading growth records…</p>}
    {view==="overview"&&<Overview data={data}/>}
    {isKind(view)&&data&&!search.id&&<>
      {add&&<section className="growth-panel"><h2>New charity prospect</h2><p>This creates a private prospect record. Link a registered organisation later.</p>
        <form className="growth-form" onSubmit={event=>void save("create",values(event))}>
          <label>Charity name<input name="name" required maxLength={200}/></label><label>Charity number<input name="charity_number" maxLength={25}/></label>
          <label>Public website<input type="url" name="website" maxLength={400}/></label><button className="founder-primary" disabled={busy}>Create prospect</button>
        </form></section>}
      <Pipeline view={view} data={data} search={search}/>
    </>}
    {isKind(view)&&detail&&<RecordPanel key={`${search.id}-${revision}`} view={view} detail={detail} busy={busy} save={save}/>}
  </>;
}

function Overview({data}:{data:Data|null}) {
  const [registrations,setRegistrations] = useState<number|null>(null);
  useEffect(()=>{let active=true;void founderCall<Dashboard>("dashboard").then(d=>{
    if (active && Array.isArray(d.users)) setRegistrations(new Set(d.users.filter(user=>user.createdAt && Date.parse(user.createdAt)>=Date.now()-30*86400000).map(user=>user.id)).size);
  }).catch(()=>undefined);return()=>{active=false;};},[]);
  const total = (kind:Kind, stage?:string) => data?.counts?.filter(row=>row.kind===kind&&(!stage||row.stage===stage)).reduce((sum,row)=>sum+row.total,0) ?? null;
  const events = (action:string) => data?.events ? data.events.find(row=>row.action===action)?.total ?? 0 : null;
  return <>
    <div className="growth-channels">{channels.map((item,index)=><Link key={item.key} href={href(item.key)}>
      <span className="founder-kicker">0{index+1}{index===0?" · Commercial priority":""}</span><h2>{item.title}</h2><p>{item.description}</p><strong>Open workspace →</strong>
    </Link>)}</div>
    <div className="growth-metrics">
      <Metric name="Accountancy prospects" value={total("accountants")} url={href("accountants",{stage:"tracked"})}/>
      <Metric name="Conversations started" value={total("accountants","Conversation started")} url={href("accountants",{stage:"Conversation started"})}/>
      <Metric name="Demos booked · pipeline stage" value={total("accountants","Demo booked")} url={href("accountants",{stage:"Demo booked"})}/>
      <Metric name="Adviser trials · Founder records" value={data?.counts?.reduce((sum,row)=>sum+(row.trials||0),0)??null} url={href("accountants",{stage:"trial"})}/>
      <Metric name="Paying Adviser partners" value={null} url={href("digital")}/>
      <Metric name="Charity prospects" value={total("charities")} url={href("charities")}/>
      <Metric name="Charities with reports prepared" value={events("report-draft")} url={href("charities",{stage:"report-draft"})}/>
      <Metric name="Charities with reports shared externally" value={events("report-shared")} url={href("charities",{stage:"report-shared"})}/>
      <Metric name="New registrations · last 30 days" value={registrations} url={href("digital")}/>
      <Metric name="Recorded contact enquiries" value={data?.enquiries??null} url="/founder/#feedback"/>
      <Metric name="Paid conversions" value={null} url={href("digital")}/>
      <Metric name="Attributed revenue" value={null} url={href("digital")}/>
    </div>
  </>;
}
function Metric({name,value,url}:{name:string;value:number|null;url:string}) {
  return <Link className="growth-metric" href={url}><strong>{value??"—"}</strong><span>{name}</span>{value===null&&<small>Unavailable</small>}</Link>;
}
function Pipeline({view,data,search}:{view:Kind;data:Data;search:Record<string,string>}) {
  const selected=search.stage||"";
  const filterStages = view==="accountants" ? ["tracked","due",...stages[view],"trial"] : ["due",...stages[view],"report-draft","report-shared"];
  const filterLabel = (stage:string)=>({tracked:"In pipeline",due:"Follow-ups due",trial:"Complimentary Adviser access","report-draft":"Report history","report-shared":"Shared externally"}[stage]||stage);
  const page = Math.max(0,parseInt(search.page||"0",10)||0);
  return <>
    <section className="growth-panel" aria-label="Pipeline stages"><h2>Pipeline</h2>
      <div className="growth-stages"><Link href={href(view,{...search,stage:"",page:""})} aria-current={!selected?"page":undefined}>All records</Link>
        {filterStages.map(stage=><Link key={stage} href={href(view,{...search,stage,page:""})} aria-current={stage===selected?"page":undefined}>{filterLabel(stage)}
          {(stages[view] as readonly string[]).includes(stage)&&<b>{data.counts?.find(row=>row.stage===stage)?.total||0}</b>}</Link>)}</div>
      {view==="accountants"&&<p className="growth-muted">Research scores and sales priority are independent. Trial figures use linked Founder entitlement records; paying Adviser status requires a billing connection.</p>}
    </section>
    <section className="growth-panel"><h2>{view==="accountants"?"Research and prospects":"Charity prospects"}</h2>
      <form className="growth-form" action={href(view)} method="get"><label>Search<input name="q" defaultValue={search.q} placeholder="Name, website or contact"/></label>
        <label>Sort by<select name="sort" defaultValue={search.sort}><option value="">Sales priority</option><option value="follow-up">Follow-up date</option><option value="name">Name</option></select></label>
        {selected&&<input type="hidden" name="stage" value={selected}/>}<button className="founder-primary">Search records</button></form>
      {data.rows?.length ? <div className="growth-table"><table><thead><tr><th>{view==="accountants"?"Firm":"Charity"}</th><th>Stage</th><th>Priority</th><th>Next action</th></tr></thead><tbody>
        {data.rows.map(row=><tr key={row.id}><td><Link href={href(view,{id:row.id})}>{row.display_name} →</Link><small>{[row.location,row.score!=null?`Research score: ${row.score}/100`:"",row.organisation_name].filter(Boolean).join(" · ")}</small></td>
          <td>{row.stage}{row.trial_active&&<small>Complimentary Adviser access</small>}</td><td>{row.priority||"—"}</td><td>{row.next_action||"—"}{row.follow_up&&<small>Due {day(row.follow_up)}</small>}</td></tr>)}
      </tbody></table></div> : <p className="growth-muted">No records match these filters.</p>}
      {(page>0||data.hasMore)&&<nav className="growth-pager" aria-label="Results pages">
        {page>0&&<Link href={href(view,{...search,page:String(page-1)})}>← Previous</Link>}<span>Page {page+1}</span>
        {data.hasMore&&<Link href={href(view,{...search,page:String(page+1)})}>Next →</Link>}
      </nav>}
    </section>
  </>;
}

function RecordPanel({view,detail,busy,save}:{view:Kind;detail:Detail;busy:boolean;save:Save}) {
  const {record,firm,evidence,people,activity,organisations,partners,referrals}=detail;
  const [selectedSource,setSelectedSource]=useState("");
  const [person,setPerson]=useState("");
  const [draft,setDraft]=useState<{subject:string;body:string}|null>(null);
  const mail = activity.filter(item=>item.action==="email-draft");
  const reports = activity.filter(item=>item.action==="report-draft");
  const approvals = activity.filter(item=>item.action==="report-approved");
  const source = evidence[Number(selectedSource)];
  const sourceUrl = selectedSource!=="" && source?.url && ["High","Verified"].includes(source.confidence) ? publicWebUrl(source.url) : "";
  const usableContact = record?.contact_review==="Reviewed for outreach" && !record.suppressed && Boolean(record.contact_email);
  return <>
    {firm&&<section className="growth-panel">
      <div className="growth-panel-heading"><div><p className="founder-kicker">Existing research profile</p><h2>Research and evidence</h2></div>
        {!record&&<button className="founder-primary" disabled={busy} onClick={()=>void save("create",{firm_id:firm.id})}>Add to partnership pipeline</button>}</div>
      <div className="growth-facts">
        <div><strong>{firm.total==null?"—":`${firm.total}/100`}</strong><span>Research score</span></div>
        <div><strong>{firm.location||"—"}</strong><span>Location</span></div>
        <div><strong>{firm.approved_at?"Human reviewed":"Awaiting review"}</strong><span>{day(firm.approved_at)}</span></div>
        <div><strong>{day(firm.research_completed_at)}</strong><span>Research completed</span></div>
      </div>
      <p>{firm.website&&publicWebUrl(firm.website)&&<a href={publicWebUrl(firm.website)} target="_blank" rel="noreferrer">Firm website ↗</a>} · {firm.listing?<Link href={`/accountants-advisers/${firm.listing.slug}/`} target="_blank" rel="noreferrer">{firm.listing.featured?"Featured public listing ↗":"Public listing ↗"}</Link>:<span>No current public listing</span>} · <Link href="/founder/#accountants">Directory controls →</Link> · <Link href={`/console/firm/${firm.id}/`}>Research Console profile →</Link></p>
      {typeof firm.contact?.email==="string"&&firm.contact.email&&<p className="growth-muted">Research contact: {firm.contact.email}. Verify the address and contact basis before using it.</p>}
      {firm.scores&&<p className="growth-muted">{Object.entries(firm.scores).map(([key,val])=>`${key}: ${val}`).join(" · ")}</p>}
      <details><summary>People and research evidence ({evidence.length})</summary>
        {people.length>0&&<ul>{people.map((item,i)=><li key={i}>{item.name}{item.role?` · ${item.role}`:""}</li>)}</ul>}
        {evidence.length ? <ul className="growth-evidence">{evidence.map((item,i)=><li key={i}><strong>{item.title}</strong>
          <p>{item.summary}</p><small>{item.category||"Evidence"} · {item.confidence} · {day(item.accessed_at)}</small>{item.url&&publicWebUrl(item.url)&&<> · <a href={publicWebUrl(item.url)} target="_blank" rel="noreferrer">Source ↗</a></>}</li>)}</ul> : <p>No current evidence on this profile.</p>}
      </details>
    </section>}
    {record&&<>
      <section className="growth-panel" aria-label="Relationship details">
        <div className="growth-panel-heading"><div><p className="founder-kicker">Relationship</p><h2>Pipeline and next action</h2><p className="growth-muted">Last recorded contact: {day(record.last_contact)}</p></div><span className="growth-badge">{record.stage}</span></div>
        <form className="growth-form growth-detail-form" onSubmit={event=>void save("update",values(event))}>
          <label>Pipeline stage<select name="stage" defaultValue={record.stage}>{stages[view].map(stage=><option key={stage}>{stage}</option>)}</select></label>
          <label>Sales priority<select name="priority" defaultValue={record.priority}>{["High","Normal","Low"].map(item=><option key={item}>{item}</option>)}</select></label>
          <label>Assigned owner<input name="owner_name" required maxLength={120} defaultValue={record.owner_name}/></label>
          <label>Follow-up date<input type="date" name="follow_up" defaultValue={record.follow_up?.slice(0,10)}/></label>
          <label className="growth-wide">Next action<input name="next_action" maxLength={1000} defaultValue={record.next_action}/></label>
          <label>Contact name<input name="contact_name" maxLength={200} defaultValue={record.contact_name} list={people.length?"growth-contact-names":undefined}/></label>
          {people.length>0&&<datalist id="growth-contact-names">{people.map(item=><option key={item.name} value={item.name}/>)}</datalist>}
          <label>Verified contact email<input type="email" name="contact_email" defaultValue={record.contact_email} maxLength={254} readOnly={record.contact_review==="Do not contact"}/></label>
          <label>Contact review<select name="contact_review" defaultValue={record.contact_review} disabled={record.contact_review==="Do not contact"}>
            {["Review needed","Reviewed for outreach","Do not contact"].map(item=><option key={item}>{item}</option>)}</select></label>
          {record.contact_review==="Do not contact"&&<input type="hidden" name="contact_review" value="Do not contact"/>}
          <label>Contact basis and source<input name="contact_basis" maxLength={2000} defaultValue={record.contact_basis} placeholder="Record why this contact can be approached"/></label>
          <p className="growth-wide growth-muted">Confirm how the address was obtained, check opt-outs and the applicable rules, and include a way to opt out. <a href="https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/" target="_blank" rel="noreferrer">ICO guidance ↗</a></p>
          <label>Registered SORP organisation<select name="organisation_id" defaultValue={record.organisation_id||""}>
            <option value="">No organisation linked</option>{organisations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {view==="charities"&&<><label>Confirmed referring firm<select name="referred_by" defaultValue={record.referred_by||""}>
            <option value="">No confirmed referral</option>{partners.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="growth-wide">Referral evidence<input name="referral_evidence" maxLength={2000} defaultValue={record.referral_evidence} placeholder="For example, an introduction date and reference"/></label></>}
          <button className="founder-primary" disabled={busy}>Save relationship</button>
        </form>
        {record.organisation_name&&<div className="growth-inset"><strong>{record.organisation_name} · {record.plan} access</strong>
          {record.complimentary&&<p>Complimentary access recorded: {day(record.complimentary_start)} to {record.complimentary_end?day(record.complimentary_end):"no expiry recorded"}.{record.trial_days!=null&&` ${record.trial_days} days remaining.`}</p>}
          <p>Subscription payment status is unavailable. <Link href={`/founder/?organisation=${record.organisation_id}#organisations`}>Open organisation and manage access →</Link></p></div>}
        {view==="accountants"&&<div className="growth-inset"><h3>Confirmed charity referrals</h3>
          {referrals.length?<ul>{referrals.map(row=><li key={row.id}><Link href={href("charities",{id:row.id})}>{row.display_name}</Link> · {row.members||0} recorded active members · {row.plan||"—"} access</li>)}</ul>:<p>No confirmed referrals. Link a registered charity and record the introduction in Charity Outreach.</p>}
          <Link href={href("charities")}>Open Charity Outreach →</Link></div>}
      </section>
      <section className="growth-panel"><h2>Personal correspondence</h2>
        {!usableContact&&<p className="growth-muted">{record.suppressed?"This address is suppressed.":"Review and save the contact before preparing the final outreach."} Drafts stay private.</p>}
        {firm&&<div className="growth-form"><label>Greeting contact<select value={person} onChange={e=>setPerson(e.target.value)}>
          <option value="">Use saved contact or general greeting</option>{people.map((item,i)=><option key={i} value={item.name}>{item.name}</option>)}</select></label>
          <label>Research reference<select value={selectedSource} onChange={e=>setSelectedSource(e.target.value)}>
            <option value="">No reference selected</option>{evidence.map((item,i)=>item.url&&publicWebUrl(item.url)&&["High","Verified"].includes(item.confidence)?<option key={i} value={i}>{item.title}</option>:null)}</select></label>
          <button className="founder-primary" type="button" onClick={()=>setDraft(introduction(firm.name,sourceUrl?{title:source.title,url:sourceUrl}:undefined,person||record.contact_name))}>Prepare introduction draft</button></div>}
        <form className="growth-form growth-detail-form" key={draft?.body||mail[0]?.id||"draft"} onSubmit={event=>void save("email-draft",values(event))}>
          <label className="growth-wide">Subject<input name="title" required maxLength={250} defaultValue={draft?.subject||mail[0]?.details.title}/></label>
          <label className="growth-wide">Email draft<textarea name="body" required rows={7} maxLength={20_000} defaultValue={draft?.body||mail[0]?.details.body}/></label>
          <button className="founder-primary" disabled={busy}>Save new draft version</button>
        </form>
        {mail.length>0&&<div className="growth-versions">{mail.map(item=><Version key={item.id} item={item}>
          <p>Saved recipient: {item.details.recipient||"Not selected"}</p>
          {usableContact && item.details.recipient===record.contact_email && <ExternalRecord action="email-sent" item={item} busy={busy} save={save}/>}
        </Version>)}</div>}
      </section>
      {view==="charities"&&<section className="growth-panel"><h2>Public evidence reports</h2>
        <p>Prepare a preliminary note using public evidence. Full assessments need the charity’s own answers and permission to use private information.</p>
        <p><Link href="/are-you-sorp-ready/" target="_blank" rel="noreferrer">Open SORP readiness tools ↗</Link> · <Link href="/charity-impact-reports/" target="_blank" rel="noreferrer">Open Impact Report tools ↗</Link></p>
        <form className="growth-form growth-detail-form" onSubmit={event=>void save("report-draft",values(event))}>
          <label>Service<select name="service"><option>SORP readiness observations</option><option>Charity reporting review</option><option>Impact report observations</option><option>Other public evidence note</option></select></label>
          <label>Report title<input name="title" required maxLength={250} defaultValue={reports[0]?.details.title}/></label>
          <label className="growth-wide">Public sources and evidence<textarea name="sources" required rows={3} maxLength={5000} defaultValue={reports[0]?.details.sources}/></label>
          <label className="growth-wide">Observations and practical next steps<textarea name="body" required rows={6} maxLength={20_000} defaultValue={reports[0]?.details.body}/></label>
          <label className="growth-wide">Assumptions and limitations<textarea name="limitations" required rows={3} maxLength={5000} defaultValue={reports[0]?.details.limitations}/></label>
          <button className="founder-primary" disabled={busy}>Save report version</button>
        </form>
        {reports.length>0&&<div className="growth-versions">{reports.map(item=>{
          const approval=approvals.find(a=>a.details.version===item.id);
          return <Version key={item.id} item={item}><p><strong>Sources and evidence:</strong> {item.details.sources}</p><p><strong>Limitations:</strong> {item.details.limitations}</p>
            {approval ? <><p className="growth-badge">Approved {day(approval.created_at)}</p><DownloadReport item={item}/>{usableContact&&<ExternalRecord action="report-shared" item={approval} busy={busy} save={save}/>}</> :
              <form className="growth-form" onSubmit={event=>{values(event);void save("report-approved",{version:item.id,confirm:true});}}>
                <label className="growth-check"><input type="checkbox" required/> I reviewed the evidence, text and limitations.</label><button className="founder-primary" disabled={busy}>Approve this version</button></form>}
          </Version>;
        })}</div>}
      </section>}
      <section className="growth-panel"><h2>Meetings and relationship notes</h2>
        <p><Link href="/are-you-sorp-ready/review/booking/?session=free" target="_blank" rel="noreferrer">Open existing introductory call booking ↗</Link>. Save the agenda, outcomes and next steps here. Only mark a meeting booked after it is confirmed.</p>
        <form className="growth-form growth-detail-form" onSubmit={event=>void save("meeting",values(event))}>
          <label>Meeting title<input name="title" required maxLength={250}/></label><label>Meeting date<input type="date" name="meeting_date" required/></label>
          <label>Meeting status<select name="meeting_status"><option>Planned</option><option>Booked externally</option><option>Completed</option><option>Cancelled</option></select></label>
          <label className="growth-wide">Agenda, notes and next steps<textarea name="body" required rows={3} maxLength={10_000}/></label>
          <button className="founder-primary" disabled={busy}>Record meeting</button>
        </form>
        <form className="growth-form growth-detail-form" onSubmit={event=>void save("note",values(event))}>
          <label>Note title<input name="title" required maxLength={250}/></label><label className="growth-wide">Contact or service notes<textarea name="body" required rows={3} maxLength={10_000}/></label>
          <button className="founder-primary" disabled={busy}>Save note</button>
        </form>
        <details open><summary>Relationship history ({activity.length}{activity.length===100?"+":""})</summary><ul className="growth-history">{activity.map(item=><li key={item.id}>
          <strong>{item.details.title||item.action.replaceAll("-"," ")}</strong><small>{day(item.created_at)} · {item.actor} · {item.action==="email-sent"?"Recorded sent externally; delivery unverified":item.action.replaceAll("-"," ")}</small>
          {item.details.stage&&<p>{item.details.previous_stage?`${item.details.previous_stage} → `:""}{item.details.stage}</p>}
          {item.details.meeting_status&&<p>{item.details.meeting_status} · {day(item.details.meeting_date)}</p>}
          {["meeting","note"].includes(item.action)&&<p className="growth-text">{item.details.body}</p>}
          {item.details.evidence&&<p>{item.details.evidence}</p>}
        </li>)}</ul></details>
      </section>
    </>}
  </>;
}

function Version({item,children}:{item:Activity;children:ReactNode}) {
  return <details className="growth-version"><summary>{item.details.title} · {displayDate(item.created_at,true)}</summary>
    <p className="growth-text">{item.details.body}</p>{children}</details>;
}

function ExternalRecord({action,item,busy,save}:{action:"email-sent"|"report-shared";item:Activity;busy:boolean;save:Save}) {
  const [copied,setCopied]=useState("");
  return <div className="growth-inset">
    {action==="email-sent"&&<><p>Send from your email account after reviewing the recipient. SORP does not send this draft.</p>
      <button type="button" className="founder-primary" onClick={()=>void navigator.clipboard.writeText(`Subject: ${item.details.title}\n\n${item.details.body}`).then(()=>setCopied("Draft copied."),()=>setCopied("Copy failed. Select the draft text to copy it."))}>Copy reviewed draft</button>
      {copied&&<span role="status"> {copied}</span>}</>}
    <form className="growth-form" onSubmit={event=>void save(action,{...values(event),version:item.id,confirm:true})}>
      <label>Evidence or sent-message reference<input name="evidence" required maxLength={2000}/></label>
      <label className="growth-check"><input type="checkbox" required/> I confirm I already shared this version externally.</label>
      <button className="founder-primary" disabled={busy}>{action==="email-sent"?"Record email sent externally":"Record report shared externally"}</button>
    </form>
  </div>;
}

function DownloadReport({item}:{item:Activity}) {
  const [status,setStatus]=useState("");
  function download() {
    const url=URL.createObjectURL(new Blob([`${item.details.title}\nPreliminary public evidence report\n\n${item.details.body}\n\nSources and evidence\n${item.details.sources}\n\nAssumptions and limitations\n${item.details.limitations}`],{type:"text/plain;charset=utf-8"}));
    const link=document.createElement("a"); link.href=url; link.download="sorp-preliminary-report.txt"; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus("Report download started.");
  }
  return <><button className="founder-primary" type="button" onClick={download}>Download approved report</button>{status&&<p role="status">{status}</p>}</>;
}

type DigitalData = { dashboard:Dashboard; enquiries:number|null; now:number };
function Digital() {
  const [data,setData]=useState<DigitalData|null>(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [days,setDays]=useState(30);
  useEffect(()=>{
    let active=true;
    void Promise.all([founderCall<Dashboard>("dashboard"),growthRequest<Data>({view:"overview"}).catch(()=>null)]).then(([dashboard,growth])=>{
      if(active)setData({dashboard,enquiries:growth?.enquiries??null,now:Date.now()});
    }).catch(caught=>{if(active)setError(getError(caught));});
    return()=>{active=false;};
  },[retry]);
  const cutoff=(data?.now||0)-days*86400000;
  const inPeriod=(value?:string)=>Boolean(data&&value&&Date.parse(value)>=cutoff&&Date.parse(value)<=data.now);
  const users=data?.dashboard.users.filter(user=>inPeriod(user.createdAt));
  const readiness=data?.dashboard.products.readiness;
  const counts = {
    users:users ? new Set(users.map(user=>user.id)).size : null,
    started:readiness ? readiness.filter(row=>inPeriod(row.startedAt)).length : null,
    completed:readiness ? readiness.filter(row=>inPeriod(row.completedAt)).length : null,
  };
  const trends = users?.reduce<Record<string,number>>((acc,user)=>{const key=new Date(user.createdAt!).toISOString().slice(0,10);acc[key]=(acc[key]||0)+1;return acc;},{});
  return <>
    <header className="growth-heading"><div><p className="founder-kicker">03 · Founder Growth</p><h1>Digital Marketing</h1><p>Track outcomes the platform can verify. Acquisition and billing figures appear only when their sources are connected.</p></div></header>
    {error&&<div className="founder-error" role="alert">{error}<button onClick={()=>{setError("");setRetry(n=>n+1);}}>Retry</button></div>}
    {!data&&!error&&<p role="status">Loading account and assessment records…</p>}
    <section className="growth-panel"><div className="growth-panel-heading"><h2>Recorded activity</h2><label>Period <select value={days} onChange={event=>setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
      <p className="growth-muted">Based on dated records returned by Founder. Assessment activity without a start or completion date is excluded.</p>
      <div className="growth-metrics"><Metric name="Registrations" value={counts.users} url="/founder/#organisations"/>
        <Metric name="Recorded assessment starts" value={counts.started} url="/founder/#readiness"/>
        <Metric name="Recorded assessment completions" value={counts.completed} url="/founder/#readiness"/>
        <Metric name="New organisation records" value={data?data.dashboard.organisations.filter(row=>inPeriod(row.created_at)).length:null} url="/founder/#organisations"/>
        <Metric name="Recorded enquiries · all time" value={data?.enquiries??null} url="/founder/#feedback"/></div>
      <h3>Registration trend · UTC</h3>
      {trends&&Object.keys(trends).length?<div className="growth-table"><table><thead><tr><th>Date</th><th>Registrations</th></tr></thead><tbody>
        {Object.entries(trends).sort(([a],[b])=>b.localeCompare(a)).map(([label,total])=><tr key={label}><td>{label}</td><td>{total}</td></tr>)}
      </tbody></table></div>:<p className="growth-muted">{data?"No dated registrations in this period.":"Registration data is not available yet."}</p>}
    </section>
    <section className="growth-panel"><h2>Conversion funnel</h2>
      <div className="growth-stages"><span>Visitors <b>Unavailable</b></span><span>Assessment starts <b>{counts.started??"—"}</b></span><span>Registrations <b>{counts.users??"—"}</b></span><span>Recently active organisations · platform total <b>{data?.dashboard.metrics.recentlyActiveOrganisations??"—"}</b></span><span>Paid subscriptions <b>Unavailable</b></span></div>
      <p>These are separate records. Conversion rates, drop-off and source or campaign filters require a connection that can link the same journey across stages.</p>
    </section>
    <section className="growth-panel"><h2>Acquisition and campaign sources</h2><dl className="growth-sources">
      <div><dt>Website traffic and journeys</dt><dd>Vercel Web Analytics is not available for this project. Visitors, sessions, sources and landing pages cannot be reported here.</dd></div>
      <div><dt>LinkedIn, Meta and Google campaigns</dt><dd>No verified campaign connection. Spend, visits, leads, cost per acquisition and campaign attribution are unavailable.</dd></div>
      <div><dt>Email campaigns</dt><dd>No connected campaign delivery or attribution feed.</dd></div>
      <div><dt>Paid conversions and revenue</dt><dd>Organisation subscription billing is not connected to Founder. One-off payments do not count as subscriptions.</dd></div>
    </dl></section>
  </>;
}
