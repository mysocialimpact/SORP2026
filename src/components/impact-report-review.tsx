"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AccountGateway } from "./account-gateway";
import { DirectorBooking } from "@/features/director/booking";
import { limitations, rubric, type Framework, type ReviewResult } from "@/lib/impact-review/rubric";
import "./impact-report-review.css";
import { ImpactMethodologyResult } from "./impact-methodology-result";
type Document={id:string;organisation:string;title:string;source_url:string|null;reporting_period:string|null;confirmed_at:string|null};
type Review={document_id:string;framework:Framework;status:string;result:ReviewResult|null;error:string|null;updated_at:string;progress?:{findings?:unknown[]}};
type State={documents:Document[];reviews:Review[];context:{organisation:string;candidate:{name:string;registrationNumber:string;officialUrl:string}|null}};
const names={claims:"Social Impact Claims Code",excellence:"Social Impact Excellence"};
async function call(body?:unknown) {
  const response=await fetch("/api/impact-report-review/",body===undefined?{cache:"no-store"}:body instanceof FormData?{method:"POST",body}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok) throw Object.assign(new Error(data.error||"The request could not finish."),{status:response.status});return data;
}
export function ImpactReportReview() {
  const [data,setData]=useState<State|null>(null),[signedOut,setSignedOut]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
  const [selected,setSelected]=useState(""),[framework,setFramework]=useState<Framework>("claims"),[enquiry,setEnquiry]=useState("");
  const searched=useRef(false), enquiryKey=useRef("");
  const refresh=useCallback(async()=>{try{const value=await call();setData(value);setSelected(id=>id||value.documents[0]?.id||"");}catch(e){if((e as {status?:number}).status===401)setSignedOut(true);else setError((e as Error).message);}},[]);
  useEffect(()=>{queueMicrotask(()=>void refresh());},[refresh]);
  useEffect(()=>{
    if(!data?.reviews.some(r=>["queued","running"].includes(r.status))) return;
    const timer=setInterval(()=>void refresh(),4000);return()=>clearInterval(timer);
  },[data,refresh]);
  useEffect(()=>{
    if(!data||data.documents.length||searched.current) return;
    searched.current=true;
    void call({action:"discover"}).then(r=>{setNotice(r.message);void refresh();}).catch(e=>setError(e.message));
  },[data,refresh]);
  async function action(body:unknown,label:string) {
    setBusy(label);setError("");
    try{const value=await call(body);if(value.id)setSelected(value.id);if(value.message)setNotice(value.message);await refresh();}
    catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  const doc=data?.documents.find(d=>d.id===selected), review=data?.reviews.find(r=>r.document_id===selected&&r.framework===framework);
  async function requestEnquiry(kind:string) {
    setBusy(kind);setError("");
    const id=enquiryKey.current||crypto.randomUUID();enquiryKey.current=id;
    try{
      const response=await fetch("/api/continuous-improvement/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"contact",submissionId:id,pagePath:"/charity-impact-reports/review/",enquiryType:"advice",message:kind+"\nOrganisation: "+(doc?.organisation||data?.context.organisation)+"\nDocument: "+(doc?.title||"Not selected")+" ("+(doc?.id||"")+")\n"+enquiry})});
      const result=await response.json();if(!response.ok||!result.accepted)throw new Error(result.error||"Your enquiry could not be saved.");
      setNotice("Your enquiry is saved for My Social Impact. We’ll use your account contact details to respond.");enquiryKey.current="";
    }catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  if(signedOut)return <section className="impact-review"><h2>Get a free assessment of your charity’s impact report.</h2><p>Create your SORP2026 account and begin with Are You SORP Ready? Then explore both impact report reviews with the same account and charity.</p><AccountGateway returnTo="/charity-impact-reports/review/"/></section>;
  return <div className="impact-review">
    {!data&&!error&&<p role="status">Opening your charity and saved reports…</p>}
    {error&&<p className="impact-alert" role="alert">{error} <Link href="/contact/">Ask My Social Impact for help →</Link></p>}{notice&&<p className="impact-notice" role="status">{notice}</p>}
    {data&&<>
      <header><p className="gateway-kicker">Your organisation</p><h2>{data.context.organisation}</h2>{data.context.candidate&&<p>Charity {data.context.candidate.registrationNumber} · <a href={data.context.candidate.officialUrl} target="_blank" rel="noreferrer">Official record ↗</a></p>}</header>
      <section aria-labelledby="impact-document-title"><h3 id="impact-document-title">Choose your report.</h3>
        {!data.documents.length&&!notice&&<p>We’re checking your charity’s published report links. You can also upload a PDF below.</p>}
        <div className="impact-documents">{data.documents.map(d=><button type="button" key={d.id} aria-pressed={selected===d.id} onClick={()=>setSelected(d.id)}><strong>{d.title}</strong><small>{d.reporting_period||"Reporting period not established"}</small><small>{d.confirmed_at?"Confirmed document":"Check this document"}</small></button>)}</div>
        <label className="impact-upload" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(busy)return;const file=event.dataTransfer.files[0];if(file){const form=new FormData();form.set("file",file);void action(form,"Uploading PDF…");}}}>Drop your PDF here, or choose a file <small>Searchable PDF · up to 4 MB · kept within your account or authorised charity workspace</small><input type="file" accept=".pdf,application/pdf" disabled={!!busy} onChange={event=>{const file=event.target.files?.[0];if(file){const form=new FormData();form.set("file",file);void action(form,"Uploading PDF…");}}}/></label>
        {!data.documents.length&&<button type="button" disabled={!!busy} onClick={()=>void action({action:"discover"},"Checking published sources…")}>Check published sources again →</button>}
      </section>
      {doc&&<section className="impact-document"><p className="gateway-kicker">Document to review</p><h3>{doc.title}</h3><p>{doc.organisation} · {doc.reporting_period||"Period not established"}</p>
        <a href={doc.source_url||"/api/impact-report-review/?download="+doc.id} target="_blank" rel="noreferrer">Inspect the original document ↗</a>
        {doc.source_url&&<p className="impact-source">{doc.source_url}</p>}
        {!doc.confirmed_at?<><p>Would you like us to review this report? Please check it belongs to your charity and covers the period you want.</p><button disabled={!!busy} onClick={()=>void action({action:"confirm",id:doc.id},"Confirming document…")}>Yes, review this report →</button></>:<p>✓ You confirmed this document.</p>}
      </section>}
      {doc?.confirmed_at&&<section><h3>One report. Two perspectives.</h3><p>Your first report review is free. Both frameworks use the same document and share your allowance.</p><div className="impact-tabs" role="group" aria-label="Review framework">{(["claims","excellence"] as const).map(f=><button aria-pressed={framework===f} key={f} onClick={()=>setFramework(f)}>{names[f]}</button>)}</div>
        <p>{framework==="claims"?"How credible are the impact claims in this report?":"What does this report reveal about how the organisation manages social impact?"}</p>
        {!review||review.status==="failed"?<><button disabled={!!busy} onClick={()=>void action({action:"review",id:doc.id,framework},"Starting review…")}>{review?"Retry review":"Run free review"} →</button>{review?.error&&<p role="alert">{review.error}</p>}</>:review.status!=="complete"?<div className="impact-processing" role="status"><p>Reading the report and checking its evidence against {names[framework]}…</p><progress max={20} value={review.progress?.findings?.length||0}/><p>{review.progress?.findings?.length||0} of 20 checks complete. You can leave and return to your saved review.</p></div>:review.result&&<article className="impact-results" aria-label="Completed report review">
          <p className="gateway-kicker">{names[framework]} · Automated preliminary review · {new Date(review.updated_at).toLocaleDateString("en-GB")}</p><h3>Your report review</h3>
          <p>{doc.organisation} · {doc.title} · {doc.reporting_period||"Reporting period not established"}</p>
          {review.result.methodologyVersion?<ImpactMethodologyResult result={review.result} framework={framework}/>:<>
          {framework==="claims"&&<p className="impact-score">{review.result.overall===null?"Insufficient evidence for an overall score":review.result.overall+"/100 · indicative document score"}</p>}
          <p>{review.result.summary}</p><div className="impact-findings">{review.result.sections.map(s=><section key={s.name}><h4>{s.name}{framework==="claims"&&s.rating!==null?" · "+s.rating*25+"/100":""}</h4><p className="impact-status">{{demonstrated:"Demonstrated in the report",partial:"Partial or unclear evidence",not_disclosed:"Not disclosed in this report",cannot_determine:"Cannot be determined from this document"}[s.status]}</p><p>{s.finding}</p>{s.strength&&<p><strong>Strength: </strong>{s.strength}</p>}<p><strong>Evidence gap: </strong>{s.gap}</p><p><strong>Next step: </strong>{s.recommendation}</p>{s.evidence.map((e,i)=><blockquote key={i}>“{e.quote}”<cite>PDF page {e.page}</cite></blockquote>)}</section>)}</div>
          <h4>Three practical improvements</h4><ol>{review.result.recommendations.map(r=><li key={r}>{r}</li>)}</ol>
          <aside className="impact-limitations"><h4>About this assessment</h4><p>{limitations}</p>{review.result.limitations.map(l=><p key={l}>{l}</p>)}<details><summary>Scoring and assessment method</summary><p>{rubric}</p><p>Framework definitions come from the existing My Social Impact Claims Code explanations and Social Impact Excellence questions. References use physical PDF page numbers.</p></details></aside>
          </>}{framework==="excellence"&&<Link href="/social-impact-excellence/">Explore the full Social Impact Excellence diagnostic →</Link>}
        </article>}
      </section>}
      {data.reviews.some(r=>r.status==="complete")&&<>
        <section><p className="gateway-kicker">Take it further</p><h3>Discuss your impact report with My Social Impact.</h3><DirectorBooking/></section>
        <section className="impact-next"><article><p className="gateway-kicker">Professional support · From £1,000</p><h3>Create your next Charity Impact Report.</h3><p>Let My Social Impact help you build a stronger report. Pricing depends on your charity’s size and requirements.</p><Link href="/contact/">Talk to us →</Link></article><article><h3>Independent expert review</h3><p>Discuss a professional review of your report, selected claims and supporting evidence within an agreed scope. Where we helped prepare a report, we disclose that involvement and agree appropriate independence arrangements.</p></article>
        <div><label>Anything you’d like to discuss?<textarea value={enquiry} maxLength={1500} onChange={event=>{setEnquiry(event.target.value);enquiryKey.current="";}}/></label><div className="impact-enquiries">{["Request an expert review quotation","Enquire about digitisation","Discuss next year’s report"].map(kind=><button key={kind} disabled={!!busy} onClick={()=>void requestEnquiry(kind)}>{kind} →</button>)}</div></div></section>
      </>}
    </>}{busy&&<p role="status" className="impact-notice">{busy}</p>}
  </div>;
}
