
(function () {
  const $ = id => document.getElementById(id);
  const OYUNLAR = [
    { ad:'Büyü Akademisi', alt:'Büyülü soru parkuru', html:'<div class="yb-buyu"><span class="yor"><i>✨</i><i>⭐</i><i>💫</i></span>🧙</div>', ac:() => (window.dunyaAc || baModuAc)() },
    { ad:'Kelime Modu', alt:'Kelimeyi söyle, seviyeyi geç', html:'<div class="yb-kelime"><span>🔤</span><b class="harf">A</b></div>', ac:() => kpModuAc() },
        { ad:'Papağanla sohbet', alt:'16 diyaloglu sohbet haritası', html:'<div class="yb-sohbet"><span>🦜</span></div>', ac:() => sohbetEkraniAc() },
    { ad:'Kelime Kartları', alt:'Takımadalarda kelime yolculuğu', html:'<div class="yb-kartlar-yuz">🃏</div>', ac:() => { if (typeof seviyeHaritasiAc === 'function') seviyeHaritasiAc(); } }
  ];
  function hedefYuzu() {
    let x = 0, h = 50;
    if (typeof yo !== 'undefined' && yo && yo.xpGun) { x = yo.xpGun.xp || 0; h = yo.hedef || 50; }
    let C = 2 * Math.PI * 17, p = Math.min(1, x / h);
    return `<div class="yb-hedef"><svg viewBox="0 0 38 38" width="38" height="38"><circle cx="19" cy="19" r="17" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3.5"/><circle cx="19" cy="19" r="17" fill="none" stroke="${p >= 1 ? '#6bcb77' : '#ffd166'}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/></svg><span>${p >= 1 ? '✅' : '🎯'}</span></div>`;
  }
  const ARACLAR = [
    { ad:'Günlük hedef', alt:'', html:'', ac:() => { window.yoGomuluHedef = null; yoHedefAc(); } },
    { ad:'Yardım', alt:'Portaldaki her şeyin açıklaması', html:'<div class="yb-yardim"><span>❓</span></div>', ac:() => yardimAc() },
    { ad:'AI Koç', alt:'Öğretmenine mesaj bırak', html:'<div class="yb-ai"><span>🤖</span></div>', ac:() => aiModalAc() }
  ];
  function aracGuncelle() {
    ARACLAR[0].html = hedefYuzu();
    let x = (typeof yo !== 'undefined' && yo && yo.xpGun) ? yo.xpGun.xp : 0, h = (typeof yo !== 'undefined' && yo) ? yo.hedef : 50;
    ARACLAR[0].alt = `Bugün ${x} / ${h} XP`;
  }

  /* ---- dönen yüzler ---- */
  function yuzleriKur(id, liste) {
    let fw = $(id);
    $(id + 'Ic').innerHTML = liste.map((x, i) => `<div class="yb-yuz${i === (fw._sira || 0) ? ' on' : ''}">${x.html}</div>`).join('');
    fw.querySelector('.yb-nokta').innerHTML = liste.map((x, i) => `<i class="${i === (fw._sira || 0) ? 'on' : ''}"></i>`).join('');
  }
  function yuzDegistir(id, liste) {
    let fw = $(id);
    if (!fw.classList.contains('gor') || fw.classList.contains('suruklen')) return;
    fw._sira = ((fw._sira || 0) + 1) % liste.length;
    fw.querySelectorAll('.yb-yuz').forEach((y, i) => y.classList.toggle('on', i === fw._sira));
    fw.querySelectorAll('.yb-nokta i').forEach((n, i) => n.classList.toggle('on', i === fw._sira));
    fw.querySelector('.yb-ipucu').innerText = liste[fw._sira].ad;
    fw.classList.add('ipucu-gor', 'parla');
    setTimeout(() => fw.classList.remove('ipucu-gor', 'parla'), 1800);
  }
  yuzleriKur('ybOyun', OYUNLAR);
  aracGuncelle(); yuzleriKur('ybArac', ARACLAR);
  setInterval(() => yuzDegistir('ybOyun', OYUNLAR), 7000);
  setInterval(() => { aracGuncelle(); yuzleriKur('ybArac', ARACLAR); yuzDegistir('ybArac', ARACLAR); }, 5000);
  setInterval(() => document.querySelectorAll('.yb-kelime .harf').forEach(h => { h.innerText = 'ABCDEFGHIKLMNOPRSTUWY'[Math.floor(Math.random() * 21)]; }), 1800);

  /* ---- enerji ---- */
  let son = { e:null, a:null, anahtar:'' };
  function renk(p) { return p > .5 ? '#6bcb77' : p > .2 ? '#ffd166' : '#ff6b6b'; }
  function degerler() {
    let e = window.genelEnerjiKalan, m = window.genelEnerjiMax;
    let a = (typeof yo !== 'undefined' && yo) ? (yo.altin || 0) : 0;
    let p = (e !== undefined && m) ? Math.max(0, Math.min(1, e / m)) : 0;
    return { e, m, a, p };
  }
  function enerjiHtml(d) {
    return `<div class="yb-en" style="--ew:${renk(d.p)}; --dol:${Math.round(d.p * 100)}%"><div class="su"></div><span class="bolt">⚡</span><span class="sayi">${d.e !== undefined ? d.e : '--'}/${d.m || '--'}</span></div><span class="yb-altin"><i>🪙</i>${d.a}</span>`;
  }
  function degisim(fark, ikon) {
    let fw = $('ybEnerji'), up = fark > 0;
    fw.classList.remove('artti', 'azaldi'); void fw.offsetWidth; fw.classList.add(up ? 'artti' : 'azaldi', 'parla');
    setTimeout(() => fw.classList.remove('parla'), 1500);
    let u = document.createElement('span'); u.className = 'yb-ucan'; u.style.color = up ? '#16a34a' : '#dc2626';
    u.innerText = (up ? '+' : '') + fark + ' ' + ikon; fw.appendChild(u); setTimeout(() => u.remove(), 1150);
  }
  function enerjiGuncelle() {
    let d = degerler();
    if (d.e !== undefined && son.e !== null && d.e !== son.e) degisim(d.e - son.e, '⚡');
    if (son.a !== null && d.a !== son.a) degisim(d.a - son.a, '🪙');
    if (d.e !== undefined) son.e = d.e;
    son.a = d.a;
    let anahtar = [d.e, d.m, d.a].join('|');
    if (anahtar === son.anahtar) return;
    son.anahtar = anahtar;
    $('ybEnerjiIc').innerHTML = enerjiHtml(d);
    $('ybEnerji').classList.toggle('dusuk', d.p <= .2);
    if ($('ybPerde').dataset.tur === 'enerji') enerjiKarti(true);
  }

  /* ---- kart ekranı ---- */
  function kartlarAc(tur) {
    let liste = tur === 'oyun' ? OYUNLAR : (aracGuncelle(), ARACLAR);
    let p = $('ybPerde'); p.dataset.tur = tur;
    $('ybPerdeIc').innerHTML = `<div class="yb-baslik">${tur === 'oyun' ? 'Ne oynamak istersin?' : 'Araçların'}</div>
      <div class="yb-kartlar">${liste.map((x, i) => `<button class="yb-kart" style="--gec:${i * 0.08}s" data-i="${i}"><span class="buyuk">${x.html}</span><span><span class="ad">${x.ad}</span><span class="alt">${x.alt}</span></span></button>`).join('')}</div>
      <button class="yb-kapat">Kapat</button>`;
    $('ybPerdeIc').querySelectorAll('.yb-kart').forEach(b => b.onclick = e => {
      e.stopPropagation(); perdeKapat();
      try { liste[Number(b.dataset.i)].ac(); } catch (er) {}
    });
    $('ybPerdeIc').querySelector('.yb-kapat').onclick = perdeKapat;
    p.classList.add('acik');
    setTimeout(() => { let k = $('ybPerdeIc').querySelector('.yb-kart'); if (k) k.focus({ preventScroll:true }); }, 300);
  }
  function enerjiKarti(guncelle) {
    let d = degerler(), r = renk(d.p);
    $('ybPerdeIc').innerHTML = `<div class="yb-en-kart"${guncelle ? ' style="animation:none"' : ''}>
        <div class="ust"><div class="gosterge"><div class="yb-ic">${enerjiHtml(d)}</div></div>
        <div><h3>⚡ Enerjin</h3><div class="buyuk-sayi" style="color:${r === '#ffd166' ? '#b7791f' : r}">${d.e !== undefined ? d.e : '--'} / ${d.m || '--'}</div></div></div>
        <div class="bar"><i style="width:${Math.round(d.p * 100)}%; background:${r}"></i></div>
        <div class="not">Her 15 dakikada +1 enerji dolar (en fazla ${d.m || 30}). Günlük hediye ve mağazadaki paketlerle de enerji alabilirsin.</div>
        <div class="altin-satir"><span>🪙 Altının</span><span>${d.a}</span></div>
        <div class="not">Altını ders, oyun ve görevleri tamamlayarak kazanırsın.</div>
        <p class="not" role="status" data-energy-limit></p>
        <button class="btn" id="ybMagazaBtn">🛍️ Mağazaya git</button></div>
      <button class="yb-kapat">Kapat</button>`;
    void window.DijiMeduPapiFeedback?.energyLimit($('ybPerdeIc').querySelector('[data-energy-limit]'));
    $('ybMagazaBtn').onclick = () => { perdeKapat(); if (typeof meduAkisAc === 'function') { maSekme = 'magaza'; meduAkisAc(); } };
    $('ybPerdeIc').querySelector('.yb-kapat').onclick = perdeKapat;
  }
  function perdeKapat() { let p = $('ybPerde'); p.classList.remove('acik'); p.dataset.tur = ''; }
  $('ybPerde').addEventListener('click', e => { if (e.target === $('ybPerde')) perdeKapat(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') perdeKapat(); });

  /* ---- sürükleme + kenara yapışma ---- */
  const VARSAYILAN = { ybOyun:0.34, ybEnerji:0.50, ybArac:0.66 };
  function boyut(fw) { return fw.offsetWidth || 52; }
  function yerlestir(fw, x, y, kaydet) {
    let b = boyut(fw), ust = 70, alt = innerHeight - b - 96;
    y = Math.max(ust, Math.min(alt, y));
    let solda = x + b / 2 < innerWidth / 2;
    x = solda ? 8 : innerWidth - b - 8;
    fw.style.left = x + 'px'; fw.style.top = y + 'px';
    fw.classList.toggle('solda', solda);
    if (kaydet) { try { localStorage.setItem('ing_yb_' + fw.id, JSON.stringify({ solda, oran: y / innerHeight })); } catch (e) {} }
  }
  function konumYukle(id) {
    let fw = $(id), k = null;
    try { k = JSON.parse(localStorage.getItem('ing_yb_' + id) || 'null'); } catch (e) {}
    let b = boyut(fw);
    let x = k && k.solda ? 0 : innerWidth, y = (k ? k.oran : VARSAYILAN[id]) * innerHeight - b / 2;
    yerlestir(fw, x, y, false);
  }
  function surukle(fw, tiklaninca) {
    let bas = null;
    fw.addEventListener('pointerdown', e => { bas = { x:e.clientX, y:e.clientY, l:fw.offsetLeft, t:fw.offsetTop, oynadi:false }; try { fw.setPointerCapture(e.pointerId); } catch (er) {} });
    fw.addEventListener('pointermove', e => {
      if (!bas) return;
      let dx = e.clientX - bas.x, dy = e.clientY - bas.y;
      if (!bas.oynadi && Math.hypot(dx, dy) > 6) { bas.oynadi = true; fw.classList.add('suruklen'); }
      if (bas.oynadi) { fw.style.left = (bas.l + dx) + 'px'; fw.style.top = (bas.t + dy) + 'px'; }
    });
    let bitir = e => {
      if (!bas) return;
      let b = bas; bas = null;
      if (b.oynadi) { fw.classList.remove('suruklen'); yerlestir(fw, fw.offsetLeft, fw.offsetTop, true); }
      else if (e.type === 'pointerup') tiklaninca();
    };
    fw.addEventListener('pointerup', bitir);
    fw.addEventListener('pointercancel', bitir);
    fw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tiklaninca(); } });
  }
  surukle($('ybOyun'), () => kartlarAc('oyun'));
  window.dijiAracPaneliAc = () => kartlarAc('arac');
  surukle($('ybArac'), window.dijiAracPaneliAc);
  window.dijiEnerjiPaneliAc = () => { $('ybPerde').dataset.tur = 'enerji'; enerjiKarti(false); $('ybPerde').classList.add('acik'); };
  surukle($('ybEnerji'), window.dijiEnerjiPaneliAc);
  function tumKonumlar() { ['ybOyun', 'ybEnerji', 'ybArac'].forEach(konumYukle); }
  addEventListener('resize', tumKonumlar);

  /* ---- oyun sırasında sadece enerji kalsın ---- */
  function oyundaMi() {
    let secici = ['.game-modal-overlay', '.seviye-harita-overlay', '.kart-oyun-overlay', '.pomodoro-overlay', '#genelSonucOverlay', '#yoModal', '.rubric-modal', '.duy3-overlay', '.yardim-modal-overlay', '.ba-levelup-overlay', '#aiChatModal'];
    for (let s of secici) for (let el of document.querySelectorAll(s)) if (el.getClientRects().length&&getComputedStyle(el).display !== 'none'&&getComputedStyle(el).visibility!=='hidden') return true;
    let ba = $('tab-buyuakademisi'), bo = $('baOyunEkrani');
    if (ba && ba.classList.contains('active') && bo && bo.style.display !== 'none') return true;
    let kp = $('tab-konusmapratigi'), ko = $('kpKelimeOyunEkrani');
    if (kp && kp.classList.contains('active') && ko && ko.style.display !== 'none') return true;
    return false;
  }
  let konumlandi = false;
  setInterval(() => {
    let panel = $('panel-alani');
    let girisli = !!(panel && panel.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== 'teacher');
    let oyunda = girisli && oyundaMi();
    $('ybEnerji').classList.toggle('gor', girisli);
    $('ybOyun').classList.toggle('gor', girisli && !oyunda);
    $('ybArac').classList.toggle('gor', girisli && !oyunda);
    if (girisli && !konumlandi) { konumlandi = true; tumKonumlar(); }
    if (typeof navAktifGuncelle === 'function') navAktifGuncelle();
    let lb = $('yoLigBtn');
    if (lb && !lb._ma) { lb._ma = true; lb.onclick = () => { if (typeof meduAkisAc === 'function') { maSekme = 'lig'; meduAkisAc(); } }; }
    let ym = $('yoModal'), ma = $('tab-meduakis');
    if (ma && ma.classList.contains('active') && typeof maSekme !== 'undefined' && maSekme === 'magaza' && $('maGomuluAlan') && ym && !ym.classList.contains('acik')) window.yoGomuluHedef = 'maGomuluAlan';
    if (girisli) enerjiGuncelle();
  }, 500);
})();
