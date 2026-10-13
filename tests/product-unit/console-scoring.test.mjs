import {test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {scoreEvidence} from '../../src/lib/console/scoring-engine.ts';
import {provisionalRubric,validateRubric} from '../../src/lib/console/rubric.ts';
import {encryptBackup,decryptBackup} from '../../src/lib/console/backup-crypto.ts';
const evidence=(summary,extra={})=>({id:'e1',firm_id:'f',run_id:'r',source_type:'Firm website',category:'services',title:'Charity services',summary,url:'https://firm.example/charities/',accessed_at:'2026-10-12',published_at:null,people:[],sorp:'Not assessed',confidence:'Needs review',state:'Current',notes:'',...extra});
const score=(rows,sufficient=true)=>scoreEvidence(rows,{sufficient});
test('unassessed and assessed zero remain distinct',()=>{assert.equal(score([],false).total,null);assert.equal(score([],true).total,0);assert.equal(score([],true).state,'Assessed with no qualifying evidence');});
test('directory membership and generic seniority/ACA never earn points',()=>{const r=score([evidence('ICAEW member John Smith FCA is an audit partner. Charities & Not For Profit listed.',{source_type:'ICAEW',url:'https://find.icaew.com/firms/example'})]);assert.equal(r.total,0);assert.equal(score([evidence('John Smith FCA is a partner with an excellent professional track record.')]).total,0);});
test('dedicated page is distinct from a specialist team; never award either twice',()=>{const e=evidence('Our dedicated charity team provides charity accounts, audit, VAT, governance and payroll services.');const r=score([e,{...e,id:'e2'}]);assert.equal(new Set(r.awards.map(a=>a.criterion_id)).size,r.awards.length);assert.ok(r.awards.some(a=>a.criterion_id==='A3'));assert.ok(r.scores.services<=25);const basic=score([evidence('Dedicated page explains independent examination of charity accounts, thresholds and statutory reporting.')]);assert.equal(basic.awards.some(a=>a.criterion_id==='A3'),false);});
test('casual SORP mentions are not substantive technical publications',()=>{assert.equal(score([evidence('We understand SORP 2026 and work with charities.')]).scores.sorp,0);const r=score([evidence('Our article explains the Charity SORP applying from 1 January 2026 and the three-tier reporting framework.')]);assert.ok(r.awards.some(a=>a.criterion_id==='C1'));});
test('network-wide clients and negated qualifications do not score',()=>{assert.equal(score([evidence('Our network works with more than 300 charity clients; this is network-wide, not necessarily local.')]).scores.clients,0);assert.equal(score([evidence('Jane Smith FCA is a charity partner, but no DChA qualification is verified.')]).scores.people,0);});
test('SORP marketing promises and commencement dates alone earn no technical points',()=>{for(const text of ['The Charity SORP is based on the underlying accounting standard FRS 102 and changes apply from 1 January 2026.','We provide advice on an excellent Trustees Annual Report that meets the requirements of the Charities SORP and shows the difference you make.'])assert.equal(score([evidence(text)]).scores.sorp,0);});
test('one SORP training event cannot earn repeated training/speaking awards',()=>{const r=score([evidence('ICAEW charity course names Sally Knight FCA DChA as presenter for a six-hour SORP 2026 training course.',{source_type:'External',url:'https://events.icaew.com/course'})]);assert.ok(r.awards.some(a=>a.criterion_id==='C3'));assert.equal(r.awards.some(a=>a.criterion_id==='E3'),false);});
test('awards always trace to exact evidence and source, invalidated evidence excluded',()=>{const e=evidence('Our dedicated charity team provides charity audit services.');const r=score([e]);assert.ok(r.total>0);assert.ok(r.awards.every(a=>a.evidence_id===e.id&&a.source_url===e.url&&a.quote===e.summary));assert.equal(score([{...e,state:'Incorrect'}]).total,0);});
test('category caps and criterion identities are validated',()=>{assert.throws(()=>validateRubric(provisionalRubric.map(r=>r.id==='A1'?{...r,points:99}:r)));assert.throws(()=>validateRubric(provisionalRubric.map(r=>r.id==='A1'?{...r,id:'A2'}:r)));assert.throws(()=>validateRubric(provisionalRubric.map(r=>r.id==='A1'?{...r,label:'Different meaning'}:r)));});
test('encrypted backup round-trips and rejects tampering and wrong keys',()=>{const key=randomBytes(32).toString('base64'),body=Buffer.from(JSON.stringify({tables:{evidence:[{summary:'private evidence'}]}}));const sealed=encryptBackup(body,key);assert.equal(sealed.includes('private evidence'),false);assert.deepEqual(decryptBackup(sealed,key),body);assert.throws(()=>decryptBackup(sealed,randomBytes(32).toString('base64')));const altered=JSON.parse(sealed.toString());altered.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>decryptBackup(Buffer.from(JSON.stringify(altered)),key));});

