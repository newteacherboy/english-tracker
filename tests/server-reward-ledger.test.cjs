const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const src=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
const start=src.indexOf('    if (is === "odulTalep") {'),end=src.indexOf('    if (is === "gunlukGorevOdul" || is === "haftalikGorevOdul") {',start);
assert(start>0&&end>start,'ledger block present');
const block=stripTypeScriptTypes('async function run(is,sid,body){'+src.slice(start,end)+'return null;}',{mode:'transform'});
function fixture(day='2026-10-19',active=true){
 let wallet={altin:10,totalXp:100,xpGun:{tarih:day,xp:0},guncelleme:1};const env={bugunOgrendiMi:async()=>active,num:(v,f=0)=>{const n=Number(v);return Number.isFinite(n)?n:f;},trBugun:()=>day,json:d=>d,hataVer:(m,c=400)=>({ok:false,mesaj:m,code:c}),
  temizMetin:(v,max)=>String(v).slice(0,max),ekonomiCevap:y=>({altin:y.altin}),yoOku:async()=>({y:structuredClone(wallet)}),
  ekonomiGuncelle:async(sid,fn)=>{const y=structuredClone(wallet);const r=fn(y);if(r&&(r.tekrar||r.sinir))return {...r,ok:true,y:wallet};wallet=y;return {...r,ok:true,y};}};
 const run=new Function(...Object.keys(env),block+';return run;')(...Object.values(env));
 return {claim:b=>run('odulTalep','s1',b),wallet:()=>wallet,setDay:d=>{day=d;}};
}
test('a general reward is written to the server wallet (gold and XP)',async()=>{
 const f=fixture();const r=await f.claim({neden:'genel',anahtar:'12',xp:10,altin:2});
 assert.equal(r.ok,true);assert.equal(r.eklenen,2);assert.equal(r.xp,10);assert.equal(f.wallet().altin,12);assert.equal(f.wallet().totalXp,110);assert.equal(f.wallet().xpGun.xp,10);assert(f.wallet().dmRewardVersion>1);assert(r.yo);
});
test('the same key never pays twice',async()=>{
 const f=fixture();await f.claim({neden:'genel',anahtar:'v1',xp:10,altin:2});const again=await f.claim({neden:'genel',anahtar:'v1',xp:10,altin:2});
 assert.equal(again.eklenen,0);assert.equal(again.tekrar,true);assert.equal(f.wallet().altin,12);
});
test('amounts are capped per call and per day; unknown reasons fall into the general budget',async()=>{
 const f=fixture();const big=await f.claim({xp:9999,altin:9999});assert.equal(big.xp,20);assert.equal(big.eklenen,5);
 const g=fixture();for(let i=0;i<5;i++)await g.claim({neden:'genel',xp:20,altin:5});const sixth=await g.claim({neden:'genel',xp:20,altin:5});
 assert.equal(sixth.sinir,true);assert.equal(g.wallet().altin,35);
 const h=fixture();const u=await h.claim({neden:'bilinmeyen_hile',xp:500,altin:500});assert.equal(u.xp,20);assert.equal(u.eklenen,5);
});
test('client-declared reasons that the server cannot verify pay nothing',async()=>{
 for(const neden of ['oyun_sonu','sohbet','ders_tekrar','lig','enerji_altin','etkinlik','video','kombo','duello','seviye_bonus','sana_ozel_gunluk']){
  const f=fixture();const r=await f.claim({neden,anahtar:'k',xp:150,altin:30});
  assert.equal(r.eklenen,0,neden);assert.equal(r.xp,0,neden);assert.equal(r.kapali,true,neden);assert.equal(f.wallet().altin,10,neden);
 }
});
test('no verified learning activity today means no general reward',async()=>{
 const f=fixture('2026-10-19',false);const r=await f.claim({neden:'genel',xp:20,altin:5});
 assert.equal(r.eklenen,0);assert.equal(r.etkinlikYok,true);assert.equal(f.wallet().altin,10);
});
test('negative or zero amounts change nothing',async()=>{
 const f=fixture();const r=await f.claim({neden:'genel',xp:-50,altin:-5});assert.equal(r.eklenen,0);assert.equal(f.wallet().altin,10);assert.equal(f.wallet().totalXp,100);
});
test('daily counters reset on a new day',async()=>{
 const f=fixture('2026-10-19');for(let i=0;i<5;i++)await f.claim({neden:'genel',xp:20,altin:5});
 f.setDay('2026-10-20');const r=await f.claim({neden:'genel',anahtar:'d2',xp:20,altin:5});assert.equal(r.xp,20);assert.equal(f.wallet().xpGun.tarih,'2026-10-20');assert.equal(f.wallet().xpGun.xp,20);
});
