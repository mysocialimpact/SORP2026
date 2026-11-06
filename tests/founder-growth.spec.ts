import { expect, test } from "@playwright/test";

test.skip(process.env.FOUNDER_GROWTH_E2E !== "true", "Requires the isolated growth fixture database and local founder-auth responder.");

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const api = "/api/founder/growth/";
const firm = "0fd84ce0-fd4f-44eb-9fbc-46b467381f63";

test("Growth pages and writes require Founder access and same-origin submissions", async ({ request }) => {
  const anonymous = await request.get(api);
  expect(anonymous.status()).toBe(401);
  const ordinary = await request.get(api,{headers:{cookie:"console_qa=other"}});
  expect(ordinary.status()).toBe(403);
  const denied = await request.post(api,{headers:{cookie:"console_qa=owner",origin:"https://other.invalid"},data:{kind:"charities",action:"create",name:"Rejected fixture"}});
  expect(denied.status()).toBe(403);
  const page = await request.get("/founder/growth/",{maxRedirects:0});
  expect(page.headers().location).toContain("/login/");
  expect((await request.get("/")).ok()).toBeTruthy();
});

test("Founder adds a researched firm, saves pipeline state, drafts an introduction and records a meeting", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name!=="desktop","This fixture firm is used once; mobile checks the shared page shell.");
  await context.addCookies([{name:"console_qa",value:"owner",url:base}]);
  await page.goto("/founder/growth/accountants/?q=Fixture");
  await page.getByRole("link",{name:"Fixture Accountancy →"}).click();
  await expect(page.getByRole("heading",{name:"Research and evidence"})).toBeVisible();
  await page.getByRole("button",{name:"Add to partnership pipeline"}).click();
  await expect(page.getByRole("heading",{name:"Pipeline and next action"})).toBeVisible();
  await page.getByLabel("Pipeline stage").selectOption("Shortlisted");
  await page.getByLabel("Sales priority").selectOption("High");
  await page.getByLabel("Next action",{exact:true}).fill("Review the charity reporting evidence");
  await page.getByLabel("Registered SORP organisation").selectOption({label:"Fixture Adviser"});
  await page.getByRole("button",{name:"Save relationship"}).click();
  await expect(page.getByText("Fixture Adviser · Adviser access")).toBeVisible();
  await page.getByLabel("Research reference").selectOption({label:"Charity accounting service"});
  await page.getByRole("button",{name:"Prepare introduction draft"}).click();
  await expect(page.getByLabel("Email draft")).toHaveValue(/fixture\.invalid\/charities/);
  await page.getByRole("button",{name:"Save new draft version"}).click();
  await expect(page.getByText("Supporting Fixture Accountancy’s charity clients with SORP 2026",{exact:false}).first()).toBeVisible();
  await page.getByLabel("Meeting title").fill("Fixture demo planning");
  await page.getByLabel("Meeting date").fill("2026-11-12");
  await page.getByLabel("Agenda, notes and next steps").fill("Walk through the existing Adviser workspace.");
  await page.getByRole("button",{name:"Record meeting"}).click();
  await expect(page.getByText("Fixture demo planning",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Pipeline stage")).toHaveValue("Shortlisted");
  await expect(page.getByText("Fixture demo planning",{exact:true})).toBeVisible();
});

test("A charity prospect has versioned reports, explicit approval and no automatic email", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name!=="desktop","This record is used once.");
  const headers={cookie:"console_qa=owner",origin:base};
  const post=(data:Record<string,unknown>)=>request.post(api,{headers,data:{kind:"charities",...data}});
  const created=await post({action:"create",name:"Fixture Report Prospect",charity_number:"1876543"});
  expect(created.ok()).toBeTruthy();
  const {id}=await created.json();
  expect((await post({action:"create",name:"Fixture Report Prospect"})).status()).toBe(409);
  const report=await post({action:"report-draft",id,title:"Public evidence note",body:"Read the published accounts.",sources:"https://fixture.invalid/report",limitations:"No private evidence reviewed.",service:"SORP readiness observations"});
  expect(report.ok()).toBeTruthy();
  const {version}=await report.json();
  expect((await post({action:"report-approved",id,version})).status()).toBe(400);
  expect((await post({action:"report-approved",id,version,confirm:true})).ok()).toBeTruthy();
  const first=await request.get(`${api}?view=charities&id=${id}`,{headers});
  const saved=await first.json();
  expect(saved.record.organisation_id).toBeNull();
  expect(saved.activity.find((x:{action:string})=>x.action==="report-draft").id).toBe(version);
  expect(saved.activity.filter((x:{action:string})=>x.action==="report-approved")).toHaveLength(1);
  expect((await post({action:"report-shared",id,version:saved.activity[0].id,confirm:true,evidence:"Synthetic test only"})).status()).toBe(409);
  const adviser=await request.get(`${api}?view=accountants&id=${firm}`,{headers});
  expect(adviser.ok()).toBeTruthy();
});

test("The growth landing page links to all three distinct workspaces", async ({ page, context }) => {
  await context.addCookies([{name:"console_qa",value:"owner",url:base}]);
  await page.goto("/founder/growth/");
  await expect(page.getByRole("heading",{name:"Marketing & Sales",exact:true})).toBeVisible();
  await page.getByText("Workspaces",{exact:true}).click();
  await expect(page.getByRole("link",{name:"View Public Website",exact:false})).toHaveAttribute("target","_blank");
  await page.getByText("Workspaces",{exact:true}).click();
  const nav=page.getByRole("navigation",{name:"Marketing and sales"});
  await nav.getByRole("link",{name:"Accountants & Advisers"}).click();
  await expect(page).toHaveURL(/\/founder\/growth\/accountants\/$/, {timeout:20000});
  await expect(page.getByRole("heading",{name:"Accountants & Advisers",exact:true})).toBeVisible();
  await nav.getByRole("link",{name:"Charity Outreach"}).click();
  await expect(page).toHaveURL(/\/founder\/growth\/charities\/$/, {timeout:20000});
  await expect(page.getByRole("heading",{name:"Charity Outreach",exact:true})).toBeVisible();
  await nav.getByRole("link",{name:"Digital Marketing"}).click();
  await expect(page).toHaveURL(/\/founder\/growth\/digital\/$/, {timeout:20000});
  await expect(page.getByRole("heading",{name:"Digital Marketing",exact:true})).toBeVisible();
  await expect(page.getByText("No verified campaign connection.",{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
});
