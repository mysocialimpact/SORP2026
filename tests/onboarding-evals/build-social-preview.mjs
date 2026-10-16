import {spawnSync} from 'node:child_process';
if(process.env.VERCEL_ENV!=='preview') throw new Error('Evaluation is preview-only');
const r=spawnSync('node',['--experimental-strip-types','tests/onboarding-evals/run-social.mjs'],{stdio:'inherit',env:{...process.env,SORP_LIVE_EVAL:'true'}});
// Preserve review artefacts in the preview even when a quality assertion fails.
// The SOCIAL_SUMMARY is the gate; a READY preview alone does not establish a pass.
const b=spawnSync('npm',['run','build'],{stdio:'inherit'});
console.log('SOCIAL_BUILD_STATUS',JSON.stringify({evaluationExit:r.status,buildExit:b.status}));
process.exitCode=b.status||0;
