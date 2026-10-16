import {spawnSync} from 'node:child_process';
if(process.env.VERCEL_ENV!=='preview')throw new Error('Preview only');
for(const [cmd,args] of [['node',['prepare.mjs']],['npm',['run','build']],['npm',['ci','--prefix','../../tests/live-runtime']],['node',['browser.mjs']]]){
 const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status)process.exit(r.status);
}
