"use client";
import { useEffect, useState } from "react";
type Row={id:string;organisation:string;title:string;source_url:string|null;confirmed_at:string|null;created_at:string;reviews:{framework:string;status:string}[]};
export function ImpactReportActivity() {
  const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();void fetch("/api/impact-report-review/?founder=1",{cache:"no-store",signal:c.signal}).then(async r=>{if(!r.ok)throw new Error("Report review activity could not be loaded.");return r.json();}).then(d=>setRows(d.documents)).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
  return <section><h3>Impact report activity</h3><p>Discovered documents and automated reviews. Quotation and digitisation requests appear in Marcus enquiries above.</p>{error&&<p role="alert">{error}</p>}<div className="founder-table-wrap"><table className="founder-table"><thead><tr><th>Organisation</th><th>Report</th><th>Document</th><th>Framework reviews</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.organisation}</td><td>{r.title}<small>{new Date(r.created_at).toLocaleDateString("en-GB")}</small></td><td>{r.confirmed_at?"Confirmed":r.source_url?"Discovered":"Uploaded"}</td><td>{r.reviews.map(v=><p key={v.framework}>{v.framework==="claims"?"Claims Code":"Excellence"}: {v.status}</p>)}</td></tr>)}</tbody></table></div></section>;
}
