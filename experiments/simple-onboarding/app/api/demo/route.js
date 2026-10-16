import {budgeted,usage} from '../../../lib/budget.mjs';
import {converse,normalise,fixtures,confirm,mockAccount} from '../../../lib/engine.mjs';
export const runtime='nodejs';
export const maxDuration=60;
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
function isolated(){if(process.env.VERCEL_ENV!=='preview'||!process.env.OPEN_API_KEY)throw new Error('The isolated Preview model is unavailable');}
export async function GET(){try{isolated();return json({available:true,budget:await usage(),limitUsd:2,mockServices:true});}catch(e){return json({error:e.message},503);}}
export async function POST(request){
 try{
  isolated();const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin) return json({error:'Open this form in its Preview tab.'},403);
  const raw=await request.text();if(Buffer.byteLength(raw)>26000)return json({error:'Answer is too long'},413);
  const b=JSON.parse(raw);
  if(b.action==='search'){const q=String(b.query||'').toLowerCase();return json({candidates:fixtures.filter(c=>c.name.toLowerCase().includes(q)||c.number===q)});}
  if(b.action==='confirm')return json({selected:confirm(b.id),preparation:'Mock preparation queued; no live charity research is started.'});
  if(b.action==='account')return json({account:mockAccount(normalise(b.profile))});
  if(b.action!=='turn'||typeof b.message!=='string'||!b.message.trim()||b.message.length>3000)return json({error:'Please enter an answer.'},400);
  const history=(Array.isArray(b.history)?b.history:[]).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-18);
  if(history.filter(m=>m.role==='user').length>=8)return json({error:'This short experiment has reached eight answers. Review the form or start a fresh introduction.'},400);
  if(/\bpassword\s*(?:is|:|=)/i.test(b.message))return json({error:'Please keep passwords out of this test conversation.'},400);
  const result=await budgeted(.08,()=>converse(b.message,normalise(b.profile),history));
  return json({...result,budget:await usage()});
 }catch(e){return json({error:e.message},400);}
}
