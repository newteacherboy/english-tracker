'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('optional game downloads launch together and remain idempotent',async()=>{
 const scripts=[],ctx={window:{},document:{getElementById:()=>null,head:{append(el){scripts.push(el)}},createElement:()=>({remove(){}}),dispatchEvent:()=>{}},Event,Set,Promise};
 ctx.window.yoToast=()=>{};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ingilizce/lazy-games.js'),'utf8'),ctx);
 const first=ctx.window.dmLazyGames.ready();
 assert.equal(scripts.length,4,'network fetches should begin together');
 assert.ok(scripts.every(s=>s.async===false),'evaluation order must remain stable');
 scripts.forEach(s=>s.onload());
 await first;
 await ctx.window.dmLazyGames.ready();
 assert.equal(scripts.length,4,'completed resources should not reload');
});
