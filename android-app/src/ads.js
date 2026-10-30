export function teacherMode(win) {
  // The existing portal uses lexical globals as well as CSS flags; ask the shared helper too.
  return win.dmAndroidIsTeacher?.() === true || !!win.sessionStorage.getItem('ing_ogr_token') ||
    win.document.documentElement.matches('.dm-teacher-portal,.dm-teacher-child') ||
    win.document.body?.classList.contains('dm-teacher-mode');
}

export function createTestAds(admob, win, events, options = {}) {
  const production=options.production===true, rewardClient=options.rewardClient;
  if(production && (!rewardClient || !options.units?.energy || !options.units?.gold))throw Error('Canlı reklam yapılandırması eksik.');
  let busy = false, initialization = null;
  function ensureInitialized() {
    if (!initialization) initialization = (async()=>{
      if(production){
        let consent=await admob.requestConsentInfo({tagForUnderAgeOfConsent:true});
        if(consent.isConsentFormAvailable && consent.status==='REQUIRED')consent=await admob.showConsentForm();
        if(!consent.canRequestAds)throw Error('Reklam izni henüz hazır değil.');
      }
      await admob.initialize({ initializeForTesting: !production, tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true, maxAdContentRating: 'General' });
    })().catch(error=>{initialization=null;throw error;});
    return initialization;
  }
  return {
    mode: production ? 'production' : 'test',
    units: production ? options.units : null,
    ensureInitialized,
    get busy() { return busy; },
    async show(kind = 'energy') {
      if (!['energy', 'gold'].includes(kind)) throw new Error('Geçersiz reklam ödülü.');
      if (teacherMode(win)) throw new Error('Öğretmen modunda reklam gösterilmez.');
      if (busy || win.dmAndroidFullscreenBusy) throw new Error('Reklam zaten hazırlanıyor.');
      if (win.dmAndroidPlacements?.rewardAllowed(kind) === false) throw new Error('Bugünkü reklam hakkın tamamlandı.');
      busy = true;
      let reward = false, finish, timer, intent;
      const listeners = [];
      try {
        await win.dmAndroidPlacements?.hideBanner();
        await ensureInitialized();
        const closed = new Promise((resolve, reject) => { finish = { resolve, reject }; });
        closed.catch(() => {}); // Native failure events can arrive before show resolves.
        // Attach before preparing/showing; dismissal is never treated as a reward.
        listeners.push(await admob.addListener(events.Rewarded, () => { reward = true; }));
        listeners.push(await admob.addListener(events.Dismissed, () => finish.resolve()));
        listeners.push(await admob.addListener(events.FailedToShow, () => finish.reject(new Error('Reklam gösterilemedi.'))));
        if(production)intent=await rewardClient.create(kind);
        await admob.prepareRewardVideoAd({ adId: production ? options.units[kind] : 'ca-app-pub-3940256099942544/5224354917', isTesting: !production, npa:true, ...(intent ? {ssv:{customData:intent.id}} : {}) });
        if (teacherMode(win)) throw new Error('Öğretmen modunda reklam gösterilmez.');
        timer = setTimeout(() => finish.reject(new Error('Reklam yanıt vermedi. Yeniden deneyebilirsin.')), 180000);
        await Promise.race([admob.showRewardVideoAd(), closed]);
        await closed;
        win.dmAndroidPlacements?.rewardClosed(kind,reward);
        // Test ads must never change live student balances or call a reward endpoint.
        if(!production)return { completed: reward, test: true, energyGranted: 0 };
        if(!reward)return {completed:false,test:false};
        const verified=await rewardClient.settle(intent.id);
        return {completed:true,test:false,...verified};
      } finally {
        clearTimeout(timer);
        if(intent && !reward)await rewardClient.cancel(intent.id).catch(()=>{});
        await Promise.allSettled(listeners.map(listener => listener.remove()));
        busy = false;
        win.dmAndroidPlacements?.sync();
      }
    }
  };
}
