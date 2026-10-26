const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

function fixture(markup=''){
 const dom=new JSDOM('<!doctype html><body>'+markup+'</body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,frames=new Map(),timers=new Map(),observers=[];let id=0;
 const NativeObserver=w.MutationObserver;w.MutationObserver=class extends NativeObserver{constructor(fn){super(fn);observers.push(this);}};
 w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=n=>frames.delete(n);
 w.setTimeout=fn=>{timers.set(++id,fn);return id;};w.clearTimeout=n=>timers.delete(n);w.setInterval=()=>0;
 w.HTMLMediaElement.prototype.pause=function(){};
 w.dmSoundEnabled=false;w.fetch=async()=>({});
 w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.closest('[hidden]')?[{}]:[];};
 w.HTMLElement.prototype.checkVisibility=function(){return !this.closest('[hidden]');};
 const counts={documentScans:0};const query=w.document.querySelectorAll.bind(w.document);
 w.document.querySelectorAll=function(selector){counts.documentScans++;return query(selector);};
 return {w,counts,frames,timers,load(file){w.eval(fs.readFileSync('ingilizce/'+file,'utf8'));},
  async flush(){for(let i=0;i<8;i++)await Promise.resolve();},
  runTimers(){const batch=[...timers.values()];timers.clear();batch.forEach(fn=>fn());},
  runFrames(){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());},close(){observers.forEach(o=>o.disconnect());dom.window.close();}};
}

test('100 unrelated counter updates cause no whole-document letter scans; newly inserted letters and coins still decorate',async()=>{
 const f=fixture('<div id="counter"></div><section id="game"></section>');
 try{
  f.load('member-polish.js');await f.flush();const before=f.counts.documentScans;
  for(let i=0;i<100;i++){f.w.document.getElementById('counter').textContent=String(i);await f.flush();}
  assert.equal(f.counts.documentScans-before,0);
  const game=f.w.document.getElementById('game');game.innerHTML='<div class="dm-letter-word"><strong>1. Elma</strong><span>🪙 10</span></div>';await f.flush();
  assert.equal(game.querySelector('.dm-letter-number').textContent,'1');assert.equal(game.querySelectorAll('.dm-gold-icon').length,1);
  const title=f.w.document.createElement('strong');title.textContent='2. Kitap';game.firstChild.append(title);await f.flush();
  assert.equal(title.querySelector('.dm-letter-number').textContent,'2');
  game.querySelector('span:not(.dm-letter-number)').textContent='🪙 20';await f.flush();
  assert(game.querySelector('.dm-gold-icon'));
 }finally{f.close();}
});

test('unrelated counters do not schedule lesson layout; lesson content, insertion and removal do',async()=>{
 const f=fixture('<div id="counter"></div><div id="dmStoryLesson" class="sp-story"><section class="ds-panel"></section></div>');
 try{
  f.load('selected-play.js');await f.flush();f.runFrames();await f.flush();assert.equal(f.frames.size,0);
  for(let i=0;i<100;i++){f.w.document.getElementById('counter').textContent=String(i);await f.flush();}
  assert.equal(f.frames.size,0);
  f.w.document.querySelector('.ds-panel').textContent='Yeni soru';await f.flush();assert.equal(f.frames.size,1);f.runFrames();
  f.w.document.getElementById('dmStoryLesson').remove();await f.flush();
  const lesson=f.w.document.createElement('div');lesson.id='dmStoryLesson';f.w.document.body.append(lesson);await f.flush();assert.equal(f.frames.size,1);
 }finally{f.close();}
});

test('start effects ignore unrelated updates but follow button insertion, disabled and ancestor visibility changes',async()=>{
 const f=fixture('<div id="counter"></div><section id="entry"></section>');
 try{
  f.load('start-spotlight.js');f.runTimers();await f.flush();const before=f.counts.documentScans;
  for(let i=0;i<100;i++){f.w.document.getElementById('counter').textContent=String(i);f.w.document.getElementById('counter').style.width=i+'px';await f.flush();f.runTimers();}
  assert.equal(f.counts.documentScans-before,0);
  const entry=f.w.document.getElementById('entry');entry.innerHTML='<button class="mt-start">Başlat</button>';await f.flush();f.runTimers();await f.flush();
  const button=entry.firstChild;assert(button.classList.contains('dmss-hop'));
  button.disabled=true;await f.flush();f.runTimers();assert(!button.classList.contains('dmss-hop'));
  button.disabled=false;await f.flush();f.runTimers();assert(button.classList.contains('dmss-hop'));
  entry.hidden=true;await f.flush();f.runTimers();assert(!button.classList.contains('dmss-hop'));
  entry.hidden=false;await f.flush();f.runTimers();assert(button.classList.contains('dmss-hop'));
  entry.remove();await f.flush();f.runTimers();assert(!f.w.document.querySelector('.dmss-layer'));
 }finally{f.close();}
});
