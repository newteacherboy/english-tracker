const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ingilizce/index.html','utf8');
const anchor=html.indexOf('HAFTALIK HEDEF',html.indexOf('GÖREVLER'));
const start=html.lastIndexOf('  function haftaKodu()',html.indexOf('  function hedefKontrol() {',anchor));
const end=html.indexOf('  /* =========================================================\n     BECERİ RADARI SVG',start);
assert(start>0&&end>start,'weekly goal block exists');
const source=html.slice(start,end);
const sql=fs.readFileSync('supabase/migrations/20261014_weekly_target_one_time_claim.sql','utf8');
const clientApi=fs.readFileSync('supabase/functions/diji-api/progression-api.ts','utf8');
function fixture({reward=true,already=false,xp=1500}={}){
 const week=new Date(Date.now()+3*3600000);week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);
 const h=week.toISOString().slice(0,10);const calls=[],shows=[],state={haftaHedef:{h,xp:1500,odul:0},altin:200,rozetler:[]};
 const sandbox={yo:state,yoVar:()=>state,yoKaydet:()=>{},bugun:()=>h,
  activeStudent:'learner',aktifOgrenciAdi:'learner',apiURL:'/api',
  window:{dmProgression:{allowed:()=>true},dmWeeklyXp:()=>xp},
  odulGoster:x=>shows.push(x),console:{warn:()=>{}},
  fetch:async(url,opts)=>{
   calls.push(JSON.parse(opts.body));
   return {ok:true,json:async()=>already
    ? {ok:true,duplicate:true,newlyAwarded:false,awardedGold:0,altin:200,haftaHedef:{h,xp:1500,odul:1}}
    : {ok:true,duplicate:false,newlyAwarded:true,awardedGold:75,altin:275,haftaHedef:{h,xp:1500,odul:1},yo:{dmRewardVersion:100,guncelleme:100}}};
  },
 };
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {sandbox,calls,shows,state,claim:()=>vm.runInContext('hedefKontrol()',sandbox)};
}
test('one completed goal only makes one server claim, re-render and repeated checks pay nothing',async()=>{
 const f=fixture();await Promise.all([f.claim(),f.claim(),f.claim()]);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].islem,'haftalikHedefOdulAl');
 assert.equal(f.state.altin,275);
 assert.equal(f.state.haftaHedef.odul,1);
 assert.equal(f.shows.length,1);
 await f.claim();assert.equal(f.calls.length,1);
});
test('server duplicate after reload marks goal as claimed without awarding or celebration',async()=>{
 const f=fixture({already:true});await f.claim();
 assert.equal(f.calls.length,1);assert.equal(f.state.altin,200);
 assert.equal(f.state.haftaHedef.odul,1);assert.equal(f.shows.length,0);
});
test('incomplete goal never requests a reward',async()=>{const f=fixture({xp:300});await f.claim();assert.equal(f.calls.length,0)});
test('backend has separate atomic target claim and reward key, client no longer grants via yoXpEkle',()=>{
 assert.match(clientApi,/haftalikHedefOdulAl/);
 assert.match(clientApi,/dm_weekly_target_claim/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/dm_progress_rewards\(student_id,kind,reward_key,gold\)/);
 assert.match(sql,/kind='weekly_target' and reward_key=week_code/);
 assert.doesNotMatch(source,/yoXpEkle\(/);
});
