
(function () {
  const kucuk = x => String(x || '').trim().toLocaleLowerCase('tr');
  const isimAl = () => (typeof yoIsim !== 'undefined' && yoIsim) || '';
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yo === 'object';
  const benimsendi = new Set();          /* bu sayfada sunucudaki verisi kabul edilmiş kişiler */
  const saveQueue = new Map();
  const taban = {};                      /* kişi → sunucudaki sürüm (guncelleme) */
  const zorlaBekleyen = new Set();
  let loadRetry = null;
  const loadRetries = new Map();

  /* ---------- Ağ katmanı ---------- */
  const orgFetch = window.fetch;
  window.fetch = async function (url, opt) {
    const fetchOwner = kucuk(isimAl());
    let u = typeof url === 'string' ? url : (url && url.url) || '';
    let govde = null;
    if (opt && typeof opt.body === 'string' && opt.body.indexOf('"ekVeriKaydet"') !== -1) { try { govde = JSON.parse(opt.body); } catch (e) {} }
    /* Kaydetme: kabul edilmeden gönderme; sürümü ekle */
    if (govde && govde.islem === 'ekVeriKaydet' && govde.anahtar === 'yo') {
      let ad = kucuk(govde.ogrenci);
      if (!benimsendi.has(ad)) return new Response(JSON.stringify({ status: 'bekliyor', message: 'Sunucudaki veri henüz yüklenmedi.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      const previousSave = saveQueue.get(ad) || Promise.resolve();
      let releaseSave;
      const queuedSave = new Promise(resolve => { releaseSave = resolve; });
      saveQueue.set(ad, queuedSave);
      await previousSave;
      try {
      if (!benimsendi.has(ad) || ad !== kucuk(isimAl())) throw new Error('Hesap verileri yeniden yükleniyor.');
      if (taban[ad] !== undefined) { govde._taban = taban[ad]; opt = Object.assign({}, opt, { body: JSON.stringify(govde) }); }
      let r = await orgFetch.call(this, url, opt);
      try {
        if (r.status === 409) { benimsendi.delete(ad); yenidenYukle(); }
        else if (r.ok) {
          const result = await r.clone().json();
          if (result.status === 'success') {
            const v = result.yo || JSON.parse(govde.deger);
            taban[ad] = Math.max(Number(taban[ad])||0, Number(v?.guncelleme)||0);
            if (ad === kucuk(isimAl()) && result.yo && yoVar()) {
              for (const key of ['guncelleme','lig','xpGun']) if (v[key] !== undefined) yo[key] = v[key];
            }
          }
        }
      } catch (e) {}
      return r;
      } finally { releaseSave(); if (saveQueue.get(ad) === queuedSave) saveQueue.delete(ad); }
    }
    let r = await orgFetch.apply(this, arguments);
    /* Yükleme (sayfanın kendi yükleyicisi; "_=" içermeyen): ilk yüklemede sunucudaki veri mutlaka kabul edilsin */
    try {
      /* Server-side rewards advance the stored version; remember it so the next save is not rejected as stale. */
      if(opt && typeof opt.body==='string' && r.ok){ const request=JSON.parse(opt.body),reward=await r.clone().json().catch(()=>null);const ver=Number((reward?.yo||reward?.reward?.yo)?.guncelleme)||0;const who=kucuk(request.ogrenci||fetchOwner);if(ver&&who)taban[who]=Math.max(Number(taban[who])||0,ver); }
      if (/[?&]islem=ekVeriGetir/.test(u) && /[?&]anahtar=yo(&|$)/.test(u) && !/[?&]_=/.test(u) && r.ok && !r.headers.get('X-Diji-Cevrimdisi')) {
        let ad = kucuk(decodeURIComponent((u.match(/[?&]ogrenci=([^&]*)/) || [])[1] || ''));
        let d = await r.clone().json().catch(() => undefined);
        if (d === undefined || (d && (d.hata || d.status === 'error'))) return r;
        if (d && d.deger) {
          let s = JSON.parse(d.deger);
          taban[ad] = Math.max(Number(taban[ad])||0, Number(s.guncelleme)||0);
          if (!benimsendi.has(ad)) {
            s.guncelleme = Date.now() + 60000;                   /* cihazdaki her şeyden "daha yeni" → kabul edilir */
            zorlaBekleyen.add(ad);
            return new Response(JSON.stringify(Object.assign({}, d, { deger: JSON.stringify(s) })), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
        } else { taban[ad] = 0; benimsendi.add(ad); }           /* sunucuda hiç veri yok: yeni hesap */
      }
    } catch (e) {}
    return r;
  };

  /* One in-flight load per account; preserve device-only lists and the current-week league. */
  let orgAl = window.yoSunucudanAl;
  const loadPending = new Map();
  if (typeof orgAl === 'function') window.yoSunucudanAl = function () {
    const owner = isimAl(), ad = kucuk(owner);
    if (!owner) return Promise.resolve(false);
    if (loadPending.has(ad)) return loadPending.get(ad);
    const local = {}, league = yoVar() && yo.lig ? { ...yo.lig } : null;
    if (yoVar()) ['gk','gkZk','dcTekrar'].forEach(k => { if (yo[k]) local[k] = yo[k]; });
    const task = (async () => {
      const ok = await orgAl.apply(this, arguments);
      if (!ok || kucuk(isimAl()) !== ad) { if (!ok && !loadRetry && kucuk(isimAl()) === ad && (loadRetries.get(ad)||0)<3) { loadRetries.set(ad,(loadRetries.get(ad)||0)+1); loadRetry = setTimeout(() => { loadRetry = null; if(kucuk(isimAl())===ad)window.yoSunucudanAl?.(); }, 10000); } return false; }
      clearTimeout(loadRetry); loadRetry = null; loadRetries.delete(ad);
      const first = zorlaBekleyen.has(ad);
      if (first) { zorlaBekleyen.delete(ad); benimsendi.add(ad); }
      if (yoVar()) {
        Object.keys(local).forEach(k => { if (!yo[k]) yo[k] = local[k]; });
        if (first && league && yo.lig && yo.lig.hafta === league.hafta && (league.xp || 0) > (yo.lig.xp || 0)) yo.lig.xp = league.xp;
        try { localStorage.setItem('ing_yo_' + owner, JSON.stringify(yo)); } catch (e) {}
        window.yoAvatarUygula?.();
        if (!yo.karakter) sessionStorage.removeItem('ing_ka_soruldu');
      }
      document.dispatchEvent(new Event('dm:state'));
      return true;
    })().finally(() => loadPending.delete(ad));
    loadPending.set(ad, task);
    return task;
  };
  /* Wait for the authoritative first server load before a first-click save.
     A local yo object is not proof that the account's save baseline is ready. */
  const saveReadyTasks = new Map();
  window.dmMemberSaveReady = function (requestedOwner) {
    const owner = String(requestedOwner || isimAl() || '');
    const ad = kucuk(owner);
    if (!ad || ad !== kucuk(isimAl())) return Promise.reject(new Error('Hesap değişti. Lütfen yeniden giriş yap.'));
    if (benimsendi.has(ad)) return Promise.resolve(true);
    if (saveReadyTasks.has(ad)) return saveReadyTasks.get(ad);
    const task = (async () => {
      if (typeof window.dmPrepareMemberState === 'function') await window.dmPrepareMemberState();
      if (ad !== kucuk(isimAl())) throw new Error('Hesap değişti. Lütfen yeniden giriş yap.');
      for (let attempt = 0; attempt < 4 && !benimsendi.has(ad); attempt++) {
        if (ad !== kucuk(isimAl())) throw new Error('Hesap değişti. Lütfen yeniden giriş yap.');
        if (attempt) await new Promise(resolve => setTimeout(resolve, 200 * attempt));
        if (typeof window.yoSunucudanAl === 'function') await window.yoSunucudanAl();
      }
      if (!benimsendi.has(ad)) throw new Error('Hesap verilerin sunucudan alınamadı. Bağlantını kontrol edip tekrar dene.');
      return true;
    })().finally(() => { if (saveReadyTasks.get(ad) === task) saveReadyTasks.delete(ad); });
    saveReadyTasks.set(ad, task);
    return task;
  };
  window.addEventListener('online', () => { loadRetries.clear(); window.yoSunucudanAl?.(); });
  function yenidenYukle() { if (typeof window.yoSunucudanAl === 'function') setTimeout(() => window.yoSunucudanAl(), 300); }

  /* ---------- Hemen kaydet ---------- */
  let sonGonderim = 0, sonGovde = '';
  async function hemenKaydet(bekle) {
    let ad = isimAl();
    if (!ad || !yoVar() || !benimsendi.has(kucuk(ad))) { if (bekle) throw new Error('Hesap verileri henüz yüklenmedi. Lütfen tekrar dene.'); return; }
    if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) return;
    let govde = JSON.stringify({ islem: 'ekVeriKaydet', ogrenci: ad, anahtar: 'yo', deger: JSON.stringify(yo) });
    if (!bekle && govde === sonGovde && Date.now() - sonGonderim < 2000) return;
    sonGovde = govde; sonGonderim = Date.now();
    const send = async () => {
      const r = await window.fetch(apiURL, { method: 'POST', body: govde, keepalive: govde.length < 60000 });
      const d = await r.json();
      if (!r.ok || d.status !== 'success') throw new Error(d.message || 'Değişiklik kaydedilemedi. Lütfen tekrar dene.');
      return true;
    };
    if (bekle) return await send();
    void send().catch(() => { sonGovde = ''; });
  }
  window.yoHemenKaydet = hemenKaydet;

  /* Sayfanın kendi gönderimi: kabul edilmeden çalışmasın; öğretmen hesabı da gönderilsin */
  let orgGonder = window.yoSunucuyaGonder;
  if (typeof orgGonder === 'function') window.yoSunucuyaGonder = function () {
    let ad = kucuk(isimAl());
    if (!benimsendi.has(ad)) return;
    if (ad === 'teacher') return hemenKaydet(false);
    return orgGonder.apply(this, arguments);
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hemenKaydet(false); });
  window.addEventListener('pagehide', () => hemenKaydet(false));
  let orgCikis = window.cikisYap;
  if (typeof orgCikis === 'function') window.cikisYap = async function () {
    let a = arguments, self = this;
    try { await hemenKaydet(true); } catch (e) {}
    benimsendi.clear();
    return orgCikis.apply(self, a);
  };

  /* ---------- "X karakter açtın!" bildirimi: veri yüklenmeden gösterme, hesap başına bir kez ---------- */
  let orgOdul = window.odulGoster;
  if (typeof orgOdul === 'function') window.odulGoster = function (o) {
    try {
      if(o && /Yeni karakter|karakter açtın!/i.test(String(o.baslik||'')))return;
      if (o && /karakter açtın!$/.test(String(o.baslik || '')) && /Koleksiyon/.test(String(o.alt || ''))) {
        let ad = kucuk(isimAl()), anahtar = 'diji_krk_toplu_' + ad;
        if (!benimsendi.has(ad)) return;                                   /* veri gelmeden: gösterme */
        if (localStorage.getItem(anahtar) || (yoVar() && yo.krkTopluGoruldu)) return;
        try { localStorage.setItem(anahtar, '1'); } catch (e) {}
        if (yoVar()) yo.krkTopluGoruldu = 1;
      }
    } catch (e) {}
    return orgOdul.apply(this, arguments);
  };
})();
