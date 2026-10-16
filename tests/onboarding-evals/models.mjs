// Read-only capability discovery in the authorised preview environment. Never prints credentials.
if(process.env.VERCEL_ENV!=='preview') throw new Error('Preview only');
const key=process.env.OPENAI_API_KEY||process.env.OPEN_API_KEY;
if(!key) throw new Error('Existing credential required');
const r=await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000)});
if(!r.ok) throw new Error(`Model catalogue ${r.status}`);
const data=await r.json();
console.log('ONBOARDING_AVAILABLE_MODELS',JSON.stringify(data.data.map(m=>m.id).filter(id=>/^gpt-(5|6)/.test(id)).sort()));
