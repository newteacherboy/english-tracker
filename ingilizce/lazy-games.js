/* Optional games initialize once, when their tab or public opener is used. */
(()=>{'use strict';
  const premiumFile='premium-word-match.js?v=20261114-flow';
  const introFile='premium-intro.js?v=20261114-daily-one-card';
  const files=['solo-arcade.js?v=20261126-premium-retirement','papi-cards.js?v=b9d02db518','meteor.js?v=9460b40009','word-wheel.js?v=dc87a710bb'];
  const loaded=new Set(),loading=new Map(),pending=new Map(),readyDone=new Set();
  const classroom=()=>!!(window.dmTeacherPortalMode||typeof aktifOgrenciAdi!=='undefined'&&String(aktifOgrenciAdi).toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci);
  const mode=()=>window.dmTeacherPortalMode?'teacher':classroom()?'classroom':'student';
  function script(src){window.dmLateCss?.();if(loaded.has(src))return Promise.resolve();if(loading.has(src))return loading.get(src);const task=new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=src;el.async=false;
    el.onload=()=>{loaded.add(src);resolve();};
    el.onerror=()=>{el.remove();reject(Error('Oyun dosyası yüklenemedi. Bağlantını kontrol edip tekrar dene.'));};
    document.head.append(el);
  }).finally(()=>loading.delete(src));loading.set(src,task);return task;}
  function ready(){const current=mode();if(pending.has(current))return pending.get(current);const task=(async()=>{
    // Start all independent downloads together; async=false retains execution order.
    const selected=[...files,...(current!=='student'?['harf-bahcesi.js?v=20261126-teacher-only','kelime-rallisi.js?v=20261125-team-1']:[]),...(window.dmTeacherPortalMode?['mola-chapters.js?v=20261106-mola-15','mola-core.js?v=20261021-chapters-1','mola-vakti.js?v=20261126-teacher-only']:[])];
    if(window.dmTeacherPortalMode&&!document.querySelector('link[data-teacher-mola]')){const css=document.createElement('link');css.rel='stylesheet';css.href='mola-vakti.css?v=20261112-a';css.dataset.teacherMola='1';document.head.append(css);}
    await Promise.all(selected.map(script));
    readyDone.add(current);
    window.dmGamesUI?.refresh();window.dmProgression?.paint();
    document.dispatchEvent(new Event('dm:state'));
  })().catch(e=>{pending.delete(current);throw e;});pending.set(current,task);return task;}
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
  const flightProxy=async options=>{
    if(!classroom())return window.yoToast?.('Bu oyun artık öğrenci hesabında sunulmuyor.');
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (flightLoading??=Promise.all([script(introFile),script('premium-cloud-flight.js?v=20261125-team-1')]).catch(error=>{flightLoading=null;throw error;}));
      if(owner!==(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi))return;
      if(window.premiumBulutUcusuAc!==flightProxy)await window.premiumBulutUcusuAc(options);
    }catch(error){window.yoToast?.(error.message);}
  };
  window.premiumBulutUcusuAc=flightProxy;
  window.premiumKelimeBloklariAc=()=>window.yoToast?.('Bu oyun yayından kaldırıldı.');
  let papizzleLoading;
  const papizzleProxy=async options=>{
    const owner=typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi;
    try{
      await (papizzleLoading??=Promise.all([script(introFile),script('papizzle.js?v=20261125-team-1')]).catch(error=>{papizzleLoading=null;throw error;}));
      if(owner===(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi)&&window.papizzleAc!==papizzleProxy)await window.papizzleAc(options);
    }catch(error){window.yoToast?.(error.message);}
  };
  window.papizzleAc=papizzleProxy;
  const lanternProxy=opener(()=>window.papiFeneriAc);
  window.papiFeneriAc=(...args)=>classroom()?lanternProxy(...args):window.yoToast?.('Bu oyun artık öğrenci hesabında sunulmuyor.');
  const monsterProxy=opener(()=>window.canavarAvcisiAc);
  window.canavarAvcisiAc=(...args)=>window.dmTeacherPortalMode||typeof aktifOgrenciAdi!=='undefined'&&String(aktifOgrenciAdi).toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&siniftaOynananOgrenci?monsterProxy(...args):window.yoToast?.('Bu oyun artık öğrenci hesabında sunulmuyor.');
  window.dengesizKuleAc=()=>window.yoToast?.('Bu oyun yayından kaldırıldı.');
  const gardenProxy=opener(()=>window.harfBahcesiAc);
  window.harfBahcesiAc=(...args)=>(window.dmTeacherPortalMode||typeof aktifOgrenciAdi!=='undefined'&&String(aktifOgrenciAdi).toLowerCase()==='teacher'||typeof siniftaOynananOgrenci!=='undefined'&&!!siniftaOynananOgrenci)?gardenProxy(...args):window.yoToast?.('Bu oyun artık öğrenci hesabında sunulmuyor.');
  const rallyProxy=opener(()=>window.ralliOyunAc);
  window.ralliOyunAc=(...args)=>classroom()?rallyProxy(...args):window.yoToast?.('Bu oyun artık öğrenci hesabında sunulmuyor.');
  for(const name of ['dmPapiCards','dmMeteor','dmWordWheel'])window[name]={open:opener(()=>window[name].open),close(){}};
  const tab=document.getElementById('tab-aktiviteler');
  const check=()=>{if(!readyDone.has(mode())&&tab?.classList.contains('active'))ready().catch(e=>window.yoToast?.(e.message));};
  if(tab)new MutationObserver(check).observe(tab,{attributes:true,attributeFilter:['class']});
  window.dmLazyGames={ready};check();
})();
