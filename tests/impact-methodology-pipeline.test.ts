import test from "node:test";
import assert from "node:assert/strict";
import { understand, advance } from "../src/lib/impact-review/methodology";
test("one shared understanding supports both independently validated twenty-check reviews",async()=>{
 const original=globalThis.fetch;let calls=0,visual=0;
 process.env.AI_GATEWAY_API_KEY="synthetic-transport-test-only";
 globalThis.fetch=async(_url,init)=>{
  calls++;const request=JSON.parse(String(init?.body));assert.match(request.messages[0].content,/UNTRUSTED DATA/);
  const input=JSON.parse(request.messages[1].content[0].text);let output;
  if(request.messages[1].content.some((p:{type:string})=>p.type==="file"))visual++;
  if(request.response_format.json_schema.schema.properties.organisation)output={organisation:"Synthetic charity",title:"Impact report",reportingPeriod:null,beneficiaries:[],activities:[],outcomes:[],context:"Synthetic fixture.",limitations:[]};
  else if(request.response_format.json_schema.schema.properties.claims)output={claims:[]};
  else if(input.criteria)output={findings:input.criteria.map((c:{id:string})=>({id:c.id,status:"assessed",score:3,explanation:"The report discloses the evidence.",evidenceIds:[input.passages[0].id],limitations:[],improvement:"Explain the sample.",confidence:"medium",claimIds:[]}))};
  else output={summary:"A controlled transport fixture.",strengths:["Evidence is presented."],opportunities:["Explain methods."],actions:[1,2,3].map(i=>({priority:"quick",title:"Improvement "+i,detail:"Explain the method.",criterionIds:[input.findings[i].id]}))};
  return Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify(output)}}],usage:{prompt_tokens:1,completion_tokens:1}});
 };
 try{
  const pages=[{page:1,text:"Participants reported increased confidence after attending our programme. The board reviewed the findings and agreed to collect follow-up evidence."}];
  const shared=await understand(pages,"Synthetic charity");
  for(const framework of ["claims","excellence"] as const){let progress={};let result;for(let i=0;i<6;i++){const step=await advance(pages,framework,shared,progress,Buffer.from("%PDF-fixture"));progress=step.progress;result=step.result;}assert.equal(result?.criteria?.length,20);assert.equal(result?.overall,75);assert.equal(result?.methodologyVersion,"1.0.0");assert.ok(result?.criteria?.every(f=>f.evidence[0].page===1&&pages[0].text.includes(f.evidence[0].quote)));}
  assert.equal(calls,14);assert.equal(visual,1);
 }finally{globalThis.fetch=original;delete process.env.AI_GATEWAY_API_KEY;}
});
