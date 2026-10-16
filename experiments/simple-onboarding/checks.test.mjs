import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProfile,apply,missing,confirm,mockAccount,requestFor} from './lib/engine.mjs';
process.env.OPEN_API_KEY='synthetic-unit-test-only';
const person=()=>({...emptyProfile(),name:'Taylor Green',email:'taylor@example.invalid',role:'Accountant'});
test('all five mandatory requirements are enforced by software',()=>{
 const p=person();assert.deepEqual(missing(p),['organisation or explicit independent status','confirmed charity']);
 assert.throws(()=>mockAccount(p));p.independent=true;assert.throws(()=>mockAccount(p));p.selected=confirm('interim');assert.equal(mockAccount(p).simulation,true);
 for(const key of ['name','email','role'])assert.throws(()=>mockAccount({...p,[key]:''}));
 assert.throws(()=>mockAccount({...p,name:'Taylor'}));assert.throws(()=>mockAccount({...p,selected:{...p.selected,token:'x'.repeat(64)}}));
});
test('a partial name appears immediately without satisfying full-name registration',()=>{
 const p=apply(emptyProfile(),{profile:{name:{value:'David',quote:'David',correction:false}}},"I'm David");assert.equal(p.name,'David');assert.ok(missing(p).includes('name'));
});
test('unsupported proposals and conversational sentences cannot populate entity fields',()=>{
 const p=apply(person(),{profile:{name:{value:'Someone Else',quote:'made up',correction:false},organisation:{value:'I already told you Interim Spaces',quote:'I already told you Interim Spaces',correction:false}}},'I already told you Interim Spaces');
 assert.equal(p.name,'Taylor Green');assert.equal(p.organisation,'');
});
test('manual corrections survive incidental spellings, with explicit corrections possible',()=>{
 const p={...person(),name:'Taylor Greene',manual:['name']};
 assert.equal(apply(p,{profile:{name:{value:'Taylor Green',quote:'Taylor Green',correction:false}}},'Taylor Green').name,'Taylor Greene');
 assert.equal(apply(p,{profile:{name:{value:'Taylor Grey',quote:'Taylor Grey',correction:true}}},'Actually Taylor Grey').name,'Taylor Grey');
});
test('independent status and charity changes preserve the correct distinctions',()=>{
 const p={...person(),organisation:'Cedar Advisory',selected:confirm('interim')};
 const n=apply(p,{independent:{value:true,quote:'I now work independently',correction:true},changeCharity:{value:'Brainstrust',quote:'use Brainstrust instead',correction:true}},'I now work independently; use Brainstrust instead');
 assert.equal(n.organisation,'');assert.equal(n.independent,true);assert.equal(n.selected,null);
});
test('dialogue receives history and confirmed edits without a compulsory question plan',()=>{
 const r=requestFor('My pal told me.',person(),[{role:'assistant',text:'How did you find us?'}]);
 assert.equal(r.input.at(-1).content,'My pal told me.');assert.equal(r.input.at(-2).content,'How did you find us?');
 assert.equal(r.tools,undefined);assert.equal(r.store,false);assert.equal(JSON.parse(r.input[0].content).progressPlan,undefined);
});
