import pg from 'pg';
let pool;
export function database(){
 if(process.env.VERCEL_ENV!=='preview')throw new Error('Preview only');
 const uri=new URL(process.env.SORP_FINISH_PREVIEW_URL||'');
 if(uri.username!=='sorp_finish_preview_20261016'||uri.hostname!=='ep-noisy-fog-aud5eyi4.c-10.us-east-1.aws.neon.tech'||uri.pathname!=='/neondb')throw new Error('Isolated counter is not configured');
 return pool||=new pg.Pool({connectionString:uri.toString(),max:2,connectionTimeoutMillis:8000});
}
export async function usage(){return (await database().query('SELECT reserved_usd::float,actual_usd::float,calls FROM sorp_simple_demo_20261016.budget WHERE id=1')).rows[0];}
export async function budgeted(reserve,fn){
 const claimed=await database().query('UPDATE sorp_simple_demo_20261016.budget SET reserved_usd=reserved_usd+$1,calls=calls+1 WHERE id=1 AND reserved_usd+$1<=2 RETURNING id',[reserve]);
 if(!claimed.rowCount)throw new Error('The US$2 experiment budget has been reached. No model request was sent.');
 const result=await fn();
 const cost=result.usage?.estimatedUsd;
 if(!Number.isFinite(cost)||cost<0||cost>reserve)throw new Error('Usage could not be safely settled; the reservation is retained.');
 await database().query('UPDATE sorp_simple_demo_20261016.budget SET reserved_usd=reserved_usd-$1+$2,actual_usd=actual_usd+$2 WHERE id=1',[reserve,cost]);
 return result;
}
