'use strict';
require('./_index-source.cjs');
const assert=require('node:assert/strict'),{test}=require('node:test');
const fs=require('node:fs');
const mod=require('../ingilizce/holiday-splashes/splash.js');
const calendar=JSON.parse(fs.readFileSync('ingilizce/holiday-splashes/dates.json','utf8'));
const date='2026-10-30T10:00:00+03:00';
test('calendar default remains automatic and special 2026 artwork stays live',()=>{
 assert.equal(mod.prefResolve(date,calendar,{mode:'auto',disabled:[]}).file,'29-ekim-2.jpg');
});
test('normal Papi disables all special-day art',()=>{
 assert.equal(mod.prefResolve(date,calendar,{mode:'normal',disabled:[]}),null);
});
test('holiday-specific disable overrides only selected automatic holiday',()=>{
 assert.equal(mod.prefResolve(date,calendar,{mode:'auto',disabled:['29-ekim']}),null);
 assert.equal(mod.prefResolve('2027-04-23T12:00:00+03:00',calendar,{mode:'auto',disabled:['29-ekim']}).id,'23-nisan');
});
test('teacher owner can choose a different valid special art',()=>{
 const r=mod.prefResolve(date,calendar,{mode:'manual',disabled:[],manual:{id:'10-kasim',file:'10-kasim-2.jpg'}});
 assert.equal(r.file,'10-kasim-2.jpg');
 assert.equal(mod.prefResolve(date,calendar,{mode:'manual',disabled:[],manual:{id:'10-kasim',file:'../../index.html'}}),null);
});
test('teacher modal is limited to the owner account in the user interface',()=>{
 const s=fs.readFileSync('ingilizce/teacher-splash-control.js','utf8');
 assert(s.includes("teacher()?.name==='teacher'"));
 assert(s.includes("teacherToken:teacher()?.teacherToken"));
 assert(s.includes('data-dm-splash-open'));
});
test('backend requires server-validated teacher owner and restricts allowed art',()=>{
 const s=fs.readFileSync('supabase/functions/splash-settings/index.ts','utf8');
 assert(s.includes("islem:'teacherPortalList'"));
 assert(s.includes('!Array.isArray(verified.items)'));
 assert(s.includes('variants[manual.id].includes(manual.file)'));
});
test('legacy 24 Kasım artwork stays manually selectable',()=>{
 const r=mod.prefResolve(date,calendar,{mode:'manual',disabled:[],manual:{id:'24-kasim',file:'24-kasim-1.jpg'}});
 assert.equal(r.file,'24-kasim-1.jpg');
 assert.ok(fs.existsSync('ingilizce/holiday-splashes/24-kasim-1.jpg'));
 assert.ok(!mod.holidays.some(h=>h.id==='24-kasim'));
 const b=fs.readFileSync('supabase/functions/splash-settings/index.ts','utf8');
 assert(b.includes("'24-kasim':['24-kasim-1.jpg']"));
});

test('Karanfil opens through 26 November in Istanbul and restores the Papi intro at midnight',()=>{
 const pref={mode:'manual',manual:{id:'papi-giris',file:'papi-giris-1.jpg'}};
 for(const [time,file] of [
  ['2026-11-20T20:59:59Z','papi-giris-1.jpg'],
  ['2026-11-20T21:00:00Z','24-kasim-karanfil-2026.webp'],
  ['2026-11-26T20:59:59Z','24-kasim-karanfil-2026.webp'],
  ['2026-11-26T21:00:00Z','papi-giris-1.jpg'],
  ['2027-11-24T12:00:00+03:00','papi-giris-1.jpg']
 ])assert.equal(mod.prefResolve(time,calendar,pref).file,file,time);
 assert.ok(fs.existsSync('ingilizce/holiday-splashes/24-kasim-karanfil-2026.webp'));
});

test('Zirve intro is a distinct manual option with approved local artwork and strict validation',()=>{
 const manual={id:'24-kasim-zirve',file:'24-kasim-zirve-1.svg'};
 assert.equal(mod.prefResolve(date,calendar,{mode:'manual',manual}).file,manual.file);
 assert.equal(mod.prefResolve(date,calendar,{mode:'manual',manual:{...manual,file:'other.svg'}}),null);
 assert.notEqual(mod.prefResolve('2026-11-24T12:00:00+03:00',calendar,{mode:'auto'})?.id,manual.id);
 assert.ok(fs.existsSync('ingilizce/holiday-splashes/'+manual.file));
 const server=fs.readFileSync('supabase/functions/splash-settings/index.ts','utf8');
 assert.ok(server.includes("'24-kasim-zirve':['24-kasim-zirve-1.svg']"));
 const admin=fs.readFileSync('ingilizce/teacher-splash-control.js','utf8');
 assert.ok(admin.includes("'24-kasim-zirve':[1]"));
 assert.ok(admin.includes('(?:jpg|svg)'));
});
test('Zirve opening defers boot completion until Continue is explicitly pressed',()=>{
 const vm=require('node:vm'),timers=[],make=()=>({style:{},hidden:true,setAttribute(){},focus(){}});
 const art=make(),button=make(),retry=make(),loading=make(),fill=make(),caption=make(),fallback=make();
 loading.hidden=false;loading.querySelector=s=>s==='i'?fill:caption;
 const controls={img:art,'.dm-zirve-loading':loading,'.dm-zirve-continue':button,'.dm-zirve-retry':retry,'.dm-zirve-opening-fallback':fallback};
 const screen={setAttribute(){},querySelector:s=>controls[s],remove(){this.removed=true;}};
 const boot={appendChild(el){this.child=el;}};
 const win={document:{baseURI:'https://app.dijimedu.com/ingilizce/',currentScript:{src:'https://app.dijimedu.com/ingilizce/holiday-splashes/splash.js'},documentElement:{classList:{add(){},remove(){},toggle(){}},style:{removeProperty(){}},dataset:{}},getElementById:id=>id==='dmBootSplash'?boot:null,createElement:()=>screen},localStorage:{getItem:k=>k==='dm-splash-preferences'?JSON.stringify({mode:'manual',manual:{id:'24-kasim-zirve',file:'24-kasim-zirve-1.svg'}}):null},requestIdleCallback(){}};
 const FixedDate=class extends Date{constructor(value='2026-11-19T12:00:00+03:00'){super(value);}};
 const scope={module:{exports:{}},URL,Date:FixedDate,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},setInterval:()=>1,clearInterval(){}};
 vm.runInNewContext(fs.readFileSync('ingilizce/holiday-splashes/splash.js','utf8'),scope);
 scope.module.exports.install(win);
 let done=0;
 assert.equal(boot.child,screen);assert.equal(button.hidden,true);
 assert.equal(win.dmZirveIntro.holdBoot(()=>done++),true);
 assert.equal(button.hidden,true);assert.equal(done,0);
 timers.filter(x=>x.ms===300).forEach(x=>x.fn());
 assert.equal(button.hidden,false);assert.equal(loading.hidden,true);assert.equal(done,0);
 button.onclick();assert.equal(done,1);assert.equal(screen.removed,true);
 assert.equal(win.dmZirveIntro.holdBoot(()=>done++),false);
});
