import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import binary from '../../tests/live-runtime/node_modules/@sparticuz/chromium/build/index.js';
import {usage,database} from './lib/budget.mjs';
if(process.env.VERCEL_ENV!=='preview')throw new Error('Preview only');
const child=spawn('node',['node_modules/next/dist/bin/next','start','--port','3103'],{env:process.env,stdio:'ignore'});
const base='http://127.0.0.1:3103';let browser;
try{
 let healthy=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/demo')).ok){healthy=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(healthy,'Model key and isolated counter must be available');
 browser=await chromium.launch({executablePath:await binary.executablePath(),args:binary.args.filter(a=>a!=='--disable-web-security'),headless:true});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:viewport.width<600});const page=await context.newPage();page.setDefaultTimeout(60000);await page.goto(base);
  assert.equal((await page.request.get(base+'/api/readiness-account/')).status(),404,'No production account route may be deployed');
  const blocked=await page.request.post(base+'/api/demo',{headers:{origin:base},data:{action:'account',profile:{name:'Marcus Moss',email:'marcus@example.invalid',role:'Trustee',organisation:'Interim Spaces'}}});assert.equal(blocked.status(),400,'Unconfirmed charity must block account creation');
  const input=page.getByLabel('YOUR ANSWER',{exact:true}),exchanges=[];
  async function send(message){await input.fill(message);const pending=page.waitForResponse(r=>r.url().endsWith('/api/demo')&&r.request().postDataJSON()?.action==='turn');await page.getByRole('button',{name:'Send',exact:false}).click();const r=await pending;assert.equal(r.status(),200);const d=await r.json();assert.ok(d.reply);exchanges.push({role:'user',text:message},{role:'assistant',text:d.reply});await expect(input).toBeEnabled();return d;}
  const first=await send("I'm Marcus Moss, a trustee at Interim Spaces. My email is marcus@example.invalid.");
  assert.equal(first.profile.organisation,'Interim Spaces');assert.equal(first.profile.selected,null);await expect(page.locator('input[name=name]')).toHaveValue('Marcus Moss');await expect(page.locator('input[name=email]')).toHaveValue('marcus@example.invalid');await expect(page.locator('.profile-field.field-arrived').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Create mock account'})).toBeDisabled();
  await page.getByRole('button',{name:'Find Interim Spaces'}).click();await expect(page.getByRole('heading',{name:'Interim Spaces',exact:true})).toBeVisible();
  const confirmed=page.waitForResponse(r=>r.url().endsWith('/api/demo')&&r.request().postDataJSON()?.action==='turn');await page.getByRole('button',{name:'Yes, this is the test charity'}).click();assert.equal((await confirmed).status(),200);await expect(input).toBeEnabled();
  await page.locator('input[name=name]').fill('Marcus Green');
  await send('Finance.');
  await send('Before we finish, please ask me how I found this platform.');
  const referral=await send('My pal told me.');
  if(!referral.reply.includes('What keeps you up at night?'))await send('What is your final question for me?');
  const final=await send('Frogs.');assert.equal(final.profile.name,'Marcus Green','Manual edit must survive later model turns');assert.notEqual(final.reply,referral.reply,'The latest answer must change the displayed reply');
  if(final.reply.includes('?'))await send('Actual frogs in the pond next door. Nothing to do with work, thankfully.');
  await page.reload();await expect(page.locator('input[name=name]')).toHaveValue('Marcus Green');
  const account=page.waitForResponse(r=>r.url().endsWith('/api/demo')&&r.request().postDataJSON()?.action==='account');await page.getByRole('button',{name:'Create mock account'}).click();const created=await (await account).json();assert.ok(created.account.simulation);assert.match(created.account.id,/^mock-/);await expect(page.getByText('Mock account created for Marcus Green.')).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(let i=0;i<exchanges.length;i++)console.log('SIMPLE_BROWSER_TURN',JSON.stringify({width:viewport.width,index:i,...exchanges[i]}));
  console.log('SIMPLE_BROWSER',JSON.stringify({viewport,passed:true,mockAccount:true,productionAccountRoute:404,context:'User explicitly invited the referral and final question; model generated every reply.'}));await context.close();
 }
 console.log('SIMPLE_BROWSER_BUDGET',JSON.stringify(await usage()));
}finally{await browser?.close();child.kill('SIGTERM');await database().end();}
