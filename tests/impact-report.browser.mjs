import assert from "node:assert/strict";
import {chromium} from "playwright";
import {claimsPrinciples,excellencePillars} from "../src/lib/impact-review/rubric.ts";
const base="http://localhost:3000";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
try {
 for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:900}});
  const denied=await c.request.get(base+"/api/impact-report-review/");assert.equal(denied.status(),401);
  const login=await c.request.post(base+"/api/readiness-account/",{data:{action:"login",email:"synthetic@example.invalid",password:"synthetic-pass-2026"},headers:{origin:base}});assert.equal(login.status(),200);
  const page=await c.newPage();let requests=0,enquiry;
  const doc={id:"ac45c007-7086-42ce-a49f-011a4a50cd74",organisation:"Synthetic QA charity",title:"QA impact report",source_url:"https://example.org/report.pdf",reporting_period:null,confirmed_at:null};
  const data={documents:[doc],reviews:[],context:{organisation:doc.organisation,candidate:null}};
  await page.route("**/api/impact-report-review/**",async route=>{
   if(route.request().method()==="GET")return route.fulfill({json:data});
   const b=route.request().postDataJSON();
   if(b.action==="confirm")doc.confirmed_at=new Date().toISOString();
   if(b.action==="review"){
    requests++;data.reviews.push({document_id:doc.id,framework:b.framework,status:"complete",updated_at:new Date().toISOString(),result:{overall:b.framework==="claims"?50:null,summary:"Synthetic UI fixture only.",sections:(b.framework==="claims"?claimsPrinciples:excellencePillars).map(p=>({name:p.name,status:"partial",rating:b.framework==="claims"?2:null,finding:"Partial disclosure.",strength:"Survey findings are disclosed.",gap:"The sample is unclear.",recommendation:"Explain the sampling method.",evidence:[{page:1,quote:"Participants reported increased confidence."}]})),recommendations:["Explain methods.","Include limitations.","Describe learning."],limitations:["Synthetic UI fixture."]}});
   }
   return route.fulfill({json:{ok:true}});
  });
  await page.route("**/api/continuous-improvement/**",async route=>{enquiry=route.request().postDataJSON();return route.fulfill({json:{accepted:true}});});
  await page.goto(base+"/charity-impact-reports/review/");
  await page.getByRole("button",{name:"Yes, review this report"}).click();
  await page.getByRole("button",{name:"Run free review"}).click();
  await page.getByText("50/100 · indicative document score").waitFor();
  await page.getByRole("tab",{name:"Social Impact Excellence",exact:true}).click();
  await page.getByRole("button",{name:"Run free review"}).click();
  await page.getByRole("heading",{name:"Communications",exact:true}).waitFor();
  await page.getByRole("tab",{name:"Social Impact Claims Code",exact:true}).click();
  assert.equal(requests,2);
  await page.getByRole("button",{name:"Enquire about digitisation"}).click();
  await page.getByText(/Your enquiry is saved/).waitFor();
  assert.equal(enquiry.kind,"contact");assert.match(enquiry.message,/digitisation/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:"/tmp/impact-review-"+width+".png",fullPage:true});
  await page.reload();await page.getByText("50/100 · indicative document score").waitFor();assert.equal(requests,2);
  console.log(width+"px: confirmation, both frameworks, saved-result switching, return, enquiry and overflow checks passed (controlled responses).");
  await c.close();
 }
}finally{await browser.close();}
