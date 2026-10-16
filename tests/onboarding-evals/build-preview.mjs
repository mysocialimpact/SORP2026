import {spawnSync} from 'node:child_process';
// Opt-in preview build only: does not mutate production sessions or change app auth.
if(process.env.VERCEL_ENV!=='preview')throw new Error('Live evaluation build is preview-only');
for(const [cmd,args,extra] of [
 ['node',['--experimental-strip-types','tests/onboarding-evals/run-live.mjs'],{SORP_LIVE_EVAL:'true'}],
 ['npm',['run','build'],{}],
]){const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,...extra}});if(result.status!==0)process.exit(result.status||1);}
