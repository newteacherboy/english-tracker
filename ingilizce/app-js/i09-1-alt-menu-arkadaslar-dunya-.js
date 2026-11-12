
(function () {
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const enc = encodeURIComponent;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci)); };
  const oyunda = () => (typeof odulOyunda === 'function' && odulOyunda()) || !!document.querySelector('.bc-perde, .bs-perde, .dv-perde, .kr-perde');

  /* ===== 1) Alt menü: Arkadaşlar → Dünya Parkuru ===== */
  setInterval(() => {
    let b = document.querySelector('#bottomNavMobile [data-ekran="tab-meduakis"]');

    let hud = document.querySelector('#dunyaAlan .bc-hud');
    if (hud && !hud.querySelector('.bc-akis-btn')) {
      let a = document.createElement('button'); a.className = 'bc-akis-btn'; a.innerText = '🎡 Akış';
      a.onclick = () => { if (typeof maSekme !== 'undefined') maSekme = 'akis'; window.yoGomuluHedef = null; if (typeof meduAkisAc === 'function') meduAkisAc(); };
      hud.appendChild(a);
    }
    /* Sana Özel: haftalık lig kartı kalksın */
    document.querySelectorAll('#yoSanaOzelGrid [onclick="yoLigAc()"]').forEach(x => x.remove());
    /* Aktivite: Büyü Akademisi kartı kalksın */
    document.querySelectorAll('#tab-aktiviteler [onclick*="baModuAc"], #tab-aktiviteler [onclick*="baFabTikla"]').forEach(x => { let k = x.closest('.az-gcard') || x; k.style.display = 'none'; });
  }, 800);

  /* ===== 2) Dünya haritası: fareyle sürükleyerek kaydır ===== */
  let sr = null;
  document.addEventListener('pointerdown', e => {
    let k = e.target.closest && e.target.closest('.bc-kaydir');
    if (!k || e.pointerType === 'touch') return;
    sr = { k, y: e.clientY, t: k.scrollTop, oynadi: false };
  });
  document.addEventListener('pointermove', e => {
    if (!sr) return;
    let dy = e.clientY - sr.y;
    if (!sr.oynadi && Math.abs(dy) > 6) { sr.oynadi = true; sr.k.classList.add('suruk'); }
    if (sr.oynadi) sr.k.scrollTop = sr.t - dy;
  });
  document.addEventListener('pointerup', () => { if (sr && sr.oynadi) { let k = sr.k; setTimeout(() => k.classList.remove('suruk'), 0); } sr = null; });

  /* ===== 3) Seviye dünyanın temasında açılsın, bitince haritaya dönülsün ===== */
  const DUNYA = [
    ['☁️ Gökyüzü Kulesi', 'linear-gradient(180deg,#312e81 0%,#6366f1 45%,#a5b4fc 100%)', ['☁️', '🎈', '✨', '🕊️']],
    ['🌳 Büyülü Orman', 'linear-gradient(180deg,#052e16 0%,#14532d 50%,#4d7c0f 100%)', ['🌲', '🍄', '✨', '🦋']],
    ['💎 Kristal Mağara', 'linear-gradient(180deg,#0c0a1d 0%,#1e1b4b 50%,#4c1d95 100%)', ['💎', '🔮', '✨', '💠']],
    ['🚀 Uzay Akademisi', 'radial-gradient(circle at 70% 20%,#312e81 0%,#0f172a 50%,#020617 100%)', ['⭐', '🪐', '☄️', '🛸']],
    ['🐠 Denizaltı Kalesi', 'linear-gradient(180deg,#0e7490 0%,#164e63 60%,#083344 100%)', ['🫧', '🐠', '🐟', '🪸']],
    ['🌋 Ejder Dağı', 'linear-gradient(180deg,#1c0a0a 0%,#7f1d1d 50%,#c2410c 100%)', ['🔥', '🌋', '✨', '🪨']]
  ];
  const ANIM = ['bcSuzul', 'bcYatay', 'bcPirilti', 'bcYuksel'];
  let dunyadan = false, basladi = false;
  function temaUygula(n) {
    let ov = $('tab-buyuakademisi'); if (!ov) return;
    let D = DUNYA[Math.floor((n - 1) / 10) % DUNYA.length];
    ov.classList.add('bc-tema'); ov.style.setProperty('--bcz', D[1]);
    let kat = ov.querySelector('.bc-amb-kat');
    if (!kat) { kat = document.createElement('div'); kat.className = 'bc-amb-kat'; ov.insertBefore(kat, ov.firstChild); }
    let h = '';
    for (let i = 0; i < 16; i++) h += `<span style="left:${(i * 37) % 94}%;top:${(i * 53) % 92}%;--s:${16 + (i % 3) * 8}px;--o:${.45 + (i % 3) * .15};--a:${ANIM[i % 4]};--d:${5 + (i % 4)}s;--g:${(i % 5) * .6}s">${D[2][i % 4]}</span>`;
    kat.innerHTML = h + `<div class="bc-dunya-rozet">${D[0]} · ${n}. seviye</div>`;
  }
  function temaKaldir() { let ov = $('tab-buyuakademisi'); if (!ov) return; ov.classList.remove('bc-tema'); let k = ov.querySelector('.bc-amb-kat'); if (k) k.remove(); }
  let orgBaAc = window.baModuAc;
  if (typeof orgBaAc === 'function') window.baModuAc = function () { dunyadan = !!($('tab-dunya') && $('tab-dunya').classList.contains('active')); basladi = false; if (!dunyadan) temaKaldir(); return orgBaAc.apply(this, arguments); };
  let orgBaSev = window.baSeviyeBaslat;
  if (typeof orgBaSev === 'function') window.baSeviyeBaslat = function (n) { if (dunyadan) { temaUygula(Number(n) || 1); basladi = true; } return orgBaSev.apply(this, arguments); };
  let orgBaGiris = window.baGirisGoster;
  if (typeof orgBaGiris === 'function') window.baGirisGoster = function () {
    let r = orgBaGiris.apply(this, arguments);
    if (dunyadan && basladi) { dunyadan = false; basladi = false; temaKaldir(); setTimeout(() => { if (typeof baModuKapat === 'function') baModuKapat(); }, 50); }
    return r;
  };
  let orgBaKapat = window.baModuKapat;
  if (typeof orgBaKapat === 'function') window.baModuKapat = function () { temaKaldir(); return orgBaKapat.apply(this, arguments); };

  /* ===== 4) Konuşma: boş/anlamsız sesi doğru sayma ===== */
  window.genelSesEslesiyorMu = function (soylenen, dogru, altlar) {
    let s = String(soylenen || '').trim(), d = String(dogru || '').trim();
    if (!s || !d || s.replace(/[^a-z0-9]/gi, '').length < 2) return false;
    if (s === d) return true;
    if (altlar && altlar.indexOf(s) !== -1) return true;
    if ((' ' + s + ' ').indexOf(' ' + d + ' ') !== -1) return true;
    if (s.length >= Math.max(3, Math.ceil(d.length * 0.7)) && d.indexOf(s) !== -1) return true;
    if (d.length >= 4 && typeof genelBenzerlikOrani === 'function' && genelBenzerlikOrani(s, d) >= 0.75) return true;
    return false;
  };

  /* ===== 5) Tüm İngilizce metinler İngiliz/Amerikan sesiyle okunsun ===== */
  if ('speechSynthesis' in window) {
    const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
    let enSes = null;
    const sesSec = () => { let v = speechSynthesis.getVoices(); enSes = v.find(x => /en[-_]US/i.test(x.lang) && /google|samantha|natural|premium/i.test(x.name)) || v.find(x => /en[-_]US/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null; };
    sesSec(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', sesSec);
    let orgSpeak = speechSynthesis.speak.bind(speechSynthesis);
    window.dmNativeSpeechSpeak = orgSpeak; // Shared mobile speech layer uses the native engine.
    speechSynthesis.speak = function (u) {
      try {
        if (u && !TR_HARF.test(u.text || '') && !/^tr/i.test(u.lang || '')) { u.lang = 'en-US'; if (!enSes) sesSec(); if (enSes) u.voice = enSes; }
        else if (u && !TR_HARF.test(u.text || '') && /^tr/i.test(u.lang || '') && /^[\x00-\x7F\s]+$/.test(u.text || '') && /[a-z]{2,}/i.test(u.text || '')) { u.lang = 'en-US'; if (enSes) u.voice = enSes; }
      } catch (e) {}
      return orgSpeak(u);
    };
  }

  /* ===== 6) Canlı bildirimler + düello daveti ===== */
  const OYUN_AC = { Kelime_Liderlik: 'kelimeYarismasiAc', Jeopardy_Liderlik: 'jpOyunAc', Bosluk_Tablosu: 'boslukOyunAc', Hafiza_Liderlik: 'hafizaOyunAc', Yagmur_Liderlik: 'yagmurOyunAc', Asmaca_Liderlik: 'asmacaOyunAc', KelimeBul_Liderlik: 'kelimeBulOyunAc', "Konusma_Liderlik": "kpModuAc", "Eslesme_Liderlik": "esOyunAc", "Tren_Liderlik": "trenOyunAc", "Dikte_Liderlik": "dikteAc", "Cumle_Liderlik": "cumleAc" };
  const OYUN_AD = { Kelime_Liderlik: '🔬 Kelime Laboratuvarı', Jeopardy_Liderlik: '🎈 Risk Balonları', Bosluk_Tablosu: '✏️ Eksik Harf', Hafiza_Liderlik: '🧠 Hafıza', Yagmur_Liderlik: '🌪️ Hız Fırtınası', Asmaca_Liderlik: '🔤 Harf Avı', KelimeBul_Liderlik: '🔐 Şifre Kırıcı', "Konusma_Liderlik": "🎤 Kelime Modu", "Eslesme_Liderlik": "🔗 Eş Bul", "Tren_Liderlik": "🚂 Kelime Treni", "Dikte_Liderlik": "🎧 Kulak Dedektifi", "Cumle_Liderlik": "🧱 Cümle Ustası" };
  window.duelloOyununuAc = function (oyun) {
    let f = window[OYUN_AC[oyun]];
    if (typeof dcTumTamEkranlariKapat === 'function') dcTumTamEkranlariKapat();
    if (typeof f === 'function') f(); else if (typeof aktivitelerTamEkranAc === 'function') aktivitelerTamEkranAc();
  };
  /* Düello durumunu 2 dakikada bir yokla: rakip oynadıysa sunucu bildirim üretir */
  setInterval(async () => {
    if (!girisli() || document.hidden) return;
    try { let r = await fetch(`${apiURL}?islem=duellolarim&ogrenci=${enc(aktifOgrenciAdi)}`); let d = await r.json(); window._dlSon = (d && d.liste) || []; } catch (e) {}
  }, 300000);   /* 2 dk → 5 dk */
  /* ===== 7) Keşfet: düellolarım aç/kapa + rozet ===== */
  setInterval(() => {
    document.querySelectorAll('#tab-meduakis .dl-kart').forEach(k => {
      let h = k.querySelector('h4');
      if (!h || !/Düellolarım/.test(h.innerText)) return;
      let aktif = [...k.querySelectorAll('.dl-alan > div')].filter(x => /Kabul|Bugün oyna|Seni düelloya|🔥/.test(x.innerText)).length;
      if (!k.classList.contains('dl-katla')) {
        k.classList.add('dl-katla');
        if (!aktif) k.classList.add('kapali');
        h.setAttribute('role', 'button'); h.tabIndex = 0;
        h.onclick = () => k.classList.toggle('kapali');
        h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('kapali'); } };
      }
      let rz = h.querySelector('.dl-rozet');
      if (aktif && !rz) h.insertAdjacentHTML('beforeend', `<span class="dl-rozet">${aktif} aktif</span>`);
      else if (rz) { if (aktif) rz.innerText = aktif + ' aktif'; else rz.remove(); }
      k.querySelectorAll('.dl-satir').forEach(s => {
        if (s.dataset.oyna || !/Bugün oyna|🔥/.test(s.innerText)) return;
        s.dataset.oyna = '1';
        let ad = Object.keys(OYUN_AD).find(o => s.innerText.includes(OYUN_AD[o].replace(/^\S+\s/, '')));
        if (ad) { let b = document.createElement('button'); b.className = 'kr-evet'; b.innerText = 'Oyna'; b.onclick = () => duelloOyununuAc(ad); s.appendChild(b); }
      });
    });
  }, 1000);
})();
