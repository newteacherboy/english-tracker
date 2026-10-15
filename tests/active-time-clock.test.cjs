'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/active-time.js','utf8');
async function fixture(seconds=5998){
 const dom=new JSDOM('<div id="panel-alani" style="display:block"></div>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;let now=0,interval,hidden=false;
 Object.defineProperty(w.performance,'now',{value:()=>now});Object.defineProperty(w.document,'hidden',{get:()=>hidden});
 w.eval("var aktifOgrenciAdi='Ada',apiURL='/api',toplamSaniye=0;");w.localStorage.setItem('ing_token','ada-token');w.setInterval=f=>{interval=f};
 w.dmMemberUI={sheet(_title,content){const el=w.document.createElement('div');el.id='dmTimePanel';el.innerHTML=content;w.document.body.append(el);return {el,close(){el.dispatchEvent(new w.Event('dm:sheet-close'));el.remove();}}}};
 let claimed=[];w.fetch=async(_u,options)=>{const b=JSON.parse(options.body);seconds+=b.seconds||0;if(b.claimIndex)claimed.push(b.claimIndex);return {ok:true,json:async()=>({ok:true,seconds,stars:Math.floor(seconds/600),baseChest:0,chestCount:Math.floor(seconds/6000),claimed,gold:b.claimIndex?20:0})}};
 w.eval(source);await w.dmActiveTime.panel();return {w,step(ms=1000){now+=ms;interval();},hide(value){hidden=value},setSeconds(s){seconds=s}};
}
test('clock ticks live, rolls over minutes and reveals a newly earned chest without reopening',async()=>{
 const f=await fixture(),w=f.w,get=k=>w.document.querySelector('[data-time="'+k+'"]').textContent;
 assert.equal(get('minutes'),'39');assert.equal(get('seconds'),'58');f.step();assert.equal(get('seconds'),'59');f.step();assert.equal(get('minutes'),'40');assert.equal(get('seconds'),'00');
 assert.equal(get('stars'),'10');assert.equal(w.document.querySelectorAll('.dm-time-chests button').length,1);assert.equal(w.document.querySelector('.dm-clock-second').getAttribute('transform'),'rotate(0 60 60)');
 w.document.querySelector('.dm-time-chests button').click();await new Promise(r=>setImmediate(r));assert.equal(w.document.querySelectorAll('.dm-time-chests button').length,0);w.close();
});
test('clock pauses when hidden or idle and closes on account change',async()=>{
 const f=await fixture(10),w=f.w,get=()=>w.document.querySelector('[data-time="seconds"]').textContent;
 f.hide(true);f.step();assert.equal(get(),'10');assert(w.document.querySelector('.dm-time-live').classList.contains('is-paused'));
 f.hide(false);w.dmLastActiveAt=Date.now()-100000;f.step();assert.equal(get(),'10');w.document.dispatchEvent(new w.Event('pointerdown'));f.step();assert.equal(get(),'11');
 w.eval("aktifOgrenciAdi='Bora'");f.step();assert.equal(w.document.getElementById('dmTimePanel'),null);await new Promise(r=>setImmediate(r));w.close();
});
test('closed clock does not update detached content and reopening uses current active time',async()=>{
 const f=await fixture(12),w=f.w,panel=w.document.getElementById('dmTimePanel');panel.dispatchEvent(new w.Event('dm:sheet-close'));panel.remove();f.step();assert.equal(w.document.getElementById('dmTimePanel'),null);await w.dmActiveTime.panel();assert.equal(w.document.querySelector('[data-time="seconds"]').textContent,'13');w.close();
});
