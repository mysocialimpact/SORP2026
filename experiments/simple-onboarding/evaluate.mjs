import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://localhost:3101';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3101'],{stdio:['ignore','pipe','pipe']});
server.stderr.on('data',b=>console.error(String(b).slice(0,500)));
const transcripts=[];
async function boot(){for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Next did not start');}
const jobs=[];
async function journey(name,answers,options={}){
 if(name.startsWith('Trustee'))return; // Completed and reviewed in the preceding build; retain its evidence separately.
 let cookie='',state,rows=[];
 async function call(action,data={}){const r=await fetch(`${base}/api/onboarding/${action}/`,{method:'POST',headers:{origin:base,'content-type':'application/json',cookie},body:JSON.stringify(data)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const d=await r.json();if(!r.ok)throw Error(`${name}/${action}: ${JSON.stringify(d)}`);if(d.state)state=d.state;return d;}
 await call('start');
 const denied=await fetch(`${base}/api/readiness-account/`,{method:'POST',headers:{origin:base,'content-type':'application/json',cookie},body:JSON.stringify({action:'signup',password:'Test preview 123!'})});assert.equal(denied.status,400);
 for(let i=0;i<answers.length;i++){
  const message=answers[i];const d=await call('turn',{message,revision:state.revision});rows.push({user:message,assistant:d.question});console.log('FINISH_TURN',JSON.stringify({journey:name,index:i,...rows.at(-1)}));
  if(options.editAfter===i){await call('edit',{fields:options.edit,revision:state.revision});assert.equal(state.facts.name,options.edit.name);}
  if(d.lookup){await call('search',{query:d.lookup,revision:state.revision});assert.ok(state.charity.candidates.length,`${name}: no official candidates for ${d.lookup}`);assert.equal(state.charity.confirmed,null);const c=await call('confirm',{index:0,revision:state.revision});rows.push({user:'[Confirmed displayed official record]',assistant:c.question});console.log('FINISH_TURN',JSON.stringify({journey:name,...rows.at(-1)}));}
 }
 assert.ok(state.facts.name.includes(' '));assert.match(state.facts.email,/@.+\.invalid$/);assert.ok(state.facts.role);assert.ok(state.facts.organisation||state.natural.independent);assert.ok(state.charity.confirmed,`${name}: no confirmed charity`);
 if(options.edit)assert.equal(state.facts.name,options.edit.name);
 const r=await fetch(`${base}/api/readiness-account/`,{method:'POST',headers:{origin:base,'content-type':'application/json',cookie},body:JSON.stringify({action:'signup',name:state.facts.name,email:state.facts.email,password:'Synthetic preview 123!'})});assert.equal(r.status,200,await r.text());await call('complete');
 const restored=await (await fetch(`${base}/api/onboarding/session/`,{headers:{cookie}})).json();assert.deepEqual(restored.state.facts,state.facts);
 transcripts.push({name,rows,finalState:state,registration:'mock account created; context retained'});await writeFile('public/conversations.json',JSON.stringify(transcripts,null,2));
}
try{
 await boot();
 jobs.push(journey('Trustee — referral and surprising final answer',[
  "I'm Marcus Warry, marcus@preview.invalid. I'm a trustee at Interim Spaces. How are you?",
  'Yes, let’s use Interim Spaces.',
  'Finance. I oversee the budget and management accounts.',
  'My pal told me.',
  'Frogs.',
  'Actual frogs in the pond outside my window! Professionally things are going well. That’s all from me.'
 ]));
 jobs.push(journey('Accountant — firm missing and several clients',[
  "I'm Sarah Jones, sarah@preview.invalid. I'm a chartered accountant working with about 20 charities, including Brainstrust and Blue Cross.",
  'I work at Burton Sweet. Let’s start with Brainstrust.',
  'I prepare their accounts and advise trustees. I found you on LinkedIn. Keeping all the reporting deadlines under control is my main challenge.',
  'That’s everything, thanks — I’d like to get started.'
 ]));
 jobs.push(journey('Out of order — context already supplied',[
  "I'm Amina Patel, amina@preview.invalid, finance director at Blue Cross. I found you through a colleague. I oversee our annual accounts; our next audit is my biggest worry. Let’s use Blue Cross as our starting charity.",
  'It’s reconciling programme data with finance. I’d rather skip any other optional questions and get started.'
 ]));
 jobs.push(journey('Manual correction and historical relationship',[
  'My name is Marcus Worrey. I used to work on a charity client called The Blue Cross, or Blue Cross, I think it was. My email is marcus.history@preview.invalid.',
  'I’m an accountant and I work independently now. Let’s use Blue Cross.',
  'I mostly advise on reporting. My pal recommended you. Getting good source data is my main concern.',
  'No more questions for now, please.'
 ],{editAfter:0,edit:{name:'Marcus Warry'}}));
 jobs.push(journey('Correction and frustration',[
  "I'm Jo Ellis, jo@preview.invalid, a trustee at Interim Spaces.",
  'I already told you Interim Spaces. You’re ignoring me. Yes, use Interim Spaces to start.',
  'Actually, let’s use Brainstrust instead.',
  'I’m involved in governance. I found you on Google. I’d rather not discuss my worries. Can we finish?'
 ]));
 jobs.push(journey('Minimal details and unexpected professional answer',[
  'Hello, I’m David Palmer. david@preview.invalid',
  'I’m a professional adviser working independently. I help trustees improve reporting. Let’s use Blue Cross.',
  'I found you at a conference. My challenge? Our spreadsheets appear to be breeding overnight.',
  'Ha, version control, mostly. I’d like to skip the rest and start exploring.'
 ]));
 await Promise.all(jobs);
 await writeFile('public/conversations.json',JSON.stringify(transcripts,null,2));
 console.log('FINISH_JOURNEYS',JSON.stringify({passed:transcripts.length,artifact:'/conversations.json'}));
}finally{server.kill('SIGTERM');}
