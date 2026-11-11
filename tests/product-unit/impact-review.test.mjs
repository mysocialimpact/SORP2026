import test from "node:test";
import assert from "node:assert/strict";
import { validateReview,claimsPrinciples,excellencePillars } from "../../src/lib/impact-review/rubric.ts";
const pages=[{page:1,text:"Our survey found that 60 of 100 participants reported improved confidence."}];
function result(framework="claims") {
  return {summary:"A report-based review.",sections:(framework==="claims"?claimsPrinciples:excellencePillars).map(p=>({name:p.name,status:"partial",rating:2,finding:"Partial evidence.",strength:"A survey is disclosed.",gap:"Methods need more context.",recommendation:"Explain the survey method.",evidence:[{page:1,quote:pages[0].text}]})),recommendations:["Explain the sample.","State limitations.","Show learning."],limitations:["Not independently verified."]};
}
test("claims scores are deterministic; excellence never receives a maturity score",()=>{
  assert.equal(validateReview(result(),"claims",pages).overall,50);
  const e=validateReview(result("excellence"),"excellence",pages);
  assert.equal(e.overall,null); assert.ok(e.sections.every(s=>s.rating===null));
});
test("missing disclosure never becomes a zero or unsupported failure score",()=>{
  const r=result();Object.assign(r.sections[1],{status:"not_disclosed",rating:0,evidence:[]});
  const validated=validateReview(r,"claims",pages);
  assert.equal(validated.sections[1].rating,null);assert.equal(validated.overall,null);
});
test("fabricated quotations, false page references and incomplete reviews are rejected",()=>{
  for(const edit of [r=>r.sections[0].evidence[0].quote="All participants achieved lasting impact.",r=>r.sections[0].evidence[0].page=3,r=>r.sections.pop(),r=>r.recommendations.pop(),r=>r.sections[0].evidence=[]]){
    const r=result();edit(r);assert.throws(()=>validateReview(r,"claims",pages));
  }
});
