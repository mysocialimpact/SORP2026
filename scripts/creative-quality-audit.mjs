import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const phase = process.argv[2] || 'before';
const output = `/workspace/quality-review/${phase}`;
await mkdir(output, { recursive:true });
const routes = ['/', '/get-started/', '/are-you-sorp-ready/', '/ask-sorp/', '/charity-impact-reports/', '/social-impact-excellence/', '/my-impact-director/', '/accountants-advisers/', '/login/', '/contact/', '/our-mission/', '/sample-charity/', '/for-charities/', '/for-advisers/', '/privacy/'];
const widths = [375,430,768,1440,1920];
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try {
 for (const width of widths) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  for (const path of routes) {
   const errors=[]; const onError=e=>errors.push(e.message); page.on('pageerror',onError);
   const response=await page.goto('http://localhost:3000'+path);
   await page.locator('main h1').first().waitFor({timeout:15000});
   await page.evaluate(()=>document.fonts.ready);
   // Visit the whole page so lazy imagery and viewport reveals actually render.
   await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,35));}scrollTo(0,0);});
   await page.waitForFunction(()=>![...document.querySelectorAll('.gateway-account-group')].some(e=>e.classList.contains('is-checking')));
   await page.evaluate(()=>Promise.all([...document.images].map(img=>Promise.race([img.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,5000))]))));
   const slug=path.replaceAll('/','')||'home';
   await page.screenshot({path:`${output}/${slug}-${width}.png`,fullPage:true});
   const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.body.scrollHeight,h1:[...document.querySelectorAll('main h1')].map(e=>e.textContent),brokenImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.getAttribute('src')),overflow:[...document.querySelectorAll('main > *, main section')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>e.className)}));
   let accessibility=[];
   if(width===375||width===1440){const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();accessibility=a.violations.map(v=>({id:v.id,impact:v.impact,description:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,12)}));}
   results.push({path,width,status:response.status(),...metrics,errors,accessibility});
   page.off('pageerror',onError);
   console.log(`${phase} ${width} ${path}: overflow=${metrics.scrollWidth>width}, axe=${accessibility.length}`);
   await writeFile(`${output}/audit.json`,JSON.stringify(results,null,2));
  }
  await context.close();
 }
}finally{await browser.close();}
