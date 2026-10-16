import {writeFile,mkdir} from 'node:fs/promises';
import {budgeted} from './lib/budget.mjs';
if(process.env.VERCEL_ENV!=='preview')throw new Error('Preview only');
const response=await budgeted(.02,async()=>{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${process.env.OPEN_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:'gpt-6.1-sol',store:false,reasoning:{effort:'medium'},max_output_tokens:300,input:'Reply only: Preview model connected.'}),signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`Model HTTP ${r.status}`);const d=await r.json();const reply=d.output.flatMap(o=>o.content||[]).map(c=>c.text||'').join('');if(!reply.includes('Preview model connected'))throw new Error('No model reply');return {model:d.model,reply,usage:{estimatedUsd:(d.usage.input_tokens*2+d.usage.output_tokens*10)/1e6}};});
console.log('FINISH_CONNECTION',JSON.stringify(response));
const r=await fetch('https://sorp2026.mysocialimpact.org/api/published-review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'find',query:'Interim Spaces',sessionId:'synthetic-preview-connection-check'}),signal:AbortSignal.timeout(45000)});
const lookup={status:r.status,data:await r.json()};
console.log('FINISH_LOOKUP',JSON.stringify(lookup).slice(0,6500));
await mkdir('public',{recursive:true});await writeFile('public/connection.json',JSON.stringify({response,lookup},null,2));
