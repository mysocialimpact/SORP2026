// Explicit, read-only deployment diagnostic; never substitutes cached search text.
import {fetchPublic} from '../src/lib/console/fetch-public';
async function main(){
 for(const url of ['https://www.fraserpowell.co.uk/robots.txt','https://www.fraserpowell.co.uk/','https://www.burton-sweet.co.uk/robots.txt']){
  try {const p=await fetchPublic(url);console.log(JSON.stringify({url,status:p.status,type:p.type,bytes:p.body.length,diagnostic:p.status>=400?p.body.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,350):p.body.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]}));}
  catch(e){console.log(JSON.stringify({url,error:e instanceof Error?e.message:'Request failed'}));}
 }
}
main();
