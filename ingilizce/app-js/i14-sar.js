
(function () {
  const $ = id => document.getElementById(id);
  const gor = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  const aktif = id => $(id) && $(id).classList.contains('active');
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const sinifModu = () => { try { return !!siniftaOynananOgrenci; } catch (e) { return false; } };
  const toast = m => { if (typeof yoToast === 'function') yoToast(m); };
  function sar(ad, once, sonra) {
    let org = window[ad]; if (typeof org !== 'function') return;
    window[ad] = function () {
      let c; try { c = once ? once.apply(this, arguments) : null; } catch (e) {}
      let r = org.apply(this, arguments);
      try { if (sonra) sonra(c, arguments); } catch (e) {}
      return r;
    };
  }

  /* ================= 1) BÜYÜ AKADEMİSİ: şıklar kendiliğinden yeşil gelmesin ================= */
  sar('baSoruGoster', () => document.querySelectorAll('#tab-buyuakademisi .bc-dogru, #tab-buyuakademisi .bc-yanlis').forEach(b => b.classList.remove('bc-dogru', 'bc-yanlis')));

  /* ================= 2) FORMÜL: harf yazınca sonraki kutuya geç ================= */
  document.addEventListener('input', e => {
    let el = e.target; if (!el.classList || !el.classList.contains('ba-bosluk-input')) return;
    el.value = el.value.slice(-1).toUpperCase();
    if (el.value) { let l = [...document.querySelectorAll('#baBoslukHarfler .ba-bosluk-input:not(:disabled)')], i = l.indexOf(el); if (l[i + 1]) l[i + 1].focus(); }
  });
  document.addEventListener('keydown', e => {
    let el = e.target; if (!el.classList || !el.classList.contains('ba-bosluk-input')) return;
    if (e.key === 'Enter' && typeof baBoslukKontrolEt === 'function') { e.preventDefault(); baBoslukKontrolEt(); }
    if (e.key === 'Backspace' && !el.value) { let l = [...document.querySelectorAll('#baBoslukHarfler .ba-bosluk-input:not(:disabled)')], i = l.indexOf(el); if (l[i - 1]) { l[i - 1].focus(); l[i - 1].value = ''; e.preventDefault(); } }
  });
  sar('baBoslukGoster', null, () => setTimeout(() => { let i = document.querySelector('#baBoslukHarfler .ba-bosluk-input'); if (i) i.focus({ preventScroll: true }); }, 250));

  /* ================= 3) GİRİŞ: tek basışta girsin ================= */
  window.girisYap = async function (event) {
    if (event && event.preventDefault) event.preventDefault();
    let ogr = $('ogrenci').value.trim(), sifre = $('sifre').value.trim(), m = $('mesaj'), btn = $('girisBtn');
    if (!ogr || !sifre) { m.className = 'error'; m.innerText = 'Tüm alanları doldurun.'; return; }
    btn.disabled = true; btn.innerText = 'Kontrol ediliyor...'; m.innerText = '';
    let d = null;
    const switchingRequest=!!window.dmAccountSwitchPending,switchSignal=window.dmSwitchLoginSignal;
    try {
      if(switchingRequest&&window.dmSavedSessions){const checked=await window.dmSavedSessions.verifyLogin({ogrenci:ogr,sifre},switchSignal);d=checked.data;}
      else {const r=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'giris',ogrenci:ogr,sifre})});d=await r.json();}
    } catch(error){if(switchingRequest)d={ok:false,mesaj:error.message};}
    if(switchingRequest&&(switchSignal?.aborted||!window.dmAccountSwitchPending)){btn.disabled=false;btn.innerText='Giriş Yap';return;}

    if (!d || !d.ok) { btn.disabled = false; btn.innerText = 'Giriş Yap'; m.className = 'error'; m.innerText = (d && d.mesaj) || 'Sunucuya ulaşılamadı, internetini kontrol edip tekrar dene.'; return; }
    if(window.dmAccountSwitchPending&&window.dmSavedSessions){
      try{window.dmSavedSessions.queue({name:d.ogrenci||ogr,token:d.token,role:d.rol,google:false});}
      catch(error){btn.disabled=false;btn.innerText='Giriş Yap';m.className='error';m.innerText=error.message;}
      return;
    }
    window.dmSavedSessions?.remember();
    window.dmSavedSessions?.remember({name:d.ogrenci||ogr,token:d.token,role:d.rol,google:false});
    localStorage.removeItem('ing_google_auth');
    localStorage.setItem('ing_token', d.token);
    sessionStorage.removeItem('ing_oturum_bitti');
    if (d.rol === 'ogretmen') sessionStorage.setItem('ing_ogr_token', d.token); else sessionStorage.removeItem('ing_ogr_token');
    localStorage.setItem('ing_oturumAcik', 'true');
    localStorage.setItem('ing_aktifOgrenci', d.ogrenci || ogr);
    if(window.dmAccountSwitchPending){
      window.dmAccountSwitchPending=false;
      localStorage.setItem('ing_toplamSaniye','0');
      // A full page reload isolates per-account in-memory progression and panels.
      window.location.reload();
      return;
    }
    setTimeout(()=>document.dispatchEvent(new Event('dm:login')),0);
          setTimeout(function () {

}, 1000);
    if (localStorage.getItem('ing_toplamSaniye') === null) localStorage.setItem('ing_toplamSaniye', '0');
    fetch(`${apiURL}?islem=sonGirisGuncelle&ogrenci=${encodeURIComponent(d.ogrenci || ogr)}`, { keepalive: true }).catch(() => {});
    await window.dmOpenPortalSession({student:d.ogrenci||ogr,seconds:localStorage.getItem('ing_toplamSaniye')||0,refreshProfile:true});
  };
  /* Otomatik girişte puan bildirimleri de çalışsın */
  let pbKuruldu = false;
  setInterval(() => {
    let p = $('panel-alani');
    if (pbKuruldu || !p || p.style.display !== 'block' || typeof puanBildirimKontrolEt !== 'function') return;
    pbKuruldu = true; setTimeout(puanBildirimKontrolEt, 2000); setInterval(() => { if (!document.hidden) puanBildirimKontrolEt(); }, 600000);
  }, 1500);

  /* ================= 4) ENERJİ: parkur girişi 2, oyun girişi 1, her 3 soruda 1 ================= */
  const PARKUR = { 'P:ba': 1, 'P:kp': 1, 'P:sh': 1, 'P:kk': 1 };
  function baglam() {
    if (aktif('tab-derscalis')) return '';
    if (aktif('tab-buyuakademisi')) return 'P:ba';
    if (aktif('tab-konusmapratigi')) return 'P:kp';
    if (aktif('tab-sohbet')) return 'P:sh';
    if ([...document.querySelectorAll('.seviye-harita-overlay, #seviyeDisLinkOverlay')].some(gor)) return 'P:kk';
    let ym = $('yoModal'); if (ym && ym.classList.contains('acik')) return 'O:yo';
    let g = [...document.querySelectorAll('.game-modal-overlay')].find(gor);
    return g ? 'O:' + (g.id || 'oyun') : '';
  }
  const ucret = k => PARKUR[k] ? 4 : 3;
  async function enerjiSunucu(fark) {
    try {
      let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'enerjiDegistir', ogrenci: aktifOgrenciAdi, fark, sebep: fark < 0 ? 'oyun' : '' }) });
      let d = await r.json();
      if (typeof headerEnerjiGoster === 'function') headerEnerjiGoster(d.enerjiKalan, d.enerjiMax);
      try { kpEnerjiKalan = d.enerjiKalan; kpEnerjiMax = d.enerjiMax; kpEnerjiSatiriniGuncelle(); } catch (e) {}
      if (typeof genelEnerjiDegisimGoster === 'function') genelEnerjiDegisimGoster(fark);
      return d;
    } catch (e) {}
  }
  let sonGiris = { k: '', t: 0 }, soruSayac = 0;
  function girisUcreti() {
    if (sinifModu()) return Promise.resolve();
    if (window.dmOdevEnerjiMuaf?.()) return Promise.resolve();   /* [v4.8] ödev oyunu */
    let k = baglam(); if (!k) return Promise.resolve();
    if (sonGiris.k === k && Date.now() - sonGiris.t < 4000) return Promise.resolve();
    sonGiris = { k, t: Date.now() }; soruSayac = 0;
    return enerjiSunucu(-ucret(k));
  }
  function soru(n) {
    if (sinifModu() || !baglam()) return;
    soruSayac += (n || 1);
    soruSayac = 0;   /* v2: soru başına enerji düşmez, giriş ücreti sabit */
  }
  window.enerjiSoruSay = soru;

  let orgHarca = window.genelEnerjiHarca;
  window.genelEnerjiHarca = function (m) { if (Number(m) < 0) return girisUcreti(); if (Number(m) > 0 && typeof odulOyunda === 'function' && odulOyunda()) return Promise.resolve(); return orgHarca.apply(this, arguments); };
  let orgKpE = window.kpEnerjiDegistir;
  if (typeof orgKpE === 'function') window.kpEnerjiDegistir = function (f) { return Number(f) !== 0 ? Promise.resolve() : orgKpE.apply(this, arguments); };
  window.genelOyunGirisEngelliMi = function () {
    if (sinifModu()) return false;
    if (window.dmOdevEnerjiMuaf?.()) return false;   /* [v4.8] ödev oyunu */
    let k = baglam(); if (!k) return false;
    let kal = window.genelEnerjiKalan;
    if (typeof kal === 'number' && kal < ucret(k)) { if (typeof genelEnerjiBittiGoster === 'function') genelEnerjiBittiGoster(); return true; }
    return false;
  };
  /* Büyü Akademisi: eski 5 enerji kontrolünü aş, girişte 2 */
  let orgBaSev = window.baSeviyeBaslat;
  if (typeof orgBaSev === 'function') window.baSeviyeBaslat = function () {
    let k = window.genelEnerjiKalan;
    if (!sinifModu() && typeof k === 'number' && k < 4) { if (typeof genelEnerjiBittiGoster === 'function') genelEnerjiBittiGoster(); return; }
    let hile = typeof k === 'number' && k < 5;
    if (hile) window.genelEnerjiKalan = 5;
    try { return orgBaSev.apply(this, arguments); } finally { if (hile && window.genelEnerjiKalan === 5) window.genelEnerjiKalan = k; }
  };
  /* Kelime Modu: seviye başlayınca 2 enerji */
  let orgKpSev = window.kpSeviyeBaslat;
  if (typeof orgKpSev === 'function') window.kpSeviyeBaslat = function () {
    let once = gor($('kpKelimeOyunEkrani'));
    if (!sinifModu() && typeof window.genelEnerjiKalan === 'number' && window.genelEnerjiKalan < 2) { if (typeof genelEnerjiBittiGoster === 'function') genelEnerjiBittiGoster(); return; }
    let r = orgKpSev.apply(this, arguments);
    setTimeout(() => { if (!once && gor($('kpKelimeOyunEkrani'))) girisUcreti(); }, 50);
    return r;
  };

  /* ---- Soru sayaçları ---- */
  const top = fn => () => { try { return Number(fn()) || 0; } catch (e) { return 0; } };
  const fark = (ad, olcu) => sar(ad, olcu, (once) => { let s = olcu() - (once || 0); if (s > 0) soru(s); });
  sar('baDogruIsle', null, () => soru(1));
  sar('baYanlisIsle', null, () => soru(1));
  fark('kpCevapKontrolEt', top(() => kpDogruSayisi + kpYanlisSayisi));
  fark('kpSonrakineGec', top(() => kpDogruSayisi + kpYanlisSayisi));
  sar('sohbetIleri', null, () => soru(1));
  fark('kyCevapVer', top(() => kyDogruSayisi + kyYanlisSayisi));
  fark('jpCevapVer', top(() => jpDogruSayisi + jpYanlisSayisi));
  fark('hafizaKartTikla', top(() => hafizaEslesenSayi));
  sar('boslukKontrolEt', null, () => { try { soru((boslukAktifKelimeler || []).length); } catch (e) {} });
  const ilkHaric = (baslat, sonraki) => { let basladi = false; sar(baslat, () => { basladi = false; }); sar(sonraki, () => { if (basladi) soru(1); basladi = true; }); };
  ilkHaric('yagmurOyunuBaslat', 'yagmurYeniKelimeDusur');
  ilkHaric('asmacaOyunuBaslat', 'asmacaSonrakiKelime');
  ilkHaric('kelimebulOyunuBaslat', 'kelimebulSonrakiKelime');
  sar('dikteSoru', () => { try { if (dkt && dkt.i > 0) soru(1); } catch (e) {} });
  sar('cumleSoru', () => { try { if (cml && cml.i > 0) soru(1); } catch (e) {} });

  /* ---- Başlat kartlarında yeni enerji bilgisi ---- */
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (!n.classList || !(n.classList.contains('bs-perde') || n.classList.contains('ab-perde'))) return;
    let parkur = n.classList.contains('bs-perde');
    n.querySelectorAll('.bs-oduller span, .ab-cip span').forEach(s => {
      if (/Giriş: 1 enerji/.test(s.innerText)) {
        s.innerText = s.innerText.replace('Giriş: 1 enerji', `Giriş: ${parkur ? 2 : 1} enerji`);
        s.insertAdjacentHTML('afterend', '<span>⚡ Her 3 soruda 1 enerji</span>');
      }
    });
  }))).observe(document.body, { childList: true });

  /* ================= 5) SINIF OYUN MODU: yeni tasarım + yeni oyunlar ================= */
  const SO = [
    ['PARKURLAR', [['ba', '🧙', 'Büyü Akademisi', '#a78bfa,#6d28d9'], ['kp', '🔤', 'Kelime Modu', '#fdba74,#ec4899'], ['yolculuk', '🃏', 'Kelime Kartları', '#7dd3fc,#1d4ed8']]],
    ['MİNİ OYUNLAR', [['ky', '🔬', 'Kelime Laboratuvarı', '#e879f9,#a21caf'], ['jp', '🎈', 'Risk Balonları', '#fb7185,#be123c'], ['bosluk', '✏️', 'Eksik Harf', '#4ade80,#15803d'],
      ['hafiza', '🃏', 'Hafıza Sandığı', '#22d3ee,#0e7490'], ['yagmur', '🌪️', 'Hız Fırtınası', '#60a5fa,#1d4ed8'], ['asmaca', '🔤', 'Harf Avı', '#f87171,#b91c1c'], ['kelimebul', '🔐', 'Şifre Kırıcı', '#a3e635,#4d7c0f'], ['eslestirme','🔗','Eş Bul','#14b8a6,#0f766e'], ['tren','🚂','Kelime Treni','#60a5fa,#1d4ed8'], ['dikte','🎧','Kulak Dedektifi','#818cf8,#4338ca'], ['cumle','🧱','Cümle Ustası','#fb923c,#c2410c'], ['harfbahcesi','🌼','Harf Bahçesi','#22c55e,#15803d'], ['okuma','📖','Okuma Stüdyosu','#2dd4bf,#0f766e'], ['pomodoro','🍅','Pomodoro','#fb923c,#c2410c']]],
    ['KAPIŞMA OYUNLARI', [['papicards','🃏','Papi Kartları','#a78bfa,#6d28d9'],['meteor','☄️','Meteor Düellosu','#f472b6,#be185d'],['wheel','🎡',"Papi’nin Kelime Çarkı",'#fbbf24,#b45309']]],
    ['ÇEVRİMİÇİ İKİ KİŞİLİK', [['ucus','🪽','Kelime Uçuşu','#38bdf8,#0369a1'],['rota','🧭','Cümle Rotası','#34d399,#047857']]]
  ];
  function soKur() {
    let ilk = document.querySelector('#siniftaOyunModal .siniftaOyunBtn');
    if (!ilk || ilk.dataset.so) return;
    let kap = ilk.parentElement;
    kap.style.cssText = '';
    kap.innerHTML = `<button type="button" class="so-zar" id="soZar">🎲 Rastgele öğrenci seç</button>` +
      SO.map(([b, l]) => `<div class="so-bolum">${b}</div><div class="so-izgara">${l.map(([k, i, a, r]) => `<button type="button" class="siniftaOyunBtn so-kart" data-so="${k}" style="--r:${r}" disabled><i>${i}</i>${a}</button>`).join('')}</div>`).join('') +
      `<div class="so-bolum" style="text-align:center;letter-spacing:0;font-size:11.5px">Tek cihazdaki sınıf oyunlarında enerji harcanmaz. Çevrimiçi oyunlar öğrencilerin kendi cihazları ve standart enerji kurallarıyla oynanır.</div>`;
    kap.querySelectorAll('.so-kart').forEach(b => b.onclick = () => soBaslat(b.dataset.so));
    $('soZar').onclick = rastgele;
    if (typeof siniftaOyunButonlariGuncelle === 'function') siniftaOyunButonlariGuncelle();
  }
  function soBaslat(k) {
    let ogr = $('siniftaOyunOgrenciSelect').value;
    if (!ogr) { alert('Lütfen önce bir öğrenci seçin.'); return; }
    if (k === 'ba' || k === 'kp') {
      siniftaOynananOgrenci = ogr;
      $('siniftaOyunModal').style.display = 'none';
      if (typeof siniftaOyunRozetiGoster === 'function') siniftaOyunRozetiGoster();
      if (k === 'ba') baModuAc(); else kpModuAc();
      return;
    }
    siniftaOyunuBaslat(k);
  }
  function rastgele() {
    let sel = $('siniftaOyunOgrenciSelect'), secenek = [...sel.options].filter(o => o.value);
    if (!secenek.length) { alert('Önce bir sınıf seçin.'); return; }
    let z = $('soZar'), n = 0, son = secenek[Math.floor(Math.random() * secenek.length)];
    z.classList.add('donuyor'); z.disabled = true;
    let t = setInterval(() => {
      let o = n++ < 14 ? secenek[Math.floor(Math.random() * secenek.length)] : son;
      sel.value = o.value; z.innerText = '🎲 ' + o.textContent;
      if (o === son && n > 14) { clearInterval(t); z.classList.remove('donuyor'); z.disabled = false; z.innerText = '🎉 ' + o.textContent + '! (tekrar çevir)'; if (typeof siniftaOyunButonlariGuncelle === 'function') siniftaOyunButonlariGuncelle(); if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('kombo', 10); }
    }, 90);
  }
  sar('siniftaOyunModuAc', null, soKur);
  setInterval(() => { if (gor($('siniftaOyunModal'))) soKur(); }, 800);
})();
