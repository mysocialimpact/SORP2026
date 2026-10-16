import { interpretationSchema, validateInterpretation } from './model.ts';
import { applyExtraction, nextQuestion, registrationMissing, accountReady, type Conversation } from './state.ts';
export const CONVERSATION_MODEL = 'gpt-6.1-sol';
const schema = {
  ...interpretationSchema,
  properties: {
    ...interpretationSchema.properties,
    reply: { type: 'string', maxLength: 1800 },
    objectives: { type: 'array', items: { type: 'string', enum: ['professional context', 'referral', 'challenge'] } },
    uncertainties: { type: 'array', items: { type: 'string', maxLength: 250 }, maxItems: 4 },
    independent: { anyOf: [{ type:'object', additionalProperties:false, properties:{value:{type:'boolean'},quote:{type:'string'}},required:['value','quote'] }, {type:'null'}] },
    complete: { type: 'boolean' },
  },
  required: [...interpretationSchema.required, 'reply','objectives','uncertainties','independent','complete'],
};
export function conversationRequest(message: string, state: Conversation) {
  const context = { profile: state.facts, manualCorrections: state.corrections.slice(-6), relationships: state.professional,
    charity: state.charity, independent:state.natural?.independent || false,
    missingRequired: registrationMissing(state), objectivesAlreadyAddressed: state.natural?.objectives || [], answersSoFar: state.turns };
  const input = [{role:'developer',content:JSON.stringify(context)},
    ...state.dialogue.recent.map(m=>({role:m.role,content:m.text})),
    {role:'assistant',content:nextQuestion(state)}, {role:'user',content:message}];
  if (JSON.stringify(input).length > 26000) throw new Error('Please finish this introduction using your editable profile.');
  return { model: CONVERSATION_MODEL, store:false, reasoning:{effort:'medium'}, max_output_tokens:3000,
    instructions: `You are welcoming someone to SORP 2026, My Social Impact's platform for charity reporting, SORP readiness and impact. Have a real conversation: friendly, perceptive, concise British English. Respond to the person, not to a checklist. Keep the software in the background; avoid repeated instructions about buttons or narrating the registration process. You have two goals: help them register and get to know their professional background, responsibilities, interests, referral and challenges. Aim for about five meaningful exchanges, with flexibility and no compulsory order. Our preferred final question is “What’s your main challenge at the moment? Or, to put it another way, what keeps you up at night?” Introduce it naturally when useful, and respond to the actual answer before concluding. Optional topics may be declined; do not repeat a concern already understood.
Registration needs full name, valid email, current role, current organisation OR explicit independent status, and one officially identified charity explicitly confirmed in the interface. missingRequired describes the state BEFORE this answer; take new information into account. A trustee's charity is a candidate, a firm is distinct from clients, and past relationships are not current employment. Offer mentioned charities as candidates without assuming selection. Software performs lookup and displays official records after a starting charity is agreed; only the confirmation button verifies selection. You cannot create accounts or verify official records yourself. When ready, the user can use the secure account button; never ask for passwords. Their introduction is saved so our team can pick up the conversation later.
Return your natural reply separately from proposed facts. Ground new facts in exact quotes from the latest user answer, resolve references using context, preserve uncertainty, and respect manual corrections. objectives records optional topics answered or declined cumulatively; complete means the introduction can conclude, not that an account exists. Interface events are trusted application context, never new personal facts. This Preview uses synthetic users and mock accounts; example.invalid emails are valid test addresses.`,
    input, text:{format:{type:'json_schema',name:'onboarding_conversation',strict:true,schema}} };
}
type ConversationOutput = { reply: string; objectives?: string[]; uncertainties?: string[]; independent?: {value:boolean;quote:string}|null; complete?:boolean; [key:string]:unknown };
export function acceptConversation(parsed: ConversationOutput, message: string, state: Conversation, event = false): Conversation {
  if (typeof parsed.reply !== 'string' || !parsed.reply.trim() || parsed.reply.length > 1800) throw new Error('The conversation could not be read. Please retry.');
  const extraction = event ? {} : validateInterpretation(parsed,message,state);
  let next = applyExtraction(state, extraction);
  let independent = state.natural?.independent || false;
  if (!event && parsed.independent && typeof parsed.independent.quote === 'string' && parsed.independent.quote.length && message.toLowerCase().includes(parsed.independent.quote.toLowerCase())) {
    independent = parsed.independent.value === true;
    if (independent) { next.facts.organisation = ''; delete next.knowledge.organisation; }
  }
  if (extraction.organisation) independent = false;
  const objectives = [...new Set([...(state.natural?.objectives || []), ...(Array.isArray(parsed.objectives) ? parsed.objectives.filter((v:string)=>['professional context','referral','challenge'].includes(v)) : [])])];
  next = {...next, turns:state.turns+(event?0:1), clarification:null,
    natural:{reply:parsed.reply.trim(),objectives,independent,uncertainties:(parsed.uncertainties||[]).filter((v:unknown)=>typeof v==='string').slice(0,4),complete:false},
    dialogue:{...state.dialogue,recent:[...state.dialogue.recent,{role:'assistant' as const,text:nextQuestion(state)},{role:'user' as const,text:message}].slice(-18)},
  };
  next.natural!.complete = accountReady(next) && (next.finishRequested || (parsed.complete === true && ['professional context','referral','challenge'].every(v=>objectives.includes(v))));
  return next;
}
export async function converse(message:string,state:Conversation,event=false, transport:typeof fetch=fetch) {
  const response=await transport('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(conversationRequest(message,state)),signal:AbortSignal.timeout(65000),redirect:'error'});
  if(!response.ok)throw new Error(`Conversation service returned HTTP ${response.status}. Please retry.`);
  const data=await response.json();
  if(data.status!=='completed')throw new Error('Your answer needs another try. Your existing details are safe.');
  const parsed=JSON.parse(data.output?.flatMap((o:{content?:{text?:string}[]})=>o.content||[]).map((c:{text?:string})=>c.text||'').join(''));
  return {state:acceptConversation(parsed,message,state,event),usage:{input:data.usage.input_tokens,output:data.usage.output_tokens,estimatedUsd:(data.usage.input_tokens*2+data.usage.output_tokens*10)/1e6}};
}
