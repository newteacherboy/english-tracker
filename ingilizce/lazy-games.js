/* Optional games initialize once, when their tab or public opener is used. */
(()=>{'use strict';
  const files=['harf-bahcesi.js?v=20261013-review','papi-cards.js?v=20261013-review','meteor.js?v=20261013-review','word-wheel.js?v=20261016-ten-seconds','kelime-rallisi.js?v=20261020-slow'];
  const loaded=new Set();let pending=null,readyDone=false;
  function script(src){return new Promise((resolve,reject)=>{
    if(loaded.has(src)){resolve();return;}
    const el=document.createElement('script');el.src=src;el.async=false;
    el.onload=()=>{loaded.add(src);resolve();};
    el.onerror=()=>{el.remove();reject(Error('Oyun dosyası yüklenemedi. Bağlantını kontrol edip tekrar dene.'));};
    document.head.append(el);
  });}
  function ready(){if(pending)return pending;pending=(async()=>{
    // Start all independent downloads together; async=false retains execution order.
    await Promise.all(files.map(script));
    readyDone=true;
    window.dmGamesUI?.refresh();window.dmProgression?.paint();
    document.dispatchEvent(new Event('dm:state'));
  })().catch(e=>{pending=null;throw e;});return pending;}
  function opener(read){const proxy=async function(...args){
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{await ready();if(owner!==(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi))return;
      const fn=read();if(fn===proxy||typeof fn!=='function')throw Error('Oyun açılamadı. Tekrar dene.');return fn(...args);
    }catch(e){window.yoToast?.(e.message);}
  };return proxy;}
  window.harfBahcesiAc=opener(()=>window.harfBahcesiAc);
  window.ralliOyunAc=opener(()=>window.ralliOyunAc);
  for(const name of ['dmPapiCards','dmMeteor','dmWordWheel'])window[name]={open:opener(()=>window[name].open),close(){}};
  const tab=document.getElementById('tab-aktiviteler');
  const check=()=>{if(!readyDone&&tab?.classList.contains('active'))ready().catch(e=>window.yoToast?.(e.message));};
  if(tab)new MutationObserver(check).observe(tab,{attributes:true,attributeFilter:['class']});
  window.dmLazyGames={ready};check();
})();
