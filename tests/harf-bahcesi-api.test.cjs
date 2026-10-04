const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
const ts=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/index.ts','utf8');
function fixture(prior=false){
 const writes=[];let found=prior;
 const db={from(table){return {select(){return this},eq(){return this},contains(){return this},limit(){return Promise.resolve({data:found?[{id:'score'}]:[],error:null})},async insert(row){writes.push({table,row});if(table==='game_scores')found=true;return {error:null};}}}};
 const ctx={DijiScoreRules:require('../ingilizce/score-rules.js'),supabase:db,hedefOgrenci:async a=>a.student_id?{id:a.student_id,username:'Actual actor'}:null,num:n=>Number(n)||0,temizMetin:(s,n)=>String(s||'').slice(0,n),json:(d,status=200)=>({d,status}),bulunamadi:()=>({status:404}),Set,Date};vm.createContext(ctx);
 const block=ts.slice(ts.indexOf('const leaderboardKey:'),ts.indexOf('// [v3.5]'));
 vm.runInContext(stripTypeScriptTypes(block,{mode:'transform'})+'\nconst ADIL_OYUNLAR=new Set(["harfbahcesi"]);globalThis.save=leaderboardSave;',ctx);
 return {save:b=>ctx.save('harfBahcesiLiderlikKaydet',b,{student_id:'signed-in-actor'}),writes};
}
const body={runId:'12345678-1234-4234-8234-123456789012',isim:'Other account',puan:100000,dogru:8,yanlis:0,suresaniye:42,puanSurum:2,sinif:'3. Sınıf',unite:'1. Ünite'};
test('new game binds score to authenticated actor, caps score and records one feed event',async()=>{const f=fixture();assert.equal((await f.save(body)).status,200);assert.equal(f.writes[0].row.student_id,'signed-in-actor');assert.equal(f.writes[0].row.student_name,'Actual actor');assert.equal(f.writes[0].row.game_key,'harfbahcesi');assert.equal(f.writes[0].row.score,1000);assert.equal(f.writes[0].row.extra.run_id,body.runId);assert.equal(f.writes.length,2);});
test('retry of same saved run creates neither another score nor another feed event',async()=>{const f=fixture();await f.save(body);await f.save(body);assert.equal(f.writes.length,2);});
test('missing or malformed run identifier fails without writing',async()=>{const f=fixture();assert.equal((await f.save({...body,runId:''})).status,400);assert.equal(f.writes.length,0);});

test('new scoring recalculates above 1000 from validated fields and keeps decimal seconds as integer storage',async()=>{const f=fixture();const r=await f.save({...body,puanSurum:3,puanTemel:1000,suresaniye:25.25});assert.equal(r.status,200);assert(f.writes[0].row.score>1000);assert.equal(f.writes[0].row.extra.v,3);assert.equal(f.writes[0].row.duration_seconds,25);assert.equal(f.writes[0].row.score,require('../ingilizce/score-rules.js').calculate({base:1000,correct:8,wrong:0,seconds:25.25}).puan);});
test('invalid scoring fields cannot write a v3 score',async()=>{for(const patch of [{suresaniye:0},{dogru:99},{puanTemel:99999},{yanlis:-1},{suresaniye:'bad'}]){const f=fixture();assert.equal((await f.save({...body,puanSurum:3,puanTemel:1000,...patch})).status,400);assert.equal(f.writes.length,0);}});
