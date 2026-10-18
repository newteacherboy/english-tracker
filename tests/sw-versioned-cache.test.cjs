'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../ingilizce/sw.js'),'utf8');

function setup(){
 const listeners={};const entries=new Map();let requests=0;
 const cache={match:async request=>entries.get(request.url||request),put:async(request,response)=>{entries.set(request.url||request,response);}};
 const ctx={URL,Promise,console,setTimeout,clearTimeout,
  self:{location:{origin:'https://app.test'},addEventListener:(name,handler)=>{listeners[name]=handler;},skipWaiting:async()=>{},clients:{claim:async()=>{}}},
  caches:{open:async()=>cache,match:async(request)=>cache.match(request),keys:async()=>[]},
  fetch:async()=>{requests++;return {ok:true,clone(){return this},source:requests};}
 };
 vm.runInNewContext(script,ctx);
 async function visit(url,mode='same-origin'){
  const wait=[];let response;
  listeners.fetch({request:{url,method:'GET',mode},respondWith(p){response=p;},waitUntil(p){wait.push(p);}});
  const result=await response;await Promise.all(wait);return result;
 }
 return {visit,get requests(){return requests;}};
}
test('JS and CSS refresh even when their v URL was not changed',async()=>{
 const s=setup();
 for(const [i,file] of ['game-feedback.js?v=10','game-feedback.js?v=10','game-feedback.js?v=11','main.css?v=2','main.css?v=2'].entries()){
  assert.equal((await s.visit('https://app.test/ingilizce/'+file)).source,i+1);
 }
 assert.equal(s.requests,5);
});
test('unversioned code, JSON and page navigation stay network first',async()=>{
 const s=setup();
 for(let i=0;i<2;i++){
  await s.visit('https://app.test/ingilizce/main.js');
  await s.visit('https://app.test/ingilizce/list.json?v=3');
  await s.visit('https://app.test/ingilizce/','navigate');
 }
 assert.equal(s.requests,6);
});
test('Supabase and authentication operations are never intercepted',async()=>{
 const listeners={};vm.runInNewContext(script,{URL,Promise,console,caches:{},fetch(){throw Error('should not fetch')},self:{location:{origin:'https://app.test'},addEventListener:(n,h)=>listeners[n]=h}});
 for(const request of [{url:'https://myproject.supabase.co/rest/v1/students',method:'GET',mode:'cors'},{url:'https://app.test/ingilizce/main.js?v=1',method:'POST',mode:'cors'}]){
  let intercepted=false;listeners.fetch({request,respondWith(){intercepted=true;}});assert.equal(intercepted,false);
 }
});

test('cached startup resources finish within budget while slow responses refresh in background',async()=>{
 const listeners={},entries=new Map(),timers=[],wait=[];let release;
 const cached={ok:true,source:'cached'},fresh={ok:true,source:'fresh',clone(){return this}};
 entries.set('https://app.test/ingilizce/main.js?v=1',cached);
 const cache={match:async k=>entries.get(k.url||k),put:async(k,v)=>entries.set(k.url||k,v)};
 vm.runInNewContext(script,{URL,Promise,console,Response,
  setTimeout:fn=>{timers.push(fn);return 1},clearTimeout(){},
  caches:{open:async()=>cache},fetch:()=>new Promise(resolve=>release=resolve),
  self:{location:{origin:'https://app.test'},addEventListener:(n,fn)=>listeners[n]=fn}});
 let response;const request={url:'https://app.test/ingilizce/main.js?v=1',method:'GET',mode:'same-origin'};
 listeners.fetch({request,respondWith:p=>response=p,waitUntil:p=>wait.push(p)});
 for(let i=0;i<10&&!timers.length;i++)await Promise.resolve();
 assert.equal(timers.length,1);timers[0]();assert.equal(await response,cached);
 release(fresh);await Promise.all(wait);assert.equal(await cache.match(request),fresh);
});
