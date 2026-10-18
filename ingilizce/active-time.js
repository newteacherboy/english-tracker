/* Foreground interaction time; rewards are credited and deduplicated by the server. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'');
const ready=()=>who()&&who().toLowerCase()!=='teacher'&&!window.dmGuestMode&&document.getElementById('panel-alani')?.style.display==='block';
const run=crypto.randomUUID();let owner='',state=null,pending=0,last=performance.now(),seq=0,request=null,inflight=false,initialized=false;
window.dmLastActiveAt=Date.now();const touch=()=>{window.dmLastActiveAt=Date.now()};for(const event of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(event,touch,{passive:true});
const active=()=>ready()&&!document.hidden&&Date.now()-window.dmLastActiveAt<90000;
async function call(payload){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'activeTime',t:localStorage.getItem('ing_token')||'',runId:run,...payload}),signal:controller.signal});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'Süre kaydedilemedi.');return d;}finally{clearTimeout(timer)}}
async function flushOnce(){if(inflight||!ready())return;const at=who();if(owner!==at){owner=at;state=null;pending=0;request=null;initialized=false;seq=0;touch();}inflight=true;try{if(!request)request={seq:++seq,seconds:initialized?Math.min(45,Math.floor(pending/1000)):0};const d=await call(request);if(at!==who())return;if(initialized&&d.chestCount>(state?.chestCount||0))earnedChest=d.chestCount;state=d;pending=Math.max(0,pending-request.seconds*1000);request=null;initialized=true;document.dispatchEvent(new Event('dm:time'));}catch(e){console.warn('[Aktif süre]',e.message);}finally{inflight=false}}
let flushing=null;function flush(){if(flushing)return flushing;flushing=flushOnce().finally(()=>{flushing=null});return flushing;}
function summary(){return state?{...state,seconds:state.seconds+Math.floor(pending/1000),stars:Math.floor((state.seconds+pending/1000)/600)}:{seconds:typeof toplamSaniye==='undefined'?0:toplamSaniye,stars:Math.floor((typeof toplamSaniye==='undefined'?0:toplamSaniye)/600),claimed:[],baseChest:0,chestCount:0};}
const clockMarkup=()=>'<div class="dm-time-clock" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="dm-clock-face" cx="60" cy="60" r="51"/>'+Array.from({length:12},(_,i)=>'<path class="dm-clock-mark" d="M60 16v5" transform="rotate('+i*30+' 60 60)"/>').join('')+'<circle class="dm-clock-track" cx="60" cy="60" r="45"/><circle class="dm-clock-progress" cx="60" cy="60" r="45" transform="rotate(-90 60 60)"/><path class="dm-clock-hour" d="M60 60V35"/><path class="dm-clock-minute" d="M60 60V25"/><path class="dm-clock-second" d="M60 69V20"/><circle class="dm-clock-pin" cx="60" cy="60" r="4"/></svg><span>✦</span></div>';
let timeView=null,earnedChest=0,chestView=null;
function chestCeremony(index){if(chestView||!ready())return;const at=who();const view=window.dmMemberUI.sheet('Bir sandık kazandın!','<div class="dm-time-celebration"><div class="dm-time-prize" aria-hidden="true">🎁</div><h2>Öğrenmenin ödülü!</h2><p>Sandığına dokun, içindeki hediyeyi keşfet.</p><button type="button" data-open-time-chest>✨ Sandığı Aç</button><p data-chest-result role="status"></p></div>','dm-time-chest-panel');chestView=view;
 view.el.addEventListener('dm:sheet-close',()=>{if(chestView===view)chestView=null;},{once:true});
 const b=view.el.querySelector('[data-open-time-chest]');b.onclick=async()=>{b.disabled=true;try{await flush();if(at!==who()){view.close();return;}const next=await call({seq,seconds:0,claimIndex:index});if(at!==who()){view.close();return;}state=next;if(next.yo)window.dmApplyRewardState?.(next.yo,at);view.el.querySelector('.dm-time-celebration').classList.add('is-open');view.el.querySelector('.dm-time-prize').textContent='🪙';view.el.querySelector('[data-chest-result]').textContent=next.gold>0?'+'+next.gold+' altın hesabına eklendi!':'Bu sandığın ödülü daha önce hesabına eklendi.';b.textContent='Harika! Devam et';b.disabled=false;b.onclick=()=>view.close();paintTime();document.dispatchEvent(new Event('dm:time'));}catch(e){view.el.querySelector('[data-chest-result]').textContent=e.message;b.disabled=false;}};
}

function paintTime(){
 if(!timeView)return;const {view,owner:at}=timeView;
 if(at!==who()||!ready()){view.close();timeView=null;return;}
 if(!view.el.isConnected){timeView=null;return;}
 const d=summary(),seconds=Math.max(0,Math.floor(Number(d.seconds)||0)),running=active()&&initialized,root=view.el;d.chestCount=Math.floor(seconds/6000);
 const text=(key,value)=>root.querySelector('[data-time="'+key+'"]').textContent=value;
 text('stars',d.stars);text('hours',String(Math.floor(seconds/3600)).padStart(2,'0'));text('minutes',String(Math.floor(seconds%3600/60)).padStart(2,'0'));text('seconds',String(seconds%60).padStart(2,'0'));
 text('status',running?'Her saniye yeni bir başarıya!':'Süre duraklatıldı · Devam etmek için ekrana dokun');
 root.querySelector('.dm-time-live').classList.toggle('is-paused',!running);
 const clock=root.querySelector('.dm-time-clock');clock.classList.toggle('is-paused',!running);
 for(const [kind,angle] of [['hour',(seconds%43200)/120],['minute',(seconds%3600)/10],['second',(seconds%60)*6]])root.querySelector('.dm-clock-'+kind).setAttribute('transform','rotate('+angle+' 60 60)');
 root.querySelector('.dm-clock-progress').style.strokeDashoffset=String(283*(1-seconds%60/60));
 const left=6000-seconds%6000;root.querySelector('progress').value=seconds%6000;text('remaining',Math.floor(left/60)+' dk '+String(left%60).padStart(2,'0')+' sn');
 const key=JSON.stringify([d.baseChest,d.chestCount,d.claimed]);if(key===timeView.chestKey)return;timeView.chestKey=key;
 const box=root.querySelector('.dm-time-chests');box.replaceChildren();let found=false;
 for(let i=(d.baseChest||0)+1;i<=d.chestCount;i++){
  if(d.claimed.includes(i))continue;found=true;const tier=Math.min(4,Math.floor((i-d.baseChest-1)/5)),b=document.createElement('button');b.type='button';b.textContent=['🥉 Bronz','🥈 Gümüş','🥇 Altın','💎 Kristal','👑 Efsane'][tier]+' sandığı aç';
  b.onclick=()=>chestCeremony(i);box.append(b);
 }
 if(!found)box.textContent='Öğrenmeye devam et, sıradaki sandık seni bekliyor!';
}
async function panel(){
 if(!ready())return;const at=who();await flush();if(owner!==at)await flush();if(at!==who()||!ready())return;
 const view=window.dmMemberUI.sheet('Öğrenmeye ayırdığın zaman','<div class="dm-time-summary">'+clockMarkup()+'<div class="dm-time-stars">⭐ <b data-time="stars">0</b><span>YILDIZ TOPLADIN</span></div><div class="dm-time-digits" role="timer" aria-label="Toplam aktif öğrenme süresi" aria-live="off"><span><b data-time="hours">00</b><small>SAAT</small></span><i>:</i><span><b data-time="minutes">00</b><small>DAKİKA</small></span><i>:</i><span class="dm-time-seconds"><b data-time="seconds">00</b><small>SANİYE</small></span></div><div class="dm-time-live"><span></span><b data-time="status"></b></div><p>10 aktif dakika = 1 yıldız · 100 aktif dakika = 1 sandık</p><div class="dm-time-goal"><span>🎁 Sıradaki sandığa</span><b data-time="remaining"></b></div><progress max="6000" value="0" aria-label="Bir sonraki sandığa ilerleme"></progress></div><div class="dm-time-chests"></div>','dmTimePanel');
 timeView={view,owner:at,chestKey:null};paintTime();
 view.el.addEventListener('dm:sheet-close',()=>{if(timeView?.view===view)timeView=null;},{once:true});
}
setInterval(()=>{const now=performance.now(),delta=Math.min(2000,now-last);last=now;if(owner!==who()){chestView?.close();chestView=null;earnedChest=0;owner=who();state=null;pending=0;request=null;initialized=false;seq=0;touch();if(ready())flush();}if(active()&&initialized)pending+=delta;if(ready()&&navigator.onLine!==false&&(!initialized||pending>=30000)&&!document.hidden)flush();paintTime();},1000);
document.addEventListener('dm:login',()=>{chestView?.close();chestView=null;earnedChest=0;initialized=false;state=null;pending=0;request=null;touch();flush()});
window.dmActiveTime={summary,panel,active,flush};
})();
