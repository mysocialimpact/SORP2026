import test from 'node:test';
import assert from 'node:assert/strict';
import {initialConversation,applyFacts,advance,confirmCharity,nextQuestion,nextObjective,suitableDialogue,normaliseConversation} from '../../src/lib/onboarding/state.ts';
import {dialogueRequest,decodeDialogue} from '../../src/lib/onboarding/dialogue.ts';
import {validateInterpretation,modelRequest,interpretWithModel,MODEL_RESERVATION_USD} from '../../src/lib/onboarding/model.ts';
const ready=()=>confirmCharity(applyFacts(initialConversation(),{name:'Marcus Warry',email:'marcus@example.invalid',role:'Trustee',organisation:'Interim Spaces',responsibilities:'Finance',discovery:'A friend'},'form'),{name:'Interim Spaces',registrationNumber:'1234567',officialUrl:'https://example.invalid/official'});
const participation=(status='answered',followUp=false)=>({topic:'concerns',status,followUp});
test('a final-topic response closes the topic without inventing a professional concern',()=>{
 for(const utterance of ['Frogs.','My children.','Nothing, actually.',"I’d rather not say."]){
   const s=advance(ready(),{utterance,topicResponse:participation()});
   assert.equal(nextObjective(s),'complete');assert.equal(s.facts.concerns,'');
   assert.equal(s.dialogue.recent.at(-1).text,utterance);
 }
});
test('one useful clarification is possible; a second cannot restart the conversation',()=>{
 const s=advance(ready(),{utterance:'An unexpected thing.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(s),'reflection');assert.equal(s.dialogue.followUps,1);
 const next=advance(s,{utterance:'It is personal, not work.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(next),'complete');assert.equal(next.dialogue.followUps,1);
});
test('reluctance and turn budgets take priority over optional curiosity',()=>{
 for(const source of [{...ready(),turns:5},{...ready(),finishRequested:true}]) {
   const s=advance(source,{utterance:'Not now.',topicResponse:participation('declined',true)});
   assert.equal(nextObjective(s),'complete');assert.equal(s.dialogue.reflecting,false);
 }
});
test('natural prose is permitted for concerns and completion, with exact special question and validated objectives',()=>{
 const s=ready();
 assert.ok(suitableDialogue(s,{objective:'concerns',fields:['concerns'],question:'A recommendation from someone you trust. Before we finish, a wider question: What keeps you up at night?',natural:true}));
 const complete=advance(s,{utterance:'Deadlines.',concerns:'Deadlines'});
 assert.ok(suitableDialogue(complete,{objective:'complete',fields:[],question:'Those reporting deadlines can pile up. You can now create your account and explore Interim Spaces.',natural:true}));
 assert.equal(suitableDialogue(complete,{objective:'discovery',fields:['discovery'],question:'How did you find us?',natural:true}),false);
});
test('generated acknowledgements are not mistaken for repeated identity requests',()=>{
 const s=ready();
 assert.ok(suitableDialogue(s,{objective:'concerns',fields:['concerns'],question:'Your role covers the finances. Before we finish: What keeps you up at night?',natural:true}));
 assert.equal(suitableDialogue(s,{objective:'concerns',fields:['concerns'],question:'What is your email address? What keeps you up at night?',natural:true}),false);
});
test('generated language cannot claim unperformed verification, credentials or saved account',()=>{
 const s=advance(ready(),{concerns:'Reporting'});
 for(const question of ["I've verified your charity.",'Your introduction is saved.','Please enter your password here.','Your accounts are ready.'])
 assert.equal(suitableDialogue(s,{objective:'complete',fields:[],question,natural:true}),false);
});
test('manual name corrections change the rendered reply immediately and persist through resume',()=>{
 const s=advance(ready(),{concerns:'Deadlines'});
 const decoded=decodeDialogue({next:{objective:'complete',fields:[],question:'Thanks, Marcus Warry. Interim Spaces is your starting charity.'},afterCharity:null},s,null);
 const state={...s,response:{...decoded.next,generated:true,contextKey:''}};
 const edited=normaliseConversation(applyFacts(state,{name:'Alex Rowan'},'form'));
 assert.match(nextQuestion(edited),/Alex Rowan/);assert.doesNotMatch(nextQuestion(edited),/Marcus|Warry/);
});
test('both stages receive bounded recent dialogue while the wording stage receives updated facts',()=>{
 let s=ready();
 for(let i=0;i<8;i++) s=advance(s,{utterance:`Answer ${i}`,topicResponse:participation()});
 const request=dialogueRequest('test',s,null), input=JSON.parse(request.input[0].content);
 assert.equal(request.input.length,9);assert.equal(request.input.at(-1).content,'Answer 7');assert.equal(request.input.at(-1).role,'user');
 assert.equal(input.progressPlan.objective,'complete');assert.equal(request.store,false);assert.equal(request.tools,undefined);
 assert.equal(JSON.parse(modelRequest('Another answer',s).input).recentDialogue.length,8);
});
test('a question about an optional topic can be answered without forcing the topic again',()=>{
 const s=advance(ready(),{intent:'question',utterance:"That's a strange question.",topicResponse:participation('declined')});
 assert.equal(s.clarification,null);assert.equal(nextObjective(s),'complete');
});
test('invalid model participation values cannot enter state',()=>{
 const p=validateInterpretation({intent:'inform',facts:{},topicResponse:{topic:'password',status:'answered',followUp:true}},'Hello',initialConversation());
 assert.equal(p.topicResponse,undefined);
});
test('personal and unresolved answers remain conversation, not professional concerns',()=>{
  for(const concernKind of ['personal','uncertain','none']) {
    const p=validateInterpretation({intent:'inform',concernKind,facts:{concerns:{value:'Unexpected animals',quote:'Unexpected animals',period:'current',correction:false}}},'Unexpected animals',ready());
    assert.equal(p.concerns,undefined);
  }
});
test('wording failure retains valid extraction and surfaces a notice; two-call cost is reserved',async()=>{
 const fetch=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test';let calls=0;
 globalThis.fetch=async()=>++calls===1?Response.json({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{text:JSON.stringify({intent:'inform',facts:{name:{value:'Alex Rowan',quote:'Alex Rowan',period:'current',correction:false}},relationships:[]})}]}]}):new Response('',{status:503});
 try{const result=await interpretWithModel('My name is Alex Rowan.',initialConversation());assert.equal(result.name,'Alex Rowan');assert.match(result.notice,/reply could not finish/);assert.equal(calls,2);assert.equal(MODEL_RESERVATION_USD,0.10);}finally{globalThis.fetch=fetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
