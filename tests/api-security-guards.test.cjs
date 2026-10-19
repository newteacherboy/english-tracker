const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const security=()=>import(pathToFileURL(require('node:path').resolve('supabase/functions/diji-api/security-guards.mjs')).href);
test('valid small request parses; no-body GET keeps defaults',async()=>{
 const s=await security();
 assert.deepEqual(await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:'{"islem":"giris","ogrenci":"test"}'})),{ok:true,data:{islem:'giris',ogrenci:'test'}});
 assert.deepEqual(await s.readJsonBounded(new Request('https://example.test/')),{ok:true,data:{}});
});
test('reject invalid JSON, arrays, primitives and empty payload',async()=>{
 const s=await security();
 for(const str of ['[1,2]', 'null','5','""','{oops','']){
  const r=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:str}));
  assert.equal(r.ok,false,str);
  assert.equal(r.status,400,str);
 }
});
test('reject streaming request above limit even without content-length',async()=>{
 const s=await security();
 const body=new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array(40));
  controller.enqueue(new Uint8Array(40));
  controller.close();
 }});
 const r=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body,duplex:'half'}),64);
 assert.equal(r.ok,false);assert.equal(r.status,413);
 const tooLarge=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:'{"x":"abcdefghijklmnop"}'}),12);
 assert.equal(tooLarge.status,413);
});
test('sensitive account routes are throttled and benign reads remain available',async()=>{
 const s=await security();
 assert.equal(s.anonymousBudgets('seviyeDurumu','1.2.3.4','').length,0);
 assert.equal(s.anonymousBudgets('giris','1.2.3.4','student').length,2);
 assert.equal(s.anonymousBudgets('sifreSifirlamaIste','1.2.3.4','student').length,2);
 assert.equal(s.anonymousBudgets('googleGiris','1.2.3.4','').length,1);
 assert.equal(s.authenticatedBudgets('seviyeOyunOdulu','actor-123',{}).length,1);
 assert.equal(s.authenticatedBudgets('ekonomi','actor-123',{is:'parkurAdim'}).length,2);
 assert.equal(s.authenticatedBudgets('ekonomi','actor-123',{is:'durum'}).length,1);
});
test('API must validate session status, restrict oversized payload and forbid cached credentials',()=>{
 const content=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 assert(content.includes('student.status!=="approved"'));
 assert(content.includes('await readJsonBounded(req'));
 assert(content.includes('anonymousBudgets(op'));
 assert(content.includes('authenticatedBudgets(op'));
 assert(content.includes('"Cache-Control":"no-store"'));
 assert(content.includes('dm_security_rate_check'));
});

