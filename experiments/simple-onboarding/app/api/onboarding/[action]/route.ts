import {applyFacts,proposeCharity,confirmCharity,validEntity,accountReady} from '../../../../../../src/lib/onboarding/state.ts';
import {body,sameOrigin,load,start,save,claim,snapshot,record,respond,json,cookie} from '../../../../lib/service';
import {budgeted,usage} from '../../../../lib/budget.mjs';
export const runtime='nodejs';
export const maxDuration=180;
import {canonicalCharityRecord} from '../../../../../../src/lib/onboarding/charity-record.ts';
const official=(c:unknown)=>!!canonicalCharityRecord(c);
export async function GET(r:Request,{params}:{params:Promise<{action:string}>}){try{if((await params).action==='health')return json({available:true,model:'gpt-6.1-sol',reasoning:'medium',isolated:true,usage:await usage()});const row=await load(r);return json(row?snapshot(row.payload):{available:true});}catch{return json({available:false},503);}}
export async function POST(r:Request,{params}:{params:Promise<{action:string}>}){
 try{
  sameOrigin(r);const {action}=await params;
  if(action==='transcribe'){
   const row=await load(r);if(!row) return json({error:'Start your introduction first.'},401);await claim(row);
   const bytes=await body(r,3600000);const form=await new Response(new Uint8Array(bytes),{headers:{'content-type':r.headers.get('content-type')||''}}).formData();const audio=form.get('audio');
   if(!(audio instanceof File)||audio.size>3500000||!/^audio\/(webm|mp4|ogg|wav|mpeg)/.test(audio.type))return json({error:'Use an audio recording under 3.5 MB.'},400);
   const result=await budgeted(.10,async()=>{const outgoing=new FormData();outgoing.append('audio',audio,audio.name);const response=await fetch('https://sorp2026.mysocialimpact.org/api/transcribe',{method:'POST',body:outgoing,redirect:'error',signal:AbortSignal.timeout(35000)});const data=await response.json();if(!response.ok||typeof data.transcript!=='string')throw new Error('Transcription is unavailable. Please retry or type.');return {transcript:data.transcript.slice(0,3000),usage:{unmetered:true}};});
   return json({transcript:result.transcript});
  }
  const data=JSON.parse((await body(r)).toString());
  if(action==='start'){const row=await load(r);if(row)return json(snapshot(row.payload));const key=await start();const out=json(snapshot((await load(new Request(r.url,{headers:{cookie:`${cookie}=${key}`}}))).payload));out.headers.append('set-cookie',`${cookie}=${key}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`);return out;}
  const row=await load(r);if(!row)return json({error:'Please reopen your introduction.'},401);
  if(data.revision!==undefined&&data.revision!==row.revision)return json({...snapshot(row.payload),error:'Your details changed. Please retry.'},409);
  await claim(row);let s=row.payload,state=s.state;
  if(action==='edit'){state=applyFacts(state,data.fields||{},'form');if(typeof data.independent==='boolean'){state.natural.independent=data.independent;if(data.independent)state=applyFacts(state,{organisation:''},'form');}if(typeof data.fields?.organisation==='string'&&data.fields.organisation)state.natural.independent=false;s={...s,state};}
  else if(action==='turn'){
   if(typeof data.message!=='string'||!data.message.trim()||data.message.length>3000)return json({error:'Use an answer of up to 3,000 characters.'},400);
   if(/\bpassword\s*(?:is|:|=)/i.test(data.message))return json({error:'Use the secure password fields.'},400);
   if((data.message.match(/[\w.+-]+@[\w.-]+\.[a-z]+/gi)||[]).some((e:string)=>!e.endsWith('.invalid')))return json({error:'Use a synthetic email ending .invalid in this isolated Preview.'},400);
   state=applyFacts(state,data.fields||{},'form');state=await respond(data.message,state);s=record(s,state,data.message);
  } else if(action==='search'){
   if(typeof data.query!=='string'||!validEntity(data.query))return json({error:'Add a charity name or number.'},400);
   state=proposeCharity(state,data.query);
   const response=await fetch('https://sorp2026.mysocialimpact.org/api/published-review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'find',query:data.query,sessionId:`preview-${row.id.slice(0,12)}`}),redirect:'error',signal:AbortSignal.timeout(30000),cache:'no-store'});
   if(!response.ok)throw new Error(`Official charity lookup returned HTTP ${response.status}.`);
   const found=await response.json();state.charity.candidates=(found.research?.candidates||[]).map(canonicalCharityRecord).filter(Boolean).slice(0,4);state.charity.phase='confirm';s={...s,state};
  } else if(action==='confirm'){
   if(!Number.isInteger(data.index)||!state.charity.candidates[data.index]||!official(state.charity.candidates[data.index]))return json({error:'Choose a returned official record.'},400);
   const selected=state.charity.candidates[data.index];state=confirmCharity(state,selected,false);
   state=await respond(`[Interface event: user explicitly confirmed the displayed official record for ${selected.name}, charity ${selected.registrationNumber}. The Preview records a preparation event only; production research is disabled.]`,state,true);
   s=record({...s,preparation:{identity:selected.officialUrl,status:'preview-event-only'}},state);
  } else if(action==='complete'){
   if(!s.account||!accountReady(state))return json({error:'Complete all five requirements and the isolated account step.'},403);
   return json({saved:true,mock:true});
  } else return json({error:'Unknown action.'},404);
  s=await save(row,s);return json({...snapshot(s),lookup:action==='turn'&&s.state.charity.phase==='lookup'?s.state.charity.proposed:'',preparation:s.preparation});
 }catch(e){return json({error:e instanceof Error?e.message:'Please retry.'},503);}
}
