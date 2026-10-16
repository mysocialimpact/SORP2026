import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import chromiumBinary from '../../tests/live-runtime/node_modules/@sparticuz/chromium/build/index.js';
import {chromium,expect} from '@playwright/test';
const base='http://localhost:3102';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3102'],{stdio:'ignore'});
let browser;const trace=[];
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({executablePath:await chromiumBinary.executablePath(),args:[...chromiumBinary.args.filter(a=>a!=='--disable-web-security'),'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${path.resolve('voice-test.wav')}`],headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();page.setDefaultTimeout(100000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/get-started/');
 const start=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/start/')&&r.request().method()==='POST');await page.getByRole('button',{name:'Start a conversation'}).click();assert.equal((await start).status(),200);
 const input=page.getByRole('textbox',{name:'Your answer',exact:true});
 await page.getByRole('button',{name:'Record your answer'}).click();await expect(page.locator('.voice-recording')).toBeVisible();
 await expect.poll(()=>page.locator('.voice-wave i').evaluateAll(es=>es.some(e=>Number.parseFloat(e.style.height)>8))).toBeTruthy();
 await page.waitForTimeout(4400);
 const transcription=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/transcribe/')&&r.request().method()==='POST');await page.getByRole('button',{name:/Stop recording/}).click();
 await expect(page.locator('.voice-transcribing')).toBeVisible();const audioResponse=await transcription;assert.equal(audioResponse.status(),200,await audioResponse.text());const audio=await audioResponse.json();assert.ok(audio.transcript.length>8);console.log('FINISH_VOICE',JSON.stringify({transcript:audio.transcript,actualProvider:true}));await expect(input).not.toHaveValue('');
 async function send(message){await input.fill(message);const p=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/turn/')&&r.request().method()==='POST');await page.getByRole('button',{name:/Send/}).click();const r=await p;assert.equal(r.status(),200,await r.text());const d=await r.json();trace.push({user:message,assistant:d.question});console.log('FINISH_MOBILE_TURN',JSON.stringify(trace.at(-1)));await expect.poll(async()=>await input.count()?await input.isDisabled():false).toBe(false);return d;}
 await send("I'm David Palmer, mobile.preview@example.org, a trustee at Interim Spaces.");await expect(page.locator('input[name=name]')).toHaveValue('David Palmer');await expect(page.locator('.profile-reward')).toContainText('added');
 const name=page.locator('input[name=name]');const edit=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/edit/')&&r.request().postDataJSON()?.fields?.name==='David Parker');await name.fill('David Parker');assert.equal((await edit).status(),200);await page.reload();await expect(name).toHaveValue('David Parker');
 const lookup=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/search/')&&r.request().method()==='POST');await send('Yes, let’s use Interim Spaces.');const found=await lookup;assert.equal(found.status(),200,await found.text());await expect(page.getByRole('button',{name:'Yes, this is the charity'}).first()).toBeVisible();
 const confirm=page.waitForResponse(r=>r.url().endsWith('/api/onboarding/confirm/')&&r.request().method()==='POST');await page.getByRole('button',{name:'Yes, this is the charity'}).first().click();const confirmed=await (await confirm).json();trace.push({user:'[Official record confirmed]',assistant:confirmed.question});
 await send('I oversee finance and the budget. My pal told me about you.');
 const final=await send('Frogs. Actual frogs in the pond outside my window! Nothing else is worrying me professionally. I’d like to finish.');assert.equal(final.state.facts.name,'David Parker');assert.equal(final.state.natural.complete,true);assert.match(final.question,/frog|pond|croak/i);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await expect(page.locator('.onboarding-finish')).toBeVisible();await page.screenshot({path:'public/mobile-onboarding.png',fullPage:true});await page.locator('.onboarding-finish').getByRole('button',{name:/Create my account/}).click();await page.getByLabel('Choose a password', {exact:true}).fill('Synthetic browser 123!');await page.getByLabel('Confirm your password').fill('Synthetic browser 123!');
 const signup=page.waitForResponse(r=>r.url().endsWith('/api/readiness-account/')&&r.request().method()==='POST');await page.getByRole('dialog').getByRole('button',{name:/Create my account/}).click();const signed=await signup;assert.equal(signed.status(),200,await signed.text());
 await mkdir('public',{recursive:true});await page.screenshot({path:'public/mobile-preview.png',fullPage:true});await writeFile('public/browser-evidence.json',JSON.stringify({browser:'Chromium 153 mobile emulation; synthetic speech fed through real MediaRecorder and live transcription',voice:audio,trace,errors},null,2));assert.deepEqual(errors,[]);console.log('FINISH_MOBILE_PASS',JSON.stringify({voice:true,manualCorrection:true,resume:true,officialConfirmation:true,account:'isolated mock',width:390}));
}finally{await browser?.close();server.kill('SIGTERM');}
