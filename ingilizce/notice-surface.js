/* Shared Papi notice surfaces: one visible item across both screen edges.
   Existing nodes/handlers are retained; account state and read receipts stay with their owner. */
(()=>{'use strict';
const SELECTOR='#duyuruOverlay,#dmWeeklyPanel,#dmNudge,#dmPlacementInvite,#dmEmailVerification,#dmEmailGuide,#dmLeagueMomentum,#dmHabitGreet,#dmHabitBreak,#dmWeekDone,.dm-notification,.cb-kart,.tv-kart,.bk-kart,.yo-davet,.dv-perde,#dmInlineNotice,.yo-toast,.uy-serit,.dm-leader-bonus,#medu-offline-notice,#cpBanner,#dm-app-update,.dm-papi-feedback.is-energy,.dm-friends-welcome,[data-papi-notice]';
const PANEL='.duy3-card,.dm-weekly-card,.dm-nudge-card,.dm-member-sheet,.dm-momentum-panel,.wd-card,.dm-papi-feedback-card,.dm-safety-card,.deg-dialog,.dv-kart';
const CLOSE='.duy3-close,.dm-member-close,.dm-final-close,.dm-momentum-close,.dm-habit-x,.dm-notif-close,.dm-nudge-x,.dm-safety-close,.deg-close,.cb-x,.tv-x,[data-notice-close],button[aria-label="Kapat"],button[aria-label="Duyuruyu kapat"]';
const actor=()=>window.dmTeacherPortalSession?.teacherToken||localStorage.getItem('ing_token')||sessionStorage.getItem('ing_ogr_token')||'';
const records=new Map();let active=null,owner=actor(),sequence=0,nextAt=0,scheduled=false,audio=null,unlocked=false,lastSound=0;
const visible=e=>!!e?.isConnected&&!e.hidden&&e.getClientRects().length>0&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
const operational=e=>e.matches('#medu-offline-notice,#cpBanner,.dm-papi-feedback.is-energy')||/hata|başarısız|yetersiz|bulunamadı|bağlantı|enerji.{0,24}(bitti|gerekli|yok)/i.test((e.textContent||'').slice(0,700));
const requested=e=>e.isConnected&&!e.hidden&&e.style.display!=='none'&&(!e.matches('#duyuruOverlay')||e.style.display==='flex');
function muted(){return window.dmSoundEnabled===false||window.dmSesAcik===false||localStorage.getItem('dm_sound_muted')==='1';}
function unlock(){unlocked=true;if(muted())return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audio=audio||new Audio();if(audio?.state==='suspended')void audio.resume().catch(()=>{});}catch{}}
function sound(kind){
 if(!unlocked||muted()||Date.now()-lastSound<100)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=audio||new Audio();if(audio.state!=='running'){void audio.resume().catch(()=>{});if(audio.state!=='running')return;}
 lastSound=Date.now();const now=audio.currentTime;
 (kind==='open'?[660,880]:[660,520]).forEach((frequency,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),at=now+i*.075;osc.type='sine';osc.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.025,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+.105);osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.12);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
 }catch{/* Audio availability never blocks the notice. */}
}
function edge(el){return el.dataset.noticeEdge|| (el.matches('.dm-notification,.cb-kart,.tv-kart,.bk-kart,.yo-davet,.dv-perde,#dmInlineNotice,.yo-toast,.uy-serit,.dm-leader-bonus,#medu-offline-notice,#cpBanner,#dm-app-update,#dmHabitGreet')?'top':'bottom');}
function decorate(el){
 if(el.dataset.noticeSurface==='papi-v2'){const panel=el.querySelector('.dm-notice-panel');if(panel)return {panel,close:panel.querySelector('.dm-notice-close'),progress:panel.querySelector('.dm-notice-progress')};}
 let panel=el.querySelector(PANEL);
 if(!panel){panel=document.createElement('section');while(el.firstChild)panel.append(el.firstChild);el.append(panel);}
 panel.classList.add('dm-notice-panel');
 const content=document.createElement('div');content.className='dm-notice-copy';while(panel.firstChild)content.append(panel.firstChild);panel.append(content);
 const hero=document.createElement('div');hero.className='dm-notice-hero';hero.setAttribute('aria-hidden','true');
 const img=document.createElement('img');img.src='papi-welcome-v2.png';img.alt='';img.width=192;img.height=192;hero.append(img);panel.prepend(hero);
 let close=content.querySelector(CLOSE);
 if(!close){close=document.createElement('button');close.type='button';close.textContent='×';close.dataset.noticeClose='';close.onclick=()=>{if(el.id==='duyuruOverlay')window.duyuruKapat?.();else el.remove();};}
 close.classList.add('dm-notice-close');close.setAttribute('aria-label','Duyuruyu kapat');panel.append(close);
 // A plain text status gets a separate title and action, never interpreted as HTML.
 if(!content.querySelector('h2,h3,strong,b')){const title=document.createElement('h2');title.textContent=el.dataset.noticeTitle||'Papi’den bildirim';content.prepend(title);}
 if(!content.querySelector('button')){const done=document.createElement('button');done.type='button';done.className='dm-notice-done';done.textContent='Tamam';done.onclick=()=>close.click();content.append(done);}
 const progress=document.createElement('div');progress.className='dm-notice-progress';progress.setAttribute('aria-hidden','true');progress.append(document.createElement('i'));panel.append(progress);
 el.classList.add('dm-notice-managed','dm-notice-edge-'+edge(el));
 el.dataset.noticeSurface='papi-v2';
 el.addEventListener('click',event=>{const b=event.target.closest?.('button');if(active===el&&b&&!b.disabled&&(b===close||b.matches('.dm-final-ready,.dm-nudge-skip,.dm-momentum-later,.dm-habit-x,.cp-dismiss,.dv-vaz,#yoDavetHayir')||/^(tamam|anladım|okudum|şimdilik kapat|kapat|[×✕x])/i.test((b.textContent||'').trim())))sound('close');},true);
 return {panel,close,progress};
}
function adopt(el){
 if(!el?.matches?.(SELECTOR)||records.has(el)||!requested(el))return;
 const r={...decorate(el),el,owner:actor(),order:sequence++,started:false,priority:el.id==='duyuruOverlay'?1:el.dataset.noticePriority==='0'?0:operational(el)?2:3};records.set(el,r);
 el.classList.add('dm-notice-waiting');el.setAttribute('aria-hidden','true');schedule();
}
function externalDialog(el){return [...document.querySelectorAll('[role="dialog"],[aria-modal="true"],.rubric-modal,.rubric-overlay,.kb-perde,#dmEmailGuide')].some(d=>!d.closest('.dm-notice-managed')&&!el.contains(d)&&visible(d));}
function blocked(el){
 if(document.hidden||window.dmPapiTour?.active?.()||window.dmContactFrozen)return true;
 const urgent=operational(el);
 if(!urgent&&(window.dmPapiNotices?.inActivity?.()||[...document.querySelectorAll('input:focus,textarea:focus,select:focus')].some(input=>!el.contains(input))))return true;
 if(!(urgent&&window.dmPapiNotices?.inActivity?.())&&externalDialog(el))return true;
 return false;
}
function hide(el){el.classList.remove('dm-notice-visible');el.classList.add('dm-notice-waiting');el.setAttribute('aria-hidden','true');}
function reset(){for(const [el]of records){if(el.id==='duyuruOverlay'){el.style.display='none';hide(el);}else el.remove();}records.clear();active=null;nextAt=0;owner=actor();}
function pump(){
 scheduled=false;if(owner!==actor()){reset();return;}
 for(const [el]of records)if(!requested(el)){if(active===el){active=null;nextAt=Date.now()+600;}el.classList.remove('dm-notice-visible','dm-notice-waiting');el.removeAttribute('aria-hidden');records.delete(el);}
 if(active){if(blocked(active)||active.classList.contains('dm-papi-held')){hide(active);active=null;}else return;}
 if(Date.now()<nextAt)return;
 const candidate=[...records.values()].filter(r=>r.owner===owner&&!blocked(r.el)&&!r.el.classList.contains('dm-papi-held')).sort((a,b)=>a.priority-b.priority||a.order-b.order)[0];
 if(!candidate)return;active=candidate.el;active.classList.remove('dm-notice-waiting');active.classList.add('dm-notice-visible');active.removeAttribute('aria-hidden');
 if(!candidate.started){candidate.started=true;sound('open');}
 // Do not take focus from typing or gameplay; bottom panels behave as dialogs.
 if(edge(active)==='bottom'){active.setAttribute('role','dialog');active.setAttribute('aria-modal','true');if(!active.contains(document.activeElement))candidate.close.focus({preventScroll:true});}
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(pump);}
function isVisible(el){return active===el&&requested(el)&&!document.hidden&&!blocked(el)&&!el.classList.contains('dm-papi-held')&&visible(el);}
function later(el,run,delay){let left=Math.max(0,delay),last=Date.now();const tick=()=>{if(!el.isConnected)return;const now=Date.now(),delta=Math.min(500,now-last);last=now;if(records.has(el)?isVisible(el):visible(el)&&!document.hidden&&!window.dmPapiNotices?.inActivity?.())left-=delta;if(left<=0){run();return;}setTimeout(tick,100);};return setTimeout(tick,100);}
function progress(el,ratio){const r=records.get(el);if(r)r.progress.firstChild.style.width=Math.max(0,Math.min(1,ratio))*100+'%';}
function notify(message,{title='Papi’den bildirim',edge='top',duration=10000}={}){
 const text=String(message??'').trim();if(!text)return null;
 const duplicate=[...records.keys()].find(e=>e.dataset.noticeMessage===text);if(duplicate)return duplicate;
 const el=document.createElement('aside');el.dataset.papiNotice='';el.dataset.noticeMessage=text;el.dataset.noticeTitle=title;el.dataset.noticeEdge=edge;el.setAttribute('role','status');
 const p=document.createElement('p');p.textContent=text;el.append(p);document.body.append(el);adopt(el);if(duration>0)later(el,()=>el.remove(),duration);return el;
}
function scan(node){if(node.nodeType!==1)return;adopt(node);for(const el of node.querySelectorAll(SELECTOR))adopt(el);}
new MutationObserver(ms=>{for(const m of ms){if(m.type==='childList')for(const node of m.addedNodes)scan(node);else if(m.target.matches?.(SELECTOR))adopt(m.target);}schedule();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
window.dmNoticeSurface={adopt,notify,isVisible,later,progress,reset,busy:()=>!!active};
function install(){for(const name of ['maToast','dcToastGoster'])if(typeof window[name]==='function'&&!window[name].dmNoticeWrapped){const fn=message=>notify(message);fn.dmNoticeWrapped=true;window[name]=fn;}scan(document.body);}
document.addEventListener('pointerdown',unlock,{capture:true,passive:true});document.addEventListener('keydown',unlock,true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!active)return;const r=records.get(active);if(r?.close&&!r.close.disabled){e.preventDefault();e.stopImmediatePropagation();r.close.click();}},true);
document.addEventListener('dm:login',()=>{if(owner!==actor())reset();install();});document.addEventListener('DOMContentLoaded',install,{once:true});document.addEventListener('visibilitychange',schedule);install();setInterval(pump,250);
})();
