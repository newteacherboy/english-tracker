/* The walking Papi opens the existing dialogue journey directly. Premium Pro is verified by the server. */
(()=>{'use strict';
const who=()=>typeof aktifOgrenciAdi==='undefined'?'':String(aktifOgrenciAdi||''),token=()=>localStorage.getItem('ing_token')||'';
const legacyOpen=window.sohbetEkraniAc,legacyClose=window.sohbetEkraniKapat;
let accessOwner='',accessToken='',premiumView=null,opening=null,epoch=0;
const access=()=>!!who()&&who()===accessOwner&&token()===accessToken;
async function request(action,data={}){
 const owner=who(),auth=token(),ticket=epoch;
 const endpoint=typeof apiURL==='string'?apiURL.replace(/\/diji-api(?:\?.*)?$/,'/papi-chat'):'';
 if(!owner||!auth||!endpoint.endsWith('/papi-chat'))throw Error('Öğrenci hesabınla giriş yap.');
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-diji-token':auth},body:JSON.stringify({action:'dialogue_'+action,...data})});
 const d=await r.json();if(ticket!==epoch||owner!==who()||auth!==token())throw Error('Hesap değişti. Sohbeti yeniden aç.');
 if(!d.ok){if(d.code==='premium'){accessOwner='';accessToken='';paywall();}const e=Error(d.mesaj||'Sohbet kaydedilemedi. Tekrar dene.');e.code=d.code;throw e;}
 if(d.progress&&typeof yo!=='undefined'&&yo)yo.sohbet={...(yo.sohbet||{}),...d.progress};
 if(d.yo)window.dmApplyRewardState?.(d.yo,owner);
 return d;
}
function closePaywall(){premiumView?.remove();premiumView=null;document.documentElement.classList.remove('dm-papi-chat-open');}
function paywall(){
 document.querySelector('.ys-start-overlay')?.remove();closePaywall();if(document.getElementById('tab-sohbet')?.classList.contains('active'))legacyClose?.();
 const el=document.createElement('div');el.id='dmPapiChat';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','pcTitle');
 el.innerHTML='<section class="pc-shell"><header class="pc-header"><button type="button" data-pc-close aria-label="Kapat">‹</button><div><h1 id="pcTitle">Papi ile canlı sohbet</h1></div></header><main class="pc-content"><section class="pc-premium"><img src="profile-assets/papi-selam.png" alt="Papi" width="160" height="160"><span class="pc-premium-badge">👑 Premium Pro</span><h2>Papi ile İngilizce sohbet et!</h2><p>Papi ile canlı sohbet yalnızca Premium Pro üyelerine açık.</p><button type="button" data-pc-plans>Paketleri İncele</button><button type="button" class="pc-premium-later" data-pc-later>Parkura dön</button></section></main></section>';
 premiumView=el;document.body.append(el);document.documentElement.classList.add('dm-papi-chat-open');
 el.querySelector('[data-pc-close]').onclick=closePaywall;el.querySelector('[data-pc-later]').onclick=closePaywall;
 el.querySelector('[data-pc-plans]').onclick=()=>{closePaywall();if(window.DMSatis?.planlar)window.DMSatis.planlar('papi-sohbet','premium_pro');else window.dmAndroidOpenPlans?.('papi-sohbet');};
 el.addEventListener('keydown',e=>{if(e.key==='Escape')closePaywall();if(e.key==='Tab'){const b=[...el.querySelectorAll('button')],i=b.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();b.at(-1).focus();}else if(!e.shiftKey&&i===b.length-1){e.preventDefault();b[0].focus();}}});el.querySelector('[data-pc-plans]').focus();
}
async function open(){
 if(opening)return opening;
 const task=(async()=>{try{await request('status');accessOwner=who();accessToken=token();closePaywall();if(typeof legacyOpen==='function')legacyOpen();else throw Error('Sohbet haritası hazırlanıyor.');}catch(e){if(e.code!=='premium')window.yoToast?.(e.message||'Bağlantı kurulamadı.');}})();opening=task;
 try{await task;}finally{if(opening===task)opening=null;}
}
function reset(){epoch++;accessOwner='';accessToken='';opening=null;closePaywall();document.querySelector('.ys-start-overlay')?.remove();if(document.getElementById('tab-sohbet')?.classList.contains('active'))legacyClose?.();}
function close(){closePaywall();document.querySelector('.ys-start-overlay')?.remove();legacyClose?.();}
window.dmPapiChat={open,close,request,access};window.sohbetEkraniAc=open;window.sohbetEkraniKapat=close;
document.addEventListener('click',e=>{if(e.target.closest('[data-mode="sh"],#pkSekmeler [data-p="sh"]')){e.preventDefault();e.stopImmediatePropagation();void open();}},true);
document.addEventListener('dm:login',reset);window.addEventListener('dm:plan',()=>{epoch++;accessOwner='';accessToken='';});
})();
