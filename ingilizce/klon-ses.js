/*
 * Diji Medu — Klon ses katmanı (klon-ses.js)
 *
 * Uygulamadaki tüm İngilizce sesli okumalar window.speechSynthesis.speak() ile yapılıyor.
 * Bu dosya o çağrının önüne geçer:
 *   - Metnin öğretmenin sesiyle üretilmiş MP3'ü varsa onu çalar (Supabase Storage "ses" deposu).
 *   - Yoksa eskisi gibi cihazın sesiyle okur ve metni "ses_metinleri" tablosuna bildirir;
 *     öğretmen bilgisayarındaki betik onu onaylayıp üretince bir sonraki seferde klon ses çalar.
 * Diğer dosyalarda hiçbir değişiklik gerekmez. Kapatmak için: localStorage.dm_klon_ses = '0'
 */
(function () {
  'use strict';
  if (window.dmKlonSes) return;
  var ss = window.speechSynthesis;
  if (!ss || !window.SpeechSynthesisUtterance || typeof ss.speak !== 'function') return;

  var DEPO = 'https://nxfqlutulxqzqgwewssd.supabase.co/storage/v1/object/public/ses/';
  var MAX_UZUNLUK = 300;
  var IZINLI = /^[ -~‘’“”—–…]+$/; // düz İngilizce karakterler

  function kapali() { try { return localStorage.getItem('dm_klon_ses') === '0'; } catch (e) { return false; } }

  // ---- Metin anahtarı: normalize + iki tohumlu FNV-1a (UTF-8) → 16 hex ----
  function normalize(t) {
    t = String(t == null ? '' : t);
    try { t = t.normalize('NFC'); } catch (e) {}
    return t.replace(/\s+/g, ' ').trim();
  }
  var enc = window.TextEncoder ? new TextEncoder() : null;
  function baytlar(s) {
    if (enc) return enc.encode(s);
    var u = unescape(encodeURIComponent(s)), a = new Array(u.length);
    for (var i = 0; i < u.length; i++) a[i] = u.charCodeAt(i);
    return a;
  }
  function fnv(b, h) {
    for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function anahtar(metin) { var b = baytlar(metin); return fnv(b, 2166136261) + fnv(b, 0x9747b28c); }

  // ---- Hazır sesler dizini ----
  var hazir = null;
  function dizinYukle() {
    var kova = Math.floor(Date.now() / 600000); // 10 dakikada bir tazele
    try {
      fetch(DEPO + 'index.json?k=' + kova, { cache: 'default' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && Array.isArray(j.anahtarlar)) hazir = new Set(j.anahtarlar); else if (!hazir) hazir = new Set(); })
        .catch(function () { if (!hazir) hazir = new Set(); });
    } catch (e) { hazir = new Set(); }
  }
  dizinYukle();
  setInterval(dizinYukle, 600000);

  // ---- Eksik metin bildirimi (cihaz başına bir kez) ----
  var bildirildi = new Set(), bekleyen = [];
  try { (JSON.parse(localStorage.getItem('dm_klon_bildirilen') || '[]') || []).forEach(function (k) { bildirildi.add(k); }); } catch (e) {}
  function kaydetBildirilen() {
    try { localStorage.setItem('dm_klon_bildirilen', JSON.stringify(Array.from(bildirildi).slice(-3000))); } catch (e) {}
  }
  function gonder() {
    var c = window.supabaseClient;
    if (!c || typeof c.rpc !== 'function') { if (bekleyen.length) setTimeout(gonder, 5000); return; }
    while (bekleyen.length) {
      var is = bekleyen.shift();
      (function (is) {
        try {
          c.rpc('ses_metni_bildir', { p_anahtar: is.k, p_metin: is.m }).then(function (r) {
            if (!r || !r.error) { bildirildi.add(is.k); kaydetBildirilen(); }
          }, function () {});
        } catch (e) {}
      })(is);
    }
  }
  function bildir(k, m) {
    if (bildirildi.has(k)) return;
    for (var i = 0; i < bekleyen.length; i++) if (bekleyen[i].k === k) return;
    if (bekleyen.length > 50) return;
    bekleyen.push({ k: k, m: m });
    setTimeout(gonder, 1500);
  }

  // ---- Yardımcılar ----
  var protoSpeaking = null;
  try { protoSpeaking = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ss), 'speaking'); } catch (e) {}
  var yerelKonus = ss.speak.bind(ss), yerelIptal = ss.cancel.bind(ss);
  var yerelDuraklat = typeof ss.pause === 'function' ? ss.pause.bind(ss) : null;
  var yerelDevam = typeof ss.resume === 'function' ? ss.resume.bind(ss) : null;

  function olay(u, tur) {
    var ev;
    try { ev = new SpeechSynthesisEvent(tur, { utterance: u, charIndex: 0, elapsedTime: 0 }); }
    catch (e) { try { ev = new Event(tur); } catch (e2) { ev = null; } }
    var gonderildi = false;
    if (ev && typeof u.dispatchEvent === 'function') { try { u.dispatchEvent(ev); gonderildi = true; } catch (e) {} }
    if (!gonderildi) { try { var h = u['on' + tur]; if (typeof h === 'function') h.call(u, ev || { type: tur, utterance: u }); } catch (e) {} }
  }
  function ingilizceMi(u) {
    var lang = String(u.lang || (u.voice && u.voice.lang) || '').toLowerCase();
    return lang === '' || lang.indexOf('en') === 0;
  }
  function hiz(u) {
    var r = Number(u.rate);
    if (!isFinite(r) || r <= 0) r = 1;
    if (r >= 0.85) return 1;               // uygulamanın "normal" hızı 0.9 civarı → kaydın doğal hızı
    return Math.max(0.6, Math.min(1, r / 0.9)); // yavaş dinleme
  }

  // Tek bir ortak <audio>: iOS'ta ilk dokunuşla açılınca sonraki çalmalara da izin verir.
  var oynatici = new Audio();
  oynatici.preload = 'auto';
  try { oynatici.preservesPitch = true; oynatici.webkitPreservesPitch = true; } catch (e) {}

  var kuyruk = [], simdiki = null, bekci = null;

  function bitir(is, tur) {
    if (simdiki !== is) return;
    clearTimeout(bekci); bekci = null;
    simdiki = null;
    if (tur) olay(is.u, tur);
    sonraki();
  }

  function yerelOku(is) {
    var u = is.u;
    var bitti = function () { u.removeEventListener('end', bitti); u.removeEventListener('error', bitti); if (simdiki === is) { clearTimeout(bekci); simdiki = null; sonraki(); } };
    try { u.addEventListener('end', bitti); u.addEventListener('error', bitti); } catch (e) {}
    var sure = Math.max(4000, String(u.text || '').length * 160 / hiz(u) + 3000);
    bekci = setTimeout(bitti, sure); // bazı tarayıcılar 'end' olayını hiç vermiyor
    try { yerelKonus(u); } catch (e) { bitti(); }
  }

  function klonOku(is) {
    var u = is.u, basladi = false;
    oynatici.onplaying = function () { if (simdiki === is && !basladi) { basladi = true; olay(u, 'start'); } };
    oynatici.onended = function () { bitir(is, 'end'); };
    oynatici.onerror = function () { if (simdiki === is) { clearTimeout(bekci); is.klon = false; yerelOku(is); } };
    try {
      oynatici.src = DEPO + is.k + '.mp3';
      oynatici.playbackRate = hiz(u);
      oynatici.volume = Math.max(0, Math.min(1, u.volume == null ? 1 : Number(u.volume)));
      var p = oynatici.play();
      if (p && typeof p.catch === 'function') p.catch(function () { if (simdiki === is && !basladi) { is.klon = false; yerelOku(is); } });
    } catch (e) { is.klon = false; yerelOku(is); return; }
    bekci = setTimeout(function () { if (simdiki === is) bitir(is, basladi ? 'end' : null); }, 30000);
  }

  function sonraki() {
    if (simdiki || !kuyruk.length) return;
    simdiki = kuyruk.shift();
    if (simdiki.klon) klonOku(simdiki); else yerelOku(simdiki);
  }

  ss.speak = function (u) {
    if (!u || kapali() || !ingilizceMi(u)) { return yerelKonus(u); }
    var metin = normalize(u.text);
    var is = { u: u, k: null, klon: false };
    if (metin && metin.length <= MAX_UZUNLUK && IZINLI.test(metin) && /[A-Za-z]/.test(metin)) {
      is.k = anahtar(metin);
      if (hazir && hazir.has(is.k)) is.klon = true;
      else if (hazir) bildir(is.k, metin);
    }
    kuyruk.push(is);
    sonraki();
  };

  ss.cancel = function () {
    kuyruk.length = 0;
    clearTimeout(bekci); bekci = null;
    if (simdiki && simdiki.klon) { try { oynatici.pause(); oynatici.removeAttribute('src'); oynatici.load(); } catch (e) {} }
    simdiki = null;
    try { yerelIptal(); } catch (e) {}
  };
  if (yerelDuraklat) ss.pause = function () { if (simdiki && simdiki.klon) { try { oynatici.pause(); } catch (e) {} } else yerelDuraklat(); };
  if (yerelDevam) ss.resume = function () { if (simdiki && simdiki.klon) { try { oynatici.play(); } catch (e) {} } else yerelDevam(); };
  try {
    Object.defineProperty(ss, 'speaking', {
      configurable: true,
      get: function () { return !!simdiki || !!(protoSpeaking && protoSpeaking.get && protoSpeaking.get.call(ss)); }
    });
  } catch (e) {}

  window.dmKlonSes = {
    anahtar: function (t) { return anahtar(normalize(t)); },
    hazirMi: function (t) { return !!(hazir && hazir.has(anahtar(normalize(t)))); },
    yenile: dizinYukle
  };
})();
