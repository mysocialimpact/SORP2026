// Explicit release verification. Uses real websites and selected environment database.
import {query} from '../src/lib/console/db';
import {ensureProvisionalMethod,pilotCalibration} from '../src/lib/console/automatic-assessment';
import {startResearch,runResearch} from '../src/lib/console/research';
import {runBackup} from '../src/lib/console/backups';
async function main(){
 await ensureProvisionalMethod();
 const historical=await query<{count:number}>("SELECT count(*)::int count FROM research_console.assessments WHERE origin='Historical pilot v1.0'");
 if(historical[0].count){const calibration=await pilotCalibration();if(calibration.length!==10||calibration.some(r=>r.provisional_total===null))throw new Error('Pilot calibration incomplete.');console.log(JSON.stringify({pilot:10,calibration:calibration.map(f=>({name:f.name,original:f.historical_total,provisional:f.provisional_total}))}));}
 const [firm]=await query<{id:string;website:string}>("SELECT id,website FROM research_console.firms WHERE name_key='burton sweet' AND merged_into IS NULL");
 if(firm?.website!=='https://www.burton-sweet.co.uk/')throw new Error('Confirmed verification firm missing.');
 const run=await startResearch(firm.id,'Completion release validation');if(run.created)await runResearch(run.id);
 const [result]=await query("SELECT status,stage FROM research_console.runs WHERE id=$1",[run.id]);
 const [assessment]=await query<{total:number;awards:unknown[]}>("SELECT total,awards FROM research_console.assessments WHERE run_id=$1 AND origin='Automated provisional'",[run.id]);
 if(result.status!=='collected'||!assessment||!assessment.awards.length)throw new Error('Real-source automatic assessment did not complete.');
 console.log(JSON.stringify({researchRun:run.id,status:result.status,score:assessment.total,awards:assessment.awards.length}));
 const backup=await runBackup();console.log(JSON.stringify({backup:backup.status,restoreVerified:backup.restoreVerified,bytes:backup.bytes,tables:backup.tables}));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
