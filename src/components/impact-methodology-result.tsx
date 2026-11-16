"use client";
import { criteria, ANCHORS } from "@/lib/impact-review/mid/rubric";
import { limitations, type Framework, type ReviewResult } from "@/lib/impact-review/rubric";
export function ImpactMethodologyResult({result,framework}:{result:ReviewResult;framework:Framework}) {
 const definitions=criteria(framework);
 return <>
  <p className="impact-score">{result.overall===null?"Provisional review · insufficient assessable coverage":`${result.overall}/100 · indicative report disclosure score`}</p>
  <p>{result.summary}</p><p>{framework==="excellence"?"This describes what your report demonstrates. It is not a score of your organisation’s maturity or effectiveness.":"This is an indicative assessment of your reported claims, not certification or independent verification."}</p>
  <div className="impact-findings">{result.sections.map(s=><section key={s.name}><h4>{s.name} {s.score===null?"":`${s.score}/100`}</h4>
   {result.criteria?.filter(t=>definitions.find(c=>c.id===t.id)?.principle===s.name).map(t=><details key={t.id}><summary>{definitions.find(c=>c.id===t.id)?.question}<span className="impact-test-score">{t.score===null?"Not assessable":`${t.score}/4 · ${ANCHORS[t.score]}`}</span></summary><p>{t.explanation}</p><p><strong>Practical improvement: </strong>{t.improvement}</p><p>Confidence: {t.confidence}</p>{t.evidence.map((e,i)=><blockquote key={i}>“{e.quote}”<cite>PDF page {e.page}</cite></blockquote>)}{t.limitations.map((l,i)=><p key={i}>{l}</p>)}</details>)}
  </section>)}</div>
  <h4>Your practical next steps</h4><ol>{result.actions?.actions.map((a,i)=><li key={i}><strong>{a.title}</strong><p>{a.detail}</p><small>{a.priority.replaceAll("_"," ")} · {a.criterionIds.join(", ")}</small></li>)}</ol>
  <aside className="impact-limitations"><h4>About this assessment</h4><p>{limitations}</p>{result.limitations.map((l,i)=><p key={i}>{l}</p>)}<details><summary>Method and scoring</summary><p>My Impact Director methodology {result.methodologyVersion}. Twenty tests per framework, each rated 0–4 against published evidence. Each pillar contributes up to 20 points to the overall score. An overall score requires at least sixteen assessable tests and at least three per pillar. Unreadable or irrelevant material is excluded with an explanation. Missing disclosure describes this document only.</p></details></aside>
  <button type="button" className="impact-print" onClick={()=>{const panels=[...document.querySelectorAll<HTMLDetailsElement>(".impact-results details")],closed=panels.filter(p=>!p.open);panels.forEach(p=>p.open=true);window.addEventListener("afterprint",()=>closed.forEach(p=>p.open=false),{once:true});window.print();}}>Print or save results as PDF →</button>
 </>;
}
