import "server-only";
import { structured } from "./mid/ai";
import { ANCHORS, criteria, VERSION, LIMITATION, type Framework } from "./mid/rubric";
import { contextSchema, actionSchema, validateClaims, validateFindings, scoreFramework, type Claim, type Criterion, type Page, type Actions } from "./mid/assessment";
import { sourcePassages, referencedClaimsSchema, referencedFindingsSchema, resolveClaims, resolveFindings } from "./mid/passages";
import { z } from "zod";
import type { PageText, ReviewResult } from "./rubric";
export type Understanding = { context: z.infer<typeof contextSchema>; claims: Claim[] };
export type Progress = { findings?: Criterion[] };
const readablePages = (pages: PageText[]): Page[] => pages.map(p=>({...p,extraction:"text",readable:p.text.trim().length>=20}));
export async function understand(pages: PageText[], organisation: string): Promise<Understanding> {
 const source=readablePages(pages), passages=sourcePassages(source);
 const context=await structured(contextSchema,"Identify report context. Do not infer unknown identity or period. Use Unknown and null when not established. Record unreadable material as an assessment limitation. The expected organisation is supplied for matching only; if the document belongs to another organisation, explicitly state that mismatch.",{pages:source,expectedOrganisation:organisation});
 const claims=await structured(referencedClaimsSchema,"Identify and scrutinise all material impact claims, usually 8–12 if that many exist, up to 40. Never pad. Include exaggerated or causal claims. For each claim retrieve supporting passages from anywhere in the document. Select only supplied passage IDs and evidenceIds; the server copies verbatim text. A repeated assertion is not independent evidence. Distinguish contribution and causation. Claim IDs C1, C2 etc.",{context:context.data,passages});
 return {context:context.data,claims:validateClaims(resolveClaims(claims.data,passages),source)};
}
export async function advance(pages:PageText[],framework:Framework,understanding:Understanding,progress:Progress,bytes:Buffer):Promise<{progress:Progress;result?:ReviewResult}> {
 const source=readablePages(pages),passages=sourcePassages(source),findings=progress.findings||[],principle=Math.floor(findings.length/4);
 if(principle<5){
  const r=await structured(referencedFindingsSchema,`Assess exactly the four supplied criterion IDs. Establish evidence before judgement. Select only existing source passage IDs; never invent quotations or IDs. Numeric anchors: ${JSON.stringify(ANCHORS)}. assessed requires score 1–4 and cited evidence. not_demonstrated means relevant disclosure absent in a fully readable report, score 0. not_applicable means irrelevant with null and a contextual explanation, never missing information. unassessable means insufficient reliable material with null and an explanation. No absence judgements on unreadable content. Excellence scores only report demonstrations, never organisational maturity. Give specific improvements and confidence. Return no overall score.`,{...understanding,criteria:criteria(framework).slice(principle*4,principle*4+4),passages,unreadablePages:source.filter(p=>!p.readable).map(p=>p.page),...(framework==="excellence"&&principle===4?{visualAssessment:"Inspect the attached original PDF layout, charts and labels. Extraction limitations must not reduce the report score."}:{})},framework==="excellence"&&principle===4?bytes:undefined);
  return {progress:{findings:[...findings,...validateFindings(resolveFindings(r.data,passages),framework,source,understanding.claims,principle)]}};
 }
 const checked=validateFindings(findings,framework,source,understanding.claims),scores=scoreFramework(checked,framework);
 const r=await structured(actionSchema,"Write a concise executive summary and practical prioritised action plan using ONLY validated findings. Actions must reference existing criterion IDs and say what to change, why and how. Distinguish quick wording changes, important evidence improvements and longer-term work. No invented achievements, benchmarks or comparisons. Never call provisional scores definitive.",{...understanding,findings:checked,scores});
 if(r.data.actions.some(a=>a.criterionIds.some(id=>!checked.some(f=>f.id===id))))throw new Error("Unknown recommendation criterion.");
 return {progress,result:present(understanding,checked,scores,r.data,framework)};
}
function present(u:Understanding,findings:Criterion[],scores:ReturnType<typeof scoreFramework>,actions:Actions,framework:Framework):ReviewResult {
 return {summary:actions.summary,overall:scores.overall,methodologyVersion:VERSION,criteria:findings,actions,framework,
  sections:scores.principles.map(p=>({name:p.name,rating:p.score===null?null:p.score/5,score:p.score===null?null:p.score*5,
   status:p.coverage===0?"cannot_determine":p.tests.every(t=>t.status==="not_demonstrated")?"not_disclosed":p.tests.every(t=>(t.score||0)>=3)?"demonstrated":"partial",
   finding:p.tests.map(t=>t.explanation).join(" "),strength:p.tests.filter(t=>(t.score||0)>=3).map(t=>t.explanation).join(" "),gap:p.tests.filter(t=>(t.score||0)<3).map(t=>t.explanation).join(" "),recommendation:p.tests.map(t=>t.improvement).join(" "),evidence:[...new Map(p.tests.flatMap(t=>t.evidence).map(e=>[e.page+":"+e.quote,e])).values()]})),
  recommendations:actions.actions.slice(0,3).map(a=>a.title+": "+a.detail),limitations:[LIMITATION,"Scores describe evidence disclosed in this report, never actual organisational maturity. Physical PDF page references. Scanned pages are not transcribed by this SORP integration.",...u.context.limitations]};
}
