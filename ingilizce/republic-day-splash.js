/* Special 29 Ekim opening theme. Automatically ends 2026-11-03 00:00 Europe/Istanbul. */
(()=>{'use strict';
 const ids=['splashEkrani','dmBootSplash','oturumYuklemeOverlay'];

 const end=Date.parse('2026-11-02T21:00:00Z'); // 03 November, 00:00 in Türkiye
 const observers=new Map();
 function turkiyeDay(){try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(_){return '';}}
 function active(){const d=turkiyeDay();return d>='2026-10-22'&&d<='2026-11-02';}
 function sync(){
  if(typeof document==='undefined'||!document.documentElement?.classList||typeof document.getElementById!=='function')return;
  const enabled=active();
  document.documentElement.classList.toggle('dm-republic-2026',enabled);
  for(const id of ids){
   const overlay=document.getElementById(id);
   if(!overlay)continue;
   let footer=overlay.querySelector?.('.dm-republic-footer');
   if(!enabled){footer?.remove();observers.get(id)?.disconnect();observers.delete(id);continue;}
   if(footer)continue;
   footer=document.createElement('div');
   footer.className='dm-republic-footer';
   footer.innerHTML='<div class="dm-republic-bar" aria-hidden="true"><div class="dm-republic-bar-fill"></div><span class="dm-republic-percent">0%</span></div><div class="dm-republic-loading">Giriş hazırlanıyor...</div>';
   overlay.appendChild(footer);
   const label=footer.querySelector('.dm-republic-percent');
   const update=()=>{const n=overlay.style.getPropertyValue('--dm-papi-progress').trim();if(label)label.textContent=/^(100|[1-9]?[0-9])%$/.test(n)?n:'0%';};
   update();
   if(typeof MutationObserver==='function'){const observer=new MutationObserver(update);observer.observe(overlay,{attributes:true,attributeFilter:['style']});observers.set(id,observer);}
  }
 }
 window.dmRepublicSplashSync=sync;
 sync();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 if(Date.now()<end&&typeof setTimeout==='function')setTimeout(sync,Math.max(0,end-Date.now()+1100));
})();
