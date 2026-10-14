'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../ingilizce/game-feedback.js'),'utf8');

test('Harf Adasi reward claim uses the same run authoritative OC counters',async()=>{
 const requests=[],storage=new Map(),events=[];
 const context={
  aktifOgrenciAdi:'TestStudent',yo:{dmRewardVersion:0,altin:100,totalXp:100},
  navigator:{onLine:true},Math,Date,Number,String,JSON,Map,Set,Response,CustomEvent:class{constructor(type,data){this.type=type;this.detail=data?.detail;}},
  localStorage:{getItem:k=>storage.get(k)||'',setItem:(k,v)=>storage.set(k,v)},
  matchMedia:()=>({matches:true}),setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},
  document:{getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{},dispatchEvent:e=>events.push(e)},
  addEventListener:()=>{},DijiProgressRules:{migrate:()=>{}},
  OC:{sonuc:key=>key==='asmaca'?{runId:'asmaca_test_run_1',dogru:6,yanlis:2}:null},
  fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({ok:true,xp:36,gold:7,yo:{altin:107,totalXp:136,dmRewardVersion:1}}),{status:200});},
  apiURL:'https://mock.invalid',genelSonucEkraniGoster:()=>{}
 };
 context.window=context;
 vm.runInNewContext(source,context,{filename:'game-feedback.js'});
 context.ocOdulVer({runId:'asmaca_test_run_1',puanSurum:3,oyunKey:'asmaca',dogru:0,yanlis:0,sureSaniye:60,rewardScope:{classNo:6,units:[1]}});
 await new Promise(resolve=>setImmediate(resolve));
 const request=requests.find(r=>r.islem==='seviyeOyunOdulu');
 assert.ok(request,'Harf Adasi must claim a reward');
 assert.equal(request.correct,6);
 assert.equal(request.wrong,2);
 assert.equal(request.game,'asmaca');
 assert.equal(request.runId,'asmaca_test_run_1');
 assert.equal(context.yo.altin,107);
 assert.equal(context.yo.totalXp,136);
});
