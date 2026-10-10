/* Shared read-only in-game wallet overlay. No score changes. */
(()=>{'use strict';
const hud=document.createElement('div');hud.className='dm-papi-wallet';hud.setAttribute('aria-label','Enerji, altın ve XP');hud.hidden=true;
hud.innerHTML='<span data-pw="energy">⚡ —</span><span data-pw="gold">🪙 —</span><span data-pw="xp">✨ — XP</span>';
function run(){
 if(!document.body)return;
 if(!hud.isConnected)document.body.appendChild(hud);
 const selectors=['#dmStoryLesson','.ds-lesson-shell','.game-modal-content','#baOyunEkrani','.oyun-modal','[id*="OyunModal"]','[id*="oyunModal"]','[id*="OyunEkrani"]','.duello-oyun'];const inGame=selectors.some(sel=>{const el=document.querySelector(sel);return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';});
 hud.hidden=!inGame;
 if(!inGame)return;
 let y=typeof yo!=='undefined'?yo:null;
 const values={energy:typeof window.genelEnerjiKalan==='number'?'⚡ '+window.genelEnerjiKalan+'/'+(window.genelEnerjiMax||30):'⚡ —',gold:'🪙 '+(y&&Number.isFinite(Number(y.altin))?Math.round(Number(y.altin)):'—'),xp:'✨ '+(y&&Number.isFinite(Number(y.totalXp))?Math.round(Number(y.totalXp)):'—')+' XP'};
 for(const [kind,value] of Object.entries(values)){const el=hud.querySelector('[data-pw="'+kind+'"]');if(el&&el.textContent!==value){el.textContent=value;el.classList.remove('dm-pw-change');void el.offsetWidth;el.classList.add('dm-pw-change');}}
}
setInterval(run,900);document.addEventListener('DOMContentLoaded',run);
window.DijiMeduPapiWallet={refresh:run};
})();
