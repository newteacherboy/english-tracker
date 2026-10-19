const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
const start=src.indexOf('    if (is === "gunlukGorevOdul" || is === "haftalikGorevOdul") {'),end=src.indexOf('    if (await denemeSay("ekonomi_alim"',start);
assert(start>0&&end>start,'claim block present');
const block=stripTypeScriptTypes('async function run(is,sid){'+src.slice(start,end)+'return null;}',{mode:'transform'});
function fixture(summary,{failCredit=false,day='2026-10-21'}={}){
 const extra=new Map(),deleted=[];let wallet={altin:10,totalXp:500,xpGun:{tarih:'2026-10-21',xp:20},guncelleme:1};
 const supabase={rpc:async(name,args)=>{assert.equal(name,'dm_mission_summary');assert.equal(args.actor,'s1');return {data:summary,error:null};},
  from:()=>{let payload,opts,filters={},op='';const q={upsert(p,o){op='upsert';payload=p;opts=o;return q;},select(){return q.run();},delete(){op='delete';return q;},eq(k,v){filters[k]=v;return op==='delete'&&filters.key_name?q.run():q;},
   async run(){if(op==='upsert'){const k=payload.student_id+'|'+payload.key_name;if(extra.has(k)&&opts.ignoreDuplicates)return {data:[],error:null};extra.set(k,payload);return {data:[{student_id:payload.student_id}],error:null};}
    if(op==='delete'){extra.delete(filters.student_id+'|'+filters.key_name);deleted.push(filters.key_name);return {error:null};}}};return q;}};
 const env={supabase,num:Number,trBugun:()=>day,json:d=>d,hataVer:(m,c=400)=>({ok:false,mesaj:m,code:c}),ekonomiCevap:y=>({altin:y.altin}),yoOku:async()=>({y:structuredClone(wallet)}),
  ekonomiGuncelle:async(sid,fn)=>{if(failCredit)return {hata:'Şu anda işlem yapılamadı, tekrar dene.'};const y=structuredClone(wallet);const r=fn(y);wallet=y;return {...r,ok:true,y};}};
 const run=new Function(...Object.keys(env),block+';return run;')(...Object.values(env));
 return {daily:()=>run('gunlukGorevOdul','s1'),weekly:()=>run('haftalikGorevOdul','s1'),wallet:()=>wallet,extra,deleted};
}
const done={daily:{route:1,game:3,review:4},weekly:{route:10,game:20,days:5}};
test('rewards are refused until the period missions are done on the server',async()=>{
 for(const d of [{route:0,game:1,review:3},{route:1,game:0,review:3},{route:1,game:1,review:2},{}]){const f=fixture({daily:d,weekly:{}});const r=await f.daily();assert.equal(r.code,409);assert.equal(f.wallet().altin,10);assert.equal(f.extra.size,0);}
 for(const w of [{route:9,game:20,days:5},{route:10,game:19,days:5},{route:10,game:20,days:4}]){const f=fixture({daily:{},weekly:w});const r=await f.weekly();assert.equal(r.code,409);assert.equal(f.wallet().totalXp,500);}
});
test('daily: +30 gold and +70 server-side XP exactly once per day',async()=>{
 const f=fixture(done);const a=await f.daily();assert.equal(a.ok,true);assert.equal(a.eklenen,30);assert.equal(a.xp,70);
 assert.equal(f.wallet().altin,40);assert.equal(f.wallet().totalXp,570);assert.equal(f.wallet().xpGun.xp,90);assert(f.wallet().dmRewardVersion>1);assert(a.yo,'returns wallet for the client');
 assert(f.extra.has('s1|mission_daily_claim:2026-10-21'));
 const b=await f.daily();assert.equal(b.eklenen,0);assert.equal(f.wallet().altin,40,'second claim adds nothing');assert.equal(f.wallet().totalXp,570);
});
test('weekly: +100 gold and +120 XP once per week, keyed by Monday',async()=>{
 const f=fixture(done,{day:'2026-10-21'});const a=await f.weekly();assert.equal(a.eklenen,100);assert.equal(a.xp,120);assert.equal(f.wallet().altin,110);assert.equal(f.wallet().totalXp,620);
 assert(f.extra.has('s1|mission_weekly_claim:2026-10-19'));
 const b=await f.weekly();assert.equal(b.eklenen,0);assert.equal(f.wallet().altin,110);
 const d=await f.daily();assert.equal(d.eklenen,30,'daily and weekly are independent');
});
test('a stale xpGun from another day restarts today\'s XP count',async()=>{
 const f=fixture(done,{day:'2026-10-22'});await f.daily();assert.deepEqual({...f.wallet().xpGun},{tarih:'2026-10-22',xp:70});
});
test('a failed credit releases the claim so the child can retry',async()=>{
 const f=fixture(done,{failCredit:true});const r=await f.daily();assert.equal(r.ok,false);assert.deepEqual(f.deleted,['mission_daily_claim:2026-10-21']);assert.equal(f.extra.size,0);
});
