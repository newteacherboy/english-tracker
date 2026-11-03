/* iOS 1.1 only. No DOM, storage, networking, or plugin registration before the gate. */
(() => {
  'use strict';
  const IDS = Object.freeze({
    odullu: 'ca-app-pub-3940256099942544/1712485313',
    banner: 'ca-app-pub-3940256099942544/2435281174',
    gecis: 'ca-app-pub-3940256099942544/4411468910'
  });
  if (!(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.isPluginAvailable?.('AdMob'))) return;
  const C = window.Capacitor;
  if (C.getPlatform?.() !== 'ios' || window.DijiReklam) return;
  const A = C.Plugins?.AdMob || C.registerPlugin?.('AdMob');
  if (!A) return;
  const SAFETY = {tagForChildDirectedTreatment:true,tagForUnderAgeOfConsent:true,maxAdContentRating:'G',npa:true};
  const SOLO = new Set(['ky','hafiza','yagmur','asmaca','kelimebul','jp','bosluk','eslestirme','tren','dikte','cumle','harfbahcesi','kulak','canavar','kule','kelime-golu','konu','mola','kp','ralli']);
  const who = () => typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi || '');
  const wallet = () => typeof yo === 'undefined' ? null : yo;
  const read = key => {try{return localStorage.getItem(key);}catch{return null;}};
  const visible = e => !!e && !e.hidden && e.getClientRects().length > 0 && !e.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]');
  const tell = text => window.DijiMeduPapiFeedback?.notice(text);
  let init, busy=false, ready=false, preparing=false, retry=0, sessionShows=0, rival=false;
  let bannerLoading=false;
  let banner=false,bannerWanted=false,bannerHeight=0,bannerRetry=0,bannerQueue=Promise.resolve(),revision=0;
  let rightsRetryAt=0;
  let rights=null,rightsOwner='',rightsDay='',rightsAt=0,rightsPending=null;
  let policyOwner='',policy={games:0,last:0,seen:[]};
  function reklamGosterilsinMi() {
    try {
      return !!(C.isNativePlatform?.() && C.isPluginAvailable?.('AdMob') && who() && read('ing_token') &&
        !['teacher','dijimedu_demo'].includes(who().toLowerCase()) && !window.dmTeacherPortalMode &&
        !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) &&
        !sessionStorage.getItem('ing_ogr_token') && !document.documentElement.matches('.dm-teacher-portal,.dm-teacher-child') &&
        !document.body.classList.contains('dm-teacher-mode') && !wallet()?.premium && !window.dmAdsDisabled);
    } catch {return false;}
  }
  function currentPolicy() {
    if(policyOwner!==who()) {
      policyOwner=who();ready=false;rival=false;
      try{policy=JSON.parse(read('dm_ios_ads:'+policyOwner)||'null');}catch{policy=null;}
      if(!policy || !Number.isFinite(policy.games) || !Number.isFinite(policy.last))policy={games:0,last:0,seen:[]};
      policy.games=Math.max(0,policy.games);policy.seen=Array.isArray(policy.seen)?policy.seen.slice(-100):[];
    }
    return policy;
  }
  function savePolicy(){try{localStorage.setItem('dm_ios_ads:'+policyOwner,JSON.stringify(policy));}catch{}}
  function day(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  async function api(islem,data={}) {
    const owner=who(),token=read('ing_token');
    if(!reklamGosterilsinMi())throw Error('Bu hesapta reklam kapalı.');
    const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem,...data,t:token}),signal:AbortSignal.timeout(15000)});
    const d=await r.json();
    if(owner!==who() || token!==read('ing_token') || !reklamGosterilsinMi())throw Error('Oturum değişti.');
    if(!r.ok||!d.ok)throw Error(d.mesaj||'İşlem tamamlanamadı.');
    return d;
  }
  async function hak(force=false,urun) {
    if(!force&&Date.now()<rightsRetryAt)throw Error('Hak bilgisi bekleniyor.');
    if(!urun&&!force&&rights&&rightsOwner===who()&&rightsDay===day()&&Date.now()-rightsAt<60000)return rights;
    if(!urun&&rightsPending)return rightsPending;
    const request=api('reklamHakki',{urun}).then(d=>{
      if(!urun){rights=d;rightsOwner=who();rightsDay=day();rightsAt=Date.now();}return d;
    }).catch(e=>{rightsRetryAt=Date.now()+60000;throw e;});
    if(urun)return request;
    rightsPending=request;try{return await request;}finally{rightsPending=null;}
  }
  function initialize() {
    if(!init)init=(async()=>{
      let consent=await A.requestConsentInfo({tagForUnderAgeOfConsent:true});
      if(consent.isConsentFormAvailable&&consent.status==='REQUIRED')consent=await A.showConsentForm();
      if(!consent.canRequestAds)throw Error('Reklam izni hazır değil.');
      // 8.3.0 translates General to GADMaxAdContentRating.general (G).
      await A.initialize({...SAFETY,maxAdContentRating:'General',initializeForTesting:true});
    })();
    return init; // A failed/denied session stays closed; never initialize twice.
  }
  const options = adId => ({...SAFETY,adId,isTesting:true});
  function obstructed() {
    return document.hidden || document.body.matches('.dm-play-session,.mv-active') ||
      [...document.querySelectorAll('[role="dialog"],.dm-session-surface,#genelSonucOverlay.acik,#yoModal.acik,#dmBagPage,.dm-papi-feedback,.game-modal-overlay,#kgOverlay,#mvOverlay,#harfBahcesiOverlay,#dmStoryLesson,#bzPerde,#mlThemeList')].some(visible);
  }
  function listVisible(){return visible(document.querySelector('#tab-aktiviteler.active'))&&!obstructed();}
  function bannerAllowed(){return reklamGosterilsinMi()&&!busy&&!obstructed()&&
    (listVisible()||visible(document.querySelector('#tab-magaza.active')));}
  function reserve(height) {
    if(bannerHeight===height)return;bannerHeight=height;
    document.documentElement.style.setProperty('--dm-ios-ad-height',height+'px');
    document.documentElement.classList.toggle('dm-ios-banner',height>0);
  }
  function setBanner(want) {
    bannerWanted=want;const rev=++revision;
    if(!want)reserve(0);
    bannerQueue=bannerQueue.catch(()=>{}).then(async()=>{
      if(rev!==revision)return;
      if(!want||!bannerAllowed()) {if(banner){await A.removeBanner();banner=false;}reserve(0);return;}
      if(banner||Date.now()<bannerRetry)return;
      bannerLoading=true;
      try {
        await initialize();if(rev!==revision||!bannerAllowed())return;
        await A.showBanner({...options(IDS.banner),adSize:'ADAPTIVE_BANNER',position:'BOTTOM_CENTER',margin:0});
        banner=true;
        if(rev!==revision||!bannerAllowed()){await A.removeBanner();banner=false;reserve(0);return;}
        reserve(bannerHeight||60);
      }catch{banner=false;reserve(0);bannerRetry=Date.now()+60000;}finally{bannerLoading=false;}
    }).catch(()=>{reserve(0);});
    return bannerQueue;
  }
  async function preload() {
    if(!reklamGosterilsinMi()||busy||ready||preparing||Date.now()<retry||sessionShows>=4)return;
    preparing=true;const owner=who();
    try{await initialize();if(!reklamGosterilsinMi()||owner!==who())return;await A.prepareInterstitial(options(IDS.gecis));ready=owner===who();}
    catch{retry=Date.now()+60000;ready=false;}finally{preparing=false;}
  }
  // Native events can precede the resolution of show(). Always install first and remove in finally.
  async function fullscreen(kind,onReward,onShown) {
    const reward=kind==='reward',prefix=reward?'onRewardedVideoAd':'interstitialAd';
    const handles=[];let timer,resolve,reject;
    const closed=new Promise((a,b)=>{resolve=a;reject=b;});closed.catch(()=>{});
    try {
      handles.push(await A.addListener(prefix+'Dismissed',resolve));
      handles.push(await A.addListener(prefix+'FailedToShow',()=>reject(Error('no-ad'))));
      if(reward)handles.push(await A.addListener('onRewardedVideoAdReward',onReward));
      if(onShown)handles.push(await A.addListener(prefix+'Showed',onShown));
      timer=setTimeout(()=>reject(Error('ad-timeout')),180000);
      await (reward?A.showRewardVideoAd():A.showInterstitial());
      await closed;
    }finally{clearTimeout(timer);await Promise.allSettled(handles.map(h=>h.remove()));}
  }
  async function odulluIzle(tur,urun) {
    if(!['enerji','altin'].includes(tur)||busy||!reklamGosterilsinMi())return;
    busy=true;const owner=who(),token=read('ing_token');let earned=false,result;
    try {
      await setBanner(false);
      const h=await hak(true,urun);
      if(!(h.kalan?.[tur]>0)||h.uygun?.[tur]===false){rights=null;document.querySelectorAll('[data-ios-ad]').forEach(e=>e.remove());tell('Bugünkü haklarını veya bakiyeni kontrol et.');return;}
      await initialize();await A.prepareRewardVideoAd(options(IDS.odullu));
      if(owner!==who()||token!==read('ing_token')||!reklamGosterilsinMi())return;
      await fullscreen('reward',()=>{earned=true;});
      if(!earned){tell('Ödül için videonun sonuna kadar izlemelisin.');return;}
      if(owner!==who()||token!==read('ing_token')||!reklamGosterilsinMi())return;
      // Only a Rewarded event permits this call; never infer it from show() resolving.
      const requestId=crypto.randomUUID();
      result=await api('reklamOdulu',{tur,urun,requestId});
      if(result.yo)window.dmApplyRewardState?.(result.yo,owner);
      window.genelEnerjiKalan=result.enerjiKalan;
      window.headerEnerjiGoster?.(result.enerjiKalan,25);
      window.yoArayuzTazele?.(); // papi-wallet reuses dmRewardFx.fly on the authoritative delta.
      if(tur==='enerji')window.DijiMeduPapiFeedback?.close();
      tell('+'+result.eklenen+' '+tur+' hesabına eklendi.');
      rights=null;document.querySelectorAll('[data-ios-ad]').forEach(e=>e.remove());
    }catch(e){tell(earned?(e.message||'Ödül kaydedilemedi.'):'Şu an video yok, biraz sonra tekrar dene.');}
    finally{busy=false;sync();}
    return result;
  }
  async function teklif(host,tur,urun) {
    if(!host||!reklamGosterilsinMi()||host.querySelector('[data-ios-ad="'+tur+'"]'))return;
    const owner=who();host.dataset.adPending=tur;
    try {
      const h=await hak(false,urun);
      if(!host.isConnected||owner!==who()||!reklamGosterilsinMi()||!(h.kalan?.[tur]>0)||h.uygun?.[tur]===false||host.querySelector('[data-ios-ad="'+tur+'"]'))return;
      const card=document.createElement('div');card.dataset.iosAd=tur;card.className='dm-ios-ad-offer';
      const button=document.createElement('button');button.type='button';button.textContent=tur==='enerji'?'🎬 Kısa video izle, +7 enerji':'🎬 Video izle, +100 altın';
      const count=document.createElement('small');count.textContent='Bugün kalan: '+h.kalan[tur];card.append(button,count);host.prepend(card);
      button.onclick=async()=>{button.disabled=true;await odulluIzle(tur,urun);card.remove();sync();};
    }catch{}finally{delete host.dataset.adPending;}
  }
  function altinEksik(urun) {
    if(!reklamGosterilsinMi())return;
    document.getElementById('dmIosGoldOffer')?.remove();
    const el=document.createElement('div');el.id='dmIosGoldOffer';el.setAttribute('role','dialog');el.className='dm-ios-gold-dialog';
    const card=document.createElement('section');card.innerHTML='<p>Bu ürün için altının yetmiyor.</p><button type="button">Kapat</button>';el.append(card);document.body.append(el);
    card.querySelector('button').onclick=()=>el.remove();void teklif(card,'altin',urun);sync();
  }
  function sonucHazir(o) {
    currentPolicy();
    if(!reklamGosterilsinMi()||rival||!SOLO.has(o?.oyunKey)||o.parkur||o.stopNo||o.intro||!(Number(o.dogru||0)+Number(o.yanlis||0)>0))return null;
    if(!document.querySelector('#tab-aktiviteler.active'))return null;
    return {id:String(o.runId||crypto.randomUUID()),owner:who(),at:Date.now()};
  }
  async function sonucKapandi(result,returnToList) {
    const p=currentPolicy();
    if(!result||!reklamGosterilsinMi()||result.owner!==who()||p.seen.includes(result.id))return;
    p.seen.push(result.id);p.seen=p.seen.slice(-100);p.games++;savePolicy();
    if(/kaydediliyor/.test(document.getElementById('dmRewardStatus')?.textContent||''))return;
    if(!returnToList||!ready||busy||p.games<3||sessionShows>=4||(p.last&&Date.now()-p.last<300000))return;
    // Wait for completed result/reward animations; cancel if navigation changed.
    const owner=who();await new Promise(r=>setTimeout(r,Math.max(100,1800-(Date.now()-result.at))));
    if(owner!==who()||!listVisible()||!reklamGosterilsinMi()||busy||!ready)return;
    if(document.querySelector('#dmRewardLayer .dm-reward-icon,[data-dm-counting]'))return;
    busy=true;ready=false;
    try {
      await setBanner(false);if(!listVisible()||owner!==who()||!reklamGosterilsinMi())return;
      let shown=false;
      await fullscreen('interstitial',null,()=>{if(shown)return;shown=true;p.games=0;p.last=Date.now();sessionShows++;savePolicy();});
    }catch{}finally{busy=false;sync();}
  }
  function sync() {
    currentPolicy();
    if(!reklamGosterilsinMi())document.querySelectorAll('[data-ios-ad],#dmIosGoldOffer').forEach(e=>e.remove());
    const want=bannerAllowed();if(want!==bannerWanted||(want&&!banner&&!bannerLoading&&Date.now()>=bannerRetry))void setBanner(want);
    if(want)void preload();
    if(!reklamGosterilsinMi()||busy)return;
    for(const h of document.querySelectorAll('.dm-papi-feedback.is-energy .dm-papi-feedback-card,#ybPerde.acik[data-tur="enerji"] .yb-en-kart'))if(visible(h)&&!h.dataset.adPending)void teklif(h,'enerji');
    const poor=Number(wallet()?.altin)<100;
    for(const h of document.querySelectorAll('#dmStoreFront .ds-home,#dmBagPage')) {
      if(!visible(h))continue;
      if(poor&&!h.dataset.adPending)void teklif(h,'altin');
      if(!poor)h.querySelectorAll('[data-ios-ad="altin"]').forEach(e=>e.remove());
    }
  }
  window.DijiReklam={odulluIzle,reklamGosterilsinMi,teklif,altinEksik,sonucHazir,sonucKapandi,rakipliBasladi(){rival=true;}};
  const style=document.createElement('style');
  style.textContent=`.dm-ios-ad-offer{padding:12px;margin:10px 0;border-radius:14px;background:#eefafa;color:#07535b}.dm-ios-ad-offer button{width:100%;min-height:44px;border:1px solid #09858c;border-radius:10px;padding:10px;font-weight:700}.dm-ios-ad-offer small{display:block;text-align:center;margin-top:5px}.dm-ios-gold-dialog{position:fixed;inset:0;background:#0006;z-index:2147483000;display:grid;place-items:center}.dm-ios-gold-dialog section{background:white;border-radius:20px;padding:24px;max-width:340px}@layer dmNoticeSurface{html.dm-ios-banner #bottomNavMobile{bottom:calc(var(--dm-ios-ad-height) + 16px + env(safe-area-inset-bottom,0px))!important}html.dm-ios-banner #tab-magaza,html.dm-ios-banner #tab-aktiviteler{padding-bottom:calc(var(--dm-ios-ad-height) + 150px)!important;max-height:calc(100dvh - var(--dm-ios-ad-height) - 16px)!important;bottom:calc(var(--dm-ios-ad-height) + 110px)!important;height:auto!important;box-sizing:border-box;overflow-y:auto!important}}`;
  document.head.append(style);
  void A.addListener('bannerAdSizeChanged',s=>{if(bannerWanted&&bannerAllowed())reserve(Math.max(0,Number(s.height)||0));}).catch(()=>{});
  void A.addListener('bannerAdFailedToLoad',()=>{reserve(0);bannerRetry=Date.now()+60000;void setBanner(false);}).catch(()=>{});
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden','inert']});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-gg-category="solo"],[data-gg-party="solo"],[data-gg-party="break"],[data-gg-party="konu"]'))rival=false;},true);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('dm:login',()=>{rights=null;rightsRetryAt=0;rightsPending=null;ready=false;sync();});
  window.addEventListener('resize',()=>{void setBanner(false).then(sync);});
  // A heartbeat handles Istanbul midnight, storage/account changes and inline display changes.
  setInterval(sync,2000);
  sync();
})();
