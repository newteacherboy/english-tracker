/* =====================================================================
   Diji-Medu · Ekonomi (v4.8)
   Altın, joker, seri dondurucu, karakter ve enerji paketi sunucuda tutulur.
   - Kazanılan altın ekranda hemen görünür, birkaç saniye içinde sunucuya yazılır.
   - Satın almaları sunucu yapar; sonuç buraya döner ve ekrana uygulanır.
   ===================================================================== */
(function () {
  'use strict';
  const API = "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";
  let bekleyen = 0, zamanlayici = null, gonderiliyor = false, sinirGunu = '', ilkDurum = '';

  const ogrenci = () => (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi) ? String(aktifOgrenciAdi) : '';
  const sinifModu = () => typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci;
  const hazir = () => typeof yo !== 'undefined' && !!yo && !!ogrenci() && ogrenci().toLowerCase() !== 'teacher' && !window.dmGuestMode && !sinifModu();
  const bildir = m => { try { (window.yoToast || window.toast || (() => {}))(m); } catch (e) {} };

  async function istek(is, veri) {
    try {
      const r = await fetch(API, { method: 'POST', body: JSON.stringify(Object.assign({ islem: 'ekonomi', is, ogrenci: ogrenci() }, veri || {})) });
      const d = await r.json();
      return d || { ok: false, mesaj: 'Sunucuya ulaşılamadı.' };
    } catch (e) { return { ok: false, ag: true, mesaj: 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.' }; }
  }

  function tazele() {
    try { if (typeof yoArayuzTazele === 'function') yoArayuzTazele(); } catch (e) {}
    try { window.yoGoster?.(); } catch (e) {}
    try { window.jokerBarCiz?.(); } catch (e) {}
  }

  /* Sunucudaki değerleri ekrana uygula. Henüz gönderilmemiş kazançlar korunur.
     sadeceAltin: altın kazanma cevabında joker çantasına dokunma (oyunda kullanılan jokerler henüz kaydedilmemiş olabilir). */
  function uygula(e, sadeceAltin) {
    if (!e || !hazir()) return;
    yo.altin = Math.max(0, Number(e.altin) || 0) + bekleyen;
    yo.ekoV = 2;
    if (sadeceAltin) { try { if (typeof yoKaydet === 'function') yoKaydet(); } catch (x) {} tazele(); return; }
    yo.jokerEnv = e.jokerEnv || {};
    yo.dondurucu = Number(e.dondurucu) || 0;
    yo.dmExtraJoker = Number(e.dmExtraJoker) || 0;
    yo.krkSatin = Array.isArray(e.krkSatin) ? e.krkSatin : [];
    yo.ekoSurum = Number(e.ekoSurum) || 0;
    yo.ekoV = 2;
    try { if (typeof yoKaydet === 'function') yoKaydet(); } catch (x) {}
    tazele();
  }

  async function gonder() {
    zamanlayici = null;
    if (!hazir() || bekleyen <= 0) return;
    if (gonderiliyor) { zamanlayici = setTimeout(gonder, 1500); return; }
    gonderiliyor = true;
    const miktar = bekleyen; bekleyen = 0;
    const d = await istek('altinKazan', { miktar });
    gonderiliyor = false;
    if (d.ok) {
      uygula(d.ekonomi, true);
      const bugun = new Date().toISOString().slice(0, 10);
      if (d.sinir && sinirGunu !== bugun) { sinirGunu = bugun; bildir('🪙 Bugünlük altın sınırına ulaştın. Yarın yine kazanabilirsin!'); }
    } else if (d.ag) {
      bekleyen += miktar;                       /* internet yoksa sonra tekrar dene */
      zamanlayici = setTimeout(gonder, 10000);
    } else if (d.ekonomi) {
      uygula(d.ekonomi, true);
    }
  }

  function kazan(n) {
    n = Math.floor(Number(n) || 0);
    if (n <= 0 || !hazir()) return;             /* sınıf modunda eski davranış sürer */
    bekleyen += n;
    if (!zamanlayici) zamanlayici = setTimeout(gonder, 1500);
  }

  async function islem(is, veri) {
    if (!hazir()) return { ok: false, mesaj: sinifModu() ? 'Sınıf modunda alışveriş yapılamaz.' : 'Önce giriş yapmalısın.' };
    if (bekleyen > 0) { clearTimeout(zamanlayici); await gonder(); }   /* önce bekleyen kazançları yaz */
    await kaydetBekle();                                                /* kullanılan jokerler vb. önce sunucuya gitsin */
    const d = await istek(is, veri);
    if (d.ekonomi) uygula(d.ekonomi);
    return d;
  }

  async function kaydetBekle() {
    try { if (window.dmProgression && typeof window.dmProgression.sync === 'function') await window.dmProgression.sync(); } catch (e) {}
  }
  async function durum() {
    if (!hazir() || bekleyen > 0 || gonderiliyor) return;
    await kaydetBekle();
    if (!hazir() || bekleyen > 0 || gonderiliyor) return;
    const d = await istek('durum');
    if (d.ok && d.ekonomi) uygula(d.ekonomi);
  }

  /* Girişte ve sonra 10 dakikada bir ekranı sunucuyla eşitle */
  setInterval(() => {
    if (!hazir()) { ilkDurum = ''; return; }
    if (yo.ekoV !== 2) yo.ekoV = 2;   /* sunucuya "yeni ekonomi sürümündeyim" der */
    if (ilkDurum !== ogrenci()) { ilkDurum = ogrenci(); durum(); }
  }, 1500);
  setInterval(() => { if (!document.hidden) durum(); }, 600000);   /* 10 dakikada bir */
  document.addEventListener('visibilitychange', () => { if (document.hidden && bekleyen > 0) gonder(); });

  /* ---------- Çevrimdışı ödül kuyruğu ----------
     Net yokken kazanılan ödüller cihazda saklanır, bağlantı gelince sırayla sunucuya gönderilir.
     Güvenli, çünkü sunucu bu işlemleri anahtara göre tekilleştirir ve günlük tavanla sınırlar. */
  const KUYRUK_ANAHTAR = 'dm_odul_kuyrugu';
  const KUYRUK_MAX = 200, KUYRUK_OMUR = 7 * 86400000;
  let bosaltiliyor = false, bosaltTimer = null;

  function kuyrukOku() {
    try {
      const h = JSON.parse(localStorage.getItem(KUYRUK_ANAHTAR) || '[]');
      if (!Array.isArray(h)) return [];
      const simdi = Date.now();
      return h.filter(k => k && k.is && typeof k.at === 'number' && simdi - k.at < KUYRUK_OMUR).slice(-KUYRUK_MAX);
    } catch (e) { return []; }
  }
  function kuyrukYaz(h) {
    try { localStorage.setItem(KUYRUK_ANAHTAR, JSON.stringify(h.slice(-KUYRUK_MAX))); } catch (e) {}
  }
  function kuyrukSayisi(sahip) {
    const ad = String(sahip || ogrenci()).toLowerCase();
    return kuyrukOku().filter(k => k.sahip === ad).length;
  }
  function kuyrugaEkle(is, veri) {
    const ad = ogrenci().toLowerCase();
    if (!ad) return null;
    const h = kuyrukOku();
    /* Anahtarlı ödül zaten kuyruktaysa ikinci kez eklenmez. */
    const anahtar = veri && veri.anahtar ? String(veri.anahtar) : '';
    if (anahtar && h.some(k => k.sahip === ad && k.is === is && k.veri && k.veri.anahtar === anahtar && k.veri.neden === (veri.neden || ''))) return null;
    const kayit = { id: 'k' + Date.now() + Math.random().toString(36).slice(2, 7), sahip: ad, is, veri: veri || {}, at: Date.now() };
    h.push(kayit); kuyrukYaz(h);
    try { document.dispatchEvent(new CustomEvent('dm:odul-kuyruk', { detail: { bekleyen: kuyrukSayisi(ad) } })); } catch (e) {}
    return kayit;
  }
  function kuyruktanSil(id) { kuyrukYaz(kuyrukOku().filter(k => k.id !== id)); }

  async function kuyrukBosalt() {
    if (bosaltiliyor || !hazir()) return 0;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
    const ad = ogrenci().toLowerCase();
    let gonderilen = 0;
    bosaltiliyor = true;
    try {
      for (const kayit of kuyrukOku().filter(k => k.sahip === ad)) {
        if (ogrenci().toLowerCase() !== ad) break;              /* hesap değiştiyse dur */
        const d = await istek(kayit.is, kayit.veri);
        if (d && d.ag) break;                                   /* hâlâ net yok: sırayı koru, sonra dene */
        kuyruktanSil(kayit.id);                                 /* sunucu kabul ya da reddetti: iki durumda da tekrar denenmez */
        gonderilen++;
        if (d && d.ok && d.yo && ogrenci().toLowerCase() === ad) window.dmApplyRewardState?.(d.yo, ogrenci());
        else if (d && d.ekonomi) uygula(d.ekonomi);
      }
    } finally { bosaltiliyor = false; }
    if (gonderilen) {
      try { document.dispatchEvent(new CustomEvent('dm:odul-kuyruk', { detail: { bekleyen: kuyrukSayisi(ad), gonderilen } })); } catch (e) {}
    }
    return gonderilen;
  }
  function bosaltPlanla(gecikme) {
    if (bosaltTimer) return;
    bosaltTimer = setTimeout(() => { bosaltTimer = null; kuyrukBosalt(); }, gecikme || 1500);
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', () => bosaltPlanla(800));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) bosaltPlanla(1200); });
    setInterval(() => { if (!document.hidden && kuyrukSayisi()) bosaltPlanla(0); }, 60000);
  }

  /* Uygulama içi küçük ödüller (görev, etkinlik, video, düello…) sunucuya yazılır; tutarlar ve günlük sınırlar sunucuda.
     Sunucunun döndürdüğü cüzdan (altın, XP) cihazdaki anlık değeri düzeltir. */
  let odulZinciri = Promise.resolve();
  function odulYaz(xp, altin, neden, anahtar) {
    if (!hazir()) return Promise.resolve(null);
    const sahip = ogrenci();
    odulZinciri = odulZinciri.then(async () => {
      const veri = { neden: neden || 'genel', anahtar: anahtar || '', xp: Number(xp) || 0, altin: Number(altin) || 0 };
      try {
        const d = await islem('odulTalep', veri);
        if (d && d.ag) { kuyrugaEkle('odulTalep', veri); return { ok: true, kuyrukta: true }; }
        if (d && d.ok && d.yo && sahip === ogrenci()) window.dmApplyRewardState?.(d.yo, sahip);
        return d;
      } catch (e) { kuyrugaEkle('odulTalep', veri); return { ok: true, kuyrukta: true }; }
    });
    return odulZinciri;
  }
  window.dmOdulYaz = odulYaz;
  /* Ödül işlemini çevrimdışıysa kuyruğa alır (görev ödülleri bunu kullanır). */
  async function odulIslem(is, veri) {
    const d = await islem(is, veri);
    if (d && d.ag) { kuyrugaEkle(is, veri || {}); return { ok: true, kuyrukta: true }; }
    return d;
  }
  window.dmEkonomi = { kazan, islem, uygula, durum, odulYaz, odulIslem, kuyrukBosalt, kuyrukSayisi };
})();
