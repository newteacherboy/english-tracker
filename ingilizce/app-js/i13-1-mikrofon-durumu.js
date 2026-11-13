
(function () {
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const gor = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const aktif = id => $(id) && $(id).classList.contains('active');
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci)); };
  const oyunda = () => typeof odulOyunda === 'function' && odulOyunda();

  /* ================= 1) MİKROFON DURUMU ================= */
  ['SpeechRecognition', 'webkitSpeechRecognition'].forEach(ad => {
    let Org = window[ad]; if (typeof Org !== 'function') return;
    let Yeni = function () {
      let r = new Org(...arguments), zaman = null;
      let goster = (dinle, metin) => {
        document.body.classList.toggle('mik-dinliyor', dinle);
        let d = $('mikDurum'); if (!d) return;
        $('mikDurumMetin').innerText = metin;
        d.classList.toggle('bitti', !dinle); d.classList.add('gor');
        clearTimeout(zaman); if (!dinle) zaman = setTimeout(() => d.classList.remove('gor'), 1400);
      };
      r.addEventListener('start', () => goster(true, 'Dinliyorum… konuş 🎙️'));
      r.addEventListener('speechstart', () => goster(true, 'Sesini duyuyorum…'));
      r.addEventListener('end', () => goster(false, '✔ Dinleme bitti'));
      r.addEventListener('error', () => goster(false, '⚠️ Ses alınamadı, tekrar dene'));
      return r;
    };
    Yeni.prototype = Org.prototype;
    window[ad] = Yeni;
  });

  /* ================= 3) BA: doğru / yanlış animasyonu ================= */
  let sonSik = null;
  document.addEventListener('pointerdown', e => { let b = e.target.closest && e.target.closest('#tab-buyuakademisi .ba-sik-btn'); if (b) sonSik = b; }, true);
  function patlat(el, ikon) {
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let r = el.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      let s = document.createElement('span'); s.className = 'ba-yildiz-pat'; s.innerText = ikon[i % ikon.length];
      let a = Math.random() * Math.PI * 2, u = 50 + Math.random() * 70;
      s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
      s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', Math.sin(a) * u + 'px');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1050);
    }
  }
  let orgSes = window.genelSesEfektiCal;
  if (typeof orgSes === 'function') window.genelSesEfektiCal = function (tur) {
    if (aktif('tab-buyuakademisi') && sonSik && document.body.contains(sonSik) && (tur === 'dogru' || tur === 'yanlis')) {
      let b = sonSik; sonSik = null;
      b.classList.remove('bc-dogru', 'bc-yanlis'); void b.offsetWidth;
      b.classList.add(tur === 'dogru' ? 'bc-dogru' : 'bc-yanlis');
      if (tur === 'dogru') patlat(b, ['⭐', '✨', '🌟']);
    }
    return orgSes.apply(this, arguments);
  };

  new MutationObserver(ms => ms.forEach(m => {
    let b = m.target;
    if (!b.classList || !b.classList.contains('ba-sik-btn') || b.classList.contains('bc-dogru') || b.classList.contains('bc-yanlis')) return;
    let c = b.className;
    if (/(^|[\s-])(dogru|correct|success)(\s|$)/i.test(c)) { b.classList.add('bc-dogru'); patlat(b, ['⭐', '✨', '🌟']); }
    else if (/(^|[\s-])(yanlis|wrong|error)(\s|$)/i.test(c)) b.classList.add('bc-yanlis');
  })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ================= 4) AKTİVİTE: Kelime Kartları kalksın ================= */
  setInterval(() => { document.querySelectorAll('#tab-aktiviteler [onclick*="seviyeHaritasiAc"]').forEach(x => { let k = x.closest('.az-gcard') || x; k.style.display = 'none'; }); }, 1000);

  /* ================= 4b) ADİL PUAN: tüm mini oyunlarda aynı kural ================= */
  const ADIL = { tavanDogru: 12, saniyeBasi: 6 };
  let oyunBas = 0, oyundaydi = false;
  setInterval(() => { let s = oyunda(); if (s && !oyundaydi) oyunBas = Date.now(); oyundaydi = s; }, 500);
  let orgXp = window.dmBaseXpAdd;
  if (typeof orgXp === 'function') window.yoXpEkle = function (xp, altin) {
    // Preserve the final legacy reward adjustments in one handler. Game rewards use dmBaseXpAdd/server claims.
    let miniOyun = !aktif('tab-buyuakademisi') && !aktif('tab-konusmapratigi') && !aktif('tab-sohbet') && document.querySelector('.game-modal-overlay[style*="flex"], #genelSonucOverlay.acik');
    if (miniOyun && altin > 0 && xp === altin * 10) {
      let sure = oyunBas ? (Date.now() - oyunBas) / 1000 : 999;
      let d = Math.min(altin, ADIL.tavanDogru, Math.max(1, Math.floor(sure / ADIL.saniyeBasi)));
      xp = d * 10; altin = d;
    }
    if (xp === 0 && altin === 5) altin = 3;
    if (xp === 20 && !altin) xp = 30;
    if (aktif('tab-buyuakademisi')) { xp = Math.round((xp || 0) * 2); altin = Math.round((altin || 0) * 2); }
    if (altin > 0) altin = Math.round(altin * window.seriCarpani());
    return orgXp.call(this, xp, altin);
  };

  /* ================= 5) YARDIM ================= */
  const YARDIM = window.DijiPapiGuide.sections.map(s => [s.icon, s.title, s.html]);

  function yardimHtml(q) {
    q = kucuk(q);
    let l = YARDIM.filter(y => !q || kucuk(y[1] + ' ' + y[2].replace(/<[^>]+>/g, ' ')).includes(q));
    return `<div class="yd-arama-sonuc">${l.map((y, i) => `<details class="yd-bolum"${q || i === 0 ? ' open' : ''}><summary>${y[0]} ${y[1]}</summary><div class="yd-ic">${y[2]}</div></details>`).join('') || '<p style="text-align:center;color:#8a78b8;font-weight:800">Sonuç bulunamadı.</p>'}</div>`;
  }
  window.yardimIcerikCiz = function (q) {
    let m = $('yardimModal'); if (!m) return;
    let hedef = m.querySelector('#ydYeni');
    if (!hedef) {
      let inp = $('yardimAramaInput');
      m.querySelectorAll('[id*="Icerik"], [id*="icerik"], [id*="Liste"], [id*="liste"]').forEach(x => { if (x !== inp && !x.contains(inp)) x.style.display = 'none'; });
      hedef = document.createElement('div'); hedef.id = 'ydYeni'; hedef.style.cssText = 'max-height:60vh;overflow-y:auto;margin-top:10px;';
      (inp ? inp.parentElement : m.firstElementChild || m).appendChild(hedef);
    }
    hedef.innerHTML = yardimHtml(q || '');
    let t = $('ydTur'); if (t) t.onclick = () => { if (typeof yardimKapat === 'function') yardimKapat(); else m.style.display = 'none'; setTimeout(() => turBaslat('ana', true), 300); };
  };
  document.addEventListener('input', e => { if (e.target && e.target.id === 'yardimAramaInput') window.yardimIcerikCiz(e.target.value); });

  /* ================= 6) TANITIM TURU: Papi'ye devredildi (papi-tur-blok.html) ================= */
  const turBaslat = (ad, zorla) => { if (typeof window.turBaslat === 'function') window.turBaslat(ad, zorla); };
  const turBitti = ad => typeof window.turBitti === 'function' ? !!(window.turBitti('v2:' + ad) || window.turBitti(ad)) : true;

  /* ================= 7) SOLUK BİLGİ KARTLARI ================= */
  let bkSay = 0, bkSon = 0, bkBas = Date.now();
  function bkIcerik() {
    let l = [], altin = yo.altin || 0, hedef = yo.hedef || 50, xp = (yo.xpGun && yo.xpGun.xp) || 0, seri = parseInt(localStorage.getItem('ing_girisSerisiSayisi') || '0') || 0;
    if (xp < hedef) l.push(['🎯', `Günlük hedefine ${hedef - xp} XP kaldı`, 'Tamamlarsan +5 🪙', () => { if (typeof dunyaAc === 'function') dunyaAc(); }]);
    if (seri >= 2) l.push(['🔥', `${seri} günlük serin var!`, seri >= 3 ? `Altınların şu an ×${window.seriCarpani ? seriCarpani() : 1}` : 'Yarın da gel, 3. günde altınlar ×1.25', null]);
    let il = window.bcIlerleme ? bcIlerleme() : null;
    if (il) { let n = il.ba || 0, k = 3 - (n % 3); l.push(['🎁', `Sıradaki sandığa ${k} seviye kaldı`, 'Büyü Akademisi parkurunda', () => { if (typeof dunyaAc === 'function') dunyaAc(); }]); }
    l.push(['⚔️', 'Bir arkadaşını düelloya çağır ödülü kap', 'Kazanan +2 ⚡ +30 XP alır', () => { if (typeof meduAkisAc === 'function') { maSekme = 'kesfet'; meduAkisAc(); } }]);
    l.push(['🦜', 'Papağanla sohbet etmeyi denedin mi?', 'Her sohbet ödüllü', () => { if (typeof sohbetEkraniAc === 'function') sohbetEkraniAc(); }]);
    return l;
  }
  setInterval(() => {
    if ((typeof window.dmPapiNotices?.blocked === 'function' && window.dmPapiNotices.blocked()) || window.dmNudgeSystemActive || !girisli() || !yoVar() || oyunda() || window.turAcik || !turBitti('ana') || document.hidden) return;
    let gecen = Date.now() - bkBas;
    if (bkSay >= 3 || gecen < 3 * 60000 || Date.now() - bkSon < 12 * 60000) return;
    if (document.querySelector('.tv-kart, .sa-perde, .kr-perde, .od-perde, .bc-perde, .cb-kart, .bk-kart')) return;
    let l = bkIcerik(); let s = l[(bkSay + new Date().getDate()) % l.length];
    bkSay++; bkSon = Date.now();
    let k = document.createElement('div'); k.className = 'bk-kart'; k.setAttribute('role', 'status');
    k.innerHTML = `<span class="i">${s[0]}</span><span>${s[1]}<small>${s[2]}</small></span>`;
    document.body.appendChild(k);
    requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('gor')));
    let kapat = () => { k.classList.remove('gor'); setTimeout(() => k.remove(), 600); };
    k.onclick = () => { kapat(); if (s[3]) s[3](); };
    (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(k,kapat,8000);
  }, 20000);
})();
