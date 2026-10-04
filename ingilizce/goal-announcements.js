/* Once per member/day. First prompt 30s after login; next 30s after dismissing it. */
(function(){'use strict';
 const DELAY=30000,visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 let actor='',key='',record={},due=0,open=null,busy=false;
 const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function member(){if(window.dmGuestMode)return '';if(typeof aktifOgrenciAdi==='undefined'||!aktifOgrenciAdi||!visible(document.getElementById('panel-alani')))return '';if(typeof yo==='undefined'||!yo)return '';return String(aktifOgrenciAdi).trim().toLocaleLowerCase('tr');}
 function save(){try{localStorage.setItem(key,JSON.stringify(record));}catch{}}
 function blocked(){return document.hidden||[...document.querySelectorAll('.game-modal-overlay,.yo-modal.acik,.duy3-overlay,.kr-perde,#oturumYuklemeOverlay,#sifreIslemModal,#dmAccountSettings,#dmNudge,#dmLevelUp,#genelSonucOverlay,#bzAlan,#baOyunEkrani,#kpKelimeOyunEkrani,#seviyeDisLinkOverlay,.kart-oyun-overlay,#kmPanel .km-sec')].some(visible);}
 async function show(kind){
  busy=true;window.soPanelCiz?.()?.catch?.(()=>{});busy=false;
  if(!member()||blocked()||open||window.dmProgression&&!window.dmProgression.allowed(kind==='daily'?'gunluk_gorev':'haftalik_hedef'))return;
  const source=document.querySelector('#soPanel [data-dm-goals="'+kind+'"]');if(!source)return;
  const prior=document.activeElement,p=document.createElement('div');p.id='dmGoalAnnouncement';p.className='dm-goal-announcement';p.dataset.kind=kind;
  p.innerHTML='<section class="dm-goal-card" role="dialog" aria-modal="true" aria-labelledby="dmGoalTitle"><button class="dm-goal-close" aria-label="Duyuruyu kapat">×</button><header><img src="papi-welcome-v2.png" alt="Papi"><div><small>PAPİ’DEN SANA</small><h2 id="dmGoalTitle"></h2></div></header><p class="dm-goal-intro"></p><div class="dm-goal-content"></div><button class="dm-goal-continue">Tamam, hazırım!</button></section>';
  p.querySelector('h2').textContent=kind==='daily'?'Bugünün keşif görevleri':'Bu haftanın hedefi';
  p.querySelector('.dm-goal-intro').textContent=kind==='daily'?'Üç görevi tamamla, günün ödülünü kazan. İlerlemeni Sana Özel’den takip edebilirsin.':'Kendine uygun bir XP hedefi seç. Seçtiğin hedefi ve ilerlemeni Sana Özel’den takip edebilirsin.';
  function paint(){const src=document.querySelector('#soPanel [data-dm-goals="'+kind+'"]');if(!src)return;const clone=src.cloneNode(true),original=[...src.querySelectorAll('button')];clone.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));clone.querySelectorAll('button').forEach((b,i)=>{b.onclick=async()=>{b.disabled=true;original[i]?.click();window.soPanelCiz?.()?.catch?.(()=>{});if(kind==='weekly')close();else paint();};});p.querySelector('.dm-goal-content').replaceChildren(clone);}
  function close(){if(open!==p)return;document.removeEventListener('keydown',keys);p.remove();open=null;due=Date.now()+DELAY;record.nextAt=due;save();prior?.focus();}
  function keys(e){if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...p.querySelectorAll('button:not(:disabled),a[href]')],first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  paint();document.body.append(p);open=p;record[kind]=true;record.nextAt=null;save();p.querySelector('.dm-goal-close').onclick=close;p.querySelector('.dm-goal-continue').onclick=close;p.onclick=e=>{if(e.target===p)close();};document.addEventListener('keydown',keys);p.querySelector('.dm-goal-close').focus();
 }
 setInterval(()=>{
  const name=member();if(!name){if(open)open.querySelector('.dm-goal-close').click();actor='';return;}
  const nextKey='dm_goal_announcements_v1:'+encodeURIComponent(name)+':'+day();
  if(actor!==name||key!==nextKey){if(open)open.querySelector('.dm-goal-close').click();actor=name;key=nextKey;try{record=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{record={};}due=Math.max(Date.now()+DELAY,Number(record.nextAt)||0);}
  const eligible=kind=>!window.dmProgression||window.dmProgression.allowed(kind==='daily'?'gunluk_gorev':'haftalik_hedef');
  const kind=!record.daily&&eligible('daily')?'daily':!record.weekly&&eligible('weekly')?'weekly':null;
  if(open||busy||Date.now()<due||!kind||blocked())return;
  show(kind).catch(()=>{busy=false;due=Date.now()+2000;});
 },500);
})();