test('device saves cannot forge or erase reward authority, XP or paid daily goal',async()=>{
 const s=await security();
 const stored={totalXp:250,lig:{hafta:'2026-H42',xp:250},xpGun:{tarih:'2026-10-17',xp:50},log:{'2026-10-17':50},hedefOdul:'2026-10-17',dmRewardVersion:9,dmParkurMigration:{version:1},dmAltinGun:{altin:10}};
 const incoming={totalXp:999999,lig:{xp:999999},xpGun:{xp:99999},log:{},dmProgressProtocol:1,dmRewardVersion:999999,hedefOdul:'',dmParkurMigration:{version:8},karakter:{cins:'e'},hedef:30};
 const result=s.protectStudentState(incoming,stored,Date.parse('2026-10-17T12:00:00Z'));
 for(const key of Object.keys(stored))assert.deepEqual(result[key],stored[key],key);
 assert(!Object.hasOwn(result,'dmProgressProtocol'));
 assert.deepEqual(result.karakter,{cins:'e'});assert.equal(result.hedef,30);
 result.lig.xp=0;assert.equal(stored.lig.xp,250,'no alias into stored state');
 const first=s.protectStudentState(incoming,null);
 for(const key of Object.keys(stored))if(key!=='lig')assert(!Object.hasOwn(first,key),key+' absent in first device save');
 assert.equal(first.lig.xp,0);assert(first.guncelleme<9999999999999);
});
test('weekly reward metadata is reserved; learner-owned settings remain writable',async()=>{
 const s=await security();
 for(const key of ['weekly_target','yo_gunluk','puan_gorulen','energy_daily:2026-10-17','member_login:2026-10-19','streak_shield:2026-10-18','streak_free_shield:2026-10-13','progress_mail_consent_v1','mission_daily_claim:2026-10-19','mission_weekly_claim:2026-10-19'])assert(s.reservedStudentKey(key));
 for(const key of ['yo','bildirim_tercihi','notlar'])assert(!s.reservedStudentKey(key));
});
test('compatibility gold route ignores requested amount and pays daily goal once',async()=>{
 const s=await security(),source=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 const start=source.indexOf('    if (is === "altinKazan") {'),end=source.indexOf('    if (await denemeSay("ekonomi_alim"',start);
 const {stripTypeScriptTypes}=require('node:module');
 const code=stripTypeScriptTypes('async function gold(){'+source.slice(start,end)+'}',{mode:'transform'}).replace(/^async function gold\(\) \{/, '').replace(/\}\s*$/, '');
 const run=new Function('dailyGoalCredit','return async function(body,state){const sid="test",is="altinKazan",trBugun=()=>"2026-10-17",num=x=>Number(x)||0,ekonomiCevap=y=>({altin:y.altin}),json=x=>x,hataVer=x=>{throw Error(x)},ekonomiGuncelle=async(id,fn)=>({...fn(state),y:state});'+code+'}')(s.dailyGoalCredit);
 const state={altin:100,hedef:50,xpGun:{tarih:'2026-10-17',xp:49}};
 let r=await run({miktar:999999},state);assert.equal(r.eklenen,0);assert.equal(state.altin,100);
 state.xpGun.xp=50;r=await run({miktar:999999},state);assert.equal(r.eklenen,5);assert.equal(state.altin,105);
 r=await run({miktar:500},state);assert.equal(r.eklenen,0);assert.equal(state.altin,105);
 assert.equal(s.dailyGoalCredit({...state,hedefOdul:'',xpGun:{tarih:'2026-10-16',xp:10000}},'2026-10-17'),0);
});
test('secondary API shares bounded parsing and the same subject budget',()=>{
 const content=fs.readFileSync('supabase/functions/medupro-api/index.ts','utf8');
 assert(content.includes('await readJsonBounded(req)'));
 assert(content.includes('authenticatedBudgets(op,a.student_id,body)'));
 assert(content.includes("plan.scope+'|'+plan.value"));
 assert(content.includes('dm_security_rate_check'));
 assert(content.includes('"Cache-Control":"no-store"'));
});

test('league rolls over and reflects server-earned day logs without trusting device XP',async()=>{
 const s=await security(),now=Date.parse('2026-10-19T08:00:00Z');
 const result=s.protectStudentState({lig:{hafta:'fake',xp:999999},guncelleme:1e30},{lig:{hafta:'2026-H42',xp:500},log:{'2026-10-17':500,'2026-10-19':80},guncelleme:now-50},now);
 assert.equal(result.lig.hafta,'2026-H43');assert.equal(result.lig.xp,80);assert.equal(result.guncelleme,now);
});

test('both deploy packages have identical security rules and CAS timestamps always advance',()=>{
 assert.equal(fs.readFileSync('supabase/functions/diji-api/security-guards.mjs','utf8'),fs.readFileSync('supabase/functions/medupro-api/security-guards.mjs','utf8'));
 const src=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 assert(src.includes("(Date.parse(satir?.updated_at||'')||0)+1"));
 assert(src.includes('value=protectStudentState(value,e2)'));
 assert(src.includes('reservedStudentKey(key)'));
});
