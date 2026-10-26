const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('ingilizce/notice-surface.js','utf8');
function fixture(){
 const dom=new JSDOM('<!doctype html><body><main id="panel-alani"></main></body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let now=100000,activity=false;const timers=[],sounds=[];w.Date.now=()=>now;w.localStorage.setItem('ing_token','account-one');Object.defineProperty(w.document,'hidden',{value:false,writable:true});
 w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.closest('.dm-notice-waiting,.dm-papi-held,[hidden]')&&this.style.display!=='none'?[{width:300,height:200}]:[]};
 w.setInterval=(fn,ms)=>{timers.push({fn,ms,interval:true});return timers.length;};w.setTimeout=(fn,ms)=>{timers.push({fn,ms,at:now+ms});return timers.length;};
 w.dmPapiNotices={inActivity:()=>activity};
 w.AudioContext=class{constructor(){this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){sounds.push('tone')},stop(){},disconnect(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}};
 w.requestAnimationFrame=fn=>w.queueMicrotask(fn);w.eval(source);
 const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
 return {w,dom,sounds,flush,setActivity:v=>activity=v,async step(ms=250){now+=ms;for(const t of [...timers])if(t.interval)t.fn();else if(t.at<=now){t.at=Infinity;t.fn();}await flush();},close:()=>{w.dmNoticeSurface.destroy();w.close();}};
}
test('top and bottom notices share one queue, actions retain their native handlers',async()=>{
 const f=fixture();try{const {w}=f;let clicked=0;
 const bottom=w.document.createElement('div');bottom.id='dmWeeklyPanel';bottom.innerHTML='<section class="dm-weekly-card"><h2>Özet</h2><button>Okudum</button></section>';bottom.querySelector('button').onclick=()=>{clicked++;bottom.remove();};w.document.body.append(bottom);await f.flush();
 const top=w.dmNoticeSurface.notify('Arkadaşından mesaj var');await f.flush();assert.equal(w.document.querySelectorAll('.dm-notice-visible').length,1);assert(bottom.classList.contains('dm-notice-visible'));assert(top.classList.contains('dm-notice-waiting'));
 bottom.querySelector('.dm-notice-copy button').click();await f.flush();await f.step(700);assert.equal(clicked,1);assert(top.classList.contains('dm-notice-visible'));assert(top.classList.contains('dm-notice-edge-top'));
 }finally{f.close();}
});
test('queued lifetime starts only on screen; activity and background pause it',async()=>{
 const f=fixture();try{const {w}=f;f.setActivity(true);const el=w.dmNoticeSurface.notify('Bekleyen duyuru',{duration:1000});await f.flush();for(let i=0;i<12;i++)await f.step(250);assert(el.isConnected);assert(!w.dmNoticeSurface.isVisible(el));
 f.setActivity(false);await f.step();assert(w.dmNoticeSurface.isVisible(el));w.document.hidden=true;for(let i=0;i<12;i++)await f.step(250);assert(el.isConnected);w.document.hidden=false;for(let i=0;i<5;i++)await f.step(250);assert(!el.isConnected);
 }finally{f.close();}
});
test('account change discards pending items without invoking their acknowledgement',async()=>{
 const f=fixture();try{let ack=0;const a=f.w.dmNoticeSurface.notify('Eski hesap');a.querySelector('button').onclick=()=>ack++;f.w.dmNoticeSurface.notify('Sırada');f.w.localStorage.setItem('ing_token','next');await f.step();assert.equal(f.w.document.querySelectorAll('.dm-notice-managed').length,0);assert.equal(ack,0);}finally{f.close();}
});
test('persistent announcement can reopen without duplicate hero or close handler',async()=>{
 const f=fixture();try{const el=f.w.document.createElement('div');el.id='duyuruOverlay';el.style.display='flex';el.innerHTML='<div class="duy3-card"><h3 id="duyuruBaslik">Duyuru</h3><button class="duy3-close">×</button><button>Tamam</button></div>';f.w.document.body.append(el);await f.flush();el.style.display='none';await f.step();el.style.display='flex';await f.step(700);assert.equal(el.querySelectorAll('.dm-notice-hero').length,1);assert.equal(el.querySelectorAll('.dm-notice-copy').length,1);assert(f.w.dmNoticeSurface.isVisible(el));}finally{f.close();}
});
test('sound waits for interaction, plays once when presented, respects mute and plays on dismiss',async()=>{
 const f=fixture();try{const {w}=f;const first=w.dmNoticeSurface.notify('Sessiz ilk yükleme');await f.flush();assert.equal(f.sounds.length,0);first.remove();await f.flush();await f.step(700);w.document.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));
 const a=w.dmNoticeSurface.notify('Sesli');await f.flush();assert.equal(f.sounds.length,2);await f.step();assert.equal(f.sounds.length,2);a.querySelector('.dm-notice-close').click();assert.equal(f.sounds.length,4);await f.flush();await f.step(700);
 w.localStorage.setItem('dm_sound_muted','1');w.dmNoticeSurface.notify('Sessiz ayar');await f.flush();assert.equal(f.sounds.length,4);
 }finally{f.close();}
});
test('external dialogs hold the next notice, typing does not block its own buttons',async()=>{
 const f=fixture();try{const {w}=f;const dialog=w.document.createElement('div');dialog.setAttribute('role','dialog');w.document.body.append(dialog);const el=w.dmNoticeSurface.notify('Sıradaki');await f.flush();assert(!w.dmNoticeSurface.isVisible(el));dialog.remove();await f.step();assert(w.dmNoticeSurface.isVisible(el));}finally{f.close();}
});

