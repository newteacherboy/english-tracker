const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
function load(db){
 const src=stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/contact-policy-api.ts','utf8'),{mode:'transform'}).replace('export function','function');
 const ctx=vm.createContext({});
 vm.runInContext(src+';this.create=contactPolicyAPI',ctx);
 return ctx.create(db,(value,status=200)=>({value,status}));
}
function fake(profile=true,result={eksik:true,donuk:false,uyari:false}){
 const counters={profile:0,students:0,rpc:0};
 const db={from(table){if(table==='extra_data')counters.profile++;else if(table==='students')counters.students++;else throw Error('Unexpected table');
 return {select(){return this},eq(){return this},maybeSingle:async()=>({data:table==='extra_data'?(profile?{value:{version:1}}:null):{email:'good@example.com'},error:null})};},
 rpc:async(name,args)=>{assert.equal(name,'student_contact_state');counters.rpc++;return {data:result,error:null};}};
 return {db,counters};
}
test('invalid email skips profile and preserves authoritative RPC and claim side effects',async()=>{
 const f=fake(),api=load(f.db);
 const r=await api.guard('iletisimDurumu',{role:'student',student_id:'one',_ogr:{id:'one',email:'bad-email',phone:''}});
 assert.equal(r.status,200);assert.equal(r.value.eksik,true);
 assert.equal(f.counters.profile,0);assert.equal(f.counters.rpc,1);
});
test('valid email with v1 profile keeps existing fast path',async()=>{
 const f=fake(),api=load(f.db);
 const r=await api.guard('iletisimDurumu',{role:'student',student_id:'one',_ogr:{id:'one',email:'good@example.com',phone:''}});
 assert.equal(r.value.eksik,false);assert.equal(f.counters.profile,1);assert.equal(f.counters.rpc,0);
});
test('unknown email preserves original profile+student lookup',async()=>{
 const f=fake(),api=load(f.db);
 const r=await api.guard('iletisimDurumu',{role:'student',student_id:'one',_ogr:null});
 assert.equal(r.value.eksik,false);assert.equal(f.counters.profile,1);assert.equal(f.counters.students,1);
});
test('profile-less invalid email still runs contact policy and cannot evade freezing',async()=>{
 const f=fake(false,{eksik:true,donuk:true,uyari:false}),api=load(f.db);
 const r=await api.guard('parkurDurum',{role:'student',student_id:'one',_ogr:{id:'one',email:'',phone:''}});
 assert.equal(r.status,423);assert.equal(f.counters.rpc,1);assert.equal(f.counters.profile,0);
});
