/* Optional games initialize once, when their tab or public opener is used. */
(()=>{'use strict';
  const premiumFile='premium-word-match.js?v=20261113-no-jokers';
  const introFile='premium-intro.js?v=20261111-paket';
  const files=['solo-arcade.js?v=20261111-papi','harf-bahcesi.js?v=20261111-papi','papi-cards.js?v=20261107-scored-rounds','meteor.js?v=20261112-kalan','word-wheel.js?v=20261016-ten-seconds','kelime-rallisi.js?v=20261112-kart-a'];
  const loaded=new Set();let pending=null,readyDone=false;
  function script(src){window.dmLateCss?.();return new Promise((resolve,reject)=>{
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
      await (flightLoading??=Promise.all([script(introFile),script('premium-cloud-flight.js?v=20261111-paket')]).catch(error=>{flightLoading=null;throw error;}));
      if(owner!==(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi))return;
      if(window.premiumBulutUcusuAc!==flightProxy)await window.premiumBulutUcusuAc();
    }catch(error){window.yoToast?.(error.message);}
  };
  window.premiumBulutUcusuAc=flightProxy;
  let blocksLoading;
  const blocksProxy=async ()=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (blocksLoading??=Promise.all([script(introFile),script('premium-word-blocks.js?v=20261111-paket')]).catch(error=>{blocksLoading=null;throw error;}));
      if(owner===(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi)&&window.premiumKelimeBloklariAc!==blocksProxy)await window.premiumKelimeBloklariAc();
    }catch(error){window.yoToast?.(error.message);}
  };
  window.premiumKelimeBloklariAc=blocksProxy;
  let papizzleLoading;
  const papizzleProxy=async ()=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (papizzleLoading??=Promise.all([script(introFile),script('papizzle.js?v=20261111-paket')]).catch(error=>{papizzleLoading=null;throw error;}));
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