test('dismissal does not bubble into a legacy card navigation action',async()=>{
 const f=fixture();try{let navigated=0;const el=f.w.document.createElement('div');el.className='bk-kart';el.textContent='Mağaza önerisi';el.onclick=()=>navigated++;f.w.document.body.append(el);await f.flush();el.querySelector('.dm-notice-done').click();assert.equal(navigated,0);assert(!el.isConnected);}finally{f.close();}
});
test('typing an appeal inside the active notice does not hide it',async()=>{
 const f=fixture();try{const el=f.w.dmNoticeSurface.notify('Öğretmen uyarısı',{edge:'bottom'});await f.flush();const area=f.w.document.createElement('textarea');el.querySelector('.dm-notice-copy').append(area);area.focus();await f.step();assert(f.w.dmNoticeSurface.isVisible(el));}finally{f.close();}
});


test('compact top ribbon wraps text, hides during play and closes after five visible seconds',async()=>{
 const f=fixture();try{
  const {w}=f;
  const el=w.dmNoticeSurface.notify('Ali parkurda yeni bir durak geçti. Bu metin küçük cihazlarda alt satıra sarılmalı.',{title:'Yeni başarı'});
  await f.flush();
  assert(el.classList.contains('dm-notice-edge-top'));
  assert(el.classList.contains('dm-notice-visible'));
  assert.equal(el.querySelectorAll('.dm-notice-hero').length,1);
  assert.equal(el.querySelectorAll('.dm-notice-controls').length,1);
  assert.equal(el.querySelector('.dm-notice-timer').textContent,'5 sn');
  assert.equal(el.querySelector('.dm-notice-emblem').textContent,'🏆');
  f.setActivity(true);await f.step();
  assert(!w.dmNoticeSurface.isVisible(el),'no banner while playing');
  for(let i=0;i<14;i++)await f.step(500);
  assert(el.isConnected,'hidden activity time does not consume its lifetime');
  f.setActivity(false);await f.step();
  assert(w.dmNoticeSurface.isVisible(el),'banner resumes after gameplay');
  for(let i=0;i<14;i++)await f.step(500);
  assert(!el.isConnected,'auto-dismisses after five seconds of visible time');
 }finally{f.close();}
});

test('new-version banner survives its old timeout and Escape until refresh',async()=>{
 const f=fixture();try{const el=f.w.document.createElement('aside');el.id='dm-app-update';el.innerHTML='<span>Yeni sürüm hazır! Uygun olduğunda yenile.</span><button>Yenile</button>';let refresh=0;el.querySelector('button').onclick=()=>refresh++;f.w.document.body.append(el);await f.flush();
 for(let i=0;i<40;i++)await f.step(250);
 assert(el.isConnected);assert(f.w.dmNoticeSurface.isVisible(el));assert.equal(el.querySelector('.dm-notice-controls'),null);
 f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape'}));assert(el.isConnected);
 el.querySelector('.dm-notice-copy button').click();assert.equal(refresh,1);
 }finally{f.close();}
});
