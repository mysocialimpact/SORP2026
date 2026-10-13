import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicAddress,safeResearchUrl} from '../../src/lib/console/fetch-public.ts';
import {evidenceLevel,validateBoundaries,canonicalName} from '../../src/lib/console/model.ts';
test('research blocks private, link-local, mapped and reserved addresses',()=>{for(const ip of ['127.0.0.1','10.1.2.3','192.168.1.1','172.16.0.1','169.254.169.254','0.0.0.0','::1','fe80::1','fc00::1','::ffff:127.0.0.1','224.0.0.1'])assert.throws(()=>assertPublicAddress(ip));assert.doesNotThrow(()=>assertPublicAddress('93.184.216.34'));});
test('research accepts only HTTPS standard-port URLs without credentials',()=>{for(const url of ['http://example.com','https://user:pass@example.com','https://example.com:8443','https://localhost','file:///etc/passwd'])assert.throws(()=>safeResearchUrl(url));assert.equal(safeResearchUrl('https://example.com/charities').pathname,'/charities');});
test('level boundaries remain independent from scores, including zero versus incomplete',()=>{assert.equal(evidenceLevel(null),null);assert.equal(evidenceLevel(0),0);assert.equal(evidenceLevel(20),1);assert.equal(evidenceLevel(21),2);assert.equal(evidenceLevel(100),5);assert.equal(evidenceLevel(20,[0,10,30,50,70,100]),2);assert.throws(()=>validateBoundaries([0,20,20,60,80,100]));assert.throws(()=>validateBoundaries([1,20,40,60,80,100]));});
test('identity keys normalise case, spacing and punctuation without merging firms',()=>{assert.equal(canonicalName('  Burton   Sweet '),canonicalName('Burton Sweet'));assert.notEqual(canonicalName('Moore UK'),canonicalName('Moore Kingston Smith'));});

test('robots security challenges and rate limits remain blocked', async()=>{
 const {inspectRobots}=await import('../../src/lib/console/fetch-public.ts');
 const page={url:'https://firm.example/robots.txt',type:'text/html',body:'Sorry, you have been blocked. Cloudflare',status:403};
 assert.throws(()=>inspectRobots('https://firm.example/',page),/security blocks/);
 assert.throws(()=>inspectRobots('https://firm.example/',{...page,status:429,body:''}),/restricted/);
 assert.throws(()=>inspectRobots('https://firm.example/',{...page,status:200,type:'text/plain',body:'User-agent: *\nDisallow: /'}),/disallowed/);
 const unavailable=inspectRobots('https://firm.example/',{...page,status:404,body:'Not found'});
 assert.ok(unavailable.notice.includes('404'));
});
