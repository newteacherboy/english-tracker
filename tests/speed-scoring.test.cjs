const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rules=require('../ingilizce/score-rules.js');
test('eight correct answers at 25 seconds beat the same result at 30 seconds',()=>{
  const fast=rules.calculate({base:1000,correct:8,wrong:0,seconds:25}),slow=rules.calculate({base:1000,correct:8,wrong:0,seconds:30});
  assert.equal(fast.puan,2164);assert.equal(slow.puan,2011);assert(fast.puan>1000);assert(fast.xp>slow.xp);
});
test('wrong answers reduce this round score and XP without negative totals',()=>{
  const a=rules.calculate({base:500,correct:4,seconds:25}),b=rules.calculate({base:500,correct:4,wrong:1,seconds:25});
  assert.equal(a.puan-b.puan,40);assert.equal(a.xp-b.xp,3);
  const zero=rules.calculate({correct:0,wrong:8,seconds:96});assert.equal(zero.puan,0);assert.equal(zero.xp,0);
});
test('frontend and both Edge Functions ship identical rules',()=>{
  const source=fs.readFileSync(__dirname+'/../ingilizce/score-rules.js','utf8');
  for(const name of ['diji-api','medupro-api'])assert.equal(fs.readFileSync(__dirname+'/../supabase/functions/'+name+'/score-rules.js','utf8'),source);
});
test('shared core freezes score and seconds, ignores late answers, and sends scoring v3',async()=>{
  const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8').replace(/<!--[\s\S]*?-->/g,'');
  const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(x=>x.includes('window.OC = (function ()'));
  let now=10000,sent;
  const ctx={DijiScoreRules:rules,Date:{now:()=>now},Math,Set,JSON,Number,String,Object,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},document:{getElementById:()=>null},fetch:async(u,opt)=>{sent=JSON.parse(opt.body);return {};}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
  ctx.OC.basla('ky');for(let i=0;i<8;i++)ctx.OC.dogru(1);now+=25000;
  const result=ctx.OC.sonlandir('ky');assert.equal(result.puan,2164);assert.equal(result.sure,25);
  now+=15000;ctx.OC.dogru(1);ctx.OC.yanlis(false);assert.equal(ctx.OC.puan(),2164);assert.equal(ctx.OC.sure(),25);
  await ctx.fetch('api',{method:'POST',body:JSON.stringify({islem:'kelimeLiderlikKaydet'})});assert.equal(sent.puanSurum,3);assert.equal(sent.puanTemel,1000);assert.equal(sent.suresaniye,25);
});
