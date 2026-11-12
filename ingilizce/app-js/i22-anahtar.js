
(function () {
  const kucuk = x => String(x || '').trim().toLocaleLowerCase('tr');
  const kisi = () => kucuk(localStorage.getItem('ing_aktifOgrenci') || (typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '') || 'anon');
  const PREFIX_YANIT = 'diji_yanit_v1_', PREFIX_KUYRUK = 'diji_kuyruk_v1_';

  /* ---------- 1) Hangi istek ne kadar cihazdan sunulur ---------- */
  const YEDEK = /^(sosyalOgrencilerGetir|etkinlikleriGetir|videolariGetir|cumleleriGetir|enerjiDurumuGetir|dersKonuDetayGetir|dersKonulariGetir|akisTumu|ekVeriGetir|\w+LiderlikTumunuGetir|duyurulariGetir|okumaGecmisGetir)$/;
  const GECERSIZ = {                             /* bu kayıt yapılınca şu önbellekler silinir */
    etkinlikYapildiIsaretle: ['etkinlikleriGetir'], videoIzlendiIsaretle: ['videolariGetir'],
    enerjiDegistir: ['enerjiDurumuGetir'],
    seviyeOyunOdulu: ['enerjiDurumuGetir','ekVeriGetir'], storyAdvance: ['enerjiDurumuGetir','ekVeriGetir'],
    buyuSeviyeTamamla: ['enerjiDurumuGetir','ekVeriGetir'], ekVeriKaydet: ['ekVeriGetir'],
    seviyeUrunAl: ['enerjiDurumuGetir','ekVeriGetir'], seviyeSandikAc: ['ekVeriGetir'],
    enerjiPaketAl: ['enerjiDurumuGetir','ekVeriGetir'], altinKazan: ['ekVeriGetir'], akisOlayToggle: ['sosyalOgrencilerGetir'], dersTestSonucKaydet: ['dersKonulariGetir','enerjiDurumuGetir','ekVeriGetir']
  };
  const KUYRUK = /^(\w+LiderlikKaydet|dersTestSonucKaydet|etkinlikYapildiIsaretle|videoIzlendiIsaretle|dersBilmiyordumToggle|enerjiDegistir|okumaKaydet)$/;

  function anahtar(url) {
    try {
      let u = new URL(url, location.href), p = [...u.searchParams].filter(([k]) => k !== 't' && k !== '_').sort();
      return p.map(([k, v]) => k + '=' + v).join('&');
    } catch (e) { return ''; }
  }
  const islemAdi = url => { try { return new URL(url, location.href).searchParams.get('islem') || ''; } catch (e) { return ''; } };
  function yanitOku(k) { try { return JSON.parse(localStorage.getItem(PREFIX_YANIT + kisi() + '_' + k) || 'null'); } catch (e) { return null; } }
  function yanitYaz(k, metin) {
    if (metin.length > 350000) return;
    try { localStorage.setItem(PREFIX_YANIT + kisi() + '_' + k, JSON.stringify({ z: Date.now(), m: metin })); }
    catch (e) { temizle(true); try { localStorage.setItem(PREFIX_YANIT + kisi() + '_' + k, JSON.stringify({ z: Date.now(), m: metin })); } catch (e2) {} }
  }
  function onbellekSil(islem) {
    let on = PREFIX_YANIT + kisi() + '_';
    for (let i = localStorage.length - 1; i >= 0; i--) { let k = localStorage.key(i); if (k && k.startsWith(on) && k.includes('islem=' + islem)) localStorage.removeItem(k); }
  }
  /* Yer darlığında ya da çok eski yanıtlarda temizlik */
  function temizle(zorla) {
    let liste = [];
    for (let i = 0; i < localStorage.length; i++) { let k = localStorage.key(i); if (k && k.startsWith(PREFIX_YANIT)) { try { liste.push([k, JSON.parse(localStorage.getItem(k)).z || 0]); } catch (e) { liste.push([k, 0]); } } }
    liste.sort((a, b) => a[1] - b[1]);
    let sinir = Date.now() - 14 * 864e5;
    liste.forEach(([k, z], i) => { if (z < sinir || (zorla && i < liste.length / 2)) localStorage.removeItem(k); });
  }
  temizle(false);
  const jsonYanit = (obj, ek) => new Response(typeof obj === 'string' ? obj : JSON.stringify(obj), { status: 200, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Diji-Kaynak': 'cihaz' }, ek || {}) });

  /* ---------- 3) Gönderim kuyruğu ---------- */
  const kuyrukOku = () => { try { return JSON.parse(localStorage.getItem(PREFIX_KUYRUK + kisi()) || '[]'); } catch (e) { return []; } };
  const kuyrukYaz = l => { try { localStorage.setItem(PREFIX_KUYRUK + kisi(), JSON.stringify(l.slice(-200))); } catch (e) {} };
  function kuyrugaEkle(url, opt, govde) {
    let l = kuyrukOku(); l.push({ url: String(url), body: opt.body, z: Date.now() }); kuyrukYaz(l);
    seritGoster();
    if (govde.islem === 'enerjiDegistir') {
      let m = window.genelEnerjiMax || 30, k = Math.max(0, Math.min(m, (window.genelEnerjiKalan || 0) + (Number(govde.fark) || 0)));
      return jsonYanit({ ok: true, status: 'success', kuyrukta: true, enerjiKalan: k, enerjiMax: m, eklenen: 0 });
    }
    return jsonYanit({ ok: true, status: 'success', kuyrukta: true });
  }
  let gonderiliyor = false;
  async function kuyruguGonder() {
    if (gonderiliyor || !navigator.onLine) return;
    let l = kuyrukOku(); if (!l.length) return;
    gonderiliyor = true; let gonderilen = 0;
    try {
      while (l.length) {
        let x = l[0];
        try {
          let r = await orgFetch(x.url, { method: 'POST', body: x.body, _kuyruk: true });
          if (r.status >= 500) break;            /* sunucu geçici hata: sonra tekrar */
          gonderilen++;                          /* 2xx ya da 4xx (ör. oturum bitmiş): kuyruktan çıkar */
        } catch (e) { break; }                   /* hâlâ internet yok */
        l.shift(); kuyrukYaz(l);
      }
    } finally { gonderiliyor = false; }
    if (gonderilen) { let s = document.getElementById('cdSerit'); if (s) { s.innerText = `☁️ Çevrimdışı ilerlemen gönderildi (${gonderilen})`; s.classList.add('acik'); setTimeout(seritGoster, 3500); } }
    else seritGoster();
  }

  /* ---------- Ağ katmanı ---------- */
  const orgFetch = window.fetch;
  window.fetch = async function (url, opt) {
    let u = typeof url === 'string' ? url : (url && url.url) || '';
    let apiMi = typeof apiURL !== 'undefined' && u.indexOf(apiURL) === 0;
    if (!apiMi || (opt && opt._kuyruk)) return orgFetch.apply(this, arguments);
    let post = opt && opt.method && opt.method.toUpperCase() === 'POST';

    if (post) {
      let govde = {}; try { govde = JSON.parse(opt.body || '{}'); } catch (e) {}
      let islem = govde.islem || '';
      (GECERSIZ[islem] || []).forEach(onbellekSil);
      let kuyruklanir = KUYRUK.test(islem) && !(islem === 'enerjiDegistir' && !(Number(govde.fark) < 0));
      if (!navigator.onLine) {
        if (kuyruklanir) return kuyrugaEkle(u, opt, govde);
        if (islem === 'enerjiDegistir') return jsonYanit({ ok: false, status: 'error', mesaj: 'İnternet bağlantısı yok, sonra tekrar dene.', enerjiKalan: window.genelEnerjiKalan || 0, enerjiMax: window.genelEnerjiMax || 30 });
      }
      try { return await orgFetch.apply(this, arguments); }
      catch (e) { if (kuyruklanir) return kuyrugaEkle(u, opt, govde); throw e; }
    }

    let islem = islemAdi(u), k = anahtar(u);
    if (!islem || !YEDEK.test(islem)) return orgFetch.apply(this, arguments);
    const zorla = /[?&]_=/i.test(u) || opt?.cache === 'reload' || opt?.cache === 'no-store';
    let kayit = zorla ? null : yanitOku(k);
    if (!navigator.onLine && kayit) return jsonYanit(kayit.m, { 'X-Diji-Cevrimdisi': '1' });
    try {
      let r = await orgFetch.apply(this, arguments);
      if (r.ok) r.clone().text().then(t => { if (t && t[0] !== '<') yanitYaz(k, t); }).catch(() => {});
      else if (r.status >= 500 && kayit) return jsonYanit(kayit.m, { 'X-Diji-Cevrimdisi': '1' });
      return r;
    } catch (e) {
      if (kayit) return jsonYanit(kayit.m, { 'X-Diji-Cevrimdisi': '1' });
      throw e;
    }
  };

  /* ---------- Ders Çalış: tamamlanan konu cihaz önbelleğine de yazılsın ---------- */
  let orgFetch2 = window.fetch;
  window.fetch = function (url, opt) {
    let p = orgFetch2.apply(this, arguments);
    try {
      if (opt && typeof opt.body === 'string' && opt.body.indexOf('dersTestSonucKaydet') !== -1)
        p.then(() => setTimeout(() => {
          try { if (Array.isArray(dcTumKonularCache) && dcTumKonularCache.length) localStorage.setItem('diji_ders_konulari_v1_' + kisi(), JSON.stringify({ zaman: Date.now(), veri: dcTumKonularCache })); } catch (e) {}
        }, 300)).catch(() => {});
    } catch (e) {}
    return p;
  };

  /* ---------- Çevrimdışı şeridi ---------- */
  function seritGoster() {
    let s = document.getElementById('cdSerit'); if (!s) return;
    let n = kuyrukOku().length;
    if (!navigator.onLine) { s.innerText = `📴 İnternet yok · oynamaya devam et${n ? `, ${n} kayıt cihazda bekliyor` : ''}`; s.classList.add('acik'); }
    else if (n) { s.innerText = `⏳ ${n} kayıt gönderiliyor…`; s.classList.add('acik'); }
    else s.classList.remove('acik');
  }
  window.addEventListener('online', () => { seritGoster(); setTimeout(kuyruguGonder, 1500); setTimeout(() => { try { if (typeof yoSunucuyaGonder === 'function') yoSunucuyaGonder(); } catch (e) {} }, 2500); });
  window.addEventListener('offline', seritGoster);
  setTimeout(() => { seritGoster(); kuyruguGonder(); }, 5000);
  setInterval(() => { if (kuyrukOku().length) kuyruguGonder(); }, 5 * 60e3);

  /* ---------- 4) Çıkışta kişisel önbellekleri temizle ---------- */
  function kisiselSil(ad) {
    let a = kucuk(ad);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      let k = localStorage.key(i); if (!k) continue;
      if (k.startsWith('diji_global_cache_') || k.startsWith('diji_lig_cache_') || k === 'diji_global_cache_v1' ||
          (a && (k === 'diji_ders_konulari_v1_' + a || k.startsWith(PREFIX_YANIT + a + '_') || k === PREFIX_KUYRUK + a))) localStorage.removeItem(k);
    }
  }
  let orgCikis = window.cikisYap;
  if (typeof orgCikis === 'function') window.cikisYap = function () {
    let ad = typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '';
    if (kuyrukOku().length && !navigator.onLine && !confirm('İnternet yok ve cihazda gönderilmemiş ilerlemen var. Çıkış yaparsan bu ilerleme silinecek. Yine de çıkılsın mı?')) return;
    kisiselSil(ad);
    return orgCikis.apply(this, arguments);
  };
  try { localStorage.removeItem('diji_global_cache_v1'); } catch (e) {}   /* eski, kişiye bağlı olmayan önbellek */

  /* ---------- 5) Service Worker: sayfa internetsiz de açılsın ---------- */
  /* Registration and safe update notification live in app-updates.js. */
})();
