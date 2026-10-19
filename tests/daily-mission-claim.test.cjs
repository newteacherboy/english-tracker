const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
const start=src.indexOf('    if (is === "gunlukGorevOdul") {'),end=src.indexOf('    if (await denemeSay("ekonomi_alim"',start);
assert(start>0&&end>start,'claim block present');
const block=stripTypeScriptTypes('async function run(is,sid){'+src.slice(start,end)+'return null;}',{mode:'transform'});
function fixture(daily,{failCredit=false}={}){
 const extra=new Map(),deleted=[];let gold=10;
 const supabase={rpc:async(name,args)=>{assert.equal(name,'dm_mission_summary');assert.equal(args.actor,'s1');return {data:{daily},error:null};},
  from:()=>{let payload,opts,filters={},op='';const q={upsert(p,o){op='upsert';payload=p;opts=o;return q;},select(){return q.run();},delete(){op='delete';return q;},eq(k,v){filters[k]=v;return op==='delete'&&filters.key_name?q.run():q;},
   async run(){if(op==='upsert'){const k=payload.student_id+'|'+payload.key_name;if(extra.has(k)&&opts.ignoreDuplicates)return {data:[],error:null};extra.set(k,payload);return {data:[{student_id:payload.student_id}],error:null};}
    if(op==='delete'){extra.delete(filters.student_id+'|'+filters.key_name);deleted.push(filters.key_name);return {error:null};}}};return q;}};
 const env={supabase,num:Number,trBugun:()=>'2026-10-19',json:d=>d,hataVer:(m,c=400)=>({ok:false,mesaj:m,code:c}),ekonomiCevap:y=>({altin:y.altin}),yoOku:async()=>({y:{altin:gold}}),
  ekonomiGuncelle:async(sid,fn)=>{if(failCredit)return {hata:'Şu anda işlem yapılamadı, tekrar dene.'};const y={altin:gold};const r=fn(y);gold=y.altin;return {...r,ok:true,y};}};
 const run=new Function(...Object.keys(env),block+';return run;')(...Object.values(env));
 return {call:()=>run('gunlukGorevOdul','s1'),gold:()=>gold,extra,deleted};
}
test('reward is refused until all three daily missions are done on the server',async()=>{
 for(const d of [{route:0,game:1,review:3},{route:1,game:0,review:3},{route:1,game:1,review:2},{}]){const f=fixture(d);const r=await f.call();assert.equal(r.ok,false);assert.equal(r.code,409);assert.equal(f.gold(),10);assert.equal(f.extra.size,0);}
});
test('completed missions credit +5 gold exactly once per day',async()=>{
 const f=fixture({route:1,game:3,review:4});const a=await f.call();assert.equal(a.ok,true);assert.equal(a.eklenen,5);assert.equal(f.gold(),15);assert(f.extra.has('s1|mission_daily_claim:2026-10-19'));
 const b=await f.call();assert.equal(b.ok,true);assert.equal(b.eklenen,0);assert.equal(f.gold(),15,'second claim adds nothing');
});
test('a failed credit releases the day claim so the child can retry',async()=>{
 const f=fixture({route:1,game:1,review:3},{failCredit:true});const r=await f.call();assert.equal(r.ok,false);assert.deepEqual(f.deleted,['mission_daily_claim:2026-10-19']);assert.equal(f.extra.size,0);
});
