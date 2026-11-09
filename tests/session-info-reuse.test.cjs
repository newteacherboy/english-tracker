const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
const begin=source.indexOf("  if(op==='oturumBilgisi'){");
const end=source.indexOf("\n  const iosAdResponse=",begin);
assert(begin>=0&&end>begin,'route location');
const body=source.slice(begin,end);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction('op','a','supabase','json',body+'\nreturn null;');
const json=(v,status=200)=>({v,status});
const student=(overrides={})=>({role:'student',student_id:'s1',expires_at:'2026-12-01',...overrides});
const mock=(value={username:'Ada',status:'approved'},error=null)=>{let reads=0;return {supabase:{from(t){reads++;assert.equal(t,'students');return {select(c){assert.equal(c,'username,status');return this},eq(k,v){assert.equal(k,'id');assert.equal(v,'s1');return this},maybeSingle:async()=>({data:value,error})}}},get reads(){return reads}}};
test('authenticated joined student is reused without re-querying students',async()=>{
 const m=mock(),a=student({_ogr:{id:'s1',username:'Ada',status:'approved'}});
 const r=await run('oturumBilgisi',a,m.supabase,json);
 assert.equal(r.v.ogrenci,'Ada');assert.equal(r.v.rol,'ogrenci');assert.equal(m.reads,0);
});
test('missing joined student falls back to original one-row query',async()=>{
 const m=mock(),r=await run('oturumBilgisi',student(),m.supabase,json);
 assert.equal(r.v.ogrenci,'Ada');assert.equal(m.reads,1);
});
test('mismatched identity cannot enter verified shortcut',async()=>{
 const m=mock(),r=await run('oturumBilgisi',student({_ogr:{id:'another',username:'Other',status:'approved'}}),m.supabase,json);
 assert.equal(r.v.ogrenci,'Ada');assert.equal(m.reads,1);
});
test('rejected and missing student keep original 403 handling',async()=>{
 const m=mock(),r=await run('oturumBilgisi',student({_ogr:{id:'s1',username:'Ada',status:'rejected'}}),m.supabase,json);
 assert.equal(r.status,403);assert.equal(m.reads,0);
 const n=mock(null),t=await run('oturumBilgisi',student(),n.supabase,json);assert.equal(t.status,403);
});
test('fallback DB errors still produce 503',async()=>{
 const m=mock(null,{message:'timeout'}),r=await run('oturumBilgisi',student(),m.supabase,json);
 assert.equal(r.status,503);assert.equal(m.reads,1);
});
test('teacher and expired sessions retain existing response behavior',async()=>{
 const m=mock(),teacher=await run('oturumBilgisi',{role:'teacher',ogretmenKullanici:'Teacher',expires_at:'x'},m.supabase,json);
 assert.equal(teacher.v.ogrenci,'Teacher');assert.equal(m.reads,0);
 const no=await run('oturumBilgisi',null,m.supabase,json);assert.equal(no.status,401);
});
