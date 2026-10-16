import {randomBytes} from 'node:crypto';
import {database,budgeted} from './budget.mjs';
import {initialConversation, nextQuestion, normaliseConversation, type Conversation} from '../../../src/lib/onboarding/state.ts';
import {converse} from '../../../src/lib/onboarding/conversation.ts';
export const table='sorp_finish_preview_20261016.drafts';
export const cookie='sorp_finish_preview';
export function sameOrigin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin || r.headers.get('sec-fetch-site')==='cross-site')throw new Error('Please submit from this Preview.');}
export async function body(r:Request,max=16000){const reader=r.body?.getReader();let bytes=0;const chunks=[];if(reader)for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max){await reader.cancel();throw new Error('Please shorten your answer.');}chunks.push(value);}return Buffer.concat(chunks);}
export function id(r:Request){return r.headers.get('cookie')?.match(/(?:^|;\s*)sorp_finish_preview=([a-f0-9]{64})(?:;|$)/)?.[1]||'';}
export async function load(r:Request){const row=(await database().query(`SELECT id,payload,revision FROM ${table} WHERE id=$1 AND expires_at>now()`,[id(r)])).rows[0];if(row){row.payload.state=normaliseConversation(row.payload.state);row.payload.state.revision=row.revision;}return row;}
export function snapshot(s:any){return {available:true,state:s.state,messages:s.messages,selected:s.state.charity.confirmed,question:nextQuestion(s.state)};}
export async function start(){const session:{state:Conversation,messages:any[],account:any}={state:initialConversation(),messages:[],account:null};session.state.natural={reply:'Hello — tell me a little about yourself and the charity work you’re involved in. You can talk or type.',objectives:[],uncertainties:[],independent:false,complete:false};const key=randomBytes(32).toString('hex');await database().query(`INSERT INTO ${table}(id,payload) SELECT $1,$2 WHERE (SELECT count(*) FROM ${table} WHERE expires_at>now())<100`,[key,JSON.stringify(session)]);return key;}
export async function save(row:any,payload:any){const result=await database().query(`UPDATE ${table} SET payload=$2,revision=revision+1 WHERE id=$1 AND revision=$3 RETURNING revision`,[row.id,JSON.stringify(payload),row.revision]);if(!result.rowCount)throw new Error('Your introduction changed. Reload to restore the latest details.');payload.state.revision=result.rows[0].revision;return payload;}
export async function claim(row:any){const result=await database().query(`UPDATE ${table} SET requests=requests+1 WHERE id=$1 AND requests<45 RETURNING id`,[row.id]);if(!result.rowCount)throw new Error('This test introduction has reached its request limit.');}
export async function respond(message:string,state:Conversation,event=false){return (await budgeted(.10,()=>converse(message,state,event))).state;}
export function record(s:any,state:Conversation,message?:string){return {...s,state,messages:[...s.messages,...(message?[{role:'user',text:message}]:[]),{role:'assistant',text:nextQuestion(state)}].slice(-36)};}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
