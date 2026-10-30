import { teacherMode } from './ads.js';
import { createAdPolicy, SOLO_GAMES } from './ad-policy.js';

// All IDs are Google's test units. Real units remain disabled until account setup is complete.
const IDS = { banner:'ca-app-pub-3940256099942544/6300978111', interstitial:'ca-app-pub-3940256099942544/1033173712' };
export function createPlacements({ admob, ads, win, interstitialEvents, bannerEvents }) {
  let active=true, ready=false, preparing=false, policy, owner='', busy=false, preloadRetryAt=0, bannerRetryAt=0;
  let banner=false, bannerWanted=false, bannerEpoch=0, bannerQueue=Promise.resolve(), initialized=false;
  let pending=null, sequence=0, closing=false;
  const seenObjects=new WeakMap();
  const visible = el => !!el && !el.hidden && el.getClientRects().length>0 && !el.closest('[inert],[aria-hidden="true"],[data-dm-nav-suspended]');
  function identity() { return String(win.dmAndroidStudentName?.() || ''); }
  function allowed() { return active && !win.document.hidden && !!identity() && !!win.localStorage.getItem('ing_token') && !teacherMode(win); }
  function currentPolicy() {
    const next=identity();
    if (!policy || next!==owner) { owner=next;policy=createAdPolicy({storage:win.localStorage,owner:next||'preview'});ready=false;pending=null; }
    return policy;
  }
  function reserved(height) {
    const root=win.document.documentElement;
    root.style.setProperty('--dm-native-banner-height', `${height}px`);
    root.classList.toggle('dm-native-banner-visible',height>0);
  }
  function setBanner(want) {
    bannerWanted=!!want;const ticket=++bannerEpoch;
    if(!want)reserved(0);
    bannerQueue=bannerQueue.catch(()=>{}).then(async()=>{
      if(ticket!==bannerEpoch)return;
      if(!bannerWanted || !allowed() || busy || ads.busy) {
        if(banner) { await admob.removeBanner().catch(()=>{});banner=false; }
        reserved(0);return;
      }
      if(banner || Date.now()<bannerRetryAt)return;
      try {
        await ads.ensureInitialized();
        if(ticket!==bannerEpoch || !bannerWanted || !allowed() || busy || ads.busy)return;
        await admob.showBanner({adId:IDS.banner,adSize:'ADAPTIVE_BANNER',position:'BOTTOM_CENTER',margin:0,isTesting:true});
        banner=true;
        if(ticket!==bannerEpoch || !bannerWanted || !allowed() || busy || ads.busy) {
          await admob.removeBanner().catch(()=>{});banner=false;reserved(0);return;
        }
        reserved(60);
      } catch { banner=false;bannerRetryAt=Date.now()+30000;reserved(0); }
    });
    return bannerQueue;
  }
  async function preload() {
    currentPolicy();
    if(!allowed() || ready || preparing || busy || ads.busy || Date.now()<preloadRetryAt)return;
    preparing=true;const at=owner;
    try { await ads.ensureInitialized();await admob.prepareInterstitial({adId:IDS.interstitial,isTesting:true});if(at===identity()&&allowed())ready=true; }
    catch { ready=false;preloadRetryAt=Date.now()+30000; }
    finally { preparing=false; }
  }
  async function showAtBreak() {
    const p=currentPolicy();
    // Never wait for a new ad to load at an exit: skip it if not already ready.
    if(!allowed() || !ready || busy || ads.busy || !p.canInterstitial())return false;
    busy=true;win.dmAndroidFullscreenBusy=true;ready=false;
    const handles=[];let timer,shown=false;
    try {
      await setBanner(false);
      if(!allowed())return false;
      let resolve,reject;
      const closed=new Promise((a,b)=>{resolve=a;reject=b;});closed.catch(()=>{});
      handles.push(await admob.addListener(interstitialEvents.Showed,()=>{shown=true;p.interstitialShown();}));
      handles.push(await admob.addListener(interstitialEvents.Dismissed,()=>resolve()));
      handles.push(await admob.addListener(interstitialEvents.FailedToShow,()=>reject(new Error('Reklam gösterilemedi.'))));
      timer=setTimeout(()=>reject(new Error('Reklam yanıt vermedi.')),120000);
      await Promise.race([admob.showInterstitial(),closed]);await closed;return shown;
    } catch { return false; }
    finally { clearTimeout(timer);await Promise.allSettled(handles.map(x=>x.remove()));busy=false;win.dmAndroidFullscreenBusy=false; }
  }
  function sync() {
    currentPolicy();
    const doc=win.document;
    const destination=[...doc.querySelectorAll('#tab-magaza.active,#tab-aktiviteler.active')].some(visible);
    const obstruction=doc.body.classList.contains('dm-play-session') || [...doc.querySelectorAll('[role="dialog"],.dm-session-surface,#yoModal.acik')].some(visible);
    const want=destination&&!obstruction&&allowed()&&!busy&&!ads.busy;
    if(want!==bannerWanted || (want&&!banner&&Date.now()>=bannerRetryAt))void setBanner(want);
    if(want)void preload();
  }
  function installResults() {
    const result=win.genelSonucEkraniGoster,close=win.genelSonucKapat;
    if(typeof result==='function'&&!result.dmNativeAdsWrapped) {
      const wrapped=function(data,...args){
        const returned=result.call(this,data,...args);
        const p=currentPolicy();
        if(allowed()&&data&&SOLO_GAMES.has(data.oyunKey)&&!data.stopNo&&!data.parkur&&!data.intro) {
          let id=data.runId||seenObjects.get(data);if(!id){id='result-'+Date.now()+'-'+(++sequence);seenObjects.set(data,id);}
          if(p.complete({id:String(id),game:data.oyunKey,answered:Number(data.dogru||0)+Number(data.yanlis||0)}))pending={owner:identity(),id:String(id)};
          void preload();
        }
        return returned;
      };
      Object.assign(wrapped,result);wrapped.dmNativeAdsWrapped=true;win.genelSonucEkraniGoster=wrapped;
    }
    if(typeof close==='function'&&!close.dmNativeAdsWrapped) {
      const wrapped=function(...args){
        const at=pending;pending=null;
        if(closing)return;
        if(args[0]==='tekrar'||!at||at.owner!==identity()||!allowed()||!ready||!currentPolicy().canInterstitial())return close.apply(this,args);
        closing=true;const self=this;
        void showAtBreak().finally(()=>{closing=false;if(at.owner===identity())close.apply(self,args);sync();});
      };
      Object.assign(wrapped,close);wrapped.dmNativeAdsWrapped=true;win.genelSonucKapat=wrapped;
    }
  }
  function start() {
    if(initialized)return;initialized=true;
    const style=win.document.createElement('style');
    style.textContent='.dm-native-banner-visible #bottomNavMobile{bottom:calc(var(--dm-native-banner-height) + 12px + env(safe-area-inset-bottom,0px))!important}.dm-native-banner-visible #tab-magaza,.dm-native-banner-visible #tab-aktiviteler{padding-bottom:calc(var(--dm-native-banner-height) + 130px)!important}';
    win.document.head.append(style);
    void admob.addListener(bannerEvents.SizeChanged,size=>{if(banner&&bannerWanted)reserved(Math.min(120,Math.max(50,Number(size.height)||60)));});
    void admob.addListener(bannerEvents.FailedToLoad,()=>{banner=false;bannerRetryAt=Date.now()+30000;reserved(0);});
    let queued=false;
    new win.MutationObserver(()=>{if(!queued){queued=true;win.requestAnimationFrame(()=>{queued=false;installResults();sync();});}}).observe(win.document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden','inert']});
    win.addEventListener('resize',sync);win.document.addEventListener('visibilitychange',sync);
    win.document.addEventListener('dm:login',()=>{pending=null;ready=false;currentPolicy();sync();});
    win.document.addEventListener('click',()=>{if(banner)void setBanner(false);},true);
    installResults();sync();
  }
  return {
    start, sync, hideBanner:()=>setBanner(false),
    setActive(value) { active=!!value;if(!active)void setBanner(false);else sync(); },
    rewardAllowed:kind=>currentPolicy().rewardAllowed(kind),
    rewardClosed(kind,completed){currentPolicy().rewardClosed(kind,completed);sync();},
    diagnostics:()=>({test:true,banner,interstitialReady:ready,busy,gamesSinceAd:currentPolicy().snapshot().games})
  };
}
