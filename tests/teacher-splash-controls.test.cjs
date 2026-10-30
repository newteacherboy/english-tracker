'use strict';
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
