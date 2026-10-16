import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { socialJourneys } from './social-journeys.mjs';
import { interpretWithModel, ONBOARDING_MODEL, DIALOGUE_MODEL, MODEL_RESERVATION_USD } from '../../src/lib/onboarding/model.ts';
import { processTurn } from '../../src/lib/onboarding/engine.ts';
import { initialConversation, applyFacts, normaliseConversation, nextQuestion, nextObjective, proposeCharity, confirmCharity, registrationReady } from '../../src/lib/onboarding/state.ts';
if(process.env.SORP_LIVE_EVAL !== 'true' || !(process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY)) throw new Error('Explicit live opt-in and existing credential required');
const report = { model:ONBOARDING_MODEL, dialogueModel:DIALOGUE_MODEL, extractionReasoning:'low',dialogueReasoning:'medium', stages:2, startedAt:new Date().toISOString(), turns:0, apiCalls:0, inputTokens:0, outputTokens:0, estimatedUsd:0, passed:0, failed:0, journeys:[] };
const selected = process.env.SORP_SOCIAL_IDS ? socialJourneys.filter(j=>process.env.SORP_SOCIAL_IDS.split(',').includes(j.id)) : socialJourneys;
const queue=[...selected];
let pendingBudget=0;
async function run(j) {
  let state=initialConversation();
  const record={id:j.id,passed:false,transcript:[{role:'assistant',text:nextQuestion(state)}],states:[]};
  let corrected=false,reminded=false,changed=false,registered=0,clarifications=0;
  async function send(text) {
    assert.ok(++report.turns <=160 && report.estimatedUsd + pendingBudget + MODEL_RESERVATION_USD <=8, 'Evaluation budget exhausted');
    pendingBudget += MODEL_RESERVATION_USD;
    record.transcript.push({role:'user',text});
    const result=await processTurn(state,text,async(t,s)=>{
      report.apiCalls+=2;
      const diagnostic=[];
      const result=await interpretWithModel(t,s,p=>diagnostic.push(p));
      pendingBudget -= MODEL_RESERVATION_USD;
      report.inputTokens+=result.usage.input; report.outputTokens+=result.usage.output; report.estimatedUsd+=result.usage.estimatedUsd;
      if(result.notice) for(const d of diagnostic.filter(d=>d.stage)) console.log('SOCIAL_DIAGNOSTIC',JSON.stringify({id:j.id,...d}));
      assert.ok(!result.notice, result.notice);
      return result;
    });
    state=result.state;
    assert.ok(state.response?.natural, 'Every live reply must be generated, not a silent template fallback');
    const reply=nextQuestion(state);
    const previousQuestions = record.transcript.filter(t=>t.role==='assistant').map(t=>t.text);
    if(reply.includes('What keeps you up at night?')) assert.ok(!previousQuestions.some(q=>q.includes('What keeps you up at night?')), 'Repeated final concern question');
    record.transcript.push({role:'assistant',text:reply});
    record.states.push({objective:nextObjective(state),facts:state.facts,confirmed:state.charity.confirmed?.name||null,reflecting:state.dialogue.reflecting});
    assert.ok(state.turns<=10);
    assert.ok(state.facts.charities.every(x=>!/^I (already|work|used)/i.test(x)));
  }
  try {
    await send(j.opening);
    if(j.edit){ state=applyFacts(state,j.edit,'form');record.transcript.push({role:'action',text:`Edited profile: ${JSON.stringify(j.edit)}`}); }
    if(j.resume){state=normaliseConversation(JSON.parse(JSON.stringify(state)));record.transcript.push({role:'action',text:'Reloaded and resumed the same introduction.'});}
    while(nextObjective(state)!=='complete') {
      assert.ok(record.transcript.length<35,'Journey did not finish');
      const objective=nextObjective(state);
      if(j.correction&&!corrected){corrected=true;await send(j.correction);continue;}
      if(j.reminder&&!reminded){reminded=true;await send(j.reminder);continue;}
      if(objective==='registration') {assert.ok(registered++<2,'Repeated registration question');await send(j.registration||"I'm Marcus Warry, a trustee at Interim Spaces. My email is marcus.warry@example.invalid.");continue;}
      if(objective==='charity') {
        if(j.changeCharity&&!changed){changed=true;await send(j.changeCharity);continue;}
        const name=j.charity||'Interim Spaces';
        // A labelled official-record service fixture; real controller confirmation, not an LLM assertion.
        state=proposeCharity(state,name);
        const candidate={name,registrationNumber:'1234567',officialUrl:'https://register-of-charities.charitycommission.gov.uk/synthetic-test-record'};
        state={...state,charity:{...state.charity,candidates:[candidate],phase:'confirm'}};
        record.transcript.push({role:'action',text:`Searched ${name}, inspected the displayed official-record fixture, and explicitly confirmed ${name}.`});
        state=confirmCharity(state,candidate);
        assert.ok(state.response?.natural,'Confirmation continuation must also use generated language');
        record.transcript.push({role:'assistant',text:nextQuestion(state)});
        continue;
      }
      if(objective==='clarification'){assert.ok(clarifications++<2,'Repeated clarification');await send(j.clarification||'I mean my own role. I oversee finances at Interim Spaces.');continue;}
      const answer=objective==='responsibilities'?j.responsibility||'I advise boards on governance.':objective==='discovery'?j.discovery||'A colleague recommended you.':objective==='concerns'?j.concern||'Keeping up with the reporting requirements.':(state.skipped.includes('concerns') || state.facts.concerns ? j.reflection : j.workReflection);
      await send(answer);
    }
    assert.ok(registrationReady(state.facts),'Account details must remain valid');
    assert.ok(state.charity.confirmed,'Starting charity must be genuinely confirmed by the fixture UI action');
    if(j.edit) for(const[k,v]of Object.entries(j.edit)) assert.equal(state.facts[k],v,'Manual correction is authoritative');
    if(j.expect==='frogs') {assert.match(record.transcript.filter(x=>x.role==='assistant').slice(-2).map(x=>x.text).join(' '),/frog|pond|amphib|croak/i);assert.doesNotMatch(state.facts.concerns,/frog/i);}
    if(j.expect==='decline') assert.equal(state.facts.concerns,'');
    record.passed=true; report.passed++;
  } catch(e){record.error=e.message;report.failed++;}
  record.finalState={objective:nextObjective(state),facts:state.facts,professional:state.professional,confirmed:state.charity.confirmed?.name||null};
  report.journeys.push(record);
  // One event per turn avoids log truncation and preserves complete review transcripts.
  for(let i=0;i<record.transcript.length;i++) console.log('SOCIAL_TURN',JSON.stringify({id:j.id,index:i,...record.transcript[i]}));
  console.log('SOCIAL_RESULT',JSON.stringify({id:j.id,passed:record.passed,error:record.error,turns:state.turns}));
}
await Promise.all(Array.from({length:3},async()=>{while(queue.length) await run(queue.shift());}));
report.completedAt=new Date().toISOString();
report.journeys.sort((a,b)=>a.id.localeCompare(b.id));
await mkdir('test-results',{recursive:true});
await writeFile('test-results/onboarding-social-eval.json',JSON.stringify(report,null,2));
console.log('SOCIAL_SUMMARY',JSON.stringify({...report,journeys:undefined}));
if(report.failed) process.exitCode=1;
