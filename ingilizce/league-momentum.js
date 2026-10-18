/* Account-scoped, once-per-ranking-change league welcome, never an award. */
(()=>{'use strict';
if(window.dmLeagueMomentumActive)return;
window.dmLeagueMomentumActive=true;
if(!document.getElementById('dm-league-momentum-css')){const style=document.createElement('link');style.id='dm-league-momentum-css';style.rel='stylesheet';style.href='league-momentum.css?v=20261017-1';document.head.append(style);}
const KEY='dm.league.momentum.v1:';
let busy=false,epoch=0,lastCheck=0,queued=null;
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||'').trim();
const normalize=x=>String(x||'').trim().toLocaleLowerCase('tr-TR');
const store={read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}},
write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}};
function week(){if(typeof yoHaftaKodu==='function')return String(yoHaftaKodu());const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function allowed(){if(window.dmCommunicationNoticeRules?.league_momentum?.enabled===false)return false;return !!who()&&normalize(who())!=='teacher'&&!window.dmGuestMode&&document.getElementById('panel-alani')?.style.display==='block'&&window.dmProgression?.allowed?.('lig')!==false;}
function blocked(){return document.hidden||!!document.querySelector('#dmRouteChoice,#dmPlacementExam,#dmEmailVerification,#dmStoryLesson,#mlThemeList,.dm-member-overlay,#dmLeagueMomentum')||[...document.querySelectorAll('.dc-fullscreen-overlay.active')].some(el=>el.id!=='tab-meduakis');}
function close(){document.getElementById('dmLeagueMomentum')?.remove();}
function show(payload,owner){
 if(blocked()||!allowed()||normalize(who())!==owner)return false;
 const up=payload.to<payload.from,emoji=up?'🚀':'🏁';
 const overlay=document.createElement('div');
 overlay.id='dmLeagueMomentum';overlay.className='dm-league-momentum '+(up?'dm-momentum-up':'dm-momentum-down');
 overlay.setAttribute('role','presentation');
 overlay.innerHTML='<section class="dm-momentum-panel" role="dialog" aria-modal="true" aria-labelledby="dmMomentumHeading" aria-describedby="dmMomentumDetail">'+
 '<button type="button" class="dm-momentum-close" aria-label="Duyuruyu kapat">×</button>'+
 '<div class="dm-momentum-rings" aria-hidden="true"><span></span><span></span><span></span></div>'+
 '<div class="dm-momentum-medal" aria-hidden="true">'+emoji+'</div>'+
 '<small class="dm-momentum-eyebrow">🏆 LİGDE HAREKET VAR!</small>'+
 '<h2 id="dmMomentumHeading">'+(up?'Sıralamada yükseldin!':'Sıralama değişti!')+'</h2>'+
 '<p id="dmMomentumDetail"></p>'+
 '<div class="dm-momentum-ranks"><span><small>Önceki sıran</small><strong>'+payload.from+'.</strong></span><b aria-hidden="true">'+(up?'↑':'↓')+'</b><span><small>Yeni sıran</small><strong>'+payload.to+'.</strong></span></div>'+
 '<p class="dm-momentum-cheer">'+(up?'Harika ilerliyorsun! Düzenli öğrenmeye devam et.':'Yeni bir fırsat! Kendi hızında devam ederek yeniden yükselebilirsin.')+'</p>'+
 '<button type="button" class="dm-momentum-action">Ligi gör</button>'+
 '<button type="button" class="dm-momentum-later">Şimdilik kapat</button></section>';
 const detail=overlay.querySelector('#dmMomentumDetail');
 detail.textContent=payload.person?(up?payload.person+' adlı oyuncunun önüne geçtin.':payload.person+' adlı oyuncu sıralamada önüne geçti.'):(up?'Yolunda ilerledin ve yeni sırana ulaştın.':'Diğer oyuncular ilerledi, sıralamadaki yerin değişti.');
 const dismiss=()=>{close();};
 overlay.querySelector('.dm-momentum-close').onclick=dismiss;
 overlay.querySelector('.dm-momentum-later').onclick=dismiss;
 overlay.querySelector('.dm-momentum-action').onclick=()=>{dismiss();try{window.meduAkisAc?.();window.maSekmeSec?.('lig');}catch{}};
 overlay.onclick=e=>{if(e.target===overlay)dismiss();};
 overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
 document.body.append(overlay);
 overlay.querySelector('.dm-momentum-close').focus({preventScroll:true});
 return true;
}
async function check(force=false){
 if(!allowed()||document.hidden||busy)return;
 if(!force&&Date.now()-lastCheck<60000)return;
 const owner=normalize(who()),turn=epoch,key=KEY+owner;
 busy=true;lastCheck=Date.now();
 try{
   await window.maTumGetir?.();
   if(owner!==normalize(who())||turn!==epoch)return;
   // Invalidate the same brief cache used by the Friends league card.
   try{if(typeof maLigOnbellek!=='undefined')maLigOnbellek=null;}catch{}
   const rows=window.maLigSiralama?.().liste||[],me=rows.find(x=>x.benMi||normalize(x.ad)===owner);
   if(!me||rows.length<2||!Number.isInteger(Number(me.sira)))return;
   const current={week:week(),rank:Number(me.sira),league:String(me.kod||''),higher:rows.filter(x=>Number(x.sira)<Number(me.sira)).map(x=>normalize(x.ad)),seen:[],pending:null};
   const before=store.read(key);
   if(before&&before.week===current.week){
     current.seen=(Array.isArray(before.seen)?before.seen:[]).filter(x=>String(x).startsWith(day()+'|')).slice(-25);
     current.pending=before.pending||null;
     if(Number.isFinite(before.rank)&&before.rank!==current.rank){
       const better=current.rank<before.rank;
       const other=better
         ? rows.find(x=>(before.higher||[]).includes(normalize(x.ad))&&!current.higher.includes(normalize(x.ad)))
         : rows.find(x=>current.higher.includes(normalize(x.ad))&&!(before.higher||[]).includes(normalize(x.ad)));
       const id=day()+'|'+before.rank+'>'+current.rank+'|'+normalize(other?.ad||'');
       if(!current.seen.includes(id))current.pending={id,from:before.rank,to:current.rank,person:other?.ad||''};
     }
   }
   store.write(key,current);
   queued=current.pending?{owner,key}:null;
   if(queued)displayPending();
 }catch(e){console.warn('[Lig sıralaması]',e?.message||e)}
 finally{busy=false;}
}
function displayPending(){
 const owner=normalize(who()),key=KEY+owner,snapshot=store.read(key);
 if(!snapshot?.pending||!allowed()||blocked())return;
 const event=snapshot.pending;
 if(snapshot.seen?.includes(event.id)){snapshot.pending=null;store.write(key,snapshot);return;}
 if(show(event,owner)){
   snapshot.seen=[...(snapshot.seen||[]),event.id].slice(-25);
   snapshot.pending=null;
   store.write(key,snapshot);queued=null;
 }
}
document.addEventListener('dm:login',()=>{epoch++;lastCheck=0;close();queued=null;});
document.addEventListener('dm:friends-open',()=>{lastCheck=0;void check(true);displayPending();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)displayPending();});
// Do not poll or announce outside the Friends entry. Pending notices wait for it.
})();
