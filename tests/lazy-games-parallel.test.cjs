'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('optional game downloads launch together and remain idempotent',async()=>{
 const scripts=[],ctx={window:{},document:{getElementById:()=>null,head:{append(el){scripts.push(el)}},createElement:()=>({remove(){}}),dispatchEvent:()=>{}},Event,Set,Promise};
 ctx.window.yoToast=()=>{};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ingilizce/lazy-games.js'),'utf8'),ctx);
 const first=ctx.window.dmLazyGames.ready();
 assert.equal(scripts.length,4,'network fetches should begin together');
 assert.ok(scripts.some(s=>s.src.startsWith('solo-arcade.js?')),'arcade module must be loaded');
 assert.ok(!scripts.some(s=>s.src.startsWith('harf-bahcesi.js?')),'retired garden must not load for students');
 assert.ok(!scripts.some(s=>s.src.includes('kelime-rallisi')),'retired rally must not load for students');
 assert.ok(scripts.every(s=>s.async===false),'evaluation order must remain stable');
 scripts.forEach(s=>s.onload());
 await first;
 await ctx.window.dmLazyGames.ready();
 assert.equal(scripts.length,4,'completed resources should not reload');
});

test('teacher still downloads Harf Bahçesi and Mola; personal browser never does',async()=>{
 const scripts=[],ctx={window:{dmTeacherPortalMode:true},document:{getElementById:()=>null,querySelector:()=>null,head:{append(el){if(el.src)scripts.push(el)}},createElement:()=>({dataset:{},remove(){}}),dispatchEvent:()=>{}},Event,Set,Promise};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ingilizce/lazy-games.js'),'utf8'),ctx);
 const task=ctx.window.dmLazyGames.ready();assert(scripts.some(s=>s.src.startsWith('harf-bahcesi.js?')));assert(scripts.some(s=>s.src.startsWith('mola-vakti.js?')));assert(scripts.some(s=>s.src.startsWith('kelime-rallisi.js?')));scripts.forEach(s=>s.onload());await task;
});
