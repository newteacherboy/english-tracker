const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=path=>fs.readFileSync(path,'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page(){
 const dom=new JSDOM('<!doctype html><html><head><link data-dm-bubble rel="stylesheet"></head><body></body></html>',{url:'https://app.dijimedu.com/ingilizce/',runScripts:'outside-only'});
 const w=dom.window;w.aktifOgrenciAdi='test';w.localStorage.setItem('ing_token','a'.repeat(40));
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.AbortSignal.timeout=()=>new w.AbortController().signal;
 w.crypto.randomUUID=()=> 'b0000000-1111-4111-8111-111111111111';
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.yoToast=()=>{};w.apiURL='https://example.test/functions/v1/diji-api';
 const requests=[],rounds=[
  {tr:'elma',options:['pear','apple','grape','banana']},
  {tr:'armut',options:['banana','pear','apple','grape']}
 ];
 w.fetch=async(_url,args)=>{
  const body=JSON.parse(args.body);requests.push(body);
  const responses={
   status:{ok:true,level:1,remaining:3,words:2,energy:25,premium:false},
   start:{ok:true,level:1,remaining:2,words:2,runId:body.runId,rounds},
   check:{ok:true,slot:body.slot,pick:body.pick,correct:body.pick===(body.slot===0?1:1),expected:body.slot===0?'apple':'pear'},
   finish:{ok:true,level:2,playedLevel:1,remaining:2,score:200,correct:2,wrong:0,stars:3,xp:150,gold:30}
  };
  return {ok:true,json:async()=>responses[body.op]};
 };
 w.eval(read('ingilizce/premium-bubble-pop.js'));
 return {w,dom,requests};
}
test('bubble client opens with premium status, plays server-authorized answers and never sends a client score',async()=>{
 const {w,dom,requests}=page();
 try{
  await w.premiumBaloncukPatlatmaAc();
  await settle();
  assert.equal(w.document.querySelectorAll('.dm-bubble').length,1);
  w.document.querySelector('.db-panel-buttons button').click();await settle();
  assert.equal(requests.find(x=>x.op==='start').game,'bubble-pop');
  assert.equal(w.document.querySelectorAll('.db-balloon').length,4);
  const choice=w.document.querySelector('.db-balloon[data-index="1"]');
  choice.click();choice.click();await settle();
  assert.equal(requests.filter(x=>x.op==='check').length,1);
  assert.equal(requests.find(x=>x.op==='check').pick,1);
  assert.equal(w.document.querySelector('.db-popmark').textContent,'✓');
  w.document.querySelector('[data-next]').click();await settle();
  w.document.querySelector('.db-balloon[data-index="1"]').click();await settle();
  w.document.querySelector('[data-next]').click();await settle();
  const end=requests.find(x=>x.op==='finish');
  assert.deepEqual(end.selections,[1,1]);
  assert.equal(end.score,undefined);
  assert.equal(end.xp,undefined);
  assert.match(w.document.querySelector('.db-panel-content').textContent,/150 XP/);
 }finally{dom.window.close();}
});
test('bubble server requires stored answers, uses RLS and idempotent results',()=>{
 const sql=read('supabase/migrations/20261107143000_premium_bubble_pop.sql');
 const edge=read('supabase/functions/premium-games/index.ts');
 const bubble=edge.slice(edge.indexOf("if(game==='bubble-pop')"),edge.indexOf("if(b.game==='cloud-flight'"));
 const papizzle=edge.slice(edge.indexOf("if(b.game==='papizzle')"),edge.indexOf("if(game==='bubble-pop')"));
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/r\.answers->n::text/);
 assert.match(sql,/if r\.result is not null then return/);
 assert.match(sql,/for update/);
 assert.match(bubble,/dm_bubble_check/);
 assert.doesNotMatch(papizzle,/dm_bubble_check/);
 assert.match(bubble,/r\.tr,options:r\.options/);
 assert.doesNotMatch(bubble,/correct:b\.correct/);
});
