/* DijiMedu shared Papi answer feedback: presentation only; no scoring or navigation side effects. */
(()=>{'use strict';
let timer=null,root=null,lastCorrectAt=0;
const PAPI='parkur-map-papi-v1.svg';

const ENERGY_STYLE = `
/* Approved Diji Medu Energy Pause 01: accessible, responsive reward sheet. */
.dm-papi-feedback.is-energy{background:rgba(38,17,83,.56)!important;backdrop-filter:blur(5px);display:flex!important;align-items:center!important;justify-content:center!important;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px calc(env(safe-area-inset-bottom,0px) + 10px)!important;box-sizing:border-box!important;inset:0!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-card{position:relative!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;width:min(100%,420px)!important;max-width:420px!important;max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))!important;overflow-y:auto!important;overflow-x:hidden!important;box-sizing:border-box!important;padding:140px 16px 14px!important;border:2px solid #e5c9ff!important;border-radius:30px!important;background:linear-gradient(180deg,#bba3ff 0,#f1dcff 29%,#fffaff 58%,#f2e7ff 100%)!important;box-shadow:0 22px 65px rgba(49,18,106,.4)!important;color:#491c84!important;text-align:center!important;gap:7px!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-card:before{content:"";position:absolute;top:0;left:0;right:0;height:146px;background:radial-gradient(circle at 14% 24%,#fff7ba 0 4px,transparent 6px),radial-gradient(circle at 80% 36%,#fff9d9 0 5px,transparent 7px),linear-gradient(125deg,#7946e8,#ae7eff 60%,#dfb5ff);border-radius:27px 27px 44% 12%/27px 27px 20% 9%}
.dm-papi-feedback.is-energy .dm-papi-feedback-mascot{display:block!important;position:absolute!important;top:5px!important;left:50%!important;transform:translateX(-50%)!important;height:128px!important;max-height:128px!important;width:auto!important;z-index:1!important;object-fit:contain!important;filter:drop-shadow(0 6px 9px #421b7c66)!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-mark{position:absolute!important;top:80px!important;right:16%!important;z-index:2!important;display:grid!important;place-items:center!important;min-width:66px!important;height:39px!important;background:linear-gradient(#fff2ad,#ffbc30)!important;border:3px solid white!important;border-radius:28px!important;box-shadow:0 5px 0 #ea8c14!important;color:#512477!important;font-size:17px!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-mark:after{content:" +7";font-weight:900}
.dm-papi-feedback.is-energy .dm-papi-feedback-card>strong{display:block!important;position:relative!important;margin:2px 0 0!important;font:900 clamp(22px,6vw,28px)/1.12 system-ui,sans-serif!important;color:#4c1889!important;letter-spacing:-.6px!important;text-shadow:0 2px #fff!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-card>p:not([data-energy-status]){margin:0 0 4px!important;font:600 12px/1.42 system-ui,sans-serif!important;color:#65438a!important}
.dm-papi-feedback.is-energy .dm-energy-options{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important;width:100%!important;margin:6px 0!important}
.dm-papi-feedback.is-energy .dm-energy-options button{min-height:70px!important;width:100%!important;padding:9px 3px!important;border:1px solid #e0c4ff!important;border-radius:16px!important;background:#fffaf5!important;color:#542288!important;font:800 11px/1.5 system-ui,sans-serif!important;box-shadow:0 3px 0 #dcc4fa!important;white-space:normal!important}
.dm-papi-feedback.is-energy .dmu-video,.dm-papi-feedback.is-energy [data-dm-test-ad="energy"]{order:0!important;display:block!important;min-height:48px!important;width:100%!important;margin:5px 0!important;padding:10px!important;border:2px solid #ffec87!important;border-bottom:4px solid #e58c0a!important;border-radius:18px!important;background:linear-gradient(110deg,#ffe638,#ffb918)!important;color:#4e2381!important;font:900 14px system-ui,sans-serif!important}
.dm-papi-feedback.is-energy .dm-energy-premium{display:block!important;width:100%!important;min-height:40px!important;padding:9px!important;margin:3px 0!important;border:1px solid #94e6df!important;background:linear-gradient(110deg,#e3fff7,#b8f2ea)!important;border-radius:16px!important;color:#06777d!important;font:800 13px system-ui,sans-serif!important}
.dm-papi-feedback.is-energy .dm-energy-pack-label{font:900 12px system-ui,sans-serif!important;margin-top:4px!important}
.dm-papi-feedback.is-energy .dm-energy-study{display:block!important;width:100%!important;min-height:34px!important;margin:2px 0!important;border:1px solid #d8bcfa!important;border-radius:14px!important;background:#f7efff!important;color:#56268e!important;font:700 12px system-ui,sans-serif!important}
.dm-papi-feedback.is-energy .dm-papi-feedback-close{display:block!important;position:static!important;min-height:34px!important;width:100%!important;margin:3px 0 0!important;padding:5px!important;border:1px solid #d5b1ef!important;border-radius:12px!important;background:#f4e5ff!important;color:#6a379d!important;font:800 12px system-ui,sans-serif!important}
.dm-papi-feedback.is-energy [data-energy-status]{margin:0!important;font:700 12px system-ui,sans-serif!important;color:#a24546!important}
@media(max-height:650px){.dm-papi-feedback.is-energy .dm-papi-feedback-card{padding-top:90px!important;gap:3px!important}.dm-papi-feedback.is-energy .dm-papi-feedback-card:before{height:95px}.dm-papi-feedback.is-energy .dm-papi-feedback-mascot{height:87px!important}.dm-papi-feedback.is-energy .dm-papi-feedback-mark{top:53px!important}.dm-papi-feedback.is-energy .dm-energy-options button{min-height:56px!important}}
`;
function ensureEnergyStyle(){if(document.getElementById('dm-energy-pause-01-style'))return;const css=document.createElement('style');css.id='dm-energy-pause-01-style';css.textContent=ENERGY_STYLE;document.head.append(css);}
let audioCtx=null;
function successSound(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioCtx=audioCtx||new Audio();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});const now=audioCtx.currentTime;[523.25,659.25,783.99].forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,now+i*.095);gain.gain.setValueAtTime(.0001,now+i*.095);gain.gain.exponentialRampToValueAtTime(.065,now+i*.095+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.095+.18);osc.connect(gain).connect(audioCtx.destination);osc.start(now+i*.095);osc.stop(now+i*.095+.2);});}catch{}}

