import test from 'node:test';
import assert from 'node:assert/strict';
import {initialConversation,applyFacts,advance,confirmCharity,confirmationFollowUp,closeOptionalConversation,charityOptions,nextQuestion,nextObjective,suitableDialogue,normaliseConversation} from '../../src/lib/onboarding/state.ts';
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
test('a professional detour leaves one bounded opportunity to understand the final answer',()=>{
 const before={...ready(),turns:4,dialogue:{...ready().dialogue,followUps:1}};
 const s=advance(before,{utterance:'Something unexpected.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(s),'reflection');assert.equal(s.dialogue.followUps,2);assert.equal(s.dialogue.finalFollowUpUsed,true);
 const end=advance(s,{utterance:'A literal explanation.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(end),'complete');assert.equal(end.turns,6);assert.equal(end.dialogue.followUps,2);
});
test('the last optional turn cannot open another follow-up and resume preserves the limit',()=>{
 const source=normaliseConversation({...ready(),turns:5,dialogue:{...ready().dialogue,followUps:1}});
 const s=advance(source,{utterance:'An interesting answer.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(s),'complete');assert.equal(s.dialogue.reflecting,false);
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
 const extraction = modelRequest('Another answer',s).input;
 assert.equal(extraction.length,11);assert.equal(extraction.at(-1).role,'user');assert.equal(extraction.at(-1).content,'Another answer');assert.equal(extraction.at(-2).role,'assistant');
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
 try{const result=await interpretWithModel('My name is Alex Rowan.',initialConversation());assert.equal(result.name,'Alex Rowan');assert.match(result.notice,/reply could not finish/);assert.equal(calls,2);assert.equal(MODEL_RESERVATION_USD,0.15);}finally{globalThis.fetch=fetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('language output cannot choose field metadata or invent a permission to continue probing',()=>{
 const state=advance(ready(),{concerns:'Deadlines',utterance:'Deadlines.'});
 const output=decodeDialogue({move:'progress',reply:'Those deadlines are the practical concern. You can explore Interim Spaces when you are ready.',afterCharity:null},state,null);
 assert.equal(output.next.objective,'complete');assert.deepEqual(output.next.fields,[]);
 assert.throws(()=>decodeDialogue({move:'follow_up',reply:'Tell me more?',afterCharity:null},state,null));
});
test('a permitted social follow-up is chosen before progressing the information objective',()=>{
 const state=advance(ready(),{utterance:'An unexpected nocturnal visitor.',topicResponse:participation()});
 const reflection={...state,dialogue:{...state.dialogue,reflecting:true}};
 const output=decodeDialogue({move:'follow_up',reply:'An unexpected visitor? Do you mean that literally?',afterCharity:null},state,null,reflection);
 assert.equal(output.next.objective,'reflection');assert.deepEqual(output.next.fields,[]);
});
test('the production two-stage pipeline offers and commits a social move before handoff',async()=>{
 const fetch=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test';let calls=0;
 globalThis.fetch=async(_url,init)=>{
   const request=JSON.parse(init.body);calls++;
   if(calls===2){
     const context=JSON.parse(request.input[0].content);
     assert.equal(context.followUpPermitted,true);
     assert.deepEqual(context.permittedMoves.map(m=>m.move),['follow_up','progress']);
   }
   const parsed=calls===1?{intent:'inform',facts:{},concernKind:'uncertain',topicResponse:participation()}:{move:'follow_up',understanding:'An unexpected answer needs one clarification.',reply:'Do you mean that literally?',afterCharity:null};
   return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{text:JSON.stringify(parsed)}]}]});
 };
 try{
   const result=await interpretWithModel('An unexpected answer.',ready());
   assert.equal(result.notice,undefined);assert.equal(result.topicResponse.followUp,true);
   assert.equal(nextObjective(advance(ready(),result)),'reflection');assert.equal(calls,2);
 }finally{globalThis.fetch=fetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('confirmation preserves the displayed correction acknowledgement and labels the UI action',()=>{
 const state=applyFacts(initialConversation(),{name:'Alex Rowan',email:'alex@example.invalid',role:'Auditor',organisation:'Interim Spaces'},'form');
 state.response={objective:'charity',fields:['charity'],question:'Auditor, thanks for correcting that. Shall we start with Interim Spaces?',natural:true,generated:true,contextKey:''};
 const s=confirmCharity(state,{name:'Interim Spaces',registrationNumber:'1234567',officialUrl:'https://example.invalid/official'});
 assert.match(s.dialogue.recent.at(-2).text,/thanks for correcting/);
 assert.match(s.dialogue.recent.at(-1).text,/Interface action: confirmed/);
 assert.equal(confirmCharity(state,s.charity.confirmed,false).dialogue.recent.length,0,'Speculation must not invent an event');
});
test('a rich early answer may invite a follow-up only after explicit charity confirmation',()=>{
 const state=applyFacts(initialConversation(),{name:'Asha Patel',email:'asha@example.invalid',role:'Trustee',organisation:'Interim Spaces',responsibilities:'Governance',discovery:'A friend',concerns:'Reliable impact data'},'form');
 const candidate={name:'Interim Spaces',registrationNumber:'1234567',officialUrl:'https://example.invalid/official'};
 const confirmed=confirmCharity(state,candidate,false),reflection=confirmationFollowUp(confirmed);
 assert.ok(reflection);assert.equal(nextObjective(reflection),'reflection');
 const reply=decodeDialogue({move:'progress',reply:'Shall we start with Interim Spaces?',afterCharityMove:'follow_up',afterCharity:'We’ll start with {charityName}. Where are the gaps in the impact information you receive?'},state,confirmed,null,reflection);
 state.afterCharity=reply.afterCharity;
 assert.equal(nextObjective(state),'charity');assert.equal(state.charity.confirmed,null);
 const actual=confirmCharity(state,candidate);
 assert.equal(nextObjective(actual),'reflection');assert.equal(actual.dialogue.followUps,1);
 assert.match(nextQuestion(actual),/gaps in the impact information/);
 assert.equal(nextObjective(advance(actual,{utterance:'We lack consistent outcomes.',context:'We lack consistent outcomes.'})),'complete');
});
test('repair turns do not consume optional curiosity, but the total hard cap still applies',()=>{
 const s=advance({...ready(),turns:6,repairTurns:3},{utterance:'A concern.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(s),'reflection');
 const capped=advance({...ready(),turns:9,repairTurns:5},{utterance:'A concern.',topicResponse:participation('answered',true)});
 assert.equal(nextObjective(capped),'complete');assert.equal(capped.dialogue.reflecting,false);
});
test('uncertain classification cannot discard named clients or arbitrarily promote one',()=>{
 const s=applyFacts(initialConversation(),{name:'Tom Lane',email:'tom@example.invalid',role:'Accountant',organisation:'Cedar Advisory'},'form');
 s.professional=['Interim Spaces','Brainstrust','Blue Cross'].map((entity,i)=>({entity,aliases:[],kind:i===2?'charity':'organisation',relationship:'client',period:'current',confidence:'stated',role:'',evidence:entity,turn:1}));
 assert.deepEqual(charityOptions(s),['Interim Spaces','Brainstrust','Blue Cross']);
 assert.equal(suitableDialogue(s,{objective:'charity',fields:['charity'],question:'Would you like to start with Blue Cross?',natural:true}),false);
 assert.ok(suitableDialogue(s,{objective:'charity',fields:['charity'],question:'Which would you like to start with: Interim Spaces, Brainstrust or Blue Cross?',natural:true}));
 s.charity.proposed='Interim Spaces';
 assert.ok(suitableDialogue(s,{objective:'charity',fields:['charity'],question:'Interim Spaces — the next step is finding its official record for you to check.',natural:true}));
});
test('unnamed advisers and referral venues cannot become candidate organisations',()=>{
 for(const entity of ['finance adviser','conference']){
   const patch=validateInterpretation({intent:'inform',facts:{},relationships:[{entity,entityNature:'description',aliases:[],kind:'unknown',relationship:'adviser',period:'current',quote:entity}]},`My ${entity} sent me here`,ready());
   assert.equal(patch.professional.length,0);
 }
});
test('a working arrangement cannot populate the current organisation',()=>{
 for(const value of ['independent','freelance','self-employed']){
   const patch=validateInterpretation({intent:'inform',organisationNature:'working_arrangement',facts:{organisation:{value,quote:value,period:'current',correction:false}}},`I am an ${value} consultant`,initialConversation());
   assert.equal(patch.organisation,undefined);
 }
});
test('one bounded wording revision preserves extraction and accounts for every successful call',async()=>{
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test';let calls=0;
 globalThis.fetch=async(_url,init)=>{
   const request=JSON.parse(init.body);calls++;
   if(calls===3){assert.equal(request.max_output_tokens,2000);assert.match(request.input.at(-1).content,/not displayed/);}
   const parsed=calls===1?{intent:'inform',facts:{name:{value:'Alex Rowan',quote:'Alex Rowan',period:'current',correction:false}}}:{move:'progress',reply:calls===2?'One? Two? Three?':'What is your email address, and what do you do?',afterCharity:null};
   return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{text:JSON.stringify(parsed)}]}]});
 };
 try{
   const result=await interpretWithModel('My name is Alex Rowan.',initialConversation());
   assert.equal(calls,3);assert.equal(result.usage.calls,3);assert.equal(result.usage.input,300);assert.equal(result.usage.output,300);
   assert.equal(result.name,'Alex Rowan');assert.equal(result.notice,undefined);
   assert.doesNotMatch(nextQuestion(advance(initialConversation(),result)),/One\?/);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('a second invalid draft stops without weakening validation or losing understood facts',async()=>{
 const original=globalThis.fetch,key=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='synthetic-test';let calls=0;
 globalThis.fetch=async()=>{
   calls++;
   const parsed=calls===1?{intent:'inform',facts:{name:{value:'Alex Rowan',quote:'Alex Rowan',period:'current',correction:false}}}:{move:'progress',reply:'One? Two? Three?',afterCharity:null};
   return Response.json({status:'completed',usage:{input_tokens:100,output_tokens:100},output:[{content:[{text:JSON.stringify(parsed)}]}]});
 };
 try{
   const result=await interpretWithModel('My name is Alex Rowan.',initialConversation());
   assert.equal(calls,3);assert.equal(result.usage.calls,3);assert.equal(result.name,'Alex Rowan');
   assert.match(result.notice,/reply could not finish/);assert.equal(result.questionProposal,undefined);
 }finally{globalThis.fetch=original;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('a permitted natural close can omit optional topics without changing supplied facts',()=>{
 const state=ready();state.facts.discovery='';state.skipped=[];
 const closure=closeOptionalConversation(state);
 assert.ok(closure);assert.equal(nextObjective(closure),'complete');
 const output=decodeDialogue({move:'finish',reply:'No problem remembering how you found us. You can create your account and explore Interim Spaces.',afterCharity:null},state,null,null,null,closure);
 assert.equal(output.closeOptional,true);
 const next=advance(state,{utterance:'Dunno.',topicResponse:{topic:'discovery',status:'uncertain',followUp:false},closeOptional:output.closeOptional,questionProposal:output.next});
 assert.equal(nextObjective(next),'complete');assert.equal(next.facts.discovery,'');assert.equal(next.facts.concerns,'');
 assert.equal(closeOptionalConversation(initialConversation()),null);
 assert.throws(()=>decodeDialogue({move:'finish',reply:'Finished.',afterCharity:null},state,null));
});
