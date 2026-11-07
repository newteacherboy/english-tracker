(()=>{
'use strict';
const api=(typeof apiURL==='string'?apiURL:'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api').replace(/diji-api.*$/,'premium-games');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const owner=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const token=()=>((window.dmTeacherPortalMode?sessionStorage.getItem('ing_ogr_token'):'')||localStorage.getItem('ing_token')||'');
let opening=false;
async function request(t,op,args={}){
 const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'bubble-pop',t,op,...args}),signal:AbortSignal.timeout(16000)});
 const data=await response.json();
 if(!response.ok||!data.ok)throw Error(data.mesaj||'Bağlantı kesildi.');
 return data;
}
window.premiumBaloncukPatlatmaAc=async()=>{
 if(opening||document.querySelector('.dm-bubble'))return;
 opening=true;
 const account=owner(),t=token();
 try{
  if(!t)throw Error('Premium oyun için hesabına giriş yap.');
  if(!document.querySelector('link[data-dm-bubble]')){
   await new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.dataset.dmBubble='';link.href='premium-bubble-pop.css?v=1';
    link.onload=resolve;link.onerror=()=>{link.remove();reject(Error('Oyun tasarımı yüklenemedi.'));};document.head.append(link);
   });
  }
  const initial=await request(t,'status');
  if(account===owner())mount(account,t,initial);
 }catch(e){window.yoToast?.(e.message);}
 finally{opening=false;}
};
function mount(account,t,initial){
 const dialog=document.createElement('dialog');dialog.className='dm-bubble';dialog.setAttribute('aria-label','Papi ile Baloncuk Patlatma');
 dialog.innerHTML=`<main class="db-shell">
  <header class="db-header"><button data-exit aria-label="Oyundan çık">✕</button><div class="db-title"><span>🎈</span><h2>Papi ile<br>Baloncuk Patlatma</h2></div><button data-sound aria-label="Sesi kapat">♫</button></header>
  <div class="db-hud"><span data-level>Bölüm 1</span><span data-progress>0 / 4</span><span data-score>0 puan</span><button data-pause hidden>Ⅱ</button></div>
  <div class="db-prompt"><small>Türkçenin İngilizcesini patlat!</small><strong data-question>Hazır mısın?</strong></div>
  <div class="db-timer"><i data-timebar></i></div>
  <section class="db-stage" aria-label="Yükselen baloncuklar">
    <div class="db-sky"><span class="db-cloud db-cloud-one"></span><span class="db-cloud db-cloud-two"></span></div>
    <div class="db-bubbles" data-bubbles></div>
    <img class="db-papi" src="papi-welcome-v2.png" alt="Papi maskotu" onerror="this.hidden=true">
    <div class="db-feedback" data-feedback role="status" aria-live="polite"></div>
  </section>
  <div class="db-controls"><button data-next hidden>Devam et ❯</button><span data-instruction>Doğru kelimenin balonuna dokun!</span></div>
  <section class="db-panel"><div class="db-panel-content" data-panel></div></section>
 </main>`;
 document.body.append(dialog);dialog.showModal();
 const $=sel=>dialog.querySelector(sel);
 const stage=$('[data-bubbles]'),panel=$('[data-panel]'),pane=dialog.querySelector('.db-panel');
 const soundBtn=$('[data-sound]');let muted=localStorage.getItem('dm_bubble_muted')==='1',audio=null;
 let state=initial,run=null,rounds=[],slot=0,picks=[],score=0,streak=0,wrong=0,paused=false,busy=false;
 let remaining=13000,last=0,frame=0,feedbackTimer=0,accountTimer=0,closed=false,pendingPick=null;
 const live=()=>!closed&&dialog.isConnected&&owner()===account;
 function tone(ok){
  if(muted||document.hidden)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   audio??=new Audio();audio.resume().catch(()=>{});
   const notes=ok?[523,659,784]:[392,330];
   notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.075;
    o.type=ok?'sine':'triangle';o.frequency.setValueAtTime(hz,at);
    g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(.10,at+.012);
    g.gain.exponentialRampToValueAtTime(.001,at+.16);
    o.connect(g).connect(audio.destination);o.start(at);o.stop(at+.17);
    o.onended=()=>{o.disconnect();g.disconnect();};
   });
  }catch{}
 }
 function paintSound(){soundBtn.textContent=muted?'♪̸':'♫';soundBtn.setAttribute('aria-label',muted?'Sesi aç':'Sesi kapat');}
 function updateStatus(d){state=d;const extra=d.teacherGame?' · Öğretmen':d.premium?' · Premium':` · ${d.remaining} hak`; $('[data-level]').textContent='Bölüm '+d.level+extra;}
 function display(title,lines,buttons){
  pane.classList.add('is-open');panel.innerHTML=`<div class="db-intro"><div class="db-spark">🎈 ✨ 🎈</div><h3>${esc(title)}</h3>${lines.map(x=>'<p>'+esc(x)+'</p>').join('')}<div class="db-panel-buttons"></div></div>`;
  const controls=panel.querySelector('.db-panel-buttons');
  for(const [label,handler] of buttons){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.onclick=handler;controls.append(btn);}
 }
 function hide(){pane.classList.remove('is-open');}
 function stop(){cancelAnimationFrame(frame);clearTimeout(feedbackTimer);frame=0;}
 function close(){if(closed)return;closed=true;stop();clearInterval(accountTimer);audio?.close().catch(()=>{});dialog.close();dialog.remove();window.dmGameViewport?.sync();}
 function setHud(){ $('[data-progress]').textContent=slot+' / '+rounds.length;$('[data-score]').textContent=score+' puan';}
 function timer(now){
  if(!live())return close();
  if(!run||paused||busy)return;
  if(!last)last=now;
  remaining=Math.max(0,remaining-Math.min(100,now-last));last=now;
  $('[data-timebar]').style.width=(remaining/130)+'%';
  if(remaining<=0){void choose(-1);return;}
  frame=requestAnimationFrame(timer);
 }
 function beginClock(){last=0;cancelAnimationFrame(frame);if(!paused&&!busy)frame=requestAnimationFrame(timer);}
 function draw(){
  if(slot>=rounds.length){void finish();return;}
  const q=rounds[slot];if(!q||!Array.isArray(q.options)||q.options.length!==4){display('Bölüm yüklenemedi',['Kelime verisi geçersiz.'],[['Çık',close]]);return;}
  busy=false;pendingPick=null;paused=false;remaining=13000;
  setHud();$('[data-question]').textContent=q.tr;$('[data-feedback]').textContent='';
  $('[data-next]').hidden=true;$('[data-pause]').hidden=false;$('[data-instruction]').hidden=false;
  $('[data-timebar]').style.width='100%';
  stage.replaceChildren();
  const order=[0,1,2,3].sort(()=>Math.random()-.5);
  order.forEach((index,i)=>{
   const btn=document.createElement('button');btn.type='button';btn.className='db-balloon db-balloon-'+(i%4);
   btn.dataset.index=index;btn.innerHTML='<span>'+esc(q.options[index])+'</span>';
   btn.style.setProperty('--delay',(.11*i)+'s');btn.style.setProperty('--duration',(5+i*.7)+'s');
   btn.onclick=()=>{void choose(index);};stage.append(btn);
  });
  beginClock();
 }
 async function choose(index,retry=false){
  if(!run||(!retry&&(busy||paused||pendingPick!==null)))return;
  stop();busy=true;pendingPick=index;
  stage.querySelectorAll('button').forEach(btn=>btn.disabled=true);
  const feedback=$('[data-feedback]');feedback.textContent='Cevabın kontrol ediliyor…';
  try{
   const reply=await request(t,'check',{runId:run,slot,pick:index});
   if(!live())return;
   if(reply.slot!==slot||reply.pick!==index)throw Error('Cevap uyuşmadı.');
   picks.push(index);
   if(reply.correct){streak++;score+=100+(streak%3===0?25:0);tone(true);}
   else{streak=0;wrong++;score=Math.max(0,score-25);tone(false);}
   const selected=stage.querySelector('[data-index="'+index+'"]');
   selected?.classList.add(reply.correct?'is-correct':'is-wrong');
   if(reply.correct)selected?.insertAdjacentHTML('beforeend','<b class="db-popmark" aria-hidden="true">✓</b>');
   feedback.textContent=reply.correct?'✓ Harika! +'+(100+(streak%3===0?25:0))+' puan':'✕ Doğru cevap: '+reply.expected;
   $('[data-next]').hidden=false;$('[data-instruction]').hidden=true;setHud();
   busy=false;pendingPick=null;
   if(reply.correct)feedbackTimer=setTimeout(advance,850);
   else $('[data-next]').focus({preventScroll:true});
  }catch(e){
   if(!live())return;
   feedback.textContent=e.message;busy=true;
   $('[data-next]').hidden=false;$('[data-next]').textContent='Cevabı tekrar gönder';$('[data-next]').onclick=()=>{void choose(index,true);};
  }
 }
 function advance(){
  if(!live()||busy||pendingPick!==null)return;
  clearTimeout(feedbackTimer);slot++;
  $('[data-next]').textContent='Devam et ❯';$('[data-next]').onclick=advance;
  draw();
 }
 async function start(){
  if(busy||run)return;
  busy=true;display('Baloncuklar hazırlanıyor…',['5 enerji ile yeni bölüm açılıyor.'],[]);
  const id=crypto.randomUUID();
  try{
   const d=await request(t,'start',{runId:id});
   if(!live())return;
   run=id;rounds=d.rounds||[];if(!rounds.length)throw Error('Bu bölüm için kelime bulunamadı.');
   slot=0;picks=[];score=0;streak=0;wrong=0;updateStatus(d);hide();busy=false;draw();
  }catch(e){run=null;busy=false;if(live())display('Oyun başlatılamadı',[e.message],[['Tekrar dene',start],['Oyunlara dön',close]]);}
 }
 async function finish(){
  if(!run||busy)return;
  busy=true;stop();$('[data-pause]').hidden=true;
  display('Sonucun kaydediliyor…',['Cevapların sunucuda doğrulanıyor.'],[]);
  try{
   const d=await request(t,'finish',{runId:run,selections:picks});
   if(!live())return;
   run=null;updateStatus(d);
   const summary=[`⭐ ${d.stars}/3 · ${d.score} puan`,`✓ ${d.correct} doğru · ✕ ${d.wrong} yanlış`,`+ ${d.xp} XP · + ${d.gold} altın`];
   display('Bölüm '+d.playedLevel+' tamamlandı!',summary,[
    ...(d.remaining>0&&!d.completed?[['Sonraki bölüm · ⚡5',()=>{busy=false;start();}]]:[]),
    ['Oyunlara dön',close]
   ]);
   busy=false;
  }catch(e){if(live()){busy=false;display('Kayıt tamamlanamadı',[e.message],[['Kaydı tekrar dene',finish],['Oyunlara dön',close]]);}}
 }
 function togglePause(){
  if(!run||busy||pendingPick!==null)return;
  paused=!paused;
  if(paused){stop();display('Oyun duraklatıldı',['Kaldığın yerden devam edebilirsin.'],[['Devam et',togglePause],['Oyundan çık',close]]);}
  else{hide();beginClock();}
 }
 $('[data-next]').onclick=advance;
 $('[data-exit]').onclick=close;
 $('[data-pause]').onclick=togglePause;
 soundBtn.onclick=()=>{muted=!muted;localStorage.setItem('dm_bubble_muted',muted?'1':'0');paintSound();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
 accountTimer=setInterval(()=>{if(!live())close();},800);paintSound();
 updateStatus(initial);
 display('Baloncuklar seni bekliyor!',[
  'Üstteki Türkçe kelimenin İngilizcesini taşıyan balonu patlat.',
  initial.completed?'Tüm bölümleri bitirdin!':`Bölüm ${initial.level} · ${initial.words} kelime · ⚡ 5 enerji`,
  initial.premium||initial.teacherGame?'Premium erişimin etkin.':`Ücretsiz kalan oyun hakkı: ${initial.remaining}`
 ],[
  ...(!initial.completed&&initial.remaining>0?[['▶ OYUNA BAŞLA',start]]:[]),
  ['Oyunlara dön',close]
 ]);
}
})();
