
(function () {
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const gor = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  const yoVar = () => typeof yo !== 'undefined' && yo;

  /* ===== 1) OYUN ÜST BARI ===== */
  const OYUN = {
    hafiza: ['🃏 Hafıza Sandığı', 'Kartları çevir, çiftleri az hamlede bul'],
    yagmur: ['🌪️ Hız Fırtınası', 'Kelime düşmeden 3 şıktan doğrusunu yakala'],
    asmaca: ['🔤 Harf Avı', 'Harflere dokunarak gizli kelimeyi bul'],
    kelimebul: ['🔐 Şifre Kırıcı', 'Renk ipuçlarıyla gizli kelimeyi kır'],
    ky: ['🔬 Kelime Laboratuvarı', 'Kelimenin doğru anlamını seç'],
    jp: ['🎈 Risk Balonları', 'Balonu ve zorluğu seç, soruyu cevapla'],
    bosluk: ['✏️ Eksik Harf', 'Kelimelerin eksik harflerini tamamla'],
    kp: ['🔤 Kelime Modu', 'Kelimeyi mikrofona net bir sesle söyle'],
    ba: ['🧙 Büyü Akademisi', 'Soruları cevapla, büyü gücünü topla']
  };
  let bar = null, aktif = null, basla = 0;
  function barKur() {
    bar = document.createElement('div'); bar.className = 'og-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<div class="og-ust"><button class="og-muzik" aria-label="Müziği aç/kapat">🎵</button><div class="og-ad"></div><div class="og-sure">0:00</div></div><div class="og-alt"><div class="og-cubuk"><i style="width:0%"></i></div><span class="og-bilgi"></span></div><div class="og-komut"></div>`;
    document.body.appendChild(bar);
    bar.querySelector('.og-muzik').onclick = () => {
      let b = aktif && aktif.muzik;
      if (b) b.click();
      else document.querySelectorAll('audio').forEach(a => { a.muted = !a.muted; });
      setTimeout(muzikCiz, 150);
    };
  }
  function muzikCiz() {
    let m = bar.querySelector('.og-muzik');
    let calar = [...document.querySelectorAll('audio')].some(a => !a.paused && !a.muted);
    let btnMetin = aktif && aktif.muzik ? aktif.muzik.innerText : '';
    let kapali = /🔇|kapal/i.test(btnMetin) || (!calar && !aktif?.muzik);
    m.innerText = kapali ? '🔇' : '🎵';
    m.classList.toggle('calar', !kapali);
    m.style.display = (aktif && aktif.muzik) || document.querySelector('audio') ? '' : 'none';
  }
  function aktifOyun() {
    if(!$('panel-alani')||$('panel-alani').style.display!=='block')return null;
    for (let k of Object.keys(OYUN)) {
      let ekran = k === 'kp' ? $('kpKelimeOyunEkrani') : k === 'ba' ? document.querySelector('#tab-buyuakademisi.active .ba-oyun-alani') : $(k + 'OyunEkrani');
      if (!ekran || !gor(ekran)) continue;
      if (k === 'kp' && !($('tab-konusmapratigi') && $('tab-konusmapratigi').classList.contains('active'))) continue;
      let kap = k === 'kp' ? $('tab-konusmapratigi') : k === 'ba' ? $('tab-buyuakademisi') : ($(k + 'OyunOverlay') || ekran);
      return { k, ekran, kap, muzik: $(k + 'MuzikBtn') };
    }
    return null;
  }
  function bilgiOku(a) {
    let metinler = [...a.kap.querySelectorAll('[id$="Info"]')].filter(gor).map(x => x.innerText.trim()).filter(Boolean);
    let yuzde = null;
    for (let t of metinler) { let m = t.match(/(\d+)\s*\/\s*(\d+)/); if (m && +m[2]) { yuzde = Math.min(100, Math.round(+m[1] / +m[2] * 100)); break; } }
    if (yuzde === null && a.k === 'kp' && $('kpProgressFill')) yuzde = parseFloat($('kpProgressFill').style.width) || 0;
    if (yuzde === null && a.k === 'ba') { let f = a.kap.querySelector('.ba-bar-fill'); if (f) yuzde = parseFloat(f.style.width) || 0; }
    if (yuzde === null && a.k === 'hafiza' && typeof hafizaKartlar !== 'undefined' && hafizaKartlar.length) yuzde = Math.round(hafizaKartlar.filter(x => x.eslesti).length / hafizaKartlar.length * 100);
    return { metin: metinler.slice(0, 2).join(' · '), yuzde };
  }
  setInterval(() => {
    let a = aktifOyun();
    if (!a) { if (bar) bar.classList.remove('gor'); aktif = null; return; }
    if (!bar) barKur();
    if (!aktif || aktif.k !== a.k) basla = Date.now();
    aktif = a;
    let ad = OYUN[a.k][0], alt = '';
    if (a.k === 'ba') { let r = document.querySelector('.bc-dunya-rozet'); alt = r ? r.innerText : ''; }
    let lv = a.kap.querySelector('[id$="LevelInfo"]'); if (lv && gor(lv)) alt = lv.innerText;
    bar.querySelector('.og-ad').innerHTML = `${ad}${alt ? `<small>${alt}</small>` : ''}`;
    let s = Math.floor((Date.now() - basla) / 1000);
    bar.querySelector('.og-sure').innerText = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    let b = bilgiOku(a);
    bar.querySelector('.og-cubuk i').style.width = (b.yuzde ?? Math.min(100, s / 3)) + '%';
    bar.querySelector('.og-bilgi').innerText = b.metin;
    bar.querySelector('.og-komut').innerText = '💡 ' + OYUN[a.k][1];
    muzikCiz();
    bar.classList.add('gor');
  }, 500);

  /* ===== 2) PAS JOKERİ: "Yeni kelime kalmadı" hatası ===== */
  window.jkYeniKelime = function (liste, filtre) {
    let havuz = (typeof masterKelimeHavuzu !== 'undefined' && masterKelimeHavuzu) || window.masterKelimeHavuzu || [];
    const en = k => String(k && (k.ingilizce || k.en) || '').trim().toLowerCase();
    let kullanilan = new Set((liste || []).map(en));
    let uygun = havuz.filter(k => { try { return filtre(k); } catch (e) { return false; } });
    let aday = uygun.filter(k => en(k) && !kullanilan.has(en(k)));
    if (!aday.length) aday = havuz.filter(k => en(k) && !kullanilan.has(en(k)) && /^[a-zA-Z ]{3,12}$/.test(en(k)));
    return aday.length ? aday[Math.floor(Math.random() * aday.length)] : null;
  };

  /* ===== 3) HAFIZA: eşleşme ve hata animasyonu + sesi ===== */
  let orgHf = window.hafizaKartTikla;
  if (typeof orgHf === 'function') window.hafizaKartTikla = function (idx) {
    let once = typeof hafizaAcikIndexler !== 'undefined' ? hafizaAcikIndexler.slice() : [];
    let r = orgHf.apply(this, arguments);
    if (once.length === 1 && typeof hafizaKartlar !== 'undefined') {
      let i1 = once[0], i2 = idx, es = hafizaKartlar[i1] && hafizaKartlar[i1].eslesti && hafizaKartlar[i2] && hafizaKartlar[i2].eslesti;
      setTimeout(() => {
        let g = $('hafizaKartGrid'); if (!g) return;
        [i1, i2].forEach(i => { let el = g.children[i]; if (el) { el.classList.remove('hf-dogru', 'hf-yanlis'); void el.offsetWidth; el.classList.add(es ? 'hf-dogru' : 'hf-yanlis'); } });
        if (!es && typeof genelSesEfektiCal === 'function') genelSesEfektiCal('yanlis');
        if (!es && navigator.vibrate) navigator.vibrate([40, 40, 40]);
      }, 30);
    }
    return r;
  };

  /* ===== 4) ADAM ASMACA: can gidince sarsıntı, harf açılınca parlama ===== */
  let asCan = null, asAcik = null;
  setInterval(() => {
    let c = $('asmacaCanInfo'), bl = $('asmacaBlanklar');
    if (!c || !gor(c)) { asCan = null; asAcik = null; return; }
    let can = parseInt((c.innerText.match(/\d+/) || [])[0]);
    let acik = bl ? [...bl.children].filter(x => /[a-z]/i.test(x.innerText)).length : 0;
    if (asCan !== null && !isNaN(can) && can < asCan) { let s = $('asmacaSahne'); if (s) { s.classList.remove('as-sars'); void s.offsetWidth; s.classList.add('as-sars'); } if (navigator.vibrate) navigator.vibrate(60); }
    if (asAcik !== null && acik > asAcik && bl) { bl.classList.remove('as-pop'); void bl.offsetWidth; bl.classList.add('as-pop'); }
    asCan = isNaN(can) ? asCan : can; asAcik = acik;
  }, 250);

  /* ===== 5) CÜMLE KUR: her kelimede anında doğru/yanlış, doğru bitince otomatik kabul ===== */
  if (typeof window.cumleSec === 'function') window.cumleSec = function (k) {
    if (typeof cml === 'undefined' || cml.kilit) return;
    let c = cml.liste[cml.i], hedef = c[0].split(' '), sira = cml.cevap.length, secilen = cml.havuz[k];
    if (!secilen) return;
    let dogru = secilen.w === hedef[sira];
    cml.cevap.push(cml.havuz.splice(k, 1)[0]);
    cumleCiz();
    let chipler = document.querySelectorAll('#yoGovde .yo-cevap-alan .yo-chip, #yoGovdeGomulu .yo-cevap-alan .yo-chip');
    let son = chipler[chipler.length - 1];
    let gb = $('yoGB');
    if (dogru) {
      chipler.forEach(x => x.classList.add('cm-dogru'));
      if (typeof yoSes === 'function') yoSes('dogru');
      if (!cml.havuz.length) { if (gb) { gb.style.color = '#2f9e5a'; gb.innerText = '✅ Harika, hepsi doğru sırada!'; } setTimeout(() => cumleKontrol(), 500); }
    } else {
      chipler.forEach((x, i) => { if (i < chipler.length - 1) x.classList.add('cm-dogru'); });
      if (son) son.classList.add('cm-yanlis');
      if (typeof yoSes === 'function') yoSes('yanlis');
      if (gb) { gb.style.color = '#e0434b'; gb.innerText = `“${secilen.w}” buraya gelmiyor, tekrar dene!`; }
      cml.kilit = true;
      setTimeout(() => { cml.kilit = false; cml.havuz.push(cml.cevap.pop()); cml.y = (cml.y || 0); cumleCiz(); let g2 = $('yoGB'); if (g2) { g2.style.color = '#e0434b'; g2.innerText = 'Sıradaki kelimeyi dikkatle seç 👀'; } document.querySelectorAll('#yoGovde .yo-cevap-alan .yo-chip, #yoGovdeGomulu .yo-cevap-alan .yo-chip').forEach(x => x.classList.add('cm-dogru')); }, 800);
    }
  };

  /* ===== 6) İSİM KİLİDİ: oyunlarda oturum açan kişinin adı sabit ===== */
  setInterval(() => {
    if (typeof aktifOgrenciAdi === 'undefined' || !aktifOgrenciAdi || kucuk(aktifOgrenciAdi) === 'teacher') return;
    document.querySelectorAll('input[id$="IsimInput"]').forEach(i => {
          let hedefAd = (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) || aktifOgrenciAdi; if (i.value !== hedefAd) { i.value = hedefAd; i.dispatchEvent(new Event('input', { bubbles: true })); }
      i.readOnly = true; i.style.background = '#f3ebff'; i.style.cursor = 'not-allowed'; i.title = 'Oturum açan öğrencinin adı';
    });
  }, 700);

  /* ===== 7) SANA ÖZEL: Papağan Mağazası kalksın ===== */
  setInterval(() => { document.querySelectorAll('#yoSanaOzelGrid [onclick="yoMagazaAc()"]').forEach(x => x.remove()); }, 1000);

  /* ===== 8) BÜYÜ AKADEMİSİ: giriş 5 enerji, ödüller 2 kat ===== */
  const baAktif = () => $('tab-buyuakademisi') && $('tab-buyuakademisi').classList.contains('active');
setInterval(() => { if (!baAktif()) baHarcandi = false; }, 1000);
  let orgBaSev = window.baSeviyeBaslat;
  if (typeof orgBaSev === 'function') window.baSeviyeBaslat = function () {
    return orgBaSev.apply(this, arguments);
  };



  /* ===== 9) İSİM GİZLEME: başkalarının soyadı "Mahmut K." gibi görünsün ===== */
  let desen = null, harita = {}, desenAnahtar = '';
  function desenKur() {
    let ben = kucuk(typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '');
    if (!ben || ben === 'teacher') { desen = null; desenAnahtar = ben; return; }
    let adlar = (typeof globalDataCache !== 'undefined' && globalDataCache || []).map(u => String(u.ogrenci || '').trim()).filter(a => a.split(/\s+/).length > 1 && kucuk(a) !== ben && kucuk(a) !== 'teacher');
    let anahtar = ben + '|' + adlar.length;
    if (anahtar === desenAnahtar) return;
    desenAnahtar = anahtar; harita = {};
    if (!adlar.length) { desen = null; return; }
    adlar.forEach(a => { let p = a.split(/\s+/); harita[kucuk(a)] = p.slice(0, -1).join(' ') + ' ' + p[p.length - 1].charAt(0).toLocaleUpperCase('tr-TR') + '.'; });
    let kacis = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    desen = new RegExp('(' + adlar.sort((a, b) => b.length - a.length).map(kacis).join('|') + ')', 'gi');
  }
  const ATLA = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|TITLE)$/;
  function isimIsle(kok) {
    if (!desen || !kok) return;
    if (kok.nodeType === 3) return metinIsle(kok);
    if (kok.nodeType !== 1 || ATLA.test(kok.nodeName)) return;
    let w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT), l = [];
    while (w.nextNode()) l.push(w.currentNode);
    l.forEach(metinIsle);
  }
  function metinIsle(n) {
    if (!n.parentNode || ATLA.test(n.parentNode.nodeName) || !desen) return;
    let v = n.nodeValue; if (!v || v.length < 3) return;
    desen.lastIndex = 0;
    if (!desen.test(v)) return;
    desen.lastIndex = 0;
    let yeni = v.replace(desen, m => harita[kucuk(m)] || m);
    if (yeni !== v) n.nodeValue = yeni;
  }
  setInterval(() => { let once = desenAnahtar; desenKur(); if (desen && once !== desenAnahtar) isimIsle(document.body); }, 3000);
  new MutationObserver(ms => {
    if (!desen) return;
    for (let m of ms) { if (m.type === 'characterData') metinIsle(m.target); else m.addedNodes.forEach(isimIsle); }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });

})();
