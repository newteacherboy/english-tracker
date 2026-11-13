'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/holiday-splashes/papi-intro.js','utf8');
function setup({offline=false,blockedStorage=false}={}){
 const dom=new JSDOM('<html><head></head><body><div id="dmBootSplash"><button id="dmBootRetry" hidden>Tekrar dene</button></div><div id="oturumYuklemeOverlay"></div></body></html>',{url:'https://papi.test/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frames=new Map();let seq=0,time=0;
 w.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq};w.cancelAnimationFrame=id=>frames.delete(id);w.fetch=()=>{throw Error('game must not fetch')};
 Object.defineProperty(w.navigator,'onLine',{value:!offline,configurable:true});
 if(blockedStorage)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked')}});
 w.eval(source);w.dmPapiIntro.enable();
 const q=s=>w.document.querySelector('#dmBootSplash '+s);
 const advance=n=>{for(let i=0;i<n;i++){time+=16;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(time));}};
 return {dom,w,q,frames,advance,close(){w.dmPapiIntro.disable();dom.window.close()}};
}
test('same 3D Papi starts a local game; normal opening is not held and session overlay stays static',()=>{
 const f=setup();assert.equal(f.w.dmPapiIntro.holdBoot(()=>{}),false);assert(f.q('.pi-runway').hidden);
 const original=f.q('.pi-svg').outerHTML;f.q('.pi-papi').click();assert(f.q('.pi-wrap').classList.contains('pi-playing'));assert.equal(f.q('.pi-svg').outerHTML,original);assert.equal(f.q('.pi-runway').hidden,false);assert.equal(f.q('#dmBootRetry').hidden,false);
 assert.equal(f.w.document.querySelector('#oturumYuklemeOverlay .pi-runway'),null);f.advance(30);assert.notEqual(f.q('.pi-score').textContent,'00000');f.close();assert.equal(f.frames.size,0);
});
test('actual application readiness offers entry without abruptly removing an active game',()=>{
 const f=setup({offline:true});assert.match(f.q('.pi-wait-status').textContent,/İnternet/);f.q('.pi-papi').click();let entered=0;
 assert.equal(f.w.dmPapiIntro.holdBoot(()=>entered++),true);assert.equal(entered,0);assert.equal(f.q('.pi-enter').hidden,false);assert.equal(f.q('#dmBootRetry').hidden,true);assert.match(f.q('.pi-wait-status').textContent,/Hazırız/);
 f.q('.pi-enter').click();assert.equal(entered,1);assert.equal(f.w.dmPapiIntro.holdBoot(()=>{}),false);assert.equal(f.frames.size,0);f.close();
});
test('collision stops the loop, another tap restarts, best score stays on device',()=>{
 const f=setup();f.q('.pi-papi').click();f.advance(300);assert(f.q('.pi-runway').classList.contains('pi-game-over'));assert.equal(f.frames.size,0);assert(Number(f.w.localStorage.getItem('dm_papi_wait_best'))>0);
 f.q('.pi-runway').dispatchEvent(new f.w.Event('pointerdown',{bubbles:true,cancelable:true}));assert(!f.q('.pi-runway').classList.contains('pi-game-over'));assert.equal(f.frames.size,1);f.close();
});
test('hidden pages pause, resume has no time jump, and blocked storage does not break play',()=>{
 const f=setup({blockedStorage:true});f.q('.pi-papi').click();f.advance(10);const previous=f.q('.pi-obstacle').style.transform;
 Object.defineProperty(f.w.document,'hidden',{value:true,configurable:true});f.w.document.dispatchEvent(new f.w.Event('visibilitychange'));assert.equal(f.frames.size,0);
 Object.defineProperty(f.w.document,'hidden',{value:false,configurable:true});f.w.document.dispatchEvent(new f.w.Event('visibilitychange'));f.advance(1);assert.equal(f.q('.pi-obstacle').style.transform,previous);
 f.w.document.dispatchEvent(new f.w.Event('dm:boot-ready'));assert.equal(f.frames.size,0);f.close();
});
test('keyboard supports play and jump, leaves retry and enter keys alone, and cleanup releases entry callback',()=>{
 const f=setup();f.q('.pi-papi').dispatchEvent(new f.w.KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));assert(f.q('.pi-wrap').classList.contains('pi-playing'));
 let called=0;f.w.dmPapiIntro.holdBoot(()=>called++);const event=new f.w.KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true});f.q('.pi-enter').dispatchEvent(event);assert.equal(event.defaultPrevented,false);
 f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(f.frames.size,0);f.q('.pi-enter').click();assert.equal(called,0);f.close();
});
