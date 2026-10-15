import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { firms, normalisePostcode, selectFirms, milesBetween, serviceLabels } from "../src/lib/accountants";
import { ExternalRecognition } from "../src/components/directory/external-recognition";
import { GET } from "../src/app/api/directory/postcode/route";

const path = "/accountants-advisers/";
const baseFilters = { query: "", services: [], origin: null, area: null, evidenced: false };
test("survey resource is visible and unverified recognition is not presented as a badge", async ({ page }) => {
  await page.goto(path);
  const section = page.getByRole("region", { name: "Other independent research into charity accountants" });
  await expect(section).toContainText("bookkeeping, accounts preparation, independent examinations, audits, SORP compliance, taxation and financial advice");
  await expect(section.getByRole("link", { name: "Explore the Charity Finance Audit Survey →" })).toHaveAttribute("href", "https://www.civilsociety.co.uk/finance/charity-audit-survey-2025-the-new-sorp-and-ai-are-shaking-up-the-charity-audit-world.html");
  await expect(page.locator(".directory-external-recognition")).toHaveCount(0);
});

test("external recognition requires verification and links the exact survey result", () => {
  const sourceUrl = "https://example.org/verified-survey-result";
  const sample = { ...firms[0], externalRecognitions: [{ publisher: "Charity Finance", survey: "Audit Survey", year: 2025, category: "larger-firm category", result: "1st for overall service", sourceUrl, verified: false }] };
  expect(renderToStaticMarkup(createElement(ExternalRecognition, { firm: sample }))).toBe("");
  sample.externalRecognitions[0].verified = true;
  const html = renderToStaticMarkup(createElement(ExternalRecognition, { firm: sample }));
  expect(html).toContain("Charity Finance Audit Survey 2025");
  expect(html).toContain("1st for overall service — larger-firm category");
  expect(html).toContain(sourceUrl);
});
test.beforeEach(async ({ page }) => {
  // External tiles are network-dependent; these tests exercise the real map library, not a mock map.
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.route("**/api/readiness-account**", route => route.fulfill({ json: { signedIn: false } }));
});

test("all original firms, evidence and postcode coordinates are preserved", () => {
  expect(firms).toHaveLength(111);
  expect(firms.filter(f => f.spreadsheetRow !== null)).toHaveLength(110);
  expect(new Set(firms.map(f => f.slug)).size).toBe(111);
  for (const firm of firms) {
    expect(normalisePostcode(firm.postcode), firm.name).not.toBeNull();
    expect(firm.coordinates, firm.name).not.toBeNull();
    expect(firm.coordinates!.lat).toBeGreaterThan(49);
    expect(firm.coordinates!.lat).toBeLessThan(61);
    expect(firm.coordinates!.lng).toBeGreaterThan(-9);
    expect(firm.coordinates!.lng).toBeLessThan(2);
    expect(firm.coordinateSource).toMatch(/^https:/);
    expect(firm.coordinateSource).toMatch(/^https:\/\/api.postcodes.io\/postcodes\//);
    expect(firm.icaewUrl).toMatch(/^https:\/\/find.icaew.com/);
    for (const s of firm.services) { expect(s.source).toMatch(/^https?:/); expect(s.evidence.length).toBeGreaterThan(10); expect(s.id in serviceLabels).toBe(true); }
  }
  expect(firms.filter(f => f.classification === "Verified")).toHaveLength(27);
});

test("distance sorting, evidence filters and map bounds are truthful", () => {
  expect(selectFirms(firms, baseFilters).map(r => r.firm.name)).toEqual(firms.map(f => f.name).sort((a,b) => a.localeCompare(b)));
  const origin = {lat:55.9533,lng:-3.1883};
  const nearest = selectFirms(firms, {...baseFilters, origin});
  expect(nearest[0].firm.slug).not.toBe("burton-sweet");
  expect(nearest.every((r,i) => !i || r.distance! >= nearest[i-1].distance!)).toBe(true);
  expect(milesBetween(origin,origin)).toBe(0);
  expect(selectFirms(firms,{...baseFilters,services:["examination","tax"]}).every(r => r.firm.services.some(s=>s.id==="tax") && r.firm.services.some(s=>s.id==="examination"))).toBe(true);
  expect(selectFirms(firms,{...baseFilters,evidenced:true})).toHaveLength(27);
  expect(selectFirms(firms,{...baseFilters,area:{south:0,north:1,east:1,west:0}})).toHaveLength(0);
  for(const value of ["bs1 4dj","CF10 1EP","EH1 1YZ","BT1 5GS","GIR 0AA"]) expect(normalisePostcode(value)).not.toBeNull();
  for(const value of ["", "12345", "not postcode", "BS1", "ZZ99 9ZZ"]) expect(normalisePostcode(value)).toBeNull();
});

test("postcode handler validates, forwards and handles provider failures", async () => {
  const original = globalThis.fetch;
  try {
    expect((await GET(new Request("https://sorp2026.org/api/directory/postcode/?q=bad"))).status).toBe(400);
    globalThis.fetch = async input => { expect(String(input)).toContain("api.postcodes.io/postcodes/BS1%204DJ"); return Response.json({result:{postcode:"BS1 4DJ",latitude:51.45,longitude:-2.6,admin_district:"Bristol"}}); };
    const response = await GET(new Request("https://sorp2026.org/api/directory/postcode/?q=bs14dj"));
    expect(await response.json()).toEqual({postcode:"BS1 4DJ",lat:51.45,lng:-2.6,area:"Bristol"});
    globalThis.fetch = async () => new Response(null,{status:404});
    expect((await GET(new Request("https://sorp2026.org/api/directory/postcode/?q=BS14DJ"))).status).toBe(404);
    globalThis.fetch = async () => { throw new Error("offline"); };
    expect((await GET(new Request("https://sorp2026.org/api/directory/postcode/?q=BS14DJ"))).status).toBe(503);
  } finally { globalThis.fetch = original; }
});

test("directory shows ten, loads more, filters, and preserves three-firm shortlist", async ({page}) => {
  await page.goto(path);
  await expect(page.locator('.directory-result')).toHaveCount(10);
  await expect(page.locator('.directory-result').first()).toContainText(selectFirms(firms,baseFilters)[0].firm.name);
  await page.getByRole('button',{name:/Show 10 more/}).click();
  await expect(page.locator('.directory-result')).toHaveCount(20);
  for(let i=0;i<4;i++) await page.locator('.directory-result').nth(i).getByRole('button',{name:/^Save .* shortlist$/}).click();
  await expect(page.getByRole('button',{name:/Shortlist & compare/})).toContainText('3/3');
  await expect(page.locator('.directory-notice')).toContainText('holds three');
  await page.getByRole('button',{name:/Shortlist & compare/}).click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('.directory-compare-grid article')).toHaveCount(3);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:/Shortlist & compare/})).toContainText('3/3');
  await page.getByLabel('Find a charity accountant',{exact:true}).fill('Burton Sweet');
  await expect(page.locator('.directory-result')).toHaveCount(1);
  await page.getByLabel('Find a charity accountant',{exact:true}).fill('zz-no-such-firm');
  await expect(page.getByRole('heading',{name:'A little further afield?'})).toBeVisible();
  await page.getByRole('button',{name:'Reset to nationwide'}).click();
  await expect(page.getByLabel('Find a charity accountant',{exact:true})).toHaveValue('');
  await page.locator('.directory-filters summary').click();
  await page.getByLabel('Independent examinations',{exact:true}).check();
  await expect(page.locator('.directory-result')).toHaveCount(1);
  await expect(page.locator('.directory-result')).toContainText('Burton Sweet');
});

