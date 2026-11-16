import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const base='http://localhost:3000';
const output='/workspace/quality-review/interactions';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try {
 for(const width of [375,430,768,900,1024,1440,1920]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/');
  await expect(page.locator('main').getByRole('link',{name:'Get Started — Free'}).first()).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Navigation overflow at ${width}`);
  const last=page.locator('.product-folder-tab').last();
  await last.focus();
  const box=await last.boundingBox();
  assert.ok(box.x>=0&&box.x+box.width<=width+1,`Keyboard-focused final tool tab is visible at ${width}`);
  assert.notEqual(await last.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/my-impact-director/**');
  await expect(page.locator('main').getByRole('link',{name:'Get Started — Free'}).first()).toBeVisible();
  const hero=page.locator('#director-overview');
  const button=hero.getByRole('link',{name:'Get Started — Free'});
  const note=hero.locator('.beta-account-note');
  const b=await button.boundingBox(),n=await note.boundingBox();
  assert.ok(n.y-b.y-b.height>=12,`Hero button has breathing room at ${width}`);
  await page.locator('#director-partners').scrollIntoViewIfNeeded();
  await expect(page.getByRole('link',{name:'Visit Fluid'})).toContainText('Fluid');
  for(const path of ['/are-you-sorp-ready/review/','/ask-sorp/workspace/','/charity-impact-reports/review/','/social-impact-excellence/assessment/','/my-impact-director/workspace/']) {
   await page.goto(base+path);await page.waitForURL('**/get-started/**');
   // The existing public-beta policy starts new report-review users with readiness.
   assert.equal(new URL(page.url()).searchParams.get('next'),path==='/charity-impact-reports/review/'?'/are-you-sorp-ready/review/':path);
  }
  await page.goto(base+'/get-started/');
  await page.getByRole('button',{name:'Fill in the form'}).click();
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await page.locator('input[name="name"]').fill('Synthetic Layout Tester');
  await page.locator('input[name="email"]').fill('layout@example.invalid');
  await expect(page.locator('.profile-next button')).toBeDisabled();
  await page.screenshot({path:`${output}/manual-${width}.png`,fullPage:true});
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.equal(a.violations.length,0,JSON.stringify(a.violations.map(v=>v.id)));
  results.push({width,navigation:'pass',keyboardTabs:'pass',heroSpacing:'pass',allFiveEntranceGates:'pass',manualForm:'pass',accessibilityViolations:0});
  await context.close();
 }
}finally {await browser.close();await writeFile(`${output}/checks.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
