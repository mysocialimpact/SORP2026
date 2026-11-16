import assert from "node:assert/strict";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";

const base="http://localhost:3000";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();let uploads=0;
  page.on("request",r=>{if(r.method()==="POST"&&r.url().includes("/api/impact-report-review/"))uploads++;});
  await page.goto(base+"/charity-impact-reports/");
  await page.getByRole("heading",{name:"One report. Two perspectives.",exact:true}).waitFor();
  const register=page.getByRole("link",{name:"Register for my free reviews"}).first();
  await page.waitForFunction(()=>document.querySelector('.reports-hero-actions a')?.getAttribute('href')?.startsWith('/get-started/'));
  assert.equal(new URL(await register.getAttribute("href"),base).searchParams.get("next"),"/are-you-sorp-ready/review/");
  const zone=page.getByRole("region",{name:"Upload your impact report"});
  assert.equal(await zone.locator('input[type=file]').count(),0);
  await zone.evaluate(el=>{const data=new DataTransfer();data.items.add(new File(["synthetic"],"example.pdf",{type:"application/pdf"}));el.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:data}));});
  await page.getByText(/No file has been sent/).waitFor();assert.equal(uploads,0);
  for(const image of await page.locator('.reports-perspectives img').all())assert.equal(await image.evaluate(el=>el.complete&&el.naturalWidth>0),true);
  assert.equal(await page.locator('.reports-services article').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.reload();await page.getByRole("heading",{name:"One report. Two perspectives.",exact:true}).waitFor();
  await page.screenshot({path:`/tmp/reports-public-${width}.png`,fullPage:true});

  await context.request.post(base+"/api/readiness-account/",{data:{action:"login",email:"synthetic@example.invalid",password:"synthetic-pass-2026"},headers:{origin:base}});
  const id="ac45c007-7086-42ce-a49f-011a4a50cd74",doc={id,organisation:"Synthetic charity",title:"Chosen impact report.pdf",source_url:null,reporting_period:null,confirmed_at:null};
  await page.route("**/api/impact-report-review/**",route=>route.fulfill({json:route.request().method()==="GET"?{documents:[{...doc,id:"bc45c007-7086-42ce-a49f-011a4a50cd74",title:"An older report"},doc],reviews:[],context:{organisation:"Synthetic charity",candidate:null}}:{id}}));
  await page.reload();
  const file=page.getByLabel("Choose your impact report PDF");await file.waitFor({state:"attached"});
  await file.setInputFiles({name:"invalid.txt",mimeType:"text/plain",buffer:Buffer.from("not PDF")});
  await page.getByRole("alert").filter({hasText:/searchable PDF up to 4 MB/}).waitFor();assert.equal(uploads,0);
  if(width===320)await file.setInputFiles({name:"impact.pdf",mimeType:"application/pdf",buffer:bytes});
  else await zone.evaluate((el,bytes)=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],"impact.pdf",{type:"application/pdf"}));el.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:data}));},[...bytes]);
  await page.waitForURL("**/review/?document="+id);
  await page.getByRole("heading",{name:"Chosen impact report.pdf",exact:true}).waitFor();
  await page.getByRole("button",{name:"Yes, review this report"}).waitFor();assert.equal(uploads,1);
  console.log(`${width}px: logos, three services, registration gate, anonymous drop safety, file validation and signed-in upload handoff passed (controlled upload API).`);
  await context.close();
 }
}finally{await browser.close();}
