/* Ders Çalış testi: çoktan seçmeli, boşluk doldurma, cümle kurma ve doğru/yanlış soruları.
   Eski biçimdeki sorular ({soru, secenekler, dogru}) çoktan seçmeli olarak gösterilir.
   Şıklar her açılışta karıştırılır. Cevap kontrolü ve "yanlışta test baştan başlar" kuralı
   eski dcQuizCevapVer fonksiyonunda kalır; bu dosya sadece soruları çizer. */
(function () {
  'use strict';
  const kac = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const karistir = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();

  /* Soruyu tek biçime getir: tip, karıştırılmış şıklar ve yeni doğru sırası */
  function hazirla(q) {
    const tip = ['secim', 'bosluk', 'siralama', 'dogruyanlis'].includes(q && q.tip) ? q.tip : 'secim';
    if (tip === 'siralama') {
      const parca = (Array.isArray(q.parcalar) ? q.parcalar : []).map(String).filter(Boolean);
      let dizi = karistir(parca.map((p, i) => ({ p, i })));
      if (dizi.length > 1 && dizi.every((x, k) => x.i === k)) dizi.push(dizi.shift());
      return { tip, soru: q.soru || 'Kelimeleri sırala, cümleyi kur.', tr: q.tr || '', parca, dizi, cevap: q.cevap || parca.join(' '), aciklama: q.aciklama || '' };
    }
    if (tip === 'dogruyanlis') {
      return { tip, soru: q.soru || '', secenekler: ['Doğru', 'Yanlış'], dogru: q.dogru === false || q.dogru === 'false' ? 1 : 0, aciklama: q.aciklama || '' };
    }
    const sec = Array.isArray(q.secenekler) ? q.secenekler.map(String) : [];
    const dogruMetin = sec[Number(q.dogru)];
    const karisik = karistir(sec);
    return { tip, soru: q.soru || '', tr: q.tr || '', secenekler: karisik, dogru: Math.max(0, karisik.indexOf(dogruMetin)), aciklama: q.aciklama || '' };
  }

  function soruHtml(h, qi) {
    let govde = '';
    if (h.tip === 'bosluk') {
      const [once, sonra] = String(h.soru).split('___');
      govde = `<div class="dt-cumle">${kac(once)}<span class="dt-bosluk" id="dtBosluk${qi}">&nbsp;</span>${kac(sonra || '')}</div>` +
        (h.tr ? `<div class="dt-tr">${kac(h.tr)}</div>` : '') +
        `<div class="dt-cipler">${h.secenekler.map((s, si) => `<button type="button" class="dc-quiz-opt dt-cip" id="dcQOpt${qi}_${si}" data-q="${qi}" data-s="${si}">${kac(s)}</button>`).join('')}</div>`;
    } else if (h.tip === 'siralama') {
      govde = (h.tr ? `<div class="dt-tr">${kac(h.tr)}</div>` : '') +
        `<div class="dt-cevap" id="dcQOpt${qi}_0" aria-live="polite"><span class="dt-ipucu">Kelimelere sırayla dokun</span></div>` +
        `<span id="dcQOpt${qi}_1" hidden></span>` +
        `<div class="dt-cipler">${h.dizi.map(x => `<button type="button" class="dc-quiz-opt dt-cip dt-kelime" data-q="${qi}" data-i="${x.i}">${kac(x.p)}</button>`).join('')}</div>`;
    } else {
      const sinif = h.tip === 'dogruyanlis' ? ' dt-dy' : '';
      govde = `<div class="dt-secenekler${sinif}">${h.secenekler.map((s, si) => `<button type="button" class="dc-quiz-opt" id="dcQOpt${qi}_${si}" data-q="${qi}" data-s="${si}">${kac(s)}</button>`).join('')}</div>`;
    }
    const baslik = h.tip === 'bosluk' ? 'Boşluğu doldur' : h.tip === 'siralama' ? kac(h.soru) : h.tip === 'dogruyanlis' ? 'Doğru mu, yanlış mı?' : '';
    const metin = h.tip === 'bosluk' || h.tip === 'siralama' ? '' : `<div class="dt-soru-metni">${kac(h.soru)}</div>`;
    return `<div class="dc-quiz-q dt-q" data-tip="${h.tip}" data-q="${qi}">
      <div class="dc-quiz-q-text"><span class="dt-no">${qi + 1}</span>${baslik ? `<span class="dt-baslik">${baslik}</span>` : ''}</div>
      ${metin}${govde}<div class="dt-aciklama" id="dtAciklama${qi}" hidden></div></div>`;
  }

  function acikla(qi, dogruMu, h) {
    const el = document.getElementById('dtAciklama' + qi); if (!el) return;
    let ek = '';
    if (!dogruMu) ek = h.tip === 'siralama' ? `Doğrusu: <b>${kac(h.cevap)}</b>. ` : h.tip === 'bosluk' || h.tip === 'secim' ? `Doğrusu: <b>${kac(h.secenekler[h.dogru])}</b>. ` : '';
    el.innerHTML = ek + kac(h.aciklama || (dogruMu ? 'Harika!' : ''));
    el.classList.toggle('dt-yanlis', !dogruMu);
    el.hidden = !el.textContent.trim();
  }

  function cevapla(qi, si, h) {
    if (typeof dcQuizCevaplari !== 'undefined' && dcQuizCevaplari[qi] !== -1) return;
    if (h.tip === 'bosluk') { const b = document.getElementById('dtBosluk' + qi); if (b) { b.textContent = h.secenekler[si]; b.classList.add(si === h.dogru ? 'dogru' : 'yanlis'); } }
    acikla(qi, si === h.dogru, h);
    window.dcQuizCevapVer(qi, si, h.dogru);
  }

  function siralamaBagla(kart, qi, h) {
    const kutu = document.getElementById('dcQOpt' + qi + '_0');
    const secilen = [];
    const ciz = () => {
      kutu.innerHTML = secilen.length ? secilen.map((x, k) => `<button type="button" class="dt-cip dt-yerlesen" data-k="${k}">${kac(x.p)}</button>`).join('') : '<span class="dt-ipucu">Kelimelere sırayla dokun</span>';
      kutu.querySelectorAll('.dt-yerlesen').forEach(b => b.onclick = () => {
        if (dcQuizCevaplari[qi] !== -1) return;
        const [x] = secilen.splice(Number(b.dataset.k), 1);
        kart.querySelector(`.dt-kelime[data-i="${x.i}"]`).hidden = false; ciz();
      });
    };
    kart.querySelectorAll('.dt-kelime').forEach(b => b.onclick = () => {
      if (dcQuizCevaplari[qi] !== -1) return;
      secilen.push({ p: b.textContent, i: Number(b.dataset.i) }); b.hidden = true; ciz();
      if (secilen.length === h.parca.length) {
        const dogruMu = norm(secilen.map(x => x.p).join(' ')) === norm(h.parca.join(' '));
        acikla(qi, dogruMu, h);
        window.dcQuizCevapVer(qi, dogruMu ? 0 : 1, 0);
        if (!dogruMu) { kutu.classList.remove('dogru'); kutu.classList.add('yanlis'); }
      }
    });
  }

  function dcTestCizYeni(sorular, accent) {
    sorular = Array.isArray(sorular) ? sorular : [];
    dcAktifTestSorulari = sorular;
    dcAktifTestAccent = accent;
    const alan = document.getElementById('dcTestIcerik');
    dcQuizCevaplari = new Array(sorular.length).fill(-1);
    dcQuizDogruSayisi = 0;
    if (!alan) return;
    if (!sorular.length) { alan.innerHTML = '<div class="dc-content-card"><h3>Test</h3><p>Test soruları yakında eklenecek.</p></div>'; return; }
    const hazir = sorular.map(hazirla);
    alan.innerHTML = hazir.map(soruHtml).join('') + `<button class="dc-quiz-bitir-btn" type="button">🏆 Testi Bitir</button>`;
    alan.querySelector('.dc-quiz-bitir-btn').onclick = () => dcTestiBitir(sorular.length);
    hazir.forEach((h, qi) => {
      const kart = alan.querySelector(`.dt-q[data-q="${qi}"]`);
      if (h.tip === 'siralama') siralamaBagla(kart, qi, h);
      else kart.querySelectorAll('button[data-s]').forEach(b => b.onclick = () => cevapla(qi, Number(b.dataset.s), h));
    });
  }

  window.dcTestCiz = dcTestCizYeni;
  window.dcTestCizYeni = dcTestCizYeni;
})();