test('not-for-profit is a sector description, never a negative finding',()=>{
 const r=score([evidence('Our dedicated not-for-profit service page describes audit and accounting services for charities.',{url:'https://firm.example/our-services/'})]);
 assert.ok(r.awards.some(a=>a.criterion_id==='A1'));
});
test('a separate missing-client sentence does not suppress documented external speaking',()=>{
 const e=evidence('No named charity clients were found. The ICAEW charity conference lists Jane Smith as a speaker on charity reporting.',{source_type:'External',url:'https://icaew.com/events/charity-conference'});
 const r=score([e]);assert.ok(r.awards.some(a=>a.criterion_id==='E1'));assert.equal(r.scores.clients,0);
});
test('a separate missing qualification never becomes an affirmative qualification award',()=>{
 const r=score([evidence('Jane Smith FCA is the senior partner responsible for charity audit. No DChA qualification was verified.')]);
 assert.ok(r.awards.some(a=>a.criterion_id==='B1'));assert.equal(r.awards.some(a=>a.criterion_id==='B2'),false);
});

test('markdown and longer negative charity findings cannot turn generic directors into specialists',()=>{
 const r=score([evidence('The team page names **Jane Smith FCA – Director** and says she is the main contact for corporate clients. I did **not** see any charity-specific responsibility or specialist charity qualification such as **DChA** on that page.',{category:'people',url:'https://firm.example/about-us/meet-the-team'})]);
 assert.equal(r.scores.people,0);
});
test('charity audit requirements in factsheets are not an offer of charity audit services',()=>{
 const r=score([evidence('The closest page only says the charity factsheet covers trustees responsibilities with emphasis on accounting and audit requirements.',{category:'sorp',url:'https://firm.example/factsheets/specialist-areas'})]);
 assert.equal(r.scores.services,0);
});

test('historic charity employment does not establish a current senior charity responsibility',()=>{
 const r=score([evidence('The people page names Jonathan Coyle as Partner. In his profile, he says he first worked at a youth charity, was responsible for getting the books in order, and joined the firm as a trainee accountant.',{category:'people',url:'https://firm.example/people/'})]);
 assert.equal(r.awards.some(a=>a.criterion_id==='B1'),false);
});

test('a firm name and a factsheet heading never identify a senior professional',()=>{
 const r=scoreEvidence([evidence('On the official Specialist areas page, Fraser Powell publishes charity-related material headed Charities trustees responsibilities, focusing on accounting and audit requirements.',{url:'https://www.fraserpowell.co.uk/factsheets/specialist-areas'})],{sufficient:true,firmName:'fraser powel'});
 assert.equal(r.scores.people,0);
});
test('AI people awards require an extracted named person linked to the passage',()=>{
 const e=evidence('Jane Smith FCA is the senior partner responsible for charity audit.',{provenance:{kind:'openai-search'}});
 assert.equal(score([e]).scores.people,0);
 assert.ok(score([{...e,people:['Jane Smith']}]).awards.some(a=>a.criterion_id==='B1'));
});

test('named charity clients do not require an extracted staff member',()=>{
 const r=score([evidence('Our firm was appointed by River Trust as the charity auditor.',{provenance:{kind:'openai-search'},people:[],category:'clients'})]);
 assert.ok(r.awards.some(a=>a.criterion_id==='D1'));
});

test('generic technical libraries cannot earn any service-category points',()=>{
 const r=score([evidence('The site contains a dedicated charity-related service area, but it is framed as general guidance rather than a specialist charity team. It covers charity VAT, governance and audit requirements.',{url:'https://firm.example/factsheets/specialist-areas'})]);
 assert.equal(r.scores.services,0);
});

test('AI SORP training claims cannot earn points against an unrelated event citation',()=>{
 const e=evidence('The firm delivered a charity governance webinar. It also presented SORP 2026 training at another conference.',{title:'Charity Governance Code refreshed',url:'https://firm.example/events/governance-code/',provenance:{kind:'openai-search'}});
 assert.equal(score([e]).scores.sorp,0);
 const sourced={...e,title:'SORP 2026 webinar',url:'https://firm.example/events/sorp-2026/'};
 assert.ok(score([sourced]).awards.some(a=>a.criterion_id==='C3'));
});