test("real map pins, selection, map-area search and mobile toggle work", async ({page},info) => {
  await page.goto(path);
  if(info.project.name==='mobile') await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect(page.locator('.directory-cluster').first()).toBeVisible();
  expect(await page.locator('.directory-map-panel').getByText('The map couldn’t load.').count()).toBe(0);
  // Select from list, then ensure the corresponding real Leaflet marker becomes selected.
  if(info.project.name==='mobile') await page.getByRole('button',{name:'List',exact:true}).click();
  await page.getByLabel('Find a charity accountant',{exact:true}).fill('Burton Sweet');
  await expect(page.locator('.directory-result')).toHaveCount(1);
  await page.locator('.directory-firm-focus').filter({hasText:'Burton Sweet'}).click();
  await expect(page.locator('.directory-map-preview')).toContainText('Burton Sweet');
  await expect(page.locator('.directory-pin.is-selected')).toBeVisible();
  await page.getByRole('button',{name:'Close firm preview'}).click();
  await page.locator('.directory-pin.is-featured').click();
  await expect(page.locator('.directory-map-preview')).toContainText('Burton Sweet');
  await expect(page.locator('#firm-burton-sweet')).toHaveClass(/is-active/);
  await page.getByRole('button',{name:'Search this area',exact:true}).click();
  await expect(page.locator('.directory-results-toolbar')).toContainText('within this map area');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const fixture of [
  {postcode:'BS1 4DJ',lat:51.454,lng:-2.598,area:'Bristol'},
  {postcode:'CF10 1EP',lat:51.481,lng:-3.179,area:'Cardiff'},
  {postcode:'EH1 1YZ',lat:55.949,lng:-3.190,area:'Edinburgh'},
  {postcode:'BT1 5GS',lat:54.597,lng:-5.93,area:'Belfast'},
]) test(`postcode UI orders results for ${fixture.area} (fixture response)`,async({page})=>{
  await page.route('**/api/directory/postcode/**',r=>r.fulfill({json:fixture}));
  await page.goto(path);
  await page.getByLabel('Find a charity accountant',{exact:true}).fill(fixture.postcode);
  await page.getByRole('button',{name:'Search ↗',exact:true}).click();
  await expect(page.locator('.directory-results-toolbar')).toContainText(`nearest to ${fixture.postcode}`);
  await expect(page.locator('.directory-result').first()).toHaveAttribute('id',`firm-${selectFirms(firms,{...baseFilters,origin:fixture})[0].firm.slug}`);
  await expect(page.locator('.directory-result').first()).toContainText('miles');
});

test("postcode errors and reset do not hide the directory", async ({page})=>{
  await page.goto(path);
  await page.getByLabel('Find a charity accountant',{exact:true}).fill('no-matching-place');
  await page.getByRole('button',{name:'Search ↗',exact:true}).click();
  await expect(page.getByRole('heading',{name:'A little further afield?'})).toBeVisible();
  await page.route('**/api/directory/postcode/**',r=>r.fulfill({status:503,json:{error:'Postcode search is temporarily unavailable.'}}));
  await page.getByLabel('Find a charity accountant',{exact:true}).fill('BS1 4DJ');
  await page.getByRole('button',{name:'Search ↗',exact:true}).click();
  await expect(page.locator('#directory-postcode-error')).toContainText('temporarily unavailable');
  await expect(page.locator('.directory-result')).toHaveCount(10);
  await page.getByRole('button',{name:'Reset to nationwide'}).click();
  await expect(page.locator('#directory-postcode-error')).toHaveCount(0);
});

test("all 111 profiles resolve with the correct firm", async ({request})=>{
  test.setTimeout(120000);
  for(const firm of firms) {
    const response=await request.get(`${path}${firm.slug}/`);
    expect(response.status(),firm.name).toBe(200);
    expect(await response.text()).toContain(`"name":"${firm.name.replace(/</g,'\\u003c')}"`);
  }
});

test("Burton showcase, nearby action and functional reviewed enquiry", async ({page})=>{
  await page.goto(`${path}burton-sweet/`);
  await expect(page.getByRole('heading',{name:'Burton Sweet.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Josh Kingston'})).toBeVisible();
  await expect(page.locator('.directory-offices article')).toHaveCount(5);
  await page.route('**/api/hello',async route=>{
    const body=route.request().postDataJSON();
    expect(body.newsletter).toBe(false); expect(body.audience).toBe('adviser');
    expect(body.message).toContain('Firm: Burton Sweet'); expect(body.submissionId).toBeTruthy();
    await route.fulfill({json:{accepted:true,emailSent:false,queued:true}});
  });
  await page.getByLabel('Your name',{exact:true}).fill('Directory test');
  await page.getByLabel('Work email').fill('test@example.org');
  await page.getByLabel('Your role').fill('Test only');
  await page.getByRole('button',{name:'Send enquiry →'}).click();
  await expect(page.getByRole('status')).toContainText('queued for delivery');
  await page.getByRole('link',{name:'Find nearby firms →'}).click();
  await expect(page.locator('.directory-results-toolbar')).toContainText('nearest to BS48 1UR');
});

test("directory and showcase have no serious accessibility violations", async({page})=>{
  for(const url of [path,`${path}burton-sweet/`]){
    await page.goto(url);
    const result=await new AxeBuilder({page}).include('main').analyze();
    expect(result.violations.filter(v=>['serious','critical'].includes(v.impact||''))).toEqual([]);
  }
});

test("redesign retains a visible real map, all five spotlights and one search", async ({page}) => {
  await page.goto(path);
  await expect(page.locator('.directory-map-canvas')).toBeVisible();
  await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
  await expect(page.locator('.adviser-feature')).toHaveCount(5);
  await expect(page.locator('main input[type=search]')).toHaveCount(1);
  for (const name of ['Burton Sweet','ECOVIS Wingrave Yeats','Moore Kingston Smith','Forvis Mazars','Lanham & Francis']) {
    await expect(page.locator('.adviser-spotlight').getByRole('heading',{name,exact:true})).toBeVisible();
  }
  await expect(page.getByRole('link',{name:'Claim your listing / Talk to us ↗'})).toHaveAttribute('href','/accountants-advisers/partners/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("human verification stays explicit and Burton is only a preview", async ({ page }) => {
  await page.goto(path);
  await expect(page.locator('.adviser-hero')).not.toContainText('£39');
  await expect(page.locator('[data-verification="approved"]')).toHaveCount(0);
  await expect(page.locator('.adviser-spotlight [data-verification="preview"]')).toContainText('Design preview · not awarded');
  await page.getByLabel('Find a charity accountant', { exact: true }).fill('Burton Sweet');
  if (await page.getByRole('button', {name:'List',exact:true}).isVisible()) await page.getByRole('button', {name:'List',exact:true}).click();
  await expect(page.locator('.directory-result [data-verification="preview"]')).toContainText('has not been awarded');
  await page.goto(`${path}burton-sweet/`);
  await expect(page.locator('[data-verification="preview"]')).toContainText('Design preview · not awarded');
  await expect(page.locator('[data-verification="approved"]')).toHaveCount(0);
  await page.goto(`${path}partners/`);
  await expect(page.locator('main')).not.toContainText('£39');
  await expect(page.locator('main')).toContainText('Not listed yet?');
  await expect(page.getByLabel('Work email')).toBeVisible();
});
