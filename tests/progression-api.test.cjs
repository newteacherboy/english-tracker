const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');
const C=require('../ingilizce/progression-catalog.js'),SP=require('../supabase/functions/diji-api/start-path.mjs'),SPA=require('../supabase/functions/diji-api/start-path-access.mjs');
function fixture(level=7){let ctx={level,feed:false,lessons:{A1:true,A2:false,B1:false,B2:false},units:[[210101,210201],[230101],[250101],[270101]],complete:[false,false,false,false],done:[],yo:{karakter:{cins:'k',s:{},sahip:[]}},owned:[]};const db={rpc:async(op,args)=>{if(op==='dm_verified_result'){ctx.verifiedArgs=args;if(ctx.noVerified)return {error:{message:'missing'}};return {data:{correct:6,wrong:3,seconds:80}};}if(['dm_game_reward_claim','dm_parkur_fair_claim','dm_parkur_fair_recover','dm_solo_fair_claim'].includes(op)){ctx.claim=args;ctx.rewardRpc=op;return {data:{ok:true,xp:50,gold:10,reason:'awarded'}};}return {data:ctx};},from:(table)=>{const f={};return {upsert:async(row)=>{ctx.weeklyTarget=structuredClone(row);return {error:null};},select(){return this},eq(k,v){f[k]=v;return this},maybeSingle:async()=>({data:table==='students'?{class_no:ctx.classNo??null}:table!=='extra_data'?null:f.key_name==='placement_start_v1'?(ctx.placement?{value:ctx.placement}:null):f.key_name==='learner_profile_v1'?(ctx.profile?{value:ctx.profile}:null):f.key_name==='start_point_v1'?(ctx.choice?{value:ctx.choice}:null):null}),limit:async()=>({data:table==='papi_story_progress'?(ctx.story||[]):ctx.noTopic?[]:[{id:'lesson'}]})};}};const scope={DijiProgressionCatalog:C,globalThis:null,items:JSON.parse(fs.readFileSync('supabase/functions/diji-api/progression-shop.json','utf8')),Intl,Date,Set,JSON};scope.globalThis=scope;vm.createContext(scope);let src=stripTypeScriptTypes(fs.readFileSync('supabase/functions/diji-api/progression-api.ts','utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace('export function','function');Object.assign(scope,SP,{loadStartPath:SPA.loadStartPath});vm.runInContext(src+';this.factory=progressionAPI',scope);return {api:scope.factory(db,(body,status=200)=>({body,status})),ctx};}
const student={role:'student',student_id:'trusted'};
test('level 7 server denies later games, store, social actions and forged state',async()=>{const {api,ctx}=fixture();for(const op of ['asmacaLiderlikKaydet','dikteLiderlikKaydet','enerjiGonder','hazirMesajGonder','duelloGonder','oyunEslesmeOlustur'])assert.equal((await api.guard(op,{},new URLSearchParams(),student)).status,403,op);assert.equal(await api.guard('hafizaLiderlikKaydet',{},new URLSearchParams(),student),null);assert.equal(await api.guard('akisTumu',{},new URLSearchParams(),student),null);ctx.feed=true;assert.equal(await api.guard('akisTumu',{},new URLSearchParams(),student),null);assert.equal((await api.guard('ekVeriKaydet',{anahtar:'yo',deger:{karakter:{cins:'k',s:{ust:'fake'},sahip:['d:fake']}}},new URLSearchParams(),student)).status,403);});
test('lessons are open at level one without previous CEFR completion, but only for published topics and valid levels',async()=>{const {api,ctx}=fixture(1);for(const code of ['A1','A2','B1','B2'])assert.equal(await api.guard('dersKonuDetayGetir',{seviye:code,kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student),null,code);assert.equal((await api.guard('dersKonuDetayGetir',{seviye:'C1',kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student)).status,403);ctx.noTopic=true;assert.equal((await api.guard('dersKonuDetayGetir',{seviye:'B2',kategori:'Grammar',konu:'Missing'},new URLSearchParams(),student)).status,403);});
test('legacy accounts keep every parkur door open; completion still needs a verified pass',async()=>{const {api,ctx}=fixture(1);assert.equal((await api.guard('buyuSeviyeTamamla',{seviyeNo:1301},new URLSearchParams(),student)).status,403,'No completion without a verified pass');ctx.done=[230101];assert.equal(await api.guard('buyuSeviyeTamamla',{seviyeNo:1301},new URLSearchParams(),student),null,'Door 2 opens without level 10 or door 1');ctx.done=[270101];assert.equal(await api.guard('buyuSeviyeTamamla',{seviyeNo:1701},new URLSearchParams(),student),null,'Door 4 opens at level 1');});
const schoolProfile=(extra={})=>({version:1,purpose:'school',ageBand:'under13',educationStage:'primary',goal:'school',startChoice:'new',knownLevel:'A1',...extra});
test('a class-3 learner starts at class 3: lower classes open, class 4+ and A2 lessons locked until class 3 is finished',async()=>{const {api,ctx}=fixture(1);ctx.profile=schoolProfile();ctx.classNo=3;ctx.units=[[210101,210201],[230101,230102,240101],[250101],[270101]];const state=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.deepEqual([state.startPath.startGrade,state.startPath.maxGrade,state.startPath.maxCefr],[3,3,'A1']);assert.deepEqual(state.studyAccess,{A1:true,A2:false,B1:false,B2:false});const play=no=>api.handle('seviyeOyunOdulu',{game:'ba',classNo:Math.floor((no-200000)/10000),units:[Math.floor(no%10000/100)],stopNo:no,runId:'r'+no},new URLSearchParams(),student);assert.notEqual((await play(230101)).status,403,'own class opens at its first stop');assert.notEqual((await play(210101)).status,403,'lower class is open');assert.notEqual((await play(210201)).status,403,'every stop of a lower class is open, in any order');assert.equal((await play(230102)).status,403,'inside a class stops stay in order');assert.equal((await play(240101)).status,403,'class 4 is locked');assert.equal((await play(250101)).status,403);assert.equal((await api.guard('dersKonuDetayGetir',{seviye:'A2',kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student)).status,403);ctx.done=[230101,230102];assert.notEqual((await play(240101)).status,403,'finishing class 3 opens class 4');assert.equal((await play(250101)).status,403,'class 5 is still locked');});
test('class 5 opens A2 lessons; a known-B1 adult gets every class and B1 but not B2; lessons promote the next level',async()=>{let {api,ctx}=fixture(1);ctx.profile=schoolProfile({educationStage:'middle'});ctx.classNo=5;let s=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.deepEqual(s.studyAccess,{A1:true,A2:true,B1:false,B2:false});({api,ctx}=fixture(1));ctx.profile={version:1,purpose:'independent',ageBand:'adult',educationStage:'',goal:'daily',startChoice:'known',knownLevel:'B1'};s=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.deepEqual([s.startPath.startCefr,s.startPath.maxCefr,s.startPath.maxGrade],['B1','B1',8]);assert.equal(await api.guard('dersKonuDetayGetir',{seviye:'B1',kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student),null);assert.equal((await api.guard('dersKonuDetayGetir',{seviye:'B2',kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student)).status,403);ctx.lessons.B2=true;assert.equal(await api.guard('dersKonuDetayGetir',{seviye:'B2',kategori:'Grammar',konu:'Topic'},new URLSearchParams(),student),null,'finishing every B1 test opens B2');});
test('test takers open up to their result and may start lower; skipping the test means A1',async()=>{let {api,ctx}=fixture(1);ctx.profile={version:1,purpose:'independent',ageBand:'adult',educationStage:'',goal:'daily',startChoice:'test',knownLevel:'A1'};let s=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.deepEqual([s.startPath.startCefr,s.startPath.maxCefr,s.startPath.maxGrade],['A1','A1',4]);ctx.placement={version:'starting-point-20261018-v1',total:24,level:'B1',completedAt:new Date().toISOString()};ctx.choice={level:'A2'};s=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.deepEqual([s.startPath.startCefr,s.startPath.maxCefr,s.startPath.maxGrade],['A2','B1',8]);ctx.choice={level:'B2'};s=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;assert.equal(s.startPath.startCefr,'B1','a forged start above the result is ignored');});
test('40 level names, next features, joker quotas and shop boundaries',()=>{assert.equal(C.levels.length,40);assert(C.levels.every(x=>x.name&&x.benefits.length));assert.deepEqual([14,15,19,20,29,30,40].map(C.quota),[0,1,1,2,2,3,3]);assert.equal(C.itemLevel({kat:'ust',tip:'tisort',sv:'temel'}),15);assert.equal(C.itemLevel({kat:'ust',tip:'sweat',sv:'ozel'}),25);assert.equal(C.itemLevel({kat:'bas',sv:'temel'}),32);assert.equal(C.itemLevel({parca:[]}),35);assert.equal(C.gates.oyun_yagmur,28);assert.equal(C.gold(40),100);});
test('existing inventory is accepted intact, new ownership uses atomic purchase only',async()=>{const {api,ctx}=fixture(15);ctx.yo.karakter.sahip=['d:owned'];const body={anahtar:'yo',deger:JSON.stringify(ctx.yo)};assert.equal(await api.guard('ekVeriKaydet',body,new URLSearchParams(),student),null);body.deger=JSON.stringify({...ctx.yo,karakter:{...ctx.yo.karakter,sahip:['d:owned','d:forged']}});assert.equal((await api.guard('ekVeriKaydet',body,new URLSearchParams(),student)).status,403);});
test('frontend and both API catalogs remain identical',()=>{const a=fs.readFileSync('ingilizce/progression-catalog.js');for(const dir of ['diji-api','medupro-api'])assert.deepEqual(a,fs.readFileSync('supabase/functions/'+dir+'/progression-catalog.js'));});

test('MeduPro word-mode routes enforce level 10 on the server',async()=>{const {api,ctx}=fixture(2);for(const op of ['konusmaSeviyeIlerlemeGetir','konusmaSeviyeTamamla','konusmaLiderlikKaydet'])assert.equal((await api.guard(op,{},new URLSearchParams(),student)).status,403);ctx.level=10;assert.equal(await api.guard('konusmaSeviyeIlerlemeGetir',{},new URLSearchParams(),student),null);});

test('reward claims reject locked games and anonymous sessions',async()=>{const {api}=fixture(7);assert.equal((await api.handle('seviyeOyunOdulu',{game:'dikte'},new URLSearchParams(),student)).status,403);assert.equal((await api.handle('seviyeOyunOdulu',{game:'ky'},new URLSearchParams(),null)).status,401);});

test('level one saves and reloads a weekly target without the retired level gate',async()=>{const {api,ctx}=fixture(1);const target={h:'2026-10-05',xp:1500,odul:0};const value={...ctx.yo,haftaHedef:target};assert.equal(await api.guard('ekVeriKaydet',{anahtar:'yo',deger:JSON.stringify(value)},new URLSearchParams(),student),null);ctx.yo=JSON.parse(JSON.stringify(value));assert.equal(ctx.yo.haftaHedef.xp,1500);assert.equal(await api.guard('ekVeriKaydet',{anahtar:'yo',deger:JSON.stringify({...ctx.yo,haftaHedef:{...target,xp:2500}})},new URLSearchParams(),student),null);});

test('weekly target uses the atomic target RPC and validates the session and choice',async()=>{const {api}=fixture(1);const src=fs.readFileSync('supabase/functions/diji-api/progression-api.ts','utf8');assert(src.includes("db.rpc('dm_weekly_target_select'"));assert.equal((await api.handle('haftalikHedefSec',{xp:1500},new URLSearchParams(),null)).status,401);assert.equal((await api.handle('haftalikHedefSec',{xp:9},new URLSearchParams(),student)).status,400);const sql=fs.readFileSync('supabase/migrations/20261014_weekly_target_one_time_claim.sql','utf8');assert(sql.includes("values(actor,'weekly_target',goal"));assert(sql.includes('pg_advisory_xact_lock'));});


test('12-question claims reach the reward RPC, parkur sections have independent identities',async()=>{const {api,ctx}=fixture(40),q=new URLSearchParams();const base={game:'ky',runId:'twelve-question-test',classNo:1,units:[1],correct:12,wrong:0,seconds:30};assert.equal((await api.handle('seviyeOyunOdulu',base,q,student)).body.ok,true);assert.equal(ctx.claim.right_count,6);assert.equal(ctx.claim.duration_seconds,80);assert.equal(ctx.rewardRpc,'dm_solo_fair_claim');ctx.units[0]=[210101,210102];ctx.done=[210101];assert.equal((await api.handle('seviyeOyunOdulu',{...base,game:'ba',stopNo:210102,firstClear:true},q,student)).body.ok,true);assert.equal(ctx.claim.stop_no,210102);assert.equal((await api.handle('seviyeOyunOdulu',{...base,game:'ba',stopNo:220102},q,student)).status,403);ctx.done=[];assert.equal((await api.handle('seviyeOyunOdulu',{...base,game:'ba',stopNo:210102},q,student)).status,403);assert.equal((await api.handle('seviyeOyunOdulu',{...base,game:'ba'},q,student)).body.ok,true);assert.equal(ctx.claim.stop_no,210101);});

test('every gender and category starts with at least three real affordable catalog choices',()=>{
 const items=JSON.parse(fs.readFileSync('supabase/functions/diji-api/progression-shop.json','utf8'));
 for(const c of ['e','k']){const groups={};for(const o of items.filter(o=>C.compatible(o,c)))(groups[o.parca?'kombin':o.kat]||=[]).push(o);for(const [cat,list] of Object.entries(groups)){if(cat==='durus')continue;assert(list.filter(o=>C.itemLevel(o)===1).length>=Math.min(3,list.length),c+' '+cat);assert(list.filter(o=>C.itemLevel(o)===1).length<=3,c+' '+cat+' starter cap');if(list.length>3)assert(list.some(o=>C.itemLevel(o)>1),c+' '+cat+' has leveled products');}}
 assert.equal(items.filter(o=>o.tip==='kahraman'&&!o.legendary).length,6);
 assert.equal(C.compatible(items.find(o=>o.id==='k:Işık Kanadı-k'),'e'),false);
 assert.equal(C.gates.karakter,1);assert.equal(C.gates.magaza,1);
});
test('level one saves starter looks and gender changes, but cannot equip unpaid or later items',async()=>{
 const {api,ctx}=fixture(1),q=new URLSearchParams();
 let next={karakter:{cins:'k',s:{sac:'uzun',kiyafet:'tisort-mor'},sahip:[]}};
 assert.equal(await api.guard('ekVeriKaydet',{anahtar:'yo',deger:next},q,student),null);
 next={karakter:{cins:'e',s:{sac:'kisa',kiyafet:'tisort-mavi'},sahip:[]}};
 assert.equal(await api.guard('ekVeriKaydet',{anahtar:'yo',deger:next},q,student),null);
 next.karakter.s.ust='u:tisort:#a78bfa:duz';
 assert.equal((await api.guard('ekVeriKaydet',{anahtar:'yo',deger:next},q,student)).status,403);
 ctx.yo.karakter.sahip=['d:u:tisort:#a78bfa:duz'];next.karakter.sahip=ctx.yo.karakter.sahip;
 assert.equal(await api.guard('ekVeriKaydet',{anahtar:'yo',deger:next},q,student),null);
 next.karakter.s.bas='b:klasik:#a78bfa:duz';
 assert.equal((await api.guard('ekVeriKaydet',{anahtar:'yo',deger:next},q,student)).status,403);
});

test('pose saves allow free gestures, reject unearned levels, unpaid gestures and forged ownership',async()=>{
 const {api,ctx}=fixture(1),q=new URLSearchParams();const save=(id,owned=[])=>api.guard('ekVeriKaydet',{anahtar:'yo',deger:{karakter:{cins:'k',s:{durus:id},sahip:owned}}},q,student);
 for(const id of ['dik','sol','sag','rahat','selam'])assert.equal(await save(id),null);
 assert.equal((await save('zafer')).status,403);ctx.level=40;assert.equal((await save('zafer')).status,403);assert.equal((await save('zafer',['durus:zafer'])).status,403);
 ctx.yo.karakter.sahip=['durus:zafer'];assert.equal(await save('zafer',['durus:zafer']),null);assert.equal((await save('made-up',['durus:zafer'])).status,403);
});

test('main Parkur fair protocol uses recorded-answer claim and authenticated recovery endpoint',async()=>{
 const {api,ctx}=fixture(1),body={game:'ba',fairProtocol:2,classNo:1,units:[1],stopNo:210101,runId:'parkurfairfixture0001',correct:12,wrong:0,seconds:123};
 const result=await api.handle('seviyeOyunOdulu',body,new URLSearchParams(),student);
 assert.equal(result.body.ok,true);
 assert.equal(ctx.rewardRpc,'dm_parkur_fair_claim');assert.equal(result.body.stopGiftGold,0);
 assert.equal(ctx.claim.stop_no,210101);
 assert(!Object.hasOwn(ctx.claim,'correct'),'Browser-reported correctness must not reach fair reward RPC');
 const recover=await api.handle('seviyeParkurPekistirme',{
   runId:body.runId,stopNo:210101,classNo:1,step:0,answer:'hello'
 },new URLSearchParams(),student);
 assert.equal(recover.body.ok,true);
 assert.equal(ctx.rewardRpc,'dm_parkur_fair_recover');
 assert.equal(ctx.claim.actor,'trusted');
 assert.equal(ctx.claim.selected,'hello');
 assert.equal((await api.handle('seviyeParkurPekistirme',{stopNo:210201,classNo:2},new URLSearchParams(),student)).status,403);
 assert.equal((await api.handle('seviyeParkurPekistirme',{stopNo:210101,classNo:1},new URLSearchParams(),null)).status,401);
});
test('old solo games keep their existing entry but use adaptive fair rewards',async()=>{
 const {api,ctx}=fixture(7),body={game:'ky',classNo:1,units:[1],runId:'oldgamefixture12345',correct:3,wrong:2,seconds:60};
 const r=await api.handle('seviyeOyunOdulu',body,new URLSearchParams(),student);
 assert.equal(r.body.ok,true);
 assert.equal(ctx.rewardRpc,'dm_solo_fair_claim');assert.equal(ctx.claim.right_count,6);assert.equal(ctx.claim.wrong_count,3);
});

test('obsolete parkur clients cannot bypass first-answer accounting',async()=>{
 const {api,ctx}=fixture(1);
 const r=await api.handle('seviyeOyunOdulu',{
   game:'ba',classNo:1,units:[1],stopNo:210101,runId:'legacy-parkur-claim-123456',correct:12,wrong:0,seconds:90
 },new URLSearchParams(),student);
 assert.equal(r.body.ok,true);
 assert.equal(ctx.rewardRpc,'dm_parkur_fair_claim');
 assert(!Object.hasOwn(ctx.claim,'correct'));
});

test('every solo vocabulary game routes to the same genre-aware ledger while parkur stays separate',async()=>{
 const {api,ctx}=fixture(40);
 for(const game of ['ky','jp','bosluk','hafiza','yagmur','asmaca','kelimebul','eslestirme','tren','dikte','cumle','harfbahcesi','kp']){
  const input={game,classNo:1,units:[1],runId:'all-games-fair-'+game,correct:6,wrong:3,seconds:80,boost:2};
  const response=await api.handle('seviyeOyunOdulu',input,new URLSearchParams(),student);
  assert.equal(response.body.ok,true,game);
  assert.equal(ctx.rewardRpc,'dm_solo_fair_claim',game);
  assert.equal(ctx.claim.game_code,game);
  assert.equal(ctx.claim.right_count,6);
  assert.equal(ctx.claim.wrong_count,3);
 }
});

test('reward request cannot create counters without an authenticated verified session',async()=>{const {api,ctx}=fixture(40);ctx.noVerified=true;const r=await api.handle('seviyeOyunOdulu',{game:'ky',classNo:2,units:[1],runId:'fake-run-12345678',correct:32,wrong:0,seconds:.01},new URLSearchParams(),student);assert.equal(r.status,409);assert.equal(ctx.claim,undefined);});

test('level one can browse the friends feed while social actions remain gated',async()=>{const {api}=fixture(1);assert.equal(await api.guard('akisTumu',{},new URLSearchParams(),student),null);assert.equal((await api.guard('akisOlayToggle',{tur:'takip'},new URLSearchParams(),student)).status,403);});

test('study access is open for every CEFR level regardless of placement, without granting games, XP or gold',async()=>{for(const placement of [undefined,{version:'starting-point-20261018-v1',total:24,level:'A1',completedAt:new Date().toISOString()}]){const {api,ctx}=fixture(1);ctx.placement=placement;const before=JSON.stringify(ctx.yo),state=(await api.handle('seviyeDurumu',{},new URLSearchParams(),student)).body;for(const code of ['A1','A2','B1','B2'])assert.equal(state.studyAccess[code],true,code);assert.equal((await api.guard('asmacaLiderlikKaydet',{},new URLSearchParams(),student)).status,403,'Open lessons must not unlock games');assert.equal(JSON.stringify(ctx.yo),before,'No XP, gold or completion grants');}});
test('parkur reward checks no longer require level or previous door but still require a matching stop',async()=>{const {api,ctx}=fixture(3);const ok=await api.handle('seviyeOyunOdulu',{game:'ba',classNo:7,units:[1],stopNo:270101,runId:'r1',correct:6,wrong:0,seconds:60},new URLSearchParams(),student);assert.notEqual(ok.status,403);const bad=await api.handle('seviyeOyunOdulu',{game:'ba',classNo:5,units:[1],stopNo:270101,runId:'r2'},new URLSearchParams(),student);assert.equal(bad.status,403);});

test('Efsaneler endpoint denies level 14 and forged level fields before reading ranking',async()=>{
 const {api}=fixture(14);
 for(const body of [{kapsam:'alltime'},{kapsam:'alltime',level:40,totalXp:999999}]){
  const result=await api.handle('seviyeLigListesi',body,new URLSearchParams(),student);
  assert.equal(result.status,403);assert.match(result.body.mesaj,/15/);
 }
 assert.equal((await api.handle('seviyeLigListesi',{kapsam:'alltime'},new URLSearchParams(),{})).status,401);
 assert.equal((await api.handle('seviyeLigListesi',{kapsam:'unknown'},new URLSearchParams(),student)).status,400);
});
