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

  window.dmEkonomi = { kazan, islem, uygula, durum };
})();
