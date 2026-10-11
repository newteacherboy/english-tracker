/* =====================================================================
   OYNA SEKMESİ · v2  —  oyna-v2.js
   Büyü Akademisi parkur ekranının (tab-dunya) yeni görünümü.

   Nasıl çalışır?
   - index.html içindeki harita() fonksiyonu ekranı şu iki fonksiyonla çizer:
       window.dmParkurBaslik({energy,max,gold})   → üst çubuk
       window.dmParkurSahne({steps,current,...})  → sahne (hero + görevler + haftalık hedef + buton)
     Bu dosya ikisini yeniler. Tıklanan düğümler `.dm-adventure-node`,
     "Devam" butonu `.dm-map-continue` sınıfını korur; yani durakKarti() ve
     oyun başlatma mantığı AYNEN çalışmaya devam eder.
   - Veri kaynakları (hiçbiri değiştirilmez):
       yo.lig.xp · yo.altin · yo.baYildiz · yo.haftaHedef · yo.gorev
       dmGunGorevleri() · dmGorevHavuz · genelEnerjiKalan/genelEnerjiMax
   - Eski tasarıma dönmek için konsolda:  localStorage.oy_eski='1'  (sonra yenile)
   ===================================================================== */
(function () {
  'use strict';
  if (window.__oyV2) return;
  window.__oyV2 = 1;

  var ASSET = 'oyna-assets/';
  var origBaslik = window.dmParkurBaslik;
  var origSahne = window.dmParkurSahne;

  /* ---------------- yardımcılar ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function Y() { try { return (typeof yo !== 'undefined' && yo) ? yo : null; } catch (e) { return null; } }
  function ready() { try { return !!Y() && typeof yoHazirMi === 'function' && yoHazirMi(); } catch (e) { return false; } }
  function ogrAdi() {
    try {
      if (typeof oyunIcinAktifIsim === 'function') return oyunIcinAktifIsim() || '';
      if (typeof aktifOgrenciAdi !== 'undefined') return aktifOgrenciAdi || '';
    } catch (e) {}
    return '';
  }
  function eski() { try { return localStorage.getItem('oy_eski') === '1'; } catch (e) { return false; } }
  function fn(name) { return typeof window[name] === 'function' ? window[name] : null; }

  /* görsel + emoji yedeği: dosya yoksa emoji görünür */
  function art(file, cls, fallback, alt) {
    return '<span class="oy-art ' + cls + '" data-fb="' + esc(fallback) + '">' +
      '<img src="' + ASSET + file + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" ' +
      'onerror="this.parentNode.classList.add(\'oy-noimg\');this.remove()"></span>';
  }

  /* ---------------- hafta / XP ---------------- */
  function haftaKodu() {
    var d = new Date(Date.now() + 3 * 3600000);
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    return d.toISOString().slice(0, 10);
  }
  function kalanGun() {
    var d = new Date(Date.now() + 3 * 3600000);
    return 6 - ((d.getUTCDay() + 6) % 7);
  }
  function haftaXp() { var y = Y(); return Number(y && y.lig && y.lig.xp) || 0; }
  function izinli(k) {
    try { return !window.dmProgression || !window.dmProgression.allowed || window.dmProgression.allowed(k); }
    catch (e) { return true; }
  }

  /* =====================================================================
     ÜST ÇUBUK
     ===================================================================== */
  function baslik(o) {
    if (eski() && origBaslik) return origBaslik.apply(this, arguments);
    o = o || {};
    var y = Y();
    var enerji = o.energy == null ? '–' : o.energy;
    var max = o.max || 30;
    var altin = o.gold != null ? o.gold : (y && y.altin) || 0;
    var av = '';
    try { if (fn('karakterSvg')) av = karakterSvg(ogrAdi(), 46) || ''; } catch (e) {}
    if (!av) av = '🧒';
    return '<div class="oy-top">' +
      '<div class="oy-logo" aria-label="DijiMedu"><b><span>Diji</span>Medu</b><i>✦</i><small>İngilizce seninle.</small></div>' +
      '<div class="oy-pills">' +
        '<div class="oy-pill" title="Enerji ' + esc(enerji) + '/' + esc(max) + '"><span class="ic">⚡</span>' + esc(enerji) + '/' + esc(max) +
          '<button type="button" class="plus" data-act="store" aria-label="Enerji al">+</button></div>' +
        '<div class="oy-pill xp" title="Bu haftaki XP"><span class="ic">XP</span>' + haftaXp() + '</div>' +
        '<div class="oy-pill" title="Altın"><span class="ic">🪙</span>' + esc(altin) + '</div>' +
      '</div>' +
      '<div class="oy-avatar" aria-label="Profil"><span>' + av + '</span></div>' +
    '</div>';
  }

  /* =====================================================================
     HERO · MACERA PARKURU
     ===================================================================== */
  var SLOT = [[18, 79], [35, 65], [54, 63], [71, 75], [90, 67]]; /* % (x, y) */
  var HERO_ORAN = 1.88;

  function parse(label) {
    var m = /(\d+)\.\s*sınıf\s+(\d+)\.\s*ünite\s*·\s*(\d+)\s*\/\s*(\d+)/i.exec(label || '');
    return m ? { sinif: m[1], unite: m[2], parca: m[3], toplam: m[4] } : null;
  }
  function pathD(pts) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1], mx = (x0 + x1) / 2;
      d += ' C' + mx + ',' + y0 + ' ' + mx + ',' + y1 + ' ' + x1 + ',' + y1;
    }
    return d;
  }
  function yildizHtml(st) {
    var y = Y(), n = 0;
    if (st.done) { n = Math.max(1, Math.min(3, Number(y && y.baYildiz && y.baYildiz[st.no]) || 1)); }
    var h = '';
    for (var i = 0; i < 3; i++) h += '<i class="' + (i < n ? '' : 'off') + '">⭐</i>';
    return '<span class="st" aria-hidden="true">' + h + '</span>';
  }

  /* kaç durak varsa hangi yuvalara oturacağı */
  var YUVA = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };

  function hero(steps, current) {
    var cs = steps[current] || steps[0];
    var info0 = parse(cs && cs.label);
    /* Sadece SIRADAKİ ÜNİTENİN durakları: numaralar 1,2,3... ünite içi sırayı gösterir */
    var unit = info0 ? steps.filter(function (st) {
      var q = parse(st.label); return q && q.sinif === info0.sinif && q.unite === info0.unite;
    }) : steps;
    var ui = Math.max(0, unit.indexOf(cs));
    var n = Math.min(5, unit.length);
    var start = Math.max(0, Math.min(ui - 2, unit.length - n));
    var list = unit.slice(start, start + n);
    var cur = Math.max(0, Math.min(n - 1, ui - start));
    var yuva = YUVA[n] || YUVA[5];

    var pts = list.map(function (_, i) { return [SLOT[yuva[i]][0], SLOT[yuva[i]][1] / HERO_ORAN]; });
    var svg = '<svg class="oy-path" viewBox="0 0 100 ' + (100 / HERO_ORAN).toFixed(2) + '" preserveAspectRatio="none" aria-hidden="true">' +
      (pts.length > 1 ? '<path class="base" d="' + pathD(pts) + '"/><path class="dash" d="' + pathD(pts) + '"/>' : '') + '</svg>';

    var nodes = list.map(function (st, i) {
      var q = parse(st.label), numara = q ? q.parca : (start + i + 1);
      var hal = i === cur ? 'is-cur' : (st.done ? 'is-done' : (st.available ? 'is-open' : 'is-lock'));
      var ad = st.label || ('Durak ' + numara);
      return '<button type="button" class="dm-adventure-node oy-node ' + hal + '" data-b="' + st.b + '" data-d="' + st.d + '"' +
        ' style="left:' + SLOT[yuva[i]][0] + '%;top:' + SLOT[yuva[i]][1] + '%" aria-label="' + esc(ad) + (hal === 'is-lock' ? ' (kilitli)' : '') + '">' +
        (hal === 'is-lock' ? '<span class="lk" aria-hidden="true">🔒</span>' : '') +
        '<span class="n">' + esc(numara) + '</span>' +
        (st.done ? yildizHtml(st) : '') + '</button>';
    }).join('');

    var info = info0;
    var ad = '';
    try { if (fn('dmParkurDurakAdi')) ad = dmParkurDurakAdi(cs.b, cs.d) || ''; } catch (e) {}
    if (!ad) ad = info ? info.unite + '. Ünite' : 'Macera';
    var ust = info ? info.sinif + '. Sınıf · ' + info.unite + '. Ünite' : 'Macera Parkuru';
    var alt = info ? 'Bölüm ' + info.parca + '/' + info.toplam : '';

    var px = Math.max(14, Math.min(86, SLOT[yuva[cur]][0])), py = SLOT[yuva[cur]][1] - 4;
    return '<section class="oy-hero" aria-label="Macera parkuru">' +
      '<div class="oy-hero-bg" aria-hidden="true"></div>' + svg +
      '<button type="button" class="oy-sign" data-act="cur" aria-label="Sıradaki durağı aç">' +
        '<span class="bk" aria-hidden="true">📗</span>' +
        '<span><small>' + esc(ust) + '</small><b>' + esc(ad) + '</b><em>' + esc(alt) + '</em></span><span class="chev">›</span></button>' +
      '<button type="button" class="oy-all" data-act="all">Tüm Parkuru Gör ›</button>' +
      '<div class="oy-wood" aria-hidden="true">Daha kocaman maceralar seni bekliyor</div>' +
      nodes +
      '<div class="oy-parrot" style="left:' + px + '%;top:' + py + '%" aria-hidden="true">' + art('oyna-papi-fly.png', '', '🦜') + '</div>' +
    '</section>';
  }

  /* =====================================================================
     GÜNÜN 3 GÖREVİ
     ===================================================================== */
  function gorevler() {
    var g = null;
    try { g = fn('dmGunGorevleri') ? dmGunGorevleri() : null; } catch (e) { g = null; }
    if (!g || !Array.isArray(g.liste)) return null;
    var havuz = window.dmGorevHavuz || [];
    return g.liste.slice(0, 3).map(function (x) {
      var p = havuz.filter(function (h) { return h.id === x.id; })[0] || { id: x.id, ad: x.id, i: '⭐', hedef: 1, olay: '' };
      var hedef = p.hedef || 1;
      return { id: p.id, ad: p.ad, i: p.i, olay: String(p.olay || ''), hedef: hedef, il: Math.min(Number(x.ilerleme) || 0, hedef) };
    });
  }
  function ikon(t) {
    var o = t.olay;
    if (o === 'ders') return ['oyna-ico-kelime.png', '📘'];
    if (/dinleme/.test(o)) return ['oyna-ico-dinle.png', '🎧'];
    if (/konusma/.test(o)) return ['oyna-ico-konus.png', '💬'];
    if (o === 'oyun' || o === 'yildiz3') return ['oyna-ico-oyun.png', t.i || '🎮'];
    return [null, t.i || '⭐'];
  }
  function gorevHtml() {
    var L = gorevler();
    var head = '<div class="oy-h"><span class="tg" aria-hidden="true">🎯</span><h3>Günün 3 Görevi</h3>' +
      '<span class="oy-chip">✨ Bugün sana özel • seviyene uygun</span></div>';
    if (!L || !L.length) {
      return '<section class="oy-tasks" aria-label="Günün görevleri">' + head +
        '<div class="oy-empty">Günlük görevlerin hazırlanıyor. Biraz sonra burada olacak! 🌴</div></section>';
    }
    var bitenler = L.filter(function (t) { return t.il >= t.hedef; }).length;
    var hepsi = bitenler === L.length;
    var kart = L.map(function (t, i) {
      var bitti = t.il >= t.hedef, ic = ikon(t);
      var gorsel = ic[0] ? art(ic[0], 'ic', ic[1]) : '<span class="oy-art ic oy-noimg" data-fb="' + esc(ic[1]) + '"></span>';
      return '<article class="oy-gk c' + (i % 3) + (bitti ? ' done' : '') + '">' +
        '<span class="sb" aria-hidden="true">' + (bitti ? '✓' : '⭐') + '</span>' + gorsel +
        '<h4>' + esc(t.ad) + '</h4><span class="pl">' + t.il + '/' + t.hedef + '</span>' +
        '<button type="button" class="go" data-act="gorev" data-olay="' + esc(t.olay) + '"' + (bitti ? ' disabled' : '') + '>' +
        (bitti ? 'Tamam ✓' : 'Başla ›') + '</button></article>';
    }).join('');
    return '<section class="oy-tasks" aria-label="Günün görevleri">' +
      '<div class="oy-bubble">' + (hepsi ? 'Harika! Bugünün görevleri tamam 🎉' : 'Bugünün görevleri hazır! Hadi başlayalım!') + '</div>' +
      '<div class="oy-peek" aria-hidden="true">' + art('oyna-papi-peek.png', '', '🦜') + '</div>' +
      head +
      '<div class="oy-gk-wrap"><div class="oy-gk-row">' + kart + '</div></div></section>';
  }

  /* =====================================================================
     HAFTALIK HEDEF + DEVAM BUTONU
     ===================================================================== */
  function haftalikHtml() {
    var y = Y(), hh = (y && y.haftaHedef && y.haftaHedef.h === haftaKodu()) ? y.haftaHedef : null;
    var xp = haftaXp(), kilitli = !izinli('haftalik_hedef');
    var hedef = hh ? hh.xp : 0;
    var oran = hh && hedef ? Math.min(1, xp / hedef) : 0;
    var C = 2 * Math.PI * 44, off = (C * (1 - oran)).toFixed(1);
    var seg = '';
    for (var i = 0; i < 10; i++) seg += '<i class="' + (i < Math.round(oran * 10) ? 'on' : '') + '"></i>';
    var gun = kalanGun();
    var gunMetni = gun <= 0 ? 'Bugün son gün!' : gun + ' gün kaldı';
    var mesaj, buyuk, alt = '';
    if (kilitli) {
      mesaj = 'Haftalık hedef yakında!'; buyuk = 'Biraz daha oyna, kilit açılsın.';
    } else if (!hh) {
      mesaj = 'Yeni hafta, yeni macera!'; buyuk = 'Bu haftaki hedefini seç.';
      alt = '<div class="oy-pick">' + [1000, 1500, 2500].map(function (x) {
        return '<button type="button" data-act="hedef" data-h="' + x + '">' + (x === 1000 ? '🙂' : x === 1500 ? '💪' : '🔥') + ' ' + x + '</button>';
      }).join('') + '</div>';
    } else if (hh.odul || xp >= hedef) {
      mesaj = 'Hedefine ulaştın! 🏅'; buyuk = 'Harikasın, ödülün hazır!';
    } else {
      mesaj = oran >= .5 ? 'Bu hafta harika gidiyorsun! 🎉' : 'Güzel bir başlangıç, devam!';
      buyuk = 'Hedefine ' + Math.max(0, hedef - xp) + ' XP kaldı.';
    }
    var merkez = hh
      ? '<b>' + xp + '<small>/' + hedef + '</small></b><span>XP kazanıldı</span><i aria-hidden="true">⭐</i>'
      : '<b>' + xp + '</b><span>XP bu hafta</span><i aria-hidden="true">⭐</i>';
    return '<div class="oy-weekly">' +
      '<div class="oy-wk-top"><span class="bars" aria-hidden="true">📊</span><h3>Haftalık Hedef</h3>' +
      '<button type="button" class="oy-detay" data-act="detay">Detayları Gör ›</button></div>' +
      '<div class="oy-wk-body">' +
        '<div class="oy-ring" role="img" aria-label="Haftalık XP: ' + xp + (hh ? '/' + hedef : '') + '">' +
          '<svg viewBox="0 0 112 112"><defs><linearGradient id="oyRingGrad" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>' +
          '<circle class="bg" cx="56" cy="56" r="44"/>' +
          '<circle class="fg" cx="56" cy="56" r="44" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off + '"/></svg>' +
          '<div class="tx">' + merkez + '</div></div>' +
        '<div class="oy-wk-r"><p>' + mesaj + '</p><h4>' + buyuk + '</h4>' +
          (hh && !kilitli ? '<div class="oy-seg" aria-hidden="true">' + seg + '</div>' +
            '<div class="oy-days"><span aria-hidden="true">🗓️</span>' + gunMetni + '</div>' : alt) +
        '</div>' +
      '</div>' +
      '<div class="oy-deco" aria-hidden="true"><div class="oy-note">Küçük adımlar büyük başarılar getirir!</div>' +
      '<div class="oy-chest">' + art('oyna-sandik.png', '', '🧰') + '</div></div></div>';
  }
  function bottomHtml(cs) {
    return '<section class="oy-bottom" aria-label="Haftalık hedef">' + haftalikHtml() +
      '<button type="button" class="dm-map-continue oy-cta" data-b="' + (cs ? cs.b : 0) + '" data-d="' + (cs ? cs.d : 0) + '">' +
        '<span class="pp" aria-hidden="true">' + art('oyna-papi-cta.png', '', '🦜') + '</span>' +
        '<span class="t">Haydi Devam Edelim!</span><span class="ar" aria-hidden="true">›</span></button>' +
    '</section>';
  }

  /* =====================================================================
     TÜM PARKURU GÖR (alt panel)
     ===================================================================== */
  function sheetHtml(steps, current) {
    var satirlar = steps.map(function (st, i) {
      var info = parse(st.label), no = info ? info.parca : (i + 1);
      var hal = i === current ? 'is-cur' : (st.done ? 'is-done' : (st.available ? 'is-open' : 'is-lock'));
      var durum = i === current ? '▶ Sıradaki' : st.done ? '✅ Bitti' : st.available ? 'Açık' : '🔒';
      return '<button type="button" class="dm-adventure-node oy-row ' + hal + '" data-b="' + st.b + '" data-d="' + st.d + '">' +
        '<span class="no">' + esc(no) + '</span><span>' + esc(info ? info.sinif + '. Sınıf · ' + info.unite + '. Ünite' : st.label) +
        '<small>' + esc(info ? 'Bölüm ' + info.parca + '/' + info.toplam : '') + '</small></span><span class="rs">' + durum + '</span></button>';
    }).join('');
    return '<div class="oy-sheet" hidden><div class="oy-sheet-card" role="dialog" aria-modal="true" aria-label="Macera parkuru">' +
      '<header><b>🗺️ Macera Parkuru</b><button type="button" data-act="sheet-x" aria-label="Kapat">✕</button></header>' +
      '<div class="oy-list">' + satirlar + '</div></div></div>';
  }

  /* =====================================================================
     SAHNE
     ===================================================================== */
  function sahne(o) {
    if (eski() && origSahne) return origSahne.apply(this, arguments);
    hook();
    o = o || {};
    var steps = Array.isArray(o.steps) ? o.steps : [];
    if (!steps.length) {
      return '<div class="oy-root"><div class="oy-empty">Parkur hazırlanıyor… 🌴</div></div>';
    }
    var current = Math.max(0, Math.min(steps.length - 1, Number(o.current) || 0));
    return '<div class="oy-root">' + hero(steps, current) + gorevHtml() + bottomHtml(steps[current]) +
      sheetHtml(steps, current) + '</div>';
  }

  /* =====================================================================
     ETKİLEŞİM  (harita() her çizimde dmParkurMapMount'u çağırır)
     ===================================================================== */
  var BECERI_OYUN = { anlam: 'esOyunAc', yazim: 'boslukOyunAc', dinleme: 'dikteAc', konusma: 'kpModuAc', cumle: 'trenOyunAc', hiz: 'yagmurOyunAc' };

  function gorevBaslat(olay) {
    var m = /^beceri2?:(\w+)/.exec(olay || '');
    var f = null;
    if (m && BECERI_OYUN[m[1]]) f = fn(BECERI_OYUN[m[1]]);
    if (!f && olay === 'ders') f = fn('dersCalisTamEkranAc');
    if (!f) f = fn('aktivitelerTamEkranAc');
    if (f) f();
  }
  function hedefKaydet(x) {
    var y = Y(); if (!y) return false;
    try { if (window.dmProgression && window.dmProgression.require && !window.dmProgression.require('haftalik_hedef')) return false; } catch (e) {}
    y.haftaHedef = { h: haftaKodu(), xp: x, odul: 0 };
    try { if (fn('yoKaydet')) yoKaydet(); } catch (e) {}
    return true;
  }
  function kaydirDurum(root) {
    var row = root.querySelector('.oy-gk-row'); if (!row) return;
    var kart = row.querySelector('.oy-gk'); if (!kart) return;
    var adim = kart.offsetWidth + 10, i = Math.round(row.scrollLeft / adim);
    var son = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    var dots = root.querySelectorAll('.oy-dots i');
    var n = dots.length, idx = son ? n - 1 : Math.min(n - 1, i);
    for (var k = 0; k < n; k++) dots[k].classList.toggle('on', k === idx);
    var l = root.querySelector('.oy-arrow.l'), r = root.querySelector('.oy-arrow.r');
    if (l) l.disabled = row.scrollLeft <= 4;
    if (r) r.disabled = son;
  }
  function tikla(e) {
    var root = e.currentTarget.querySelector('.oy-root');
    if (!root) return;
    var sheet = root.querySelector('.oy-sheet');
    if (sheet && e.target === sheet) { sheet.hidden = true; return; }
    if (sheet && !sheet.hidden && e.target.closest && e.target.closest('.oy-row')) { sheet.hidden = true; return; }
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    switch (t.getAttribute('data-act')) {
      case 'cur': var c = root.querySelector('.oy-node.is-cur'); if (c) c.click(); break;
      case 'all': if (sheet) sheet.hidden = false; break;
      case 'sheet-x': if (sheet) sheet.hidden = true; break;
      case 'prev': case 'next':
        var row = root.querySelector('.oy-gk-row'), k = row && row.querySelector('.oy-gk');
        if (row && k) row.scrollBy({ left: (t.getAttribute('data-act') === 'next' ? 1 : -1) * (k.offsetWidth + 10), behavior: 'smooth' });
        break;
      case 'gorev': if (!t.disabled) gorevBaslat(t.getAttribute('data-olay')); break;
      case 'hedef':
        if (hedefKaydet(+t.getAttribute('data-h'))) {
          var w = root.querySelector('.oy-bottom'), cta = w && w.querySelector('.oy-cta');
          if (w && cta) {
            var b = cta.getAttribute('data-b'), d = cta.getAttribute('data-d');
            var tmp = document.createElement('div');
            tmp.innerHTML = bottomHtml({ b: b, d: d });
            var yeni = tmp.firstChild;
            w.parentNode.replaceChild(yeni, w);
            var yc = yeni.querySelector('.oy-cta');
            if (yc) yc.onclick = cta.onclick; /* durakKarti bağlantısını koru */
          }
        }
        break;
      case 'detay': if (fn('benimDunyamAc')) benimDunyamAc(); break;
      case 'store': if (fn('magazaAc')) magazaAc(); break;
    }
  }
  function mount(el) {
    el.classList.add('oy-scroll');
    var host = el.closest ? el.closest('.bz-parkur') : null;
    if (host) host.classList.add('oy-on');
    /* üst çubuk (+ butonu) scroll alanının dışında olduğundan dinleyiciyi ortak üst elemana bağla */
    var kap = el.parentNode || el;
    if (!kap.__oyBagli) { kap.__oyBagli = 1; kap.addEventListener('click', tikla); }
  }

  /* eski modüller bizim sahnemize dokunmasın */
  function hook() {
    var om = window.dmParkurMapMount;
    if (om && !om.__oy) {
      var w = function (el) {
        if (el && el.querySelector && el.querySelector('.oy-root')) { mount(el); return; }
        return om.apply(this, arguments);
      };
      w.__oy = 1; window.dmParkurMapMount = w;
    } else if (!om) {
      window.dmParkurMapMount = function (el) { if (el && el.querySelector && el.querySelector('.oy-root')) mount(el); };
      window.dmParkurMapMount.__oy = 1;
    }
    var sp = window.dmStoryPath;
    if (sp && typeof sp.mount === 'function' && !sp.mount.__oy) {
      var os = sp.mount;
      sp.mount = function (el) { if (el && el.querySelector && el.querySelector('.oy-root')) return; return os.apply(this, arguments); };
      sp.mount.__oy = 1;
    }
  }

  function kur() { window.dmParkurBaslik = baslik; window.dmParkurSahne = sahne; hook(); }
  kur();
  window.addEventListener('load', function () { kur(); setTimeout(kur, 1500); });
  window.OyV2 = { surum: 1, kur: kur };
})();
