import {mkdir,writeFile} from 'node:fs/promises';
if(process.env.VERCEL_ENV!=='preview')throw new Error('Experiment is preview-only');
const key=process.env.OPEN_API_KEY;
if(!key)throw new Error('Preview OPEN_API_KEY is unavailable');
// One fixed, bounded synthetic request. No database, account or production API code.
const response=await fetch('https://api.openai.com/v1/responses',{
 method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},
 body:JSON.stringify({model:'gpt-6.1-sol',store:false,reasoning:{effort:'low'},max_output_tokens:500,input:'Reply with the exact words: Connection verified'}),
 signal:AbortSignal.timeout(35000),redirect:'error',
});
if(!response.ok)throw new Error(`Model connection failed: HTTP ${response.status}`);
const data=await response.json();
const reply=data.output?.flatMap(o=>o.content||[]).map(c=>c.text||'').join('');
const inputTokens=Number(data.usage?.input_tokens||0),outputTokens=Number(data.usage?.output_tokens||0);
const result={model:data.model,status:data.status,reply,inputTokens,outputTokens,estimatedUsd:(inputTokens*2+outputTokens*10)/1e6};
console.log('SIMPLE_PROBE',JSON.stringify(result));
if(data.status!=='completed'||!reply.includes('Connection verified'))throw new Error('Model did not complete the connection check');
await mkdir('public',{recursive:true});
await writeFile('public/probe.json',JSON.stringify(result,null,2));
await writeFile('public/index.html','<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>SORP experiment connection check</title><body><h1>Preview model connection verified</h1><p>This is a connection check, not the experimental onboarding.</p><a href="/probe.json">Measured model usage</a></body></html>');
