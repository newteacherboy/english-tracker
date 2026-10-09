/* Benim Dünyam: "Sana Özel" ve "Profil" tek ekranda, dört sekme (Sana Özel, İstatistik, Rozetler, Karakter).
   Yeni bir .dc-fullscreen-overlay ekler; eski ekranların içeriğini (görev paneli, gelişim grafikleri,
   karakter koleksiyonu) silmeden taşır ve ekran kapanınca yerlerine geri koyar.
   Eski açılış fonksiyonları (sanaOzelTamEkranAc, profilAc) bu ekrana yönlenir. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const kac = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yo === 'object';
  const ogrenci = () => typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && String(aktifOgrenciAdi).toLowerCase() !== 'teacher';
  const izin = kod => !window.dmProgression || window.dmProgression.allowed(kod);
  const SEKMELER = [['sanaozel', 'Sana Özel'], ['istatistik', 'İstatistik'], ['rozetler', 'Rozetler'], ['karakter', 'Karakter']];
  /* Her sekmenin sahnesi. Papi sahne görselinin içinde çizili; ayrı Papi resmi sadece sahne yoksa gösterilir. */
  const SAHNE = {
    sanaozel: { papi: 'benim-dunyam/papi-selam.png', sahne: 'benim-dunyam/sahne-sana-ozel.webp' },
    istatistik: { papi: 'ders-vadi/papi-buyutec.png', sahne: 'benim-dunyam/sahne-istatistik.webp' },
    rozetler: { papi: 'ders-vadi/papi-yildiz.png', sahne: 'benim-dunyam/sahne-rozetler.webp' },
    karakter: { papi: 'ders-vadi/papi-kitap.png', sahne: 'benim-dunyam/sahne-sana-ozel.webp' }
  };
  let sekme = 'sanaozel', aralik = 'hafta', istat = null, istatZaman = 0, istatYukleniyor = false;
  let rozetKisi = '', istatDeneme = 0, yenileT = null, rozetSirasi = [], kutlama = null;

  /* ------------------------------------------------------------------ rozet kataloğu */
  const ROZETLER = [
    ['ilk-adim', 'İlk Adım', '👣', 'İlk oyununu tamamla', c => c.oyun >= 1],
    ['ilk-zafer', 'İlk Zafer', '👑', 'İlk Ders Çalış konunu bitir', c => c.ders >= 1],
    ['seri-3', '3 Gün Seri', '🔥', '3 gün üst üste gir', c => c.seri >= 3],
    ['seri-7', '7 Gün Seri', '🔥', '7 gün üst üste gir', c => c.seri >= 7],
    ['seri-30', '30 Gün Seri', '📅', '30 gün üst üste gir', c => c.seri >= 30],
    ['kelime-avcisi', 'Kelime Avcısı', '🔎', '10 oyun tamamla', c => c.oyun >= 10],
    ['kelime-ustasi', 'Kelime Ustası', '📖', '100 oyun tamamla', c => c.oyun >= 100],
    ['tam-isabet', 'Tam İsabet', '🎯', 'Bir oyunu hiç hata yapmadan bitir', c => c.mukemmel >= 1],
    ['keskin-goz', 'Keskin Göz', '👁️', 'En az 100 soruda %90 doğruluk', c => c.cevap >= 100 && c.dogruluk >= 90],
    ['ders-kurdu', 'Ders Kurdu', '🐛', '10 konu bitir', c => c.ders >= 10],
    ['konu-ustasi', 'Konu Ustası', '🎓', '50 konu bitir', c => c.ders >= 50],
    ['yildiz-toplayici', 'Yıldız Toplayıcı', '⭐', 'Konu Macerası\'nda 30 yıldız topla', c => c.yildiz >= 30],
    ['parkurcu', 'Parkurcu', '🚩', 'Parkurda 5 durak geç', c => c.parkur >= 5],
    ['kasif', 'Kaşif', '🧭', 'Parkurda 20 durak geç', c => c.parkur >= 20],
    ['sampiyon', 'Şampiyon', '🏆', 'Bir haftalık hedefe ulaş', c => c.hafta >= 1],
    ['gorev-avcisi', 'Görev Avcısı', '✅', 'Günün 3 görevini 5 gün bitir', c => c.gorev >= 5],
    ['seviye-5', 'Seviye 5', '🪽', '5. seviyeye ulaş', c => c.seviye >= 5],
    ['seviye-10', 'Seviye 10', '🪽', '10. seviyeye ulaş', c => c.seviye >= 10],
    ['seviye-20', 'Seviye 20', '💠', '20. seviyeye ulaş', c => c.seviye >= 20],
    ['koleksiyoncu', 'Koleksiyoncu', '👕', '5 karakter aç', c => c.karakter >= 5],
    ['puan-avcisi', 'Puan Avcısı', '🌟', '1.000 XP topla', c => c.xp >= 1000],
    ['puan-efsanesi', 'Puan Efsanesi', '✨', '10.000 XP topla', c => c.xp >= 10000],
    ['altin-kumbara', 'Altın Kumbara', '🐷', '1.000 altın biriktir', c => c.altin >= 1000],
    ['dinleme-ustasi', 'Dinleme Ustası', '🎧', 'Dinleme oyunlarında 5 kez %80 üstü yap', c => c.dinleme >= 5]
  ].map(([id, ad, ikon, kosul, kontrol]) => ({ id, ad, ikon, kosul, kontrol, resim: `benim-dunyam/rozet-${id}.webp` }));
  window.dmRozetKatalogu = ROZETLER;

  function seviyeBilgi() {
    try {
      const R = window.DijiProgressRules;
      if (R && yoVar()) return R.progress(R.migrate(yo));
    } catch (e) {}
    return { level: 1, xp: 0, start: 0, next: 100, ratio: 0 };
  }
  function toplamlar(gunler, bas) {
    const t = { oyun: 0, dogru: 0, yanlis: 0, mukemmel: 0, ders: 0, parkur: 0, aktif: 0 };
    Object.entries(gunler || {}).forEach(([g, v]) => {
      if (bas && g < bas) return;
      ['oyun','dogru','yanlis','mukemmel','ders','parkur'].forEach((k,i) => { t[k] += Number(v[['o','d','y','m','l','p'][i]]) || 0; });
      if ((Number(v.o)||0) + (Number(v.l)||0) + (Number(v.p)||0) > 0) t.aktif++;
    });
    return t;
  }
  function gorevGunleriniKaydet() {
    if (!yoVar() || !yo.gorev || !yo.gorev.alindi || !yo.gorev.t) return;
    const l = Array.isArray(yo.dmGorevGunleri) ? yo.dmGorevGunleri : [];
    if (!l.includes(yo.gorev.t)) { l.push(yo.gorev.t); yo.dmGorevGunleri = l.slice(-60); if (typeof yoKaydet === 'function') yoKaydet(); }
  }
  function rozetBaglami() {
    const sv = seviyeBilgi(), tum = toplamlar(istat && istat.gunler);
    let karakter = 0;
    const kol = document.querySelector('#bdKoleksiyon .bc-kutu h3');
    const m = kol && kol.textContent.match(/(\d+)\s*\/\s*36/); if (m) karakter = Number(m[1]);
    const beceri = yoVar() && yo.beceri && Array.isArray(yo.beceri.dinleme) ? yo.beceri.dinleme : [];
    const cevap = tum.dogru + tum.yanlis;
    return {
      oyun: tum.oyun, mukemmel: tum.mukemmel, cevap, dogruluk: cevap ? Math.round(tum.dogru * 100 / cevap) : 0,
      ders: yoVar() && Array.isArray(yo.dcOdul) ? yo.dcOdul.length : 0,
      yildiz: yoVar() && yo.dcYildiz ? Object.values(yo.dcYildiz).reduce((a, b) => a + (Number(b) || 0), 0) : 0,
      parkur: Math.max(tum.parkur, yoVar() && yo.baYildiz ? Object.keys(yo.baYildiz).length : 0),
      seri: parseInt(localStorage.getItem('ing_girisSerisiSayisi') || '0', 10) || 0,
      hafta: yoVar() && Array.isArray(yo.rozetler) ? yo.rozetler.filter(r => /Haftalık hedef/i.test(r && r.ad || '')).length : 0,
      gorev: yoVar() && Array.isArray(yo.dmGorevGunleri) ? yo.dmGorevGunleri.length : 0,
      seviye: sv.level, xp: sv.xp, altin: yoVar() ? Number(yo.altin) || 0 : 0, karakter,
      dinleme: beceri.filter(x => Number(x) >= 80).length
    };
  }


  /* Earned badges stay earned; initialize old achievements silently, then queue new awards. */
  function rozetOturumu() {
    const kisi = ogrenci() && !window.dmGuestMode && yoVar() &&
      (typeof yoHazirMi !== 'function' || yoHazirMi()) &&
      (typeof yoIsim === 'undefined' || !yoIsim || String(yoIsim).trim().toLowerCase() === String(aktifOgrenciAdi).trim().toLowerCase())
      ? String(aktifOgrenciAdi).trim().toLowerCase() : '';
    if (kisi !== rozetKisi) {
      rozetKisi = kisi; istat = null; istatZaman = 0; istatDeneme = 0; istatYukleniyor = false;
      clearTimeout(yenileT); yenileT = null; rozetSirasi = []; kutlama?.remove(); kutlama = null;
      if (kisi) { try { rozetSirasi = JSON.parse(localStorage.getItem('bd_rozet_bekleyen:' + kisi) || '[]').filter(id => ROZETLER.some(r => r.id === id)); } catch (e) {} }
    }
    return !!kisi;
  }
  function kazanilanRozetler(c) {
    const kayit = yoVar() && yo.dmWorldBadges;
    return new Set([...(kayit?.ids || []).filter(id => ROZETLER.some(r => r.id === id)), ...ROZETLER.filter(r => r.kontrol(c)).map(r => r.id)]);
  }
  function kuyrukKaydet() {
    if (!rozetKisi) return;
    try { localStorage.setItem('bd_rozet_bekleyen:' + rozetKisi, JSON.stringify(rozetSirasi)); } catch (e) {}
  }
  function rozetleriKontrolEt() {
    if (!rozetOturumu()) return;
    gorevGunleriniKaydet();
    // Wait for historical game statistics before establishing the first baseline.
    if (!istat) return;
    const eski = yo.dmWorldBadges, sahip = kazanilanRozetler(rozetBaglami());
    const yeni = [...sahip].filter(id => !(eski?.ids || []).includes(id));
    if (!eski || yeni.length) {
      yo.dmWorldBadges = { version: 1, ids: [...sahip] };
      if (eski?.version === 1) {
        yeni.forEach(id => { if (!rozetSirasi.includes(id)) rozetSirasi.push(id); });
        kuyrukKaydet();
      }
      if (typeof yoKaydet === 'function') yoKaydet();
      if ($('tab-dunyam')?.classList.contains('active') && sekme === 'rozetler') rozetCiz();
    }
  }
  function gorunur(el) {
    return !!el && !el.hidden && getComputedStyle(el).display !== 'none' &&
      getComputedStyle(el).visibility !== 'hidden' && !!el.getClientRects().length;
  }
  function kutlamaMesgul() {
    if (document.hidden || window.turAcikMi?.() || window.turAcik) return true;
    if (typeof odulOyunda === 'function' && odulOyunda()) return true;
    return [...document.querySelectorAll('[role="dialog"],.rubric-modal,.game-modal-overlay,.gso-overlay,.yo-modal,.hb-overlay,.bz-perde,.dv-perde,#genelSonucOverlay,#dmLevelUp,#dmGoalAnnouncement,.cog-perde,.pc-overlay,.ww-overlay')].some(gorunur);
  }
  function rozetKutla() {
    if (!rozetKisi || kutlama || !rozetSirasi.length || kutlamaMesgul()) return;
    const r = ROZETLER.find(r => r.id === rozetSirasi[0]); if (!r) { rozetSirasi.shift(); kuyrukKaydet(); return; }
    const kisi = rozetKisi, once = document.activeElement, el = document.createElement('div');
    el.className = 'bd-kutlama'; el.id = 'bdRozetKutlama';
    el.innerHTML = `<section class="bd-kutlama-kart" role="dialog" aria-modal="true" aria-labelledby="bdRozetTebrik" aria-describedby="bdRozetAciklama">
      <button type="button" class="bd-kutlama-kapat" aria-label="Kutlamayı kapat">×</button>
      <div class="bd-kutlama-isilti" aria-hidden="true">✦ ✧ ✦ ✧</div>
      <p class="bd-kutlama-etiket">YENİ ROZET KAZANDIN</p><h2 id="bdRozetTebrik">Tebrikler, ${kac((typeof yoIsim !== 'undefined' && yoIsim) || aktifOgrenciAdi)}!</h2>
      <div class="bd-kutlama-rozet"><img src="${kac(r.resim)}" alt="${kac(r.ad)} rozeti"><span hidden aria-hidden="true">${r.ikon}</span></div>
      <h3>${kac(r.ad)}</h3><p id="bdRozetAciklama">Başardığın hedef: ${kac(r.kosul)}.</p>
      <div class="bd-kutlama-papi"><img src="papi-reward-v2.png" alt=""><p>Harikasın! Emeğin yeni bir rozetle taçlandı. Maceraya devam!</p></div>
      <small>Rozetin Benim Dünyam → Rozetler bölümüne eklendi.</small>
      <button type="button" class="bd-kutlama-devam">Harika! Devam et ✨</button>
    </section>`;
    document.body.append(el); kutlama = el;
    const resim = el.querySelector('.bd-kutlama-rozet img'); resim.onerror = () => { resim.hidden = true; resim.nextElementSibling.hidden = false; };
    const kapat = () => {
      if (kutlama !== el) return;
      el.remove(); kutlama = null;
      if (kisi === rozetKisi) { rozetSirasi.shift(); kuyrukKaydet(); }
      if (once?.isConnected) once.focus?.({ preventScroll: true });
      setTimeout(rozetKutla, 250);
    };
    el.querySelector('.bd-kutlama-kapat').onclick = kapat; el.querySelector('.bd-kutlama-devam').onclick = kapat;
    el.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); kapat(); }
      if (e.key === 'Tab') { const b = [...el.querySelectorAll('button')]; if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === b.at(-1)) { e.preventDefault(); b[0].focus(); } }
    };
    el.querySelector('.bd-kutlama-devam').focus();
  }
  // Refresh game counts after a successful save, preserving the original fetch response.
  const oncekiFetch = window.fetch;
  if (typeof oncekiFetch === 'function') window.fetch = function (url, opt) {
    const istek = oncekiFetch.apply(this, arguments);
    try {
      const b = typeof opt?.body === 'string' ? JSON.parse(opt.body) : null;
      if (typeof url === 'string' && typeof apiURL !== 'undefined' && url.split('?')[0] === apiURL.split('?')[0] &&
        b && (/LiderlikKaydet$/.test(b.islem) || ['seviyeOyunOdulu','buyuSeviyeTamamla','dersTestSonucKaydet','seviyeUrunAl'].includes(b.islem))) {
        const kisi = String(b.ogrenci || (typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '')).trim().toLowerCase();
        istek.then(async r => {
          if (!r.ok || kisi !== rozetKisi) return;
          const d = await r.clone().json();
          if (d?.ok === false || d?.hata) return;
          clearTimeout(yenileT); yenileT = setTimeout(() => { yenileT = null; if (kisi === rozetKisi) istatGetir(true); }, 1200);
        }).catch(() => {});
      }
    } catch (e) {}
    return istek;
  };
  // Password cancellation and teacher-menu closure leave the same world tab visible.
  ['sifreModal','ogretmenMenuModal'].forEach(id => {
    const m = $(id); if (!m) return;
    new MutationObserver(() => {
      if (getComputedStyle(m).display !== 'none' || !$('tab-dunyam')?.classList.contains('active')) return;
      if ([...document.querySelectorAll('.rubric-modal,.cog-perde')].some(gorunur)) return;
      $('bdOgretmen')?.focus({ preventScroll: true });
    }).observe(m, { attributes: true, attributeFilter: ['style'] });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); m.style.display = 'none'; } });
  });
  setInterval(() => {
    if (!rozetOturumu()) return;
    if (!document.hidden) { if (!istat) istatGetir(); rozetleriKontrolEt(); rozetKutla(); }
  }, 1000);

  /* ------------------------------------------------------------------ iskelet */
  function iskelet() {
    if ($('tab-dunyam')) return $('tab-dunyam');
    const ov = document.createElement('div');
    ov.id = 'tab-dunyam'; ov.className = 'dc-fullscreen-overlay bd-kok';
    ov.innerHTML = `
      <div class="bd-sahne" id="bdSahne">
        <img class="bd-papi" id="bdPapi" alt="" decoding="async">
        <div class="bd-tabela" id="bdTabela" hidden></div>
        <p class="bd-balon" id="bdBalon"></p>
        <div class="bd-ust"><button type="button" class="bd-yuvarlak bd-ogretmen" id="bdOgretmen" aria-label="Öğretmen paneli" title="Öğretmen paneli">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>
        </button><button type="button" class="bd-yuvarlak bd-cikis" id="bdCikis" aria-label="Çıkış yap" title="Çıkış yap">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        </button><button type="button" class="bd-yuvarlak" id="bdAyar" aria-label="Hesap ayarları">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </button></div>
      </div>
      <div class="bd-kart" id="bdKart"></div>
      <div class="bd-sekmeler" role="tablist" aria-label="Benim Dünyam">${SEKMELER.map(([k, ad]) => `<button type="button" role="tab" class="bd-sekme" data-bd="${k}" aria-selected="false">${ad}</button>`).join('')}</div>
      <div class="bd-govde">
        <section class="bd-panel" data-panel="sanaozel"><div id="bdOdevler"></div><div id="bdGorevler"></div><div id="bdHafta"></div><div id="bdDiger"></div></section>
        <section class="bd-panel" data-panel="istatistik" hidden><div id="bdIstat"></div><div id="bdGelisim"></div></section>
        <section class="bd-panel" data-panel="rozetler" hidden><div id="bdRozet"></div></section>
        <section class="bd-panel" data-panel="karakter" hidden><div id="bdKarakterUst"></div><div id="bdKarakterAlan"></div><div id="bdKoleksiyon"></div></section>
      </div>`;
    const yer = $('tab-profil') || $('tab-sanaozel');
    (yer && yer.parentNode ? yer.parentNode : document.body).appendChild(ov);
    ov.querySelectorAll('.bd-sekme').forEach(b => b.onclick = () => sekmeSec(b.dataset.bd));
    /* Öğretmen paneli şifreyle açılır; öğrenci basarsa sadece şifre sorulur */
    $('bdOgretmen').onclick = () => {
      // Keep the selected world tab and scroll position beneath the teacher dialog.
      if (typeof window.ogretmenPaneliAc === 'function') window.ogretmenPaneliAc();
    };
    $('bdCikis').onclick = () => {
      if (!window.confirm('Çıkış yapmak istediğine emin misin?')) return;
      if (typeof window.cikisYap === 'function') window.cikisYap();
    };
    $('bdAyar').onclick = () => { if (typeof window.dmHesapAyarlariAc === 'function') window.dmHesapAyarlariAc(); };
    return ov;
  }

  /* ------------------------------------------------------------------ taşı / geri koy */
  const yerler = new Map();
  function tasi(el, hedef) {
    if (!el || !hedef || hedef.contains(el)) return;
    if (!yerler.has(el)) { const im = document.createComment('bd-yer'); el.parentNode && el.parentNode.insertBefore(im, el); yerler.set(el, im); }
    hedef.appendChild(el);
  }
  function geriKoy() {
    yerler.forEach((im, el) => { if (im.parentNode) im.parentNode.insertBefore(el, im); im.remove(); });
    yerler.clear();
    const oz = $('tab-ozet'); if (oz && !document.getElementById('profilAlan')?.contains(oz)) { oz.classList.remove('active'); oz.style.display = ''; }
    if (window.yoGomuluHedef === 'bdKarakterAlan') window.yoGomuluHedef = null;
  }

  /* ------------------------------------------------------------------ üst kart */
  function kartCiz() {
    const sv = seviyeBilgi();
    const ad = (typeof yoIsim !== 'undefined' && yoIsim) || (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi) || '';
    const av = $('userAvatarLetter');
    const enerji = typeof window.genelEnerjiKalan === 'number' ? window.genelEnerjiKalan : (yoVar() ? yo.enerji : 0);
    const bas = sv.start || 0, son = sv.next == null ? sv.xp : sv.next;
    $('bdKart').innerHTML = `
      <div class="bd-kimlik">
        <div class="bd-avatar">${av ? av.innerHTML : '🦜'}</div>
        <div class="bd-isim">
          <div class="bd-ad-satir"><b>${kac(ad)}</b><button type="button" class="bd-kalem" id="bdAdDuzenle" aria-label="Hesap bilgilerini düzenle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button><span class="bd-cevrimici">Çevrimiçi</span></div>
          <div class="bd-seviye-satir"><span class="bd-sv">Sv. ${sv.level}</span></div>
          <div class="bd-xp"><span style="width:${Math.round(Math.max(0, Math.min(1, sv.ratio)) * 100)}%"></span></div>
          <div class="bd-xp-yazi">${sayi(sv.xp - bas)} / ${sayi(son - bas)} XP</div>
        </div>
        <div class="bd-kalkan" aria-label="Seviye ${sv.level}"><span>${sv.level}</span></div>
      </div>
      <div class="bd-cipler">
        <span class="bd-cip"><i aria-hidden="true">⚡</i>${sayi(enerji)}/30</span>
        <span class="bd-cip"><i aria-hidden="true">🪙</i>${sayi(yoVar() ? yo.altin : 0)}</span>
        <span class="bd-cip"><i aria-hidden="true">🏆</i>${sayi(sv.xp)} XP</span>
      </div>`;
    $('bdAdDuzenle').onclick = () => { if (typeof window.dmHesapAyarlariAc === 'function') window.dmHesapAyarlariAc(); };
  }

  function sahneCiz() {
    const ad = (typeof yoIsim !== 'undefined' && yoIsim) || '';
    const s = SAHNE[sekme];
    $('bdSahne').dataset.sekme = sekme;
    $('bdSahne').style.backgroundImage = s.sahne ? `url("${s.sahne}")` : '';
    $('bdPapi').src = s.papi; $('bdPapi').hidden = !!s.sahne;
    const g = window.dmGunGorevleri && izin('gunluk_gorev') ? window.dmGunGorevleri() : null;
    const kalan = g ? g.liste.filter(x => { const t = (window.dmGorevHavuz || []).find(y => y.id === x.id); return t && x.ilerleme < t.hedef; }).length : 0;
    const rozetSay = kazanilanRozetler(rozetBaglami()).size;
    const metin = {
      sanaozel: `Merhaba ${ad}! ` + (g ? (kalan ? `Bugün ${kalan} görevin var. Hadi maceraya devam edelim!` : 'Bugünkü görevlerin bitti, harikasın!') : 'Hadi maceraya devam edelim!'),
      istatistik: 'Harika gidiyorsun! İlerlemeni aşağıda görebilirsin.',
      rozetler: rozetSay ? `Tebrikler! ${rozetSay} rozetin var. Daha fazlasını kazanabilirsin.` : 'İlk rozetini kazanmak için hemen bir oyun oyna!',
      karakter: 'Karakterini istediğin gibi giydir, koleksiyonunu büyüt!'
    }[sekme];
    $('bdBalon').textContent = metin;
    const tabela = $('bdTabela');
    tabela.hidden = sekme !== 'istatistik'; tabela.textContent = 'İstatistiklerim';
  }

  /* ------------------------------------------------------------------ Sana Özel */
  function gorevlerCiz() {
    const alan = $('bdGorevler');
    if (!izin('gunluk_gorev')) { alan.innerHTML = kilitKart('Günün 3 Görevi', 'gunluk_gorev'); return; }
    const g = window.dmGunGorevleri ? window.dmGunGorevleri() : null, havuz = window.dmGorevHavuz || [];
    if (!g || !Array.isArray(g.liste)) { alan.innerHTML = ''; return; }
    gorevGunleriniKaydet();
    const satir = g.liste.map(x => {
      const t = havuz.find(y => y.id === x.id); if (!t) return '';
      const n = Math.min(t.hedef, x.ilerleme || 0), tamam = n >= t.hedef;
      return `<li class="bd-gorev${tamam ? ' tamam' : ''}"><span class="bd-gorev-ikon" aria-hidden="true">${kac(t.i)}</span>
        <span class="bd-gorev-metin"><b>${kac(t.ad)}</b><span class="bd-mini-bar"><span style="width:${Math.round(n * 100 / t.hedef)}%"></span></span></span>
        <span class="bd-gorev-sayi">${tamam ? '✓' : `${n}/${t.hedef}`}</span></li>`;
    }).join('');
    const hepsi = g.liste.every(x => { const t = havuz.find(y => y.id === x.id); return t && x.ilerleme >= t.hedef; });
    const dugme = g.alindi ? '<div class="bd-odul-alindi">Bugünün ödülünü aldın 🎉</div>'
      : `<button type="button" class="bd-odul" id="bdOdulAl" ${hepsi ? '' : 'disabled'}>${hepsi ? 'Ödülü al' : 'Hepsini bitir'}: +40 XP · +30 🪙</button>`;
    alan.innerHTML = `<div class="bd-tahta"><h2>Günün 3 Görevi</h2></div><ul class="bd-gorevler">${satir}</ul>${dugme}`;
    const b = $('bdOdulAl'); if (b) b.onclick = () => { const o = $('soGorevOdul'); if (o) o.click(); setTimeout(ciz, 400); };
  }
  function haftaCiz() {
    const alan = $('bdHafta');
    if (!izin('haftalik_hedef')) { alan.innerHTML = kilitKart('Haftalık Hedef', 'haftalik_hedef'); return; }
    if (!yoVar()) { alan.innerHTML = ''; return; }
    const h = yo.haftaHedef, xp = Number(yo.lig && yo.lig.xp) || 0;
    let govde;
    if (h && h.xp && h.h === haftaKodu()) {
      const oran = Math.min(1, xp / h.xp);
      govde = `<p>Bu hafta <b>${sayi(h.xp)} XP</b> topla${h.odul ? ' · hedefe ulaştın!' : ''}</p>
        <div class="bd-hafta-bar"><span style="width:${Math.round(oran * 100)}%"></span></div>
        <div class="bd-hafta-alt"><span>${sayi(Math.min(xp, h.xp))} / ${sayi(h.xp)} XP</span><span>Ödül: ${sayi(Math.round(h.xp / 20))} 🪙 + rozet</span></div>`;
    } else {
      govde = `<p>Bu haftanın hedefini seç:</p><div class="bd-hedef-sec">${[1000, 1500, 2500].map(x => `<button type="button" data-hedef="${x}">${sayi(x)} XP</button>`).join('')}</div>`;
    }
    alan.innerHTML = `<div class="bd-kutu bd-hafta"><div class="bd-hafta-bas"><div><h3>Haftalık Hedefim</h3>${govde}</div><span class="bd-hediye" aria-hidden="true">🎁</span></div></div>`;
    alan.querySelectorAll('[data-hedef]').forEach(b => b.onclick = () => {
      const o = document.querySelector(`#soPanel .so-hedef button[data-h="${b.dataset.hedef}"]`);
      if (o) o.click(); setTimeout(ciz, 300);
    });
  }
  function haftaKodu() {
    const d = new Date(Date.now() + 3 * 3600000); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  function kilitKart(baslik, kod) {
    const sv = window.DijiProgressionCatalog && window.DijiProgressionCatalog.gates ? window.DijiProgressionCatalog.gates[kod] : null;
    return `<div class="bd-kutu bd-kilit"><h3>🔒 ${kac(baslik)}</h3><p>${sv ? sv + '. seviyede açılır.' : 'Yakında açılacak.'}</p></div>`;
  }
  function digerleriniTasi() {
    const kart = document.querySelector('#tab-sanaozel .dc-focus-card') || document.querySelector('#bdDiger .dc-focus-card');
    if (kart) tasi(kart, $('bdDiger'));
    if (typeof gununKonusuYukle === 'function' && !digerleriniTasi.yuklendi) { digerleriniTasi.yuklendi = true; try { gununKonusuYukle(); } catch (e) {} }
  }

  /* ------------------------------------------------------------------ İstatistik */
  async function istatGetir(zorla) {
    if (!rozetOturumu()) return;
    if (istatYukleniyor || (!zorla && Date.now() - istatDeneme < 60000)) return;
    if (typeof apiURL === 'undefined') return;
    const kisi = rozetKisi;
    istatYukleniyor = true; istatDeneme = Date.now();
    try {
      const r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'benimIstatistik', ogrenci: aktifOgrenciAdi }) });
      const d = await r.json();
      if (kisi !== rozetKisi || kisi !== String(aktifOgrenciAdi || '').trim().toLowerCase()) return;
      if (r.ok && d && d.ok) { istat = d; istatZaman = Date.now(); rozetleriKontrolEt(); }
    } catch (e) {} finally { if (kisi === rozetKisi) istatYukleniyor = false; }
    if ($('tab-dunyam')?.classList.contains('active')) {
      if (sekme === 'istatistik') istatCiz();
      if (sekme === 'rozetler') rozetCiz();
      sahneCiz();
    }
  }

  const gunStr = d => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  function aralikBas() {
    const bugun = new Date();
    if (aralik === 'hafta') { const d = new Date(bugun); const g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g); return gunStr(d); }
    if (aralik === 'ay') { const d = new Date(bugun); d.setDate(d.getDate() - 29); return gunStr(d); }
    return '';
  }
  function cubuklar() {
    const gunler = (istat && istat.gunler) || {}, bugun = new Date(), out = [];
    const v = g => gunler[g] || { o: 0, l: 0, p: 0 };
    if (aralik === 'hafta') {
      const d = new Date(bugun); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach((ad, i) => { const x = new Date(d); x.setDate(d.getDate() + i); const k = gunStr(x); out.push({ ad, ...v(k), gelecek: k > gunStr(bugun) }); });
    } else if (aralik === 'ay') {
      for (let i = 29; i >= 0; i--) { const x = new Date(bugun); x.setDate(x.getDate() - i); const k = gunStr(x); out.push({ ad: i % 5 === 0 ? String(x.getDate()) : '', ...v(k) }); }
    } else {
      const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      for (let i = 11; i >= 0; i--) {
        const x = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1), on = gunStr(x).slice(0, 7);
        const t = { o: 0, l: 0, p: 0 }; Object.entries(gunler).forEach(([g, y]) => { if (g.slice(0, 7) === on) { t.o += y.o; t.l += y.l; t.p += y.p; } });
        out.push({ ad: aylar[x.getMonth()], ...t });
      }
    }
    return out;
  }
  function istatCiz() {
    const alan = $('bdIstat');
    const t = toplamlar(istat && istat.gunler, aralikBas()), cevap = t.dogru + t.yanlis;
    const kartlar = [
      ['🎮', sayi(t.oyun), 'Tamamlanan oyun'],
      ['🎯', cevap ? '%' + Math.round(t.dogru * 100 / cevap) : '—', 'Doğruluk oranı'],
      ['📅', sayi(t.aktif), 'Aktif gün'],
      ['⭐', sayi(t.dogru), 'Doğru cevap']
    ];
    const c = cubuklar(), en = Math.max(1, ...c.map(x => x.o + x.l + x.p));
    alan.innerHTML = `
      <div class="bd-aralik" role="group" aria-label="Zaman aralığı">${[['hafta', 'Bu Hafta'], ['ay', 'Bu Ay'], ['tum', 'Tüm Zamanlar']].map(([k, ad]) => `<button type="button" data-aralik="${k}" aria-pressed="${k === aralik}">${ad}</button>`).join('')}</div>
      ${istat ? '' : `<p class="bd-not">${istatYukleniyor ? 'İstatistikler yükleniyor…' : 'İstatistikler şu an alınamadı. Biraz sonra tekrar dene.'}</p>`}
      <div class="bd-istat-izgara">${kartlar.map(([i, s, a]) => `<div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">${i}</span><span><b>${s}</b><small>${a}</small></span></div>`).join('')}</div>
      <div class="bd-kutu bd-grafik">
        <div class="bd-grafik-bas"><h3>${aralik === 'tum' ? 'Aylık Performans' : 'Günlük Performans'}</h3>
          <div class="bd-lejant"><span class="o">Oyun</span><span class="l">Ders</span><span class="p">Parkur</span></div></div>
        <div class="bd-cubuklar${aralik === 'ay' ? ' ince' : ''}">${c.map(x => {
          const top = x.o + x.l + x.p, y = v => Math.round(v * 100 / en);
          return `<div class="bd-cubuk" title="${top} etkinlik"><div class="bd-yigin"><span class="p" style="height:${y(x.p)}%"></span><span class="l" style="height:${y(x.l)}%"></span><span class="o" style="height:${y(x.o)}%"></span></div><small>${kac(x.ad)}</small></div>`;
        }).join('')}</div>
      </div>`;
    alan.querySelectorAll('[data-aralik]').forEach(b => b.onclick = () => { aralik = b.dataset.aralik; istatCiz(); });
    /* Öğretmenin gördüğü gelişim grafikleri (deneme, gelişim, kriter) eski profilden buraya taşınır */
    const oz = $('tab-ozet');
    if (oz) {
      // The retired general-score badge section is not part of statistics.
      oz.classList.add('active'); oz.style.display = 'block'; tasi(oz, $('bdGelisim'));
      setTimeout(() => ['gelisimChartInstance', 'kriterChartInstance', 'denemeChartInstance'].forEach(n => { try { const ch = window[n] || (0, eval)(n); if (ch && ch.resize) ch.resize(); } catch (e) {} }), 80);
    }
    const tc = document.querySelector('#panel-alani > .timer-card') || document.querySelector('#bdGelisim .timer-card');
    if (tc) tasi(tc, $('bdGelisim'));
  }

  /* ------------------------------------------------------------------ Rozetler */
  function rozetHtml(r, kazanildi) {
    const resim = r.resim ? `<img src="${kac(r.resim)}" alt="" loading="lazy">` : `<span class="bd-rozet-emoji" aria-hidden="true">${r.ikon}</span>`;
    const kilit = '<span class="bd-kilit-ikon" aria-hidden="true">🔒</span>';
    return `<li class="bd-rozet${kazanildi ? '' : ' kilitli'}${r.resim ? ' resimli' : ''}" title="${kac(r.kosul)}"><span class="bd-rozet-sekil">${kazanildi ? resim : (r.resim ? resim + kilit : kilit)}</span><b>${kac(r.ad)}</b><small>${kac(r.kosul)}</small></li>`;
  }
  function rozetCiz() {
    rozetleriKontrolEt();
    const c = rozetBaglami();
    const sahip = kazanilanRozetler(c);
    const kaz = ROZETLER.filter(r => sahip.has(r.id)), kalan = ROZETLER.filter(r => !sahip.has(r.id));
    $('bdRozet').innerHTML = `
      <div class="bd-baslik-satir"><h3>Kazandığım Rozetler</h3><span>${kaz.length} rozet</span></div>
      ${kaz.length ? `<ul class="bd-rozetler">${kaz.map(r => rozetHtml(r, true)).join('')}</ul>` : '<p class="bd-not">Henüz rozetin yok. İlk oyununu bitirince ilk rozetini alacaksın!</p>'}
      <div class="bd-baslik-satir"><h3>Rozet Koleksiyonum</h3><span class="bd-kol-sayi"><span class="bd-kol-bar"><span style="width:${Math.round(kaz.length * 100 / ROZETLER.length)}%"></span></span>${kaz.length} / ${ROZETLER.length}</span></div>
      <ul class="bd-rozetler">${kalan.map(r => rozetHtml(r, false)).join('')}</ul>`;
    if (!istat) istatGetir();
  }

  /* ------------------------------------------------------------------ Karakter */
  function karakterCiz() {
    const ust = $('bdKarakterUst');
    if (!izin('magaza')) {
      ust.innerHTML = kilitKart('Karakter Atölyesi', 'magaza');
    } else {
      ust.innerHTML = '';
      window.yoGomuluHedef = 'bdKarakterAlan';
      if (typeof window.yoMagazaAc === 'function') { try { window.yoMagazaAc(); } catch (e) {} }
    }
    const kol = $('profilKoleksiyon') || document.querySelector('#bdKoleksiyon #profilKoleksiyon');
    if (kol) { tasi(kol, $('bdKoleksiyon')); if (typeof window.bcKoleksiyonCiz === 'function' && !kol.children.length) window.bcKoleksiyonCiz(kol); }
  }

  /* ------------------------------------------------------------------ genel */
  function sekmeSec(k) {
    if (!SEKMELER.some(([x]) => x === k)) k = 'sanaozel';
    sekme = k;
    document.querySelectorAll('#tab-dunyam .bd-sekme').forEach(b => { const on = b.dataset.bd === k; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    document.querySelectorAll('#tab-dunyam .bd-panel').forEach(p => { p.hidden = p.dataset.panel !== k; });
    if (k !== 'karakter' && window.yoGomuluHedef === 'bdKarakterAlan') window.yoGomuluHedef = null;
    ciz();
    if (k === 'istatistik') istatGetir();
    try { localStorage.setItem('bd_sekme', k); } catch (e) {}
  }
  function ciz() {
    if (!$('tab-dunyam') || !$('tab-dunyam').classList.contains('active')) return;
    kartCiz(); sahneCiz();
    if (sekme === 'sanaozel') { if (typeof window.soPanelCiz === 'function') { try { window.soPanelCiz(); } catch (e) {} } gorevlerCiz(); haftaCiz(); digerleriniTasi(); if (typeof window.dmOdevKartCiz === 'function') window.dmOdevKartCiz(); }
    if (sekme === 'istatistik') istatCiz();
    if (sekme === 'rozetler') rozetCiz();
    if (sekme === 'karakter') karakterCiz();
  }
  function benimDunyamAc(k) {
    iskelet();
    if (typeof dcTumTamEkranlariKapat === 'function') dcTumTamEkranlariKapat();
    const ov = $('tab-dunyam'); ov.classList.add('active'); ov.scrollTop = 0;
    if (typeof dcBottomNavSenkronize === 'function') dcBottomNavSenkronize();
    let k2 = k; if (!k2) { try { k2 = localStorage.getItem('bd_sekme'); } catch (e) {} }
    sekmeSec(k2 || 'sanaozel');
    istatGetir();
  }
  window.benimDunyamAc = benimDunyamAc;

  /* Eski girişler bu ekrana yönlenir */
  window.sanaOzelTamEkranAc = () => benimDunyamAc('sanaozel');
  window.profilAc = () => benimDunyamAc('istatistik');

  /* Ekran kapanınca taşınanlar yerine döner */
  const eskiKapat = window.dcTumTamEkranlariKapat;
  if (typeof eskiKapat === 'function') window.dcTumTamEkranlariKapat = function () { geriKoy(); return eskiKapat.apply(this, arguments); };

  /* Sekmeler arası klavye ile gezinme */
  document.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('#tab-dunyam .bd-sekme'); if (!b) return;
    const l = [...document.querySelectorAll('#tab-dunyam .bd-sekme')], i = l.indexOf(b);
    const y = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
    if (y === null) return; e.preventDefault(); const h = l[(y + l.length) % l.length]; h.focus(); h.click();
  });

  /* Alt menü: Sana Özel ve Profil yerine tek "Benim Dünyam" düğmesi */
  function menu() {
    const nav = $('bottomNavMobile'); if (!nav) return;
    if (!nav.querySelector('[data-ekran="tab-dunyam"]')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bn-item'; b.dataset.ekran = 'tab-dunyam';
      b.innerHTML = '<span class="bn-icon">🦜</span><span class="bn-label">Benim Dünyam</span>';
      b.onclick = () => benimDunyamAc();
      nav.appendChild(b);
    } else if (nav.lastElementChild && nav.lastElementChild.dataset.ekran !== 'tab-dunyam') {
      nav.appendChild(nav.querySelector('[data-ekran="tab-dunyam"]'));
    }
  }
  iskelet(); menu();
  setInterval(() => {
    menu();
    const ov = $('tab-dunyam');
    if (ov && ov.classList.contains('active')) {
      if (sekme === 'karakter' && izin('magaza') && window.yoGomuluHedef !== 'bdKarakterAlan' && !($('yoModal') && $('yoModal').classList.contains('acik'))) window.yoGomuluHedef = 'bdKarakterAlan';
      if (sekme === 'sanaozel') { gorevlerCiz(); haftaCiz(); }
      kartCiz();
    }
  }, 2000);
})();
