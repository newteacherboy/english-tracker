
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SEV = [['A1', 'Başlangıç'], ['A2', 'Temel'], ['B1', 'Orta'], ['B2', 'Orta-Üstü']];
  const KAT = [['grammar', '🏰', 'Dil Bilgisi', 'Grammar Topics'], ['vocab', '🏡', 'Kelime', 'Vocabulary Topics'], ['comm', '⛺', 'İletişim', 'Communication / Functions'], ['pron', '🗼', 'Telaffuz', 'Pronunciation Focus']];
  const ADA_YER = [[26, 20], [74, 40], [28, 62], [70, 84]];
  const KAT_YER = [[28, 34], [72, 34], [28, 64], [72, 64]];
  const ADA_SEKIL = [
    `<svg width="130" height="96" viewBox="0 0 130 96" aria-hidden="true"><ellipse cx="65" cy="70" rx="60" ry="22" fill="#fcd34d"/><ellipse cx="65" cy="58" rx="52" ry="28" fill="#4ade80"/><text x="28" y="52" font-size="26">🌴</text><text x="62" y="44" font-size="30">🏠</text></svg>`,
    `<svg width="130" height="100" viewBox="0 0 130 100" aria-hidden="true"><ellipse cx="65" cy="74" rx="60" ry="22" fill="#fcd34d"/><path d="M14 70 Q30 30 65 26 Q100 30 116 70Z" fill="#22c55e"/><text x="46" y="52" font-size="32">🏰</text></svg>`,
    `<svg width="130" height="104" viewBox="0 0 130 104" aria-hidden="true"><ellipse cx="65" cy="78" rx="60" ry="22" fill="#fcd34d"/><path d="M16 74 L50 22 L66 40 L84 14 L114 74Z" fill="#a78bfa"/><text x="56" y="70" font-size="26">⛏️</text></svg>`,
    `<svg width="130" height="110" viewBox="0 0 130 110" aria-hidden="true"><ellipse cx="65" cy="84" rx="60" ry="22" fill="#fcd34d"/><path d="M20 80 L54 20 L76 20 L110 80Z" fill="#78716c"/><path d="M54 20 Q65 6 76 20" fill="#f97316"/><text x="54" y="18" font-size="18">🔥</text></svg>`
  ];
  const acik = () => localStorage.getItem('dc_tema') !== 'klasik';
  const liste = () => (typeof dcTumKonularCache !== 'undefined' && Array.isArray(dcTumKonularCache)) ? dcTumKonularCache : [];
  const konular = (sev, kat) => liste().filter(k => k.seviye === sev && (!kat || k.kategori === kat)).sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
  const bitti = k => k.durum === 'tamamlandi';
  const yildiz = k => { try { return (yo && yo.dcYildiz && yo.dcYildiz[[k.seviye, k.kategori, k.konuAdi].join('|')]) || (bitti(k) ? 1 : 0); } catch (e) { return bitti(k) ? 1 : 0; } };
  const yuzde = l => l.length ? Math.round(l.filter(bitti).length / l.length * 100) : 0;
  function kap(ekranId, id) {
    let e = $(ekranId); if (!e) return null;
    let k = $(id); if (!k) { k = document.createElement('div'); k.id = id; k.className = 'ma-kap'; e.insertBefore(k, e.firstChild); }
    return k;
  }
  function klasikDugmesi(ekranId) {
    let e = $(ekranId); if (!e || e.querySelector('.ma-klasik-don')) return;
    let b = document.createElement('button'); b.type = 'button'; b.className = 'ma-klasik-don'; b.textContent = '🏝️ Ada haritasına geç';
    b.onclick = () => { localStorage.removeItem('dc_tema'); document.body.classList.add('dc-ada'); ciz(true); };
    e.insertBefore(b, e.firstChild);
  }

  /* ---------- 1) Seviyeler: ada haritası ---------- */
  function haritaCiz() {
    let k = kap('dcScreenLevels', 'maHarita'); if (!k) return;
    // Keep the live accent controls before replacing the map that currently owns them.
    const ses = document.querySelector('#dcScreenLevels .dc-voice-toggle');
    let toplamY = liste().reduce((t, x) => t + yildiz(x), 0), veriVar = liste().length > 0;
    let hedef = SEV.findIndex(([s]) => { let l = konular(s); return l.length && l.some(x => !bitti(x)); }); if (hedef < 0) hedef = 0;
    let yol = ADA_YER.map(([x, y]) => `${x * 4.8},${y * 5.4}`).join(' ');
    k.className = 'ma-kap ma-deniz';
    k.innerHTML = `<div class="ma-dalga" aria-hidden="true"></div>
      <div class="ma-ust"><span class="ma-tabela">🗺️ İngilizce Adaları<small>Her ada yeni bir seviye. Adaya dokun!</small></span><span class="ma-rozet" aria-label="Toplam yıldız">⭐ ${toplamY}</span></div>
      <div class="ma-ses" id="maSesYeri"></div>
      <div class="ma-harita"><svg class="ma-yol" viewBox="0 0 480 540" preserveAspectRatio="none" aria-hidden="true"><polyline points="${yol}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round" opacity=".85"/></svg>
      ${SEV.map(([s, ad], i) => { let l = konular(s), y = yuzde(l), [x, yy] = ADA_YER[i];
        let rozet = !veriVar ? '…' : !l.length ? '' : y >= 70 ? '⭐⭐⭐' : y >= 30 ? '⭐⭐☆' : y > 0 ? '⭐☆☆' : '🌱 Yeni';
        return `<button type="button" class="ma-ada" data-s="${s}" data-ad="${ad}" style="left:${x}%;top:${yy}%" aria-label="${s} ${ad} adası${veriVar ? ', yüzde ' + y : ''}">${ADA_SEKIL[i]}<span class="ma-isim"><b>${s}</b><small>${ad}${veriVar && l.length ? ' · %' + y : ''}</small><i>${rozet}</i></span></button>`; }).join('')}
      <span class="ma-tekne" style="left:${ADA_YER[hedef][0] + 12}%;top:${ADA_YER[hedef][1] - 9}%" aria-hidden="true">⛵</span></div>
      <div class="ma-alt"><button type="button" class="ma-klasik" id="maKlasik">📋 Klasik görünüm</button></div>`;
    /* ABD/İngiliz ses seçimi haritaya taşınır (aynı düğmeler, aynı işlev) */
    if (ses) $('maSesYeri').appendChild(ses);
    k.querySelectorAll('.ma-ada').forEach(b => b.onclick = () => dcSeviyeSec(b.dataset.s, b.dataset.ad));
    $('maKlasik').onclick = () => {
      localStorage.setItem('dc_tema', 'klasik'); document.body.classList.remove('dc-ada');
      let hero = document.querySelector('#dcScreenLevels .dc-hero'), s2 = $('maSesYeri') && $('maSesYeri').querySelector('.dc-voice-toggle');
      if (hero && s2) hero.appendChild(s2);
      klasikDugmesi('dcScreenLevels');
    };
    // Apply the current presentation before this rebuilt map can paint.
    if (typeof window.dmStudyDecorate === 'function') window.dmStudyDecorate();
  }

  /* ---------- 2) Kategoriler: adanın içi ---------- */
  function adaIcCiz() {
    let k = kap('dcScreenCats', 'maAdaIc'); if (!k) return;
    let s = typeof dcAktifSeviye !== 'undefined' ? dcAktifSeviye : 'A1', ad = (SEV.find(x => x[0] === s) || [s, ''])[1], l = konular(s);
    k.className = 'ma-kap ma-adaic';
    k.innerHTML = `<div class="ma-ust"><span class="ma-tabela">${s} Adası<small>${ad}${l.length ? ' · %' + yuzde(l) + ' keşfedildi' : ''}</small></span></div>
      ${KAT.map(([key, ev, kad, uzun], i) => { let kl = konular(s, key), y = yuzde(kl);
        return `<button type="button" class="ma-yapi" data-k="${key}" data-ad="${uzun}" style="left:${KAT_YER[i][0]}%;top:${KAT_YER[i][1] + 6}%" aria-label="${kad}${kl.length ? ', ' + kl.filter(bitti).length + ' / ' + kl.length + ' konu' : ''}"><span class="ev" style="animation-delay:${i * .4}s">${ev}</span><span class="et">${kad}<small>${kl.length ? kl.filter(bitti).length + '/' + kl.length + ' konu' : 'Konular yükleniyor'}</small><div class="cubuk"><i style="width:${y}%"></i></div></span></button>`; }).join('')}
      <div style="position:absolute;left:50%;top:55%;transform:translate(-50%,-50%);font-size:40px" aria-hidden="true">⛲</div>`;
    k.querySelectorAll('.ma-yapi').forEach(b => b.onclick = () => dcKategoriSec(b.dataset.k, b.dataset.ad));
  }

  /* ---------- 3) Konular: taş patika ---------- */
  function patikaCiz() {
    let k = kap('dcScreenTopics', 'maPatika'); if (!k) return;
    let s = typeof dcAktifSeviye !== 'undefined' ? dcAktifSeviye : '', key = typeof dcAktifKategori !== 'undefined' ? dcAktifKategori : '';
    let K = KAT.find(x => x[0] === key) || [key, '📍', key], l = konular(s, key), sira = l.findIndex(x => !bitti(x));
    k.className = 'ma-kap ma-cayir';
    let taslar = l.map((x, i) => {
      let y = yildiz(x), sonraki = i === sira, basarisiz = x.durum === 'basarisiz';
      let renk = bitti(x) ? '#fde68a' : basarisiz ? '#fed7aa' : sonraki ? '#fff' : '#d6d3d1';
      let alt = bitti(x) ? '⭐'.repeat(y) + '☆'.repeat(3 - y) : basarisiz ? '🔁 Tekrar dene' : sonraki ? 'Sıradaki taş!' : 'Keşfedilmedi';
      if (x.bilmiyordum) alt += ' · ❓ Bilmiyordum';
      return `<button type="button" class="ma-tas" data-i="${i}" aria-label="${kac(x.konuAdi)}: ${alt}">${sonraki ? `<span class="bayrak" style="${i % 2 ? 'right:18px' : 'left:18px'}" aria-hidden="true">🚩</span>` : ''}<span class="tas" style="background:${renk};${sonraki ? 'outline:4px solid #f59e0b' : ''}">${bitti(x) ? '✓' : basarisiz ? '↺' : i + 1}</span><span class="et"><b>${kac(x.konuAdi)}</b><small>${alt}</small></span></button>`;
    }).join('');
    let hepsi = l.length && l.every(bitti);
    k.innerHTML = `<div class="ma-ust"><span class="ma-tabela">${K[1]} ${K[2]} patikası<small>${s} Adası · ${l.filter(bitti).length}/${l.length} taş</small></span></div>
      <div class="ma-patika">${l.length ? taslar : `<div class="ma-bos">🌿 Konular yükleniyor…</div>`}
      ${l.length ? `<div class="ma-hazine"><span aria-hidden="true">${hepsi ? '🏆' : '🧰'}</span>${hepsi ? 'Bu patikayı fethettin!' : 'Tüm taşları bitir, patikayı fethet!'}</div>` : ''}</div>`;
    k.querySelectorAll('.ma-tas').forEach(b => b.onclick = () => dcKonuAc(l[+b.dataset.i].konuAdi));
  }

  /* ---------- Bağlantılar ---------- */
  let imza = '';
  function ciz(zorla) {
    if (!acik()) { document.body.classList.remove('dc-ada'); klasikDugmesi('dcScreenLevels'); return; }
    document.body.classList.add('dc-ada');
    let ekran = document.querySelector('#tab-derscalis .dc-screen.active'), id = ekran ? ekran.id : '';
    let yeni = id + '|' + liste().length + '|' + liste().filter(bitti).length + '|' + (typeof dcAktifSeviye !== 'undefined' ? dcAktifSeviye : '') + '|' + (typeof dcAktifKategori !== 'undefined' ? dcAktifKategori : '') + '|' + (typeof yo !== 'undefined' && yo && yo.dcYildiz ? Object.keys(yo.dcYildiz).length : 0);
    if (!zorla && yeni === imza) return;
    imza = yeni;
    if (id === 'dcScreenLevels') haritaCiz();
    else if (id === 'dcScreenCats') adaIcCiz();
    else if (id === 'dcScreenTopics') patikaCiz();
  }
  ['dcSeviyeSec', 'dcKategoriIcerikCiz', 'dcGeriGit', 'dcAnaEkranaDon', 'dersCalisBaslat', 'dcTestSonrasiKonuListesineDon'].forEach(ad => {
    let org = window[ad]; if (typeof org !== 'function') return;
    window[ad] = function () { let r = org.apply(this, arguments); ciz(true); return r; };
  });
  setInterval(() => { let t = $('tab-derscalis'); if (t && t.getClientRects().length) ciz(false); }, 800);
  if (acik()) document.body.classList.add('dc-ada');
})();
