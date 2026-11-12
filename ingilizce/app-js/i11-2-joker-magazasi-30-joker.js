
(function () {
  const $ = id => document.getElementById(id);
  const gor = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const aktif = id => $(id) && $(id).classList.contains('active');

  // The account-selected route is changed only from profile settings.

  /* ================= 2) JOKER MAĞAZASI (30 joker) ================= */
  const KAD = { 1: ['Sıradan', '#8b9bb4', '#f8fafc'], 2: ['Nadir', '#4d96ff', '#eff6ff'], 3: ['Efsane', '#a06bff', '#f5f0ff'] };
  const J = [
    ['sihirli-makas', '✂️', 'Sihirli Makas', 'yari', 1, 10, 'Yanlış şıkların yarısını keser.'],
    ['cift-makas', '✂️✂️', 'İkiz Makas', 'yari', 2, 18, 'Yarıya indirme hakkı ×2.'],
    ['makas-firtinasi', '🌪️', 'Makas Fırtınası', 'yari', 3, 25, 'Yarıya indirme hakkı ×3.'],
    ['ikinci-sans', '🔁', 'İkinci Şans', 'ikinci', 1, 12, 'Yanlış cevaptan sonra bir hak daha.'],
    ['yanki-tilsim', '🪞', 'Yankı Tılsımı', 'ikinci', 2, 22, 'İkinci şans ×2.'],
    ['altin-yildiz', '⭐', 'Altın Yıldız', 'cift', 1, 14, 'Sıradaki doğru cevap çift puan.'],
    ['yildiz-yagmuru', '🌟', 'Yıldız Yağmuru', 'cift', 2, 26, 'Çift puan ×2.'],
    ['ucan-halı', '🧞', 'Uçan Halı', 'pas', 1, 10, 'Soruyu cezasız atla, yeni soru gelsin.'],
    ['roket-pas', '🚀', 'Roket Pas', 'pas', 2, 18, 'Pas hakkı ×2.'],
    ['isinlanma', '🌀', 'Işınlanma Kapısı', 'pas', 3, 25, 'Pas hakkı ×3.'],
    ['kristal-kalkan', '🛡️', 'Kristal Kalkan', 'kalkan', 1, 12, 'Bir yanlışın cezasını engeller.'],
    ['ejder-pulu', '🐉', 'Ejder Pulu Kalkanı', 'kalkan', 2, 22, 'Kalkan ×2.'],
    ['titan-kalkan', '🏰', 'Titan Kalesi', 'kalkan', 3, 30, 'Kalkan ×3.'],
    ['harf-fener', '🔦', 'Harf Feneri', 'harf', 1, 10, 'Gizli kelimenin bir harfini açar.'],
    ['harf-kandili', '🪔', 'Sihirli Kandil', 'harf', 2, 18, 'Harf ipucu ×2.'],
    ['alfabe-anahtar', '🗝️', 'Alfabe Anahtarı', 'harf', 3, 25, 'Harf ipucu ×3.'],
    ['papagan-fisiltisi', '🦜', 'Papağan Fısıltısı', 'papagan', 1, 12, 'Papağan cevabı fısıldar.'],
    ['papagan-korosu', '🎶', 'Papağan Korosu', 'papagan', 2, 22, 'Papağan yardımı ×2.'],
    ['kalp-iksiri', '❤️‍🩹', 'Kalp İksiri', 'can', 1, 14, 'Kaybedilen bir canı geri verir.'],
    ['anka-tuyu', '🪶', 'Anka Tüyü', 'can', 2, 26, 'Can iksiri ×2.'],
    ['baykus-gozu', '🦉', 'Baykuş Gözü', 'bakis', 1, 12, 'Hafıza kartlarına kısa bir göz atış.'],
    ['kartal-bakisi', '👁️', 'Kartal Bakışı', 'bakis', 2, 22, 'Göz atış ×2.'],
    ['buz-kristali', '❄️', 'Buz Kristali', 'dondur', 1, 12, 'Süreyi / yağmuru kısa süre dondurur.'],
    ['zaman-kum-saati', '⏳', 'Zaman Kum Saati', 'dondur', 2, 22, 'Dondurma ×2.'],
    ['xp-tilsimi', '📜', 'XP Tılsımı', 'm_xp', 2, 20, 'Sıradaki oyunda XP ×2.'],
    ['buyuk-xp', '📚', 'Bilgelik Kitabı', 'm_xp3', 3, 30, 'Sıradaki 3 oyunda XP ×2.'],
    ['altin-miknatis', '🧲', 'Altın Mıknatısı', 'm_altin', 2, 20, 'Sıradaki oyunda altın ×2.'],
    ['bedava-bilet', '🎟️', 'Bedava Bilet', 'm_bilet', 3, 30, 'Sıradaki oyun girişi enerji harcamaz.'],
    ['seri-kalkani', '🧊', 'Seri Kalkanı', 'm_seri', 1, 150, 'Haftada 1 kalkan ücretsiz; fazlası için bu kalkan serini korur.'],
    ['sans-yoncasi', '🍀', 'Şans Yoncası', 'm_kombo', 2, 16, "Sıradaki oyunda 4'lü kombo altını ×2."]
  ].map(x => ({ id: x[0], e: x[1], ad: x[2], tur: x[3], kad: x[4], f: x[5], ac: x[6], adet: x[3].startsWith('m_') ? 1 : x[4] }));
  window.JOKER_MAGAZA = J;
  const TUR_AD = { yari: 'Yarıya indir', ikinci: 'İkinci şans', cift: 'Çift puan', pas: 'Pas', kalkan: 'Kalkan', harf: 'Harf', papagan: 'Papağan', can: 'Can', bakis: 'Bakış', dondur: 'Dondur' };
  function env() { if (!yoVar()) return {}; yo.jokerEnv = yo.jokerEnv || {}; return yo.jokerEnv; }
  function satinAl(j, sonra) {
    if (!yoVar()) return;
    if ((yo.altin || 0) < j.f) { if (typeof yoToast === 'function') yoToast(`${j.ad} için ${j.f - (yo.altin || 0)} altın daha lazım 🪙`); return; }
    /* [v4.8] satın alma sunucuda */
    window.dmEkonomi.islem('jokerAl', { id: j.id }).then(d => {
      if (!d.ok) { if (typeof yoToast === 'function') yoToast(d.mesaj || 'Satın alma tamamlanamadı.'); return; }
      if (typeof yoToast === 'function') yoToast(`${j.e} ${j.ad} çantana eklendi!`);
      if (typeof yoSes === 'function') yoSes('dogru');
      if (sonra) sonra();
    });
  }
  let jmFiltre = 'hepsi', jmAcik = false;
  function magazaHtml(sadeceTurler) {
    let E = env(), liste = J.filter(j => !sadeceTurler || sadeceTurler.includes(j.tur));
    if (!sadeceTurler && jmFiltre !== 'hepsi') liste = liste.filter(j => jmFiltre === 'meta' ? j.tur.startsWith('m_') : !j.tur.startsWith('m_'));
    let canta = Object.keys(TUR_AD).filter(t => E[t]).map(t => `${TUR_AD[t]} ×${E[t]}`).concat(E.m_xp ? [`XP ×2: ${E.m_xp} oyun`] : [], E.m_altin ? [`Altın ×2: ${E.m_altin} oyun`] : [], E.m_bilet ? [`Bedava bilet ×${E.m_bilet}`] : [], E.m_kombo ? [`Şans yoncası ×${E.m_kombo}`] : []).join(' · ');
    return `<div class="jm-kutu"><h3>🃏 Joker Dükkânı</h3><p>Jokerleri altınla al, oyunlarda kullan. Her oyunda her jokerin 1 bedava hakkı var, satın aldıkların bunun üstüne ekstra hak verir.<br>🎒 Çantan: <b>${canta || 'boş'}</b> · 🪙 ${yoVar() ? yo.altin || 0 : 0}</p>
      ${sadeceTurler ? '' : `<div class="jm-filtre">${[['hepsi', 'Hepsi'], ['oyun', '🎮 Oyun jokerleri'], ['meta', '✨ Güçlendiriciler']].map(([k, t]) => `<button class="${jmFiltre === k ? 'aktif' : ''}" data-f="${k}">${t}</button>`).join('')}</div>`}
      <div class="jm-izgara">${liste.map((j, i) => { let K = KAD[j.kad], sahip = j.tur.startsWith('m_') ? (j.tur === 'm_seri' ? (yoVar() ? yo.dondurucu || 0 : 0) : E[j.tur === 'm_xp3' ? 'm_xp' : j.tur] || 0) : E[j.tur] || 0;
        return `<div class="jm-kart" style="--z:${K[2]};--k:${K[1]};--g:${(i % 5) * .4}s">${sahip ? `<span class="sahip">×${sahip}</span>` : ''}<span class="e">${j.e}</span><span class="kademe">${K[0]}</span><b>${j.ad}</b><small>${j.ac}</small><button class="jm-al" data-id="${j.id}" ${yoVar() && (yo.altin || 0) >= j.f ? '' : 'disabled'}>🪙 ${j.f}</button></div>`; }).join('')}</div></div>`;
  }
  function bagla(el, yenile, turler) {
    el.querySelectorAll('.jm-filtre button').forEach(b => b.onclick = () => { jmFiltre = b.dataset.f; yenile(); });
    el.querySelectorAll('.jm-al').forEach(b => b.onclick = () => satinAl(J.find(j => j.id === b.dataset.id), yenile));
  }
  function jmCiz() {
    let kap = document.querySelector('#tab-magaza .mg-kap'); if (!kap) return;
    let al = $('jmAlan'); if (!al) { al = document.createElement('div'); al.id = 'jmAlan'; kap.appendChild(al); }
    al.innerHTML = magazaHtml(); bagla(al, jmCiz);
  }
  setInterval(() => {
    let bar = $('bcMgBar'); if (!bar) return;
    bar.classList.add('jk4');
    if (!bar.querySelector('[data-jm]')) {
      let b = document.createElement('button'); b.dataset.jm = '1'; b.innerText = '🃏 Jokerler';
      b.onclick = () => { if(!window.dmProgression?.require('joker_magaza'))return; jmAcik = true; bar.querySelectorAll('button').forEach(x => x.classList.toggle('aktif', x === b)); ['magazaAlan', 'bcMgAlan'].forEach(id => { if ($(id)) $(id).style.display = 'none'; }); jmCiz(); $('jmAlan').style.display = ''; };
      bar.appendChild(b);
      bar.querySelectorAll('button:not([data-jm])').forEach(x => x.addEventListener('click', () => { jmAcik = false; if ($('jmAlan')) $('jmAlan').style.display = 'none'; }));
      if (jmAcik) b.click();
    }
  }, 500);

  /* Oyun içinde: jokerlere ekstra hak + oyundan joker satın alma */
  let orgJk = window.jokerKullan;
  if (typeof orgJk === 'function') window.jokerKullan = function (j) {
    let E = env();
    if (typeof jk !== 'undefined' && jk.kullanilan && jk.kullanilan.has(j) && (E[j] || 0) > 0) {
      E[j]--; jk.kullanilan.delete(j); yoKaydet();
      if (typeof yoToast === 'function') yoToast(`🎒 Çantandan ${TUR_AD[j] || j} jokeri kullanıldı (kalan ${E[j]})`);
    }
    return orgJk.apply(this, arguments);
  };
  let orgBar = window.jokerBarCiz;
  if (typeof orgBar === 'function') window.jokerBarCiz = function () {
    let r = orgBar.apply(this, arguments);
    let bar = $('jkBar'); if (!bar) return r;
    let E = env(), turler = [];
    bar.querySelectorAll('[onclick*="jokerKullan"]').forEach(b => {
      let m = (b.getAttribute('onclick') || '').match(/jokerKullan\('(\w+)'\)/); if (!m) return;
      turler.push(m[1]);
      if (E[m[1]] && !b.querySelector('.jm-rozet')) b.insertAdjacentHTML('beforeend', `<span class="jm-rozet">+${E[m[1]]}</span>`);
    });
    if (turler.length && !bar.querySelector('.jm-oyun-al')) {
      let a = document.createElement('button'); a.className = 'jm-oyun-al'; a.type = 'button'; a.innerText = '🛒 Joker al';
      a.onclick = () => oyunIciMagaza(turler);
      bar.appendChild(a);
    }
    return r;
  };
  function oyunIciMagaza(turler) {
    if(!window.dmProgression?.require("joker_magaza"))return;
    let p = document.createElement('div'); p.className = 'jm-perde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Joker dükkânı');
    let ciz = () => { p.innerHTML = magazaHtml(turler) + ''; let k = p.querySelector('.jm-kutu'); k.insertAdjacentHTML('beforeend', '<button class="jm-al" style="width:100%;margin-top:12px;background:#f1e9ff;color:#7c3aed;box-shadow:none" id="jmKapat">Oyuna dön</button>'); bagla(p, () => { ciz(); if (typeof jokerBarCiz === 'function') jokerBarCiz(); }); p.querySelector('#jmKapat').onclick = () => p.remove(); };
    ciz(); document.body.appendChild(p);
    p.addEventListener('click', e => { if (e.target === p) p.remove(); });
  }

  /* Güçlendiriciler: XP ×2, altın ×2, bedava bilet, şans yoncası */
  let oyundaydi = false, buOyunXp = false, buOyunAltin = false, buOyunKombo = false;
  setInterval(() => {
    if(!yoVar())return;
    let simdi = typeof odulOyunda === 'function' && odulOyunda();
    let E = env();
    if (simdi && !oyundaydi && DijiProgressRules.progress(DijiProgressRules.migrate(yo)).level >= 15) {
      buOyunXp = (E.m_xp || 0) > 0; if (buOyunXp) { E.m_xp--; yoKaydet(); if (typeof yoToast === 'function') yoToast('📜 XP Tılsımı aktif: bu oyunda XP ×2!'); }
      buOyunAltin = (E.m_altin || 0) > 0; if (buOyunAltin) { E.m_altin--; yoKaydet(); if (typeof yoToast === 'function') setTimeout(() => yoToast('🧲 Altın Mıknatısı aktif: bu oyunda altın ×2!'), 1500); }
      buOyunKombo = (E.m_kombo || 0) > 0; if (buOyunKombo) { E.m_kombo--; yoKaydet(); }
    }
    if (!simdi && oyundaydi) { buOyunXp = buOyunAltin = buOyunKombo = false; }
    oyundaydi = simdi;
  }, 700);
  window.dmGameBonusFlags = () => ({ xpBoost: buOyunXp, goldBoost: buOyunAltin, comboBoost: buOyunKombo });





  /* ================= 3) RUBRİK RAPORU → VELİ E-POSTASI ================= */
  async function mailGonder(telefon, metin) {
    let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'raporMail', telefon, metin }) });
    return r.json();
  }
  function bildir(m, renk) {
    let s = $('rubricMailSonuc');
    let btn = $('rubricKaydetBtn');
    if (!s && btn) { s = document.createElement('div'); s.id = 'rubricMailSonuc'; s.style.cssText = 'font-size:12px;font-weight:800;margin-top:6px;text-align:center'; btn.insertAdjacentElement('afterend', s); }
    if (s) { s.style.color = renk; s.innerText = m; }
  }
  let orgRubrik = window.rubrikVerileriniKaydetVeWhatsappGonder;
  if (typeof orgRubrik === 'function') window.rubrikVerileriniKaydetVeWhatsappGonder = function () {
    let orgOpen = window.open, yakalandi = false;
    window.open = function (url) {
      let u = String(url || '');
      if (/wa\.me|whatsapp/i.test(u)) {
        yakalandi = true;
        let tel = (u.match(/wa\.me\/(\d+)/) || u.match(/phone=(\d+)/) || [])[1] || '';
        let metin = ''; try { metin = new URL(u, location.href).searchParams.get('text') || ''; } catch (e) {}
        bildir('📧 Rapor veliye e-postayla gönderiliyor...', '#7c3aed');
        mailGonder(tel, metin).then(d => {
          if (d && d.ok) bildir(`✅ Rapor ${d.ogrenci} velisine e-postayla gönderildi (${d.email}).`, '#16a34a');
          else { bildir(`⚠️ ${d && d.mesaj ? d.mesaj : 'E-posta gönderilemedi'} · WhatsApp açılıyor.`, '#dc2626'); orgOpen.call(window, url, '_blank'); }
        }).catch(() => { bildir('⚠️ E-posta gönderilemedi · WhatsApp açılıyor.', '#dc2626'); orgOpen.call(window, url, '_blank'); });
        return null;
      }
      return orgOpen.apply(window, arguments);
    };
    let r;
    try { r = orgRubrik.apply(this, arguments); } finally { setTimeout(() => { window.open = orgOpen; }, 15000); }
    return r;
  };
  setInterval(() => { let b = $('rubricKaydetBtn'); if (b && !b.dataset.mail) { b.dataset.mail = '1'; b.innerText = '💾 Kaydet & Uzun Veli Raporunu E-postayla Gönder'; } }, 1500);
})();