function remove(){if(timer)clearTimeout(timer);timer=null;root?.remove();root=null;}
function mount(kind,title,detail){
 if(window.dmPapiTour?.active?.()){return null;}
 if(kind!=='energy'&&root?.isConnected&&root.classList.contains('is-energy'))return null;
 remove();root=document.createElement('div');root.className='dm-papi-feedback '+(kind==='energy'?'is-energy':kind==='wrong'?'is-wrong':'is-success');root.setAttribute('role',kind==='energy'?'dialog':'status');if(kind==='energy')root.setAttribute('aria-modal','true');
 const card=document.createElement('div');card.className='dm-papi-feedback-card';
 if(kind!=='energy'){root.style.cssText='position:fixed!important;left:50%!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom, 0px) + 76px)!important;transform:translateX(-50%)!important;max-width:min(92vw,340px)!important;width:max-content!important;pointer-events:none!important;z-index:2147483000!important';card.style.cssText='max-width:min(92vw,340px)!important;padding:8px 14px!important;min-height:0!important';}
 const mascot=document.createElement('img');mascot.className='dm-papi-feedback-mascot';mascot.src=PAPI;mascot.alt='Papi papağanı';mascot.onerror=()=>{mascot.style.display='none'};
 const mark=document.createElement('span');mark.className='dm-papi-feedback-mark';mark.textContent=kind==='energy'?'⚡':kind==='wrong'?'↻':'✓';mark.setAttribute('aria-hidden','true');
 const heading=document.createElement('strong');heading.textContent=title;
 const copy=document.createElement('p');copy.textContent=detail;
 card.append(mark,mascot,heading,copy);root.append(card);document.body.append(root);
 if(kind==='energy'){const close=document.createElement('button');close.type='button';close.className='dm-papi-feedback-close';close.textContent='Anladım';close.addEventListener('click',remove,{once:true});card.append(close);close.focus();}
 return card;
}
function correct({detail='',anchor=null,duration=1000,card=true}={}){
 if(window.dmPapiTour?.active?.())return;
 const at=Date.now();if(at-lastCorrectAt<450)return;lastCorrectAt=at;
 window.dmAnswerFeedback?.(true);
 anchor?.classList.add('dm-papi-correct-pulse');if(anchor)setTimeout(()=>anchor.classList.remove('dm-papi-correct-pulse'),650);
 if(!card)return; // Parkurlar kendi alt geri bildirimini gösterir; Papi kartı tekrar çıkmasın.
 if(!mount('correct','Harika!',detail||'Doğru cevap!'))return;
 timer=setTimeout(remove,Math.max(650,Math.min(duration,1800)));
}
function wrong({detail='Tekrar dene!',duration=1100}={}){window.dmAnswerFeedback?.(false);if(window.dmPapiTour?.active?.())return;if(!mount('wrong','Bir daha deneyelim!',detail))return;timer=setTimeout(remove,Math.max(700,Math.min(duration,1800)));}
async function energyLimit(status){
 if(!status)return;
 const message=await window.dmEkonomi?.paketUyarisi?.();
 if(message&&status.isConnected&&!status.textContent)status.textContent=message;
}
function energyDenied(error){
 if(error?.code==='enerji'||error?.energyEmpty||/yetersiz enerji|enerji.{0,24}(?:yetmiyor|yetersiz|bitti|gerekli)|enerjin.{0,18}(?:yetmiyor|yetersiz|bitti)/i.test(error?.message||''))window.dmEnerjiPaketPaneli?.();
}
function energy(){
 if(root?.isConnected&&root.classList.contains('is-energy')){window.dmNoticeSurface?.adopt(root);return root.querySelector('.dm-papi-feedback-card');}
 window.dmStartSpotlight?.stop();ensureEnergyStyle();
 const card=mount('energy','Papi ile enerji molası!','İlerlemen güvende. Kısa bir video izleyerek +7 enerji kazanabilir veya altınlarınla enerji alabilirsin.');if(!card)return;root.dataset.noticePriority='0';root.dataset.noticeEdge='bottom';
 const options=document.createElement('div');options.className='dm-energy-options';const status=document.createElement('p');status.dataset.energyStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const [amount,price] of [[5,230],[10,300],[15,460]]){
  const button=document.createElement('button');button.type='button';button.textContent='⚡ '+amount+' enerji · '+price+' altın';
  button.onclick=async()=>{
   const buttons=options.querySelectorAll('button');
   buttons.forEach(item=>item.disabled=true);
   status.textContent='';
   try {
    const bought=await window.enerjiPaketiAl?.(amount,message=>status.textContent=message);
    if(bought){if(card.isConnected)remove();}
    else if(!status.textContent)status.textContent='Enerji alınamadı. Tekrar dene.';
   } catch {
    status.textContent='Bağlantı kurulamadı. Enerji paketini tekrar deneyebilirsin.';
   } finally {
    buttons.forEach(item=>item.disabled=false);
   }
  };
  options.append(button);
 }
 const packLabel=document.createElement('div');packLabel.className='dm-energy-pack-label';packLabel.textContent='⚡ Altınlarınla enerji al';
 const premium=document.createElement('button');premium.type='button';premium.className='dm-energy-premium';premium.textContent='👑 Premium ol, sınırsız enerjin olsun';premium.onclick=()=>{remove();window.dmAndroidOpenPlans?.('enerji-molasi');};
 // Ders Çalış yalnızca öğretmen panelinde: enerji altınla ya da reklamla alınır (11 Kas 2026).
 card.append(premium,packLabel,options,status,card.querySelector('.dm-papi-feedback-close'));void energyLimit(status);window.dmNoticeSurface?.adopt(root);card.querySelector('button')?.focus();
}
function notice(message){const text=String(message||'').slice(0,500);if(/bugünün keşif görevleri|günlük hedefini tamamladın|yeni karakter|karakter açtın|bu haftanın hedefi/i.test(text))return;if(/enerji.*(bitti|yetersiz|gerekli|yok)|yeterli.*enerji/i.test(text)){energy();return;}if(window.dmNoticeSurface){window.dmNoticeSurface.notify(text,{kind:'feedback'});return;}document.getElementById('dmInlineNotice')?.remove();const el=document.createElement('div');el.id='dmInlineNotice';el.className='dm-inline-notice';el.setAttribute('role','status');el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),3500);}
document.addEventListener('dm:login',()=>{window.dmLastEnergyValue=undefined;remove();});
window.DijiMeduPapiFeedback={correct,wrong,energy,energyLimit,energyDenied,notice,close:remove};
})();
