/* DijiMedu shared Papi answer feedback: presentation only; no scoring or navigation side effects. */
(()=>{'use strict';
let timer=null,root=null,lastCorrectAt=0;
const PAPI='parkur-map-papi-v1.svg';
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
 window.dmStartSpotlight?.stop();
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
 const study=document.createElement('button');study.type='button';study.className='dm-energy-study';study.textContent='📚 Ders Çalış’a git';study.onclick=()=>{remove();window.dmThematicLearning?.close(true);window.dmStoryPath?.close(true);for(const name of ['kelimeYarismasiKapat','jpOyunKapat','boslukOyunKapat','hafizaOyunKapat','yagmurOyunKapat','asmacaOyunKapat','kelimebulOyunKapat','esOyunKapat','trenOyunKapat'])window[name]?.();document.querySelector('#bzCik')?.click();window.dersCalisTamEkranAc?.();};
 card.append(options,status,study,card.querySelector('.dm-papi-feedback-close'));void energyLimit(status);window.dmNoticeSurface?.adopt(root);card.querySelector('button')?.focus();
}
function notice(message){const text=String(message||'').slice(0,500);if(/bugünün keşif görevleri|günlük hedefini tamamladın|yeni karakter|karakter açtın|bu haftanın hedefi/i.test(text))return;if(/enerji.*(bitti|yetersiz|gerekli|yok)|yeterli.*enerji/i.test(text)){energy();return;}if(window.dmNoticeSurface){window.dmNoticeSurface.notify(text,{kind:'feedback'});return;}document.getElementById('dmInlineNotice')?.remove();const el=document.createElement('div');el.id='dmInlineNotice';el.className='dm-inline-notice';el.setAttribute('role','status');el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),3500);}
document.addEventListener('dm:login',()=>{window.dmLastEnergyValue=undefined;remove();});
window.DijiMeduPapiFeedback={correct,wrong,energy,energyLimit,energyDenied,notice,close:remove};
})();
