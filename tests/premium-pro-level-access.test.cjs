const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/progression-ui.js','utf8'),C=require('../ingilizce/progression-catalog.js');
async function fixture(){
 const dom=new JSDOM('<body><button id="duo" data-dm-level-lock="iki_kisilik">Arkadaşlarla oyna</button></body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let early=false,requests=0,picks=[];w.aktifOgrenciAdi='Fixture';w.yo={totalXp:0,karakter:{sahip:[]}};w.yoHazirMi=()=>true;w.apiURL='/api';w.DijiProgressionCatalog=C;w.DijiProgressRules={progress:()=>({level:1}),migrate:x=>x};w.requestAnimationFrame=()=>0;w.setInterval=()=>0;w.setTimeout=()=>0;w.DMSatis={planlar:(...a)=>picks.push(a)};
 w.fetch=async()=>{requests++;return {ok:true,json:async()=>({ok:true,level:1,levelEarlyAccess:early,lessons:{}})}};
 await new Promise(r=>w.addEventListener('load',r,{once:true}));w.eval(source);await w.dmProgression.refresh(true);
 return {w,dom,picks,get requests(){return requests},async access(value){early=value;await w.dmProgression.refresh(true)},close(){dom.window.close()}};
}
test('level warning offers Premium Pro, selects that plan and preserves the free earned-level route',async()=>{
 const f=await fixture();assert.equal(f.w.dmProgression.require('iki_kisilik'),false);const d=f.w.document.querySelector('#dmLevelAccess');assert.match(d.textContent,/30. seviyede açılır/);d.querySelector('[data-early-plan]').click();assert.deepEqual(f.picks,[['seviye-kilidi','premium_pro']]);assert.equal(f.w.document.querySelector('#dmLevelAccess'),null);f.close();
});
test('only the server flag opens all feature and category entries; account changes and expiry remove access',async()=>{
 const f=await fixture();f.w.dmAndroidPlan={plan:'pro'};assert.equal(f.w.dmProgression.allowed('iki_kisilik'),false);
 f.w.dmAndroidPlan={plan:'premium_pro'};assert.equal(f.w.dmProgression.allowed('iki_kisilik'),false,'unverified browser plan cannot grant early access');
 await f.access(true);for(const code of Object.keys(C.gates))assert.equal(f.w.dmProgression.allowed(code),true,code);assert.equal(f.w.dmProgression.level(),1);
 const before=f.requests;f.w.document.querySelector('#duo').click();assert.equal(f.w.document.querySelector('#dmLevelAccess'),null);assert.equal(f.requests,before,'clicks do not add server polls');
 f.w.aktifOgrenciAdi='Other';assert.equal(f.w.dmProgression.earlyAccess(),false);f.w.aktifOgrenciAdi='Fixture';await f.access(false);assert.equal(f.w.dmProgression.allowed('iki_kisilik'),false);f.close();
});
test('purchase event refreshes server access and keyboard Escape closes the warning',async()=>{
 const f=await fixture();f.w.dmProgression.require('hazir_mesaj');const dialog=f.w.document.querySelector('#dmLevelAccess');dialog.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(f.w.document.querySelector('#dmLevelAccess'),null);
 const before=f.requests;f.w.dispatchEvent(new f.w.Event('dm:plan'));await new Promise(r=>setTimeout(r,0));assert(f.requests>before);f.close();
});
test('package comparison gives early access exclusively to student Premium Pro',()=>{
 const s=fs.readFileSync('ingilizce/dm-satis.js','utf8');assert(s.includes("['🔓 Seviyeyle açılan özellikler', 'Seviyene göre', 'Seviyene göre', 'Hemen açık']"));
 const migration=fs.readFileSync('supabase/migrations/20261113142541_premium_pro_level_access.sql','utf8');assert(migration.includes("public.dm_plan(actor,'student')='premium_pro'"));assert(!migration.includes('CREATE OR REPLACE FUNCTION public.dm_student_level'));assert(migration.includes("'levelEarlyAccess',public.dm_level_early_access(actor),'level',l"));
});
