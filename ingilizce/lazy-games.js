/* Optional games initialize once, when their tab or public opener is used. */
(()=>{'use strict';
  const premiumFile='premium-word-match.js?v=20261114-flow';
  const introFile='premium-intro.js?v=20261114-daily-one-card';
  const files=['solo-arcade.js?v=82a3b3891e','harf-bahcesi.js?v=b936541467','papi-cards.js?v=b9d02db518','meteor.js?v=9460b40009','word-wheel.js?v=dc87a710bb','kelime-rallisi.js?v=20261118-hiz'];
  const loaded=new Set(),loading=new Map();let pending=null,readyDone=false;
  function script(src){window.dmLateCss?.();if(loaded.has(src))return Promise.resolve();if(loading.has(src))return loading.get(src);const task=new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=src;el.async=false;
    el.onload=()=>{loaded.add(src);resolve();};
    el.onerror=()=>{el.remove();reject(Error('Oyun dosyası yüklenemedi. Bağlantını kontrol edip tekrar dene.'));};
    document.head.append(el);
  }).finally(()=>loading.delete(src));loading.set(src,task);return task;}
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
  // Premium's own module loads on demand. Never wait for unrelated games to parse.
  // This reduces peak CPU/memory usage when opening the candy board on iOS.
  const premiumProxy=async (...args)=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await Promise.all([script(introFile),script(premiumFile)]);
      if(owner!==(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi))return;
      const fn=window.premiumKelimeEslestirmeAc;
      if(fn===premiumProxy||typeof fn!=='function')throw Error('Candy Papiş açılamadı.');
      return fn(...args);
    }catch(e){window.yoToast?.(e.message||'Oyun yüklenemedi.');}
  };
  window.premiumKelimeEslestirmeAc=premiumProxy;
  let flightLoading;
  const flightProxy=async ()=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (flightLoading??=Promise.all([script(introFile),script('premium-cloud-flight.js?v=20261118-hiz')]).catch(error=>{flightLoading=null;throw error;}));
      if(owner!==(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi))return;
      if(window.premiumBulutUcusuAc!==flightProxy)await window.premiumBulutUcusuAc();
    }catch(error){window.yoToast?.(error.message);}
  };
  window.premiumBulutUcusuAc=flightProxy;
  let blocksLoading;
  const blocksProxy=async ()=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (blocksLoading??=Promise.all([script(introFile),script('premium-word-blocks.js?v=20261114-flow')]).catch(error=>{blocksLoading=null;throw error;}));
      if(owner===(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi)&&window.premiumKelimeBloklariAc!==blocksProxy)await window.premiumKelimeBloklariAc();
    }catch(error){window.yoToast?.(error.message);}
  };
  window.premiumKelimeBloklariAc=blocksProxy;
  let papizzleLoading;
  const papizzleProxy=async ()=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (papizzleLoading??=Promise.all([script(introFile),script('papizzle.js?v=c74c21cb87')]).catch(error=>{papizzleLoading=null;throw error;}));
      if(owner===(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi)&&window.papizzleAc!==papizzleProxy)await window.papizzleAc();
    }catch(error){window.yoToast?.(error.message);}
  };
  window.papizzleAc=papizzleProxy;
  window.papiFeneriAc=opener(()=>window.papiFeneriAc);
  window.canavarAvcisiAc=opener(()=>window.canavarAvcisiAc);
  window.dengesizKuleAc=opener(()=>window.dengesizKuleAc);
  window.harfBahcesiAc=opener(()=>window.harfBahcesiAc);
  window.ralliOyunAc=opener(()=>window.ralliOyunAc);
  for(const name of ['dmPapiCards','dmMeteor','dmWordWheel'])window[name]={open:opener(()=>window[name].open),close(){}};
  const tab=document.getElementById('tab-aktiviteler');
  const check=()=>{if(!readyDone&&tab?.classList.contains('active'))ready().catch(e=>window.yoToast?.(e.message));};
  if(tab)new MutationObserver(check).observe(tab,{attributes:true,attributeFilter:['class']});
  window.dmLazyGames={ready};check();
})();
