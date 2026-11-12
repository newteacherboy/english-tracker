
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const karistir = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = s => String(s).toLocaleLowerCase('tr').replace(/[’`]/g, "'").replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim();
  const kelimeler = s => String(s).replace(/[.,!?;:"]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const oku = t => { try { if (typeof dcSesOku === 'function') dcSesOku(t); else { let u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {} };
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yoHazirMi === 'function' && yoHazirMi();
  const ses = t => { if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal(t); };
  const konuAnahtar = () => [typeof dcAktifSeviye !== 'undefined' ? dcAktifSeviye : '', typeof dcAktifKategori !== 'undefined' ? dcAktifKategori : '', typeof dcAktifKonu !== 'undefined' ? dcAktifKonu : ''].join('|');

  /* ---------- Ortak Ders Çalış ödülü (klasik test ve macera aynı kuralı kullanır) ---------- */
  window.dcOdulVer = function (konu) {
    if (!yoVar() || !window.dmProgression?.allowed('ders')) return null;
    yo.dcOdul = yo.dcOdul || []; yo.dcTekrar = yo.dcTekrar || {};
    let bugunK = typeof yoBugun === 'function' ? yoBugun() : new Date().toISOString().slice(0, 10);
    let ilk = !yo.dcOdul.includes(konu);
    if (!ilk && yo.dcTekrar[konu] === bugunK) return { tekrarBugun: true };
    let bilmiyordu = (yo.dcBilmiyor || []).includes(konu);
    let xp = ilk ? (bilmiyordu ? 100 : 80) : 30, al = ilk ? (bilmiyordu ? 30 : 25) : 8, en = 0;
    if (ilk) { yo.dcOdul.push(konu); /* First-clear ledger is permanent. */ }
    else { Object.keys(yo.dcTekrar).forEach(x => { if (yo.dcTekrar[x] !== bugunK) delete yo.dcTekrar[x]; }); yo.dcTekrar[konu] = bugunK; }
    yoXpEkle(xp, al, 'ders_tekrar', String(konu));
    /* Energy is awarded by the validated lesson result on the server. */
    return { ilk, bilmiyordu, xp, al, en };
  };

  /* ---------- İçerikten soru üretimi ---------- */
  let D = null;       /* son yüklenen konu detayı */
  function veriHazirla(detay) {
    let parse = (v, bos) => { if (Array.isArray(v) || (v && typeof v === 'object')) return v; try { return JSON.parse(v || bos); } catch (e) { return JSON.parse(bos); } };
    let ornek = parse(detay.ornekler, '[]').filter(o => o && o.en && o.tr).map(o => ({ en: String(o.en).replace(/<[^>]+>/g, '').trim(), tr: String(o.tr).replace(/<[^>]+>/g, '').trim() }))
      .filter(o => { let n = kelimeler(o.en).length; return n >= 2 && n <= 11 && !/[_\/]|\.\.\./.test(o.en); });
    let sozluk = Object.entries(parse(detay.kelimeSozlugu, '{}')).map(([en, v]) => ({ en: en.trim(), tr: String((v && (v.tr || v)) || '').trim() })).filter(x => x.en && x.tr && x.tr !== '[object Object]');
    let test = parse(detay.testJSON, '[]').filter(t => t && t.soru && Array.isArray(t.secenekler) && t.secenekler.length >= 2 && Number.isInteger(Number(t.dogru)));
    return { ornek, sozluk, test, anlatim: detay.anlatimHTML || '', gorsel: detay.gorselLink || '' };
  }
  function sorulariKur(v) {
    let testler = karistir(v.test), final = null;
    if (testler.length >= 3) final = { tip: 'test', ...testler.pop() };
    let ornekler = karistir(v.ornek), havuz = [];
    testler.slice(0, 2).forEach(t => havuz.push({ tip: 'test', ...t }));
    ornekler.filter(o => kelimeler(o.en).length <= 8).slice(0, 2).forEach(o => havuz.push({ tip: 'sira', ...o }));
    if (ornekler.length >= 2) { let o = ornekler[ornekler.length - 1], dogruMu = Math.random() < 0.5, baska = ornekler.find(x => x !== o); havuz.push({ tip: 'dy', en: o.en, tr: dogruMu ? o.tr : baska.tr, gercek: o.tr, dogruMu }); }
    let bosluk = ornekler.map(o => { let w = v.sozluk.find(s => new RegExp('\\b' + s.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(o.en)); return w ? { o, w } : null; }).find(Boolean);
    if (bosluk && v.sozluk.length >= 3) {
      let cel = karistir(v.sozluk.filter(s => norm(s.en) !== norm(bosluk.w.en))).slice(0, 2).map(s => s.en);
      let secenekler = karistir([bosluk.w.en, ...cel]);
      havuz.push({ tip: 'bosluk', soru: bosluk.o.en.replace(new RegExp('\\b' + bosluk.w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '_____'), tr: bosluk.o.tr, secenekler, dogru: secenekler.indexOf(bosluk.w.en), tam: bosluk.o.en });
    }
    if (v.sozluk.length >= 4) havuz.push({ tip: 'es', ciftler: karistir(v.sozluk).slice(0, 4) });
    /* 6'ya tamamla: kalan testler ve örnekler */
    let ek = [...testler.slice(2).map(t => ({ tip: 'test', ...t })), ...ornekler.slice(2).filter(o => kelimeler(o.en).length <= 9).map(o => ({ tip: 'sira', ...o }))];
    while (havuz.length < 6 && ek.length) havuz.push(ek.shift());
    havuz = karistir(havuz).slice(0, 6);
    if (!final) { let uzun = [...v.ornek].sort((a, b) => kelimeler(b.en).length - kelimeler(a.en).length).find(o => kelimeler(o.en).length <= 11); if (uzun) final = { tip: 'sira', ...uzun }; else if (havuz.length > 3) final = havuz.pop(); }
    return { sorular: havuz, final };
  }
  function kartlariKur(v) {
    let tmp = document.createElement('div'); tmp.innerHTML = v.anlatim;
    let bloklar = [...tmp.childNodes].map(n => n.nodeType === 3 ? (n.textContent.trim() ? `<p>${kac(n.textContent.trim())}</p>` : '') : n.outerHTML).filter(Boolean);
    let kartlar = [], simdiki = '', uzunluk = 0;
    bloklar.forEach(b => {
      let l = b.replace(/<[^>]+>/g, '').length;
      if (uzunluk && uzunluk + l > 420 && kartlar.length < 2) { kartlar.push(simdiki); simdiki = ''; uzunluk = 0; }
      simdiki += b; uzunluk += l;
    });
    if (simdiki) kartlar.push(simdiki);
    let sonuc = kartlar.map((h, i) => ({ baslik: `📖 Anlatım ${kartlar.length > 1 ? (i + 1) + '/' + kartlar.length : ''}`, html: (i === 0 && v.gorsel ? `<img src="${kac(v.gorsel)}" alt="" loading="lazy"><br>` : '') + h }));
    if (v.ornek.length) sonuc.push({ baslik: '🔊 Örneklerle dinle', html: v.ornek.slice(0, 4).map((o, i) => `<div class="km-ornek"><button type="button" data-oku="${i}" aria-label="Dinle">🔊</button><div><b>${kac(o.en)}</b><span>${kac(o.tr)}</span></div></div>`).join('') });
    return sonuc.length ? sonuc : [{ baslik: '📖 Konu', html: '<p>Bu konunun anlatımı yakında eklenecek. Hadi soruları deneyelim!</p>' }];
  }

  /* ---------- Macera akışı ---------- */
  let M = null;
  function ac() {
    if (!D) return;
    let v = veriHazirla(D), s = sorulariKur(v);
    if (s.sorular.length < 3 || !s.final) { if (typeof dcToastGoster === 'function') dcToastGoster('Bu konu için macera henüz hazır değil, klasik görünümle çalışabilirsin.'); return; }
    M = { v, kartlar: kartlariKur(v), sorular: s.sorular, final: s.final, adim: 0, dogru: 0, finalHak: 2, finalIlk: true, konu: ($('dcCrumb') && $('dcCrumb').innerText.trim()) || (typeof dcAktifKonu !== 'undefined' ? dcAktifKonu : 'konu'), anahtar: konuAnahtar() };
    M.toplam = M.kartlar.length + M.sorular.length + 1;
    let p = document.createElement('div'); p.className = 'km-perde'; p.id = 'kmPerde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Konu Macerası');
    p.innerHTML = `<div class="km-ust"><button class="km-kapat" id="kmKapat" aria-label="Maceradan çık">✕</button><div class="km-bar"><i id="kmBar"></i></div><span class="km-adim" id="kmAdim"></span></div><div class="km-govde" id="kmGovde"></div><div class="km-alt" id="kmAlt"></div>`;
    document.body.appendChild(p);
    $('kmKapat').onclick = kapat;
    ciz();
  }
  function kapat() { let p = $('kmPerde'); if (p) p.remove(); M = null; try { speechSynthesis.cancel(); } catch (e) {} }
  function ilerleme(etiket) { $('kmBar').style.width = Math.round(M.adim / M.toplam * 100) + '%'; $('kmAdim').innerText = etiket; }
  function alt(html) { $('kmAlt').innerHTML = html; }
  function ciz() {
    let k = M.kartlar.length, n = M.sorular.length;
    if (M.adim < k) return kartCiz(M.adim);
    if (M.adim < k + n) return soruCiz(M.sorular[M.adim - k], `Soru ${M.adim - k + 1}/${n}`, false);
    if (M.adim === k + n) {
      if (M.dogru < Math.ceil(n * 0.6)) return yetersiz();
      return soruCiz(M.final, '👑 Final', true);
    }
  }
  function kartCiz(i) {
    let c = M.kartlar[i];
    ilerleme(`Kart ${i + 1}/${M.kartlar.length}`);
    $('kmGovde').innerHTML = `<div class="km-kart"><h3>${c.baslik}</h3>${c.html}</div>`;
    $('kmGovde').querySelectorAll('[data-oku]').forEach(b => b.onclick = () => oku(M.v.ornek[+b.dataset.oku].en));
    alt(`<button class="km-btn" id="kmIleri">${i === M.kartlar.length - 1 ? '🎯 Sorulara geç' : 'Devam →'}</button>`);
    $('kmIleri').onclick = () => { M.adim++; ciz(); };
    setTimeout(() => $('kmIleri') && $('kmIleri').focus(), 50);
  }
  function geriBildirim(iyi, metin, finalMi) {
    if(iyi)window.DijiMeduPapiFeedback?.correct({duration:900});
    let g = document.createElement('div'); g.className = 'km-geri ' + (iyi ? 'iyi' : 'kotu'); g.setAttribute('role', 'status'); g.innerHTML = metin;
    $('kmGovde').appendChild(g); g.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ses(iyi ? 'dogru' : 'yanlis');
    if(iyi)window.DijiMeduPapiFeedback?.correct({detail:'Harika!',duration:850});
    alt(`<button class="km-btn" id="kmIleri">Devam et</button>`);
    $('kmIleri').onclick = () => {
      if (finalMi) { if (iyi) return bitir(); if (M.finalHak > 0) return soruCiz(M.final, '👑 Final · son hak', true); return yetersiz(true); }
      M.adim++; ciz();
    };
    setTimeout(() => $('kmIleri') && $('kmIleri').focus(), 50);
  }
  function sonuclandir(q, iyi, finalMi, dogruMetin) {
    if (finalMi) { M.finalHak--; if (!iyi) M.finalIlk = false; }
    else if (iyi) M.dogru++;
    geriBildirim(iyi, iyi ? ['✅ Harika!', '✅ Süper!', '✅ Aynen böyle!'][Math.floor(Math.random() * 3)] + (dogruMetin ? `<br><small>${dogruMetin}</small>` : '') : `❌ Doğrusu: <b>${dogruMetin}</b>`, finalMi);
  }
  function soruCiz(q, etiket, finalMi) {
    ilerleme(etiket);
    let bas = finalMi ? `<div class="km-final">👑 Final sorusu · konuyu kazandırır</div>` : '';
    let G = $('kmGovde'); alt('');
    if (q.tip === 'test' || q.tip === 'bosluk') {
      let tipAd = q.tip === 'test' ? '📝 Soru' : '🧩 Boşluğu doldur';
      let soruHtml = q.tip === 'test' ? kac(q.soru) : `${kac(q.soru)}<small>${kac(q.tr)}</small>`;
      let sira = karistir(q.secenekler.map((s, i) => i));
      G.innerHTML = `${bas}<div class="km-soru-tip">${tipAd}</div><div class="km-soru">${soruHtml}</div><div class="km-secenekler">${sira.map(i => `<button type="button" class="km-sec" data-i="${i}">${kac(q.secenekler[i])}</button>`).join('')}</div>`;
      G.querySelectorAll('.km-sec').forEach(b => b.onclick = () => {
        let i = +b.dataset.i, iyi = i === Number(q.dogru);
        G.querySelectorAll('.km-sec').forEach(x => { x.disabled = true; if (+x.dataset.i === Number(q.dogru)) x.classList.add('dogru'); });
        if (!iyi) b.classList.add('yanlis');
        if (q.tip === 'bosluk') oku(q.tam);
        sonuclandir(q, iyi, finalMi, kac(q.tip === 'bosluk' ? q.tam : q.secenekler[Number(q.dogru)]));
      });
    } else if (q.tip === 'dy') {
      G.innerHTML = `${bas}<div class="km-soru-tip">🤔 Çeviri doğru mu?</div><div class="km-soru">${kac(q.en)}<small>= ${kac(q.tr)}</small></div><div class="km-secenekler"><button type="button" class="km-sec" data-c="1">✅ Evet, doğru</button><button type="button" class="km-sec" data-c="0">❌ Hayır, yanlış</button></div>`;
      oku(q.en);
      G.querySelectorAll('.km-sec').forEach(b => b.onclick = () => {
        let iyi = (b.dataset.c === '1') === q.dogruMu;
        G.querySelectorAll('.km-sec').forEach(x => x.disabled = true);
        b.classList.add(iyi ? 'dogru' : 'yanlis');
        sonuclandir(q, iyi, finalMi, `${kac(q.en)} = ${kac(q.gercek)}`);
      });
    } else if (q.tip === 'sira') {
      let parca = kelimeler(q.en), cevap = [], havuz = karistir(parca.map((w, i) => ({ w, i, k: false })));
      if (havuz.map(x => x.w).join(' ') === parca.join(' ') && havuz.length > 1) havuz.reverse();
      const yenile = () => {
        G.innerHTML = `${bas}<div class="km-soru-tip">🧱 Cümleyi diz</div><div class="km-soru">${kac(q.tr)}</div><div class="km-cevap" id="kmCevap">${cevap.map((x, k) => `<button type="button" class="km-cip" data-g="${k}">${kac(x.w)}</button>`).join('')}</div><div class="km-havuz">${havuz.map((x, k) => `<button type="button" class="km-cip${x.k ? ' bos' : ''}" data-h="${k}" ${x.k ? 'tabindex="-1"' : ''}>${kac(x.w)}</button>`).join('')}</div>`;
        G.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { let x = havuz[+b.dataset.h]; if (x.k) return; x.k = true; cevap.push(x); yenile(); });
        G.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { let x = cevap.splice(+b.dataset.g, 1)[0]; x.k = false; yenile(); });
        alt(`<button class="km-btn" id="kmKontrol" ${cevap.length === parca.length ? '' : 'disabled'}>Kontrol et</button>`);
        $('kmKontrol').onclick = () => {
          let iyi = norm(cevap.map(x => x.w).join(' ')) === norm(q.en);
          G.querySelectorAll('.km-cip').forEach(x => x.disabled = true);
          oku(q.en);
          sonuclandir(q, iyi, finalMi, kac(q.en));
        };
      };
      yenile();
    } else if (q.tip === 'es') {
      let sol = karistir(q.ciftler), sag = karistir(q.ciftler), hata = 0, kalan = q.ciftler.length, secS = null, secG = null;
      G.innerHTML = `${bas}<div class="km-soru-tip">🔗 Kelimeleri eşleştir</div><div class="km-soru">Her İngilizce kelimeyi Türkçesiyle eşle<small>En fazla 1 hata ile tam puan</small></div><div class="km-es"><div id="kmSol"></div><div id="kmSag"></div></div>`;
      const dug = (x, taraf) => { let b = document.createElement('button'); b.type = 'button'; b.className = 'km-cip'; b.textContent = taraf === 's' ? x.en : x.tr; b.dataset.en = x.en;
        b.onclick = () => {
          if (taraf === 's') { if (secS) secS.classList.remove('secili'); secS = b; oku(x.en); } else { if (secG) secG.classList.remove('secili'); secG = b; }
          b.classList.add('secili');
          if (!secS || !secG) return;
          let a = secS, c = secG; secS = secG = null; a.classList.remove('secili'); c.classList.remove('secili');
          if (a.dataset.en === c.dataset.en) { a.classList.add('eslesti'); c.classList.add('eslesti'); ses('dogru'); if (--kalan === 0) sonuclandir(q, hata <= 1, finalMi, hata <= 1 ? '' : `${hata} hata yaptın`); }
          else { hata++; ses('yanlis'); [a, c].forEach(z => { z.style.borderColor = '#dc2626'; setTimeout(() => z.style.borderColor = '', 450); }); }
        }; return b; };
      sol.forEach(x => $('kmSol').appendChild(dug(x, 's'))); sag.forEach(x => $('kmSag').appendChild(dug(x, 'g')));
    }
    let ilk = G.querySelector('button'); if (ilk) setTimeout(() => ilk.focus(), 60);
  }
  function yetersiz(finalden) {
    ilerleme('Tekrar');
    $('kmGovde').innerHTML = `<div class="km-sonuc"><div class="yildiz">💪</div><h2>Az kaldı!</h2><p>${finalden ? 'Final sorusunu bu sefer geçemedin.' : `${M.sorular.length} sorudan ${M.dogru} doğru yaptın; finale ${Math.ceil(M.sorular.length * 0.6)} doğruyla geçilir.`} Kartlara bir göz at ve tekrar dene, ödül seni bekliyor.</p></div>`;
    alt(`<button class="km-btn" id="kmYine">🔁 Maceraya baştan başla</button><button class="km-btn ikincil" id="kmCik">Konu ekranına dön</button>`);
    $('kmYine').onclick = () => { kapat(); ac(); };
    $('kmCik').onclick = kapat;
  }
  function bitir() {
    M.adim = M.toplam; ilerleme('🏁');
    let n = M.sorular.length;
    let yildiz = M.dogru === n && M.finalIlk ? 3 : M.dogru >= n - 1 ? 2 : 1;
    /* sunucuya tamamlandı kaydı (klasik testle aynı) */
    try {
      if (typeof dcAktifKonuTamamlanmisMi !== 'undefined' && !dcAktifKonuTamamlanmisMi) {
        fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'dersTestSonucKaydet', ogrenci: aktifOgrenciAdi, seviye: dcAktifSeviye, kategori: dcAktifKategori, konuAdi: dcAktifKonu, basariliMi: true }) }).catch(() => {});
        let k = dcTumKonularCache.find(x => x.seviye === dcAktifSeviye && x.kategori === dcAktifKategori && x.konuAdi === dcAktifKonu);
        if (k) k.durum = 'tamamlandi';
        dcAktifKonuTamamlanmisMi = true;
      }
    } catch (e) {}
    let odul = window.dcOdulVer(M.konu);
    if (yoVar()) { yo.dcYildiz = yo.dcYildiz || {}; yo.dcYildiz[M.anahtar] = Math.max(yo.dcYildiz[M.anahtar] || 0, yildiz); if (typeof yoKaydet === 'function') yoKaydet(); }
    let odulHtml = odul && !odul.tekrarBugun ? `<div class="km-odul"><span>+${odul.en} ⚡</span><span>+${odul.al} 🪙</span><span>+${odul.xp} XP</span></div>` : `<p>Bu konunun bugünkü tekrar ödülünü zaten aldın. Yarın tekrar edersen yine ödül var!</p>`;
    $('kmGovde').innerHTML = `<div class="km-sonuc"><div class="yildiz" aria-label="${yildiz} yıldız">${'⭐'.repeat(yildiz)}${'☆'.repeat(3 - yildiz)}</div>
      <h2>${odul && odul.bilmiyordu && odul.ilk ? 'Bilmediğin konuyu öğrendin!' : odul && odul.ilk ? 'Konuyu kazandın!' : 'Tekrarın harikaydı!'}</h2>
      <p>${M.dogru}/${n} uygulama doğru · final ${M.finalIlk ? 'ilk denemede' : 'ikinci denemede'} geçildi</p>${odulHtml}</div>`;
    ses('dogru');
    if (typeof gsoKonfetiPatlat === 'function') try { gsoKonfetiPatlat($('kmGovde')); } catch (e) {}
    alt(`<button class="km-btn" id="kmBitti">📚 Konu listesine dön</button>`);
    $('kmBitti').onclick = () => { kapat(); if (typeof dcTestSonrasiKonuListesineDon === 'function') dcTestSonrasiKonuListesineDon(); else if (typeof dcGeriGit === 'function') dcGeriGit(); };
  }

  /* ---------- Bağlantılar ---------- */
  let orgDetay = window.dcKonuDetayiCiz;
  if (typeof orgDetay === 'function') window.dcKonuDetayiCiz = function (detay) {
    let r = orgDetay.apply(this, arguments);
    D = detay;
    try {
      let ekran = $('dcScreenDetail'), eski = $('kmBaslangic'); if (eski) eski.remove();
      let v = veriHazirla(detay), s = sorulariKur(v);
      if (ekran && s.sorular.length >= 3 && s.final) {
        let y = yoVar() && yo.dcYildiz ? (yo.dcYildiz[konuAnahtar()] || 0) : 0;
        let b = document.createElement('div'); b.className = 'km-baslangic'; b.id = 'kmBaslangic';
        b.innerHTML = `<span class="i">🚀</span><span><b>Konu Macerası ${y ? '⭐'.repeat(y) : ''}</b><small>${kartlariKur(v).length} kart · ${s.sorular.length} soru · 👑 final · ödül +6 ⚡</small></span><button type="button">Başla</button>`;
        b.querySelector('button').onclick = ac;
        let h = $('dcTopicHeader'); (h || ekran.firstElementChild).insertAdjacentElement('afterend', b);
      }
    } catch (e) { console.warn('Macera hazırlanamadı', e); }
    return r;
  };
  let orgListe = window.dcKategoriIcerikCiz;
  if (typeof orgListe === 'function') window.dcKategoriIcerikCiz = function (key) {
    let r = orgListe.apply(this, arguments);
    try {
      if (yoVar() && yo.dcYildiz) document.querySelectorAll('#dcTopicListArea .dc-card').forEach(c => {
        let t = c.querySelector('.dc-card-title'); if (!t) return;
        let y = yo.dcYildiz[[dcAktifSeviye, key, t.innerText.trim()].join('|')] || 0;
        if (y && !c.querySelector('.km-yildiz')) { let s = document.createElement('span'); s.className = 'km-yildiz'; s.textContent = '⭐'.repeat(y); s.setAttribute('aria-label', y + ' yıldız'); c.appendChild(s); }
      });
    } catch (e) {}
    return r;
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('kmPerde')) kapat(); });
})();
