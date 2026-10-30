export function teacherMode(win) {
  // The existing portal uses lexical globals as well as CSS flags; ask the shared helper too.
  return win.dmAndroidIsTeacher?.() === true || !!win.sessionStorage.getItem('ing_ogr_token') ||
    win.document.documentElement.matches('.dm-teacher-portal,.dm-teacher-child') ||
    win.document.body?.classList.contains('dm-teacher-mode');
}

export function createTestAds(admob, win, events) {
  let busy = false, initialized = false;
  return {
    mode: 'test',
    async show(kind = 'energy') {
      if (!['energy', 'gold'].includes(kind)) throw new Error('Geçersiz reklam ödülü.');
      if (teacherMode(win)) throw new Error('Öğretmen modunda reklam gösterilmez.');
      if (busy) throw new Error('Reklam zaten hazırlanıyor.');
      busy = true;
      let reward = false, finish, timer;
      const listeners = [];
      try {
        if (!initialized) {
          await admob.initialize({ initializeForTesting: true, tagForChildDirectedTreatment: true, tagForUnderAgeOfConsent: true, maxAdContentRating: 'General' });
          initialized = true;
        }
        const closed = new Promise((resolve, reject) => { finish = { resolve, reject }; });
        closed.catch(() => {}); // Native failure events can arrive before show resolves.
        // Attach before preparing/showing; dismissal is never treated as a reward.
        listeners.push(await admob.addListener(events.Rewarded, () => { reward = true; }));
        listeners.push(await admob.addListener(events.Dismissed, () => finish.resolve()));
        listeners.push(await admob.addListener(events.FailedToShow, () => finish.reject(new Error('Reklam gösterilemedi.'))));
        await admob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917', isTesting: true });
        if (teacherMode(win)) throw new Error('Öğretmen modunda reklam gösterilmez.');
        timer = setTimeout(() => finish.reject(new Error('Reklam yanıt vermedi. Yeniden deneyebilirsin.')), 180000);
        await Promise.race([admob.showRewardVideoAd(), closed]);
        await closed;
        // Test ads must never change live student balances or call a reward endpoint.
        return { completed: reward, test: true, energyGranted: 0 };
      } finally {
        clearTimeout(timer);
        await Promise.allSettled(listeners.map(listener => listener.remove()));
        busy = false;
      }
    }
  };
}
