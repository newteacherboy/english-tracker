/* Independent progress, achievements and wardrobe screens. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const kac = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yo === 'object';
  const ogrenci = () => typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && String(aktifOgrenciAdi).toLowerCase() !== 'teacher';
  const izin = kod => !window.dmProgression || window.dmProgression.allowed(kod);

  const panels={istatistik:{id:'tab-ilerlemem',title:'İlerlemem',content:'<div id="bdIstat"></div><div id="bdGelisim"></div>'},rozetler:{id:'tab-basarilarim',title:'Başarılarım',content:'<div id="bdRozet"></div>'},karakter:{id:'tab-dolabim',title:'Dolabım',content:'<div id="bdKarakterUst"></div><div id="bdKarakterAlan"></div><div id="bdKoleksiyon"></div>'}};
  let sekme='', aralik='hafta', istat=null, istatZaman=0, istatYukleniyor=false;
  let rozetKisi='', istatDeneme=0, yenileT=null, rozetSirasi=[], kutlama=null;
  const activePanel=()=>document.getElementById(panels[sekme]?.id);
  function ensurePanel(key){
    const config=panels[key];let el=$(config.id);if(el)return el;
    el=document.createElement('section');el.id=config.id;el.className='dc-fullscreen-overlay dm-profile-section';el.setAttribute('aria-label',config.title);
    el.innerHTML='<div class="dm-profile-content"><header class="dm-profile-heading"><button type="button" class="dm-profile-back" aria-label="Profile dön">‹ Profil</button><h1>'+config.title+'</h1></header>'+config.content+'</div>';
    el.querySelector('button').onclick=()=>{if(window.dmProfileMenuGeriDon)window.dmProfileMenuGeriDon();else{window.dcTumTamEkranlariKapat?.();window.dmProfileMenuAc?.();}};
    document.body.appendChild(el);return el;
  }
  function openPanel(key){
    if(!ogrenci()||!panels[key])return;
    window.dcTumTamEkranlariKapat?.();sekme=key;const el=ensurePanel(key);el.classList.add('active');el.scrollTop=0;
    window.dcBottomNavSenkronize?.();
    if(key==='istatistik')istatCiz();else if(key==='rozetler')rozetCiz();else karakterCiz();
    istatGetir();
  }
  window.dmIlerlememAc=()=>openPanel('istatistik');
  window.dmBasarilarimAc=()=>openPanel('rozetler');
  window.dmDolabimAc=()=>openPanel('karakter');
  /* ------------------------------------------------------------------ rozet kataloğu */
  const ROZETLER = [
    ['hos-geldin','Hoş Geldin','🦜','İlk girişinden 2 dakika sonra Diji-Medu ailesine katıl',c=>c.welcome],
    ['aktif-5','Meraklı Papi','🌱','5 dakika aktif çalış',c=>c.sure>=300],
    ['aktif-15','Odak Ustası','⏱️','15 dakika aktif çalış',c=>c.sure>=900],
    ['aktif-60','Bir Saatlik Kaşif','🧭','1 saat aktif çalış',c=>c.sure>=3600],
    ['oyun-25','Oyun Gezgini','🎮','25 oyun tamamla',c=>c.oyun>=25],
    ['dogru-50','Parlayan Zihin','💡','50 doğru cevap ver',c=>c.dogru>=50],
    ['parkur-50','Rota Efsanesi','🗺️','Parkurda 50 durak geç',c=>c.parkur>=50],
    ['seri-14','İki Haftalık Azim','💪','14 gün üst üste gir',c=>c.seri>=14],
    ['ilk-adim', 'İlk Adım', '👣', 'İlk oyununu tamamla', c => c.oyun >= 1],
    ['ilk-zafer', 'İlk Zafer', '👑', 'İlk Ders Çalış konunu bitir', c => c.ders >= 1],
    ['seri-3', '3 Gün Seri', '🔥', '3 gün üst üste gir', c => c.seri >= 3],
    ['seri-7', '7 Gün Seri', '🔥', '7 gün üst üste gir', c => c.seri >= 7],
    ['seri-30', '30 Gün Seri', '📅', '30 gün üst üste gir', c => c.seri >= 30],
    ['kelime-avcisi', 'Kelime Avcısı', '🔎', '10 oyun tamamla', c => c.oyun >= 10],
    ['kelime-ustasi', 'Kelime Ustası', '📖', '100 oyun tamamla', c => c.oyun >= 100],
    ['tam-isabet', 'Tam İsabet', '🎯', 'Bir oyunu hiç hata yapmadan bitir', c => c.mukemmel >= 1],
    ['keskin-goz', 'Keskin Göz', '👁️', 'En az 100 soruda %90 doğruluk', c => c.cevap >= 100 && c.dogruluk >= 90],
    ['ders-kurdu', 'Ders Kurdu', '🐛', '10 konu bitir', c => c.ders >= 10],
    ['konu-ustasi', 'Konu Ustası', '🎓', '50 konu bitir', c => c.ders >= 50],
    ['yildiz-toplayici', 'Yıldız Toplayıcı', '⭐', 'Konu Macerası\'nda 30 yıldız topla', c => c.yildiz >= 30],
    ['parkurcu', 'Parkurcu', '🚩', 'Parkurda 5 durak geç', c => c.parkur >= 5],
    ['kasif', 'Kaşif', '🧭', 'Parkurda 20 durak geç', c => c.parkur >= 20],
    ['sampiyon', 'Şampiyon', '🏆', 'Bir haftalık hedefe ulaş', c => c.hafta >= 1],
    ['gorev-avcisi', 'Görev Avcısı', '✅', 'Günün 3 görevini 5 gün bitir', c => c.gorev >= 5],
    ['seviye-5', 'Seviye 5', '🪽', '5. seviyeye ulaş', c => c.seviye >= 5],
    ['seviye-10', 'Seviye 10', '🪽', '10. seviyeye ulaş', c => c.seviye >= 10],
    ['seviye-20', 'Seviye 20', '💠', '20. seviyeye ulaş', c => c.seviye >= 20],
    ['koleksiyoncu', 'Koleksiyoncu', '👕', '5 karakter aç', c => c.karakter >= 5],
    ['puan-avcisi', 'Puan Avcısı', '🌟', '1.000 XP topla', c => c.xp >= 1000],
    ['puan-efsanesi', 'Puan Efsanesi', '✨', '10.000 XP topla', c => c.xp >= 10000],
    ['altin-kumbara', 'Altın Kumbara', '🐷', '1.000 altın biriktir', c => c.altin >= 1000],
    ['dinleme-ustasi', 'Dinleme Ustası', '🎧', 'Dinleme oyunlarında 5 kez %80 üstü yap', c => c.dinleme >= 5]
  ].map(([id, ad, ikon, kosul, kontrol]) => ({ id, ad, ikon, kosul, kontrol, resim: `profile-assets/rozet-${id}.${['hos-geldin','aktif-5','aktif-15','aktif-60','oyun-25','dogru-50','parkur-50','seri-14'].includes(id)?'svg':'webp'}` }));
  window.dmRozetKatalogu = ROZETLER;

  function seviyeBilgi() {
    try {
      const R = window.DijiProgressRules;
      if (R && yoVar()) return R.progress(R.migrate(yo));
    } catch (e) {}
    return { level: 1, xp: 0, start: 0, next: 100, ratio: 0 };
  }
  function toplamlar(gunler, bas) {
    const t = { oyun: 0, dogru: 0, yanlis: 0, mukemmel: 0, ders: 0, parkur: 0, aktif: 0 };
    Object.entries(gunler || {}).forEach(([g, v]) => {
      if (bas && g < bas) return;
      ['oyun','dogru','yanlis','mukemmel','ders','parkur'].forEach((k,i) => { t[k] += Number(v[['o','d','y','m','l','p'][i]]) || 0; });
      if ((Number(v.o)||0) + (Number(v.l)||0) + (Number(v.p)||0) > 0) t.aktif++;
    });
    return t;
  }
  function gorevGunleriniKaydet() {
    if (!yoVar() || !yo.gorev || !yo.gorev.alindi || !yo.gorev.t) return;
    const l = Array.isArray(yo.dmGorevGunleri) ? yo.dmGorevGunleri : [];
    if (!l.includes(yo.gorev.t)) { l.push(yo.gorev.t); yo.dmGorevGunleri = l.slice(-60); if (typeof yoKaydet === 'function') yoKaydet(); }
  }
  const badgeStatus=()=>window.dmMemberBadgeStatus?.owner===String(typeof aktifOgrenciAdi==='undefined'?'':aktifOgrenciAdi)?window.dmMemberBadgeStatus:null;
  function rozetBaglami() {
    const sv = seviyeBilgi(), tum = toplamlar(istat && istat.gunler);
    let karakter = 0;
    const kol = document.querySelector('#bdKoleksiyon .bc-kutu h3');
    const m = kol && kol.textContent.match(/(\d+)\s*\/\s*36/); if (m) karakter = Number(m[1]);
    const beceri = yoVar() && yo.beceri && Array.isArray(yo.beceri.dinleme) ? yo.beceri.dinleme : [];
    const cevap = tum.dogru + tum.yanlis;
    return {
      dogru:tum.dogru,sure:Number(window.dmActiveTime?.summary?.().seconds)||0,welcome:!!badgeStatus()?.welcomeEarned,
      oyun: tum.oyun, mukemmel: tum.mukemmel, cevap, dogruluk: cevap ? Math.round(tum.dogru * 100 / cevap) : 0,
      ders: yoVar() && Array.isArray(yo.dcOdul) ? yo.dcOdul.length : 0,
      yildiz: yoVar() && yo.dcYildiz ? Object.values(yo.dcYildiz).reduce((a, b) => a + (Number(b) || 0), 0) : 0,
      parkur: Math.max(tum.parkur, yoVar() && yo.baYildiz ? Object.keys(yo.baYildiz).length : 0),
      seri:Number(badgeStatus()?.maxLoginStreak)||0,
      hafta: yoVar() && Array.isArray(yo.rozetler) ? yo.rozetler.filter(r => /Haftalık hedef/i.test(r && r.ad || '')).length : 0,
      gorev: yoVar() && Array.isArray(yo.dmGorevGunleri) ? yo.dmGorevGunleri.length : 0,
      seviye: sv.level, xp: sv.xp, altin: yoVar() ? Number(yo.altin) || 0 : 0, karakter,
      dinleme: beceri.filter(x => Number(x) >= 80).length
    };
  }


  /* Earned badges stay earned; initialize old achievements silently, then queue new awards. */
  function rozetOturumu() {
    const kisi = ogrenci() && !window.dmGuestMode && yoVar() &&
      (typeof yoHazirMi !== 'function' || yoHazirMi()) &&
      (typeof yoIsim === 'undefined' || !yoIsim || String(yoIsim).trim().toLowerCase() === String(aktifOgrenciAdi).trim().toLowerCase())
      ? String(aktifOgrenciAdi).trim().toLowerCase() : '';
    if (kisi !== rozetKisi) {
      rozetKisi = kisi; istat = null; istatZaman = 0; istatDeneme = 0; istatYukleniyor = false;
      clearTimeout(yenileT); yenileT = null; rozetSirasi = []; kutlama?.remove(); kutlama = null;
      if (kisi) { try { rozetSirasi = JSON.parse(localStorage.getItem('bd_rozet_bekleyen:' + kisi) || '[]').filter(id => ROZETLER.some(r => r.id === id)); } catch (e) {} }
    }
    return !!kisi;
  }
  function kazanilanRozetler(c) {
    const kayit = yoVar() && yo.dmWorldBadges;
    return new Set([...(kayit?.ids || []).filter(id => ROZETLER.some(r => r.id === id) && (kayit?.version>=2 || !id.startsWith('seri-') || Number(id.slice(5))<=c.seri)), ...ROZETLER.filter(r => r.kontrol(c)).map(r => r.id)]);
  }
  function kuyrukKaydet() {
    if (!rozetKisi) return;
    try { localStorage.setItem('bd_rozet_bekleyen:' + rozetKisi, JSON.stringify(rozetSirasi)); } catch (e) {}
  }
  function rozetleriKontrolEt() {
    if (!rozetOturumu()) return;
    gorevGunleriniKaydet();
    // Wait for historical game statistics before establishing the first baseline.
    if (!istat || !badgeStatus()) return;
    const eski = yo.dmWorldBadges, sahip = kazanilanRozetler(rozetBaglami());
    const yeni = [...sahip].filter(id => !(eski?.ids || []).includes(id));
    rozetSirasi=rozetSirasi.filter(id=>sahip.has(id));
    if (!eski || eski.version!==2 || yeni.length) {
      yo.dmWorldBadges = { version: 2, ids: [...sahip] };
      if (eski || yeni.includes('hos-geldin')) {
        yeni.forEach(id => { if (!rozetSirasi.includes(id)) rozetSirasi.push(id); });
        kuyrukKaydet();
      }
      if (typeof yoKaydet === 'function') yoKaydet();
      if (activePanel()?.classList.contains('active') && sekme === 'rozetler') rozetCiz();
    }
  }
  function gorunur(el) {
    return !!el && !el.hidden && getComputedStyle(el).display !== 'none' &&
      getComputedStyle(el).visibility !== 'hidden' && !!el.getClientRects().length;
  }
  function kutlamaMesgul() {
    if (document.hidden || window.turAcikMi?.() || window.turAcik) return true;
    if (typeof odulOyunda === 'function' && odulOyunda()) return true;
    return [...document.querySelectorAll('[role="dialog"],.rubric-modal,.game-modal-overlay,.gso-overlay,.yo-modal,.hb-overlay,.bz-perde,.dv-perde,#genelSonucOverlay,#dmLevelUp,#dmGoalAnnouncement,.cog-perde,.pc-overlay,.ww-overlay')].some(gorunur);
  }
  function rozetKutla() {
    if (!rozetKisi || !istat || !badgeStatus() || kutlama || !rozetSirasi.length || kutlamaMesgul()) return;
    const r = ROZETLER.find(r => r.id === rozetSirasi[0]); if (!r) { rozetSirasi.shift(); kuyrukKaydet(); return; }
    const kisi = rozetKisi, once = document.activeElement, el = document.createElement('div');
    el.className = 'bd-kutlama'; el.id = 'bdRozetKutlama';
    el.innerHTML = `<section class="bd-kutlama-kart" role="dialog" aria-modal="true" aria-labelledby="bdRozetTebrik" aria-describedby="bdRozetAciklama">
      <button type="button" class="bd-kutlama-kapat" aria-label="Kutlamayı kapat">×</button>
      <div class="bd-kutlama-isilti" aria-hidden="true">✦ ✧ ✦ ✧</div>
      <p class="bd-kutlama-etiket">YENİ ROZET KAZANDIN</p><h2 id="bdRozetTebrik">Tebrikler, ${kac((typeof yoIsim !== 'undefined' && yoIsim) || aktifOgrenciAdi)}!</h2>
      <div class="bd-kutlama-rozet"><img src="${kac(r.resim)}" alt="${kac(r.ad)} rozeti"><span hidden aria-hidden="true">${r.ikon}</span></div>
      <h3>${kac(r.ad)}</h3><p id="bdRozetAciklama">Başardığın hedef: ${kac(r.kosul)}.</p>
      <div class="bd-kutlama-papi"><img src="papi-reward-v2.png" alt=""><p>Harikasın! Emeğin yeni bir rozetle taçlandı. Maceraya devam!</p></div>
      <small>Rozetin Profil → Başarılarım bölümüne eklendi.</small>
      <button type="button" class="bd-kutlama-devam">Harika! Devam et ✨</button>
    </section>`;
    document.body.append(el); kutlama = el;
    window.dmSharing?.attachAchievementActions(el.querySelector('section'), {kind:'badge',id:r.id,name:r.ad,src:r.resim,emoji:r.ikon});
    const resim = el.querySelector('.bd-kutlama-rozet img'); resim.onerror = () => { resim.hidden = true; resim.nextElementSibling.hidden = false; };
    const kapat = () => {
      if (kutlama !== el) return;
      el.remove(); kutlama = null;
      if (kisi === rozetKisi) { rozetSirasi.shift(); kuyrukKaydet(); }
      if (once?.isConnected) once.focus?.({ preventScroll: true });
      setTimeout(rozetKutla, 250);
    };
    el.querySelector('.bd-kutlama-kapat').onclick = kapat; el.querySelector('.bd-kutlama-devam').onclick = kapat;
    el.onkeydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); kapat(); }
      if (e.key === 'Tab') { const b = [...el.querySelectorAll('button')]; if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === b.at(-1)) { e.preventDefault(); b[0].focus(); } }
    };
    el.querySelector('.bd-kutlama-devam').focus();
  }
  // Refresh game counts after a successful save, preserving the original fetch response.
  const oncekiFetch = window.fetch;
  if (typeof oncekiFetch === 'function') window.fetch = function (url, opt) {
    const istek = oncekiFetch.apply(this, arguments);
    try {
      const b = typeof opt?.body === 'string' ? JSON.parse(opt.body) : null;
      if (typeof url === 'string' && typeof apiURL !== 'undefined' && url.split('?')[0] === apiURL.split('?')[0] &&
        b && (/LiderlikKaydet$/.test(b.islem) || ['seviyeOyunOdulu','buyuSeviyeTamamla','dersTestSonucKaydet','seviyeUrunAl'].includes(b.islem))) {
        const kisi = String(b.ogrenci || (typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '')).trim().toLowerCase();
        istek.then(async r => {
          if (!r.ok || kisi !== rozetKisi) return;
          const d = await r.clone().json();
          if (d?.ok === false || d?.hata) return;
          clearTimeout(yenileT); yenileT = setTimeout(() => { yenileT = null; if (kisi === rozetKisi) istatGetir(true); }, 1200);
        }).catch(() => {});
      }
    } catch (e) {}
    return istek;
  };
  const yerler = new Map();
  function tasi(el, hedef) {
    if (!el || !hedef || hedef.contains(el)) return;
    if (!yerler.has(el)) { const im = document.createComment('bd-yer'); el.parentNode && el.parentNode.insertBefore(im, el); yerler.set(el, im); }
    hedef.appendChild(el);
  }
  function geriKoy() {
    yerler.forEach((im, el) => { if (im.parentNode) im.parentNode.insertBefore(el, im); im.remove(); });
    yerler.clear();
    const oz = $('tab-ozet'); if (oz && !document.getElementById('profilAlan')?.contains(oz)) { oz.classList.remove('active'); oz.style.display = ''; }
    if (window.yoGomuluHedef === 'bdKarakterAlan') window.yoGomuluHedef = null;
  }

  function kilitKart(baslik, kod) {
    const sv = window.DijiProgressionCatalog && window.DijiProgressionCatalog.gates ? window.DijiProgressionCatalog.gates[kod] : null;
    return `<div class="bd-kutu bd-kilit"><h3>🔒 ${kac(baslik)}</h3><p>${sv ? sv + '. seviyede açılır.' : 'Yakında açılacak.'}</p></div>`;
  }
  async function istatGetir(zorla) {
    if (!rozetOturumu()) return;
    if (istatYukleniyor || (!zorla && Date.now() - istatDeneme < 60000)) return;
    if (typeof apiURL === 'undefined') return;
    const kisi = rozetKisi;
    istatYukleniyor = true; istatDeneme = Date.now();
    try {
      const r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'benimIstatistik', ogrenci: aktifOgrenciAdi }) });
      const d = await r.json();
      if (kisi !== rozetKisi || kisi !== String(aktifOgrenciAdi || '').trim().toLowerCase()) return;
      if (r.ok && d && d.ok) { istat = d; istatZaman = Date.now(); rozetleriKontrolEt(); }
    } catch (e) {} finally { if (kisi === rozetKisi) istatYukleniyor = false; }
    if (activePanel()?.classList.contains('active')) {
      if (sekme === 'istatistik') istatCiz();
      if (sekme === 'rozetler') rozetCiz();

    }
  }

  const gunStr = d => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  function aralikBas() {
    const bugun = new Date();
    if (aralik === 'hafta') { const d = new Date(bugun); const g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g); return gunStr(d); }
    if (aralik === 'ay') { const d = new Date(bugun); d.setDate(d.getDate() - 29); return gunStr(d); }
    return '';
  }
  function cubuklar() {
    const gunler = (istat && istat.gunler) || {}, bugun = new Date(), out = [];
    const v = g => gunler[g] || { o: 0, l: 0, p: 0 };
    if (aralik === 'hafta') {
      const d = new Date(bugun); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach((ad, i) => { const x = new Date(d); x.setDate(d.getDate() + i); const k = gunStr(x); out.push({ ad, ...v(k), gelecek: k > gunStr(bugun) }); });
    } else if (aralik === 'ay') {
      for (let i = 29; i >= 0; i--) { const x = new Date(bugun); x.setDate(x.getDate() - i); const k = gunStr(x); out.push({ ad: i % 5 === 0 ? String(x.getDate()) : '', ...v(k) }); }
    } else {
      const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      for (let i = 11; i >= 0; i--) {
        const x = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1), on = gunStr(x).slice(0, 7);
        const t = { o: 0, l: 0, p: 0 }; Object.entries(gunler).forEach(([g, y]) => { if (g.slice(0, 7) === on) { t.o += y.o; t.l += y.l; t.p += y.p; } });
        out.push({ ad: aylar[x.getMonth()], ...t });
      }
    }
    return out;
  }
  function istatCiz() {
    const alan = $('bdIstat');
    const t = toplamlar(istat && istat.gunler, aralikBas()), cevap = t.dogru + t.yanlis;
    const kartlar = [
      ['🎮', sayi(t.oyun), 'Tamamlanan oyun'],
      ['🎯', cevap ? '%' + Math.round(t.dogru * 100 / cevap) : '—', 'Doğruluk oranı'],
      ['📅', sayi(t.aktif), 'Aktif gün'],
      ['⭐', sayi(t.dogru), 'Doğru cevap']
    ];
    const c = cubuklar(), en = Math.max(1, ...c.map(x => x.o + x.l + x.p));
    alan.innerHTML = `
      <div class="bd-aralik" role="group" aria-label="Zaman aralığı">${[['hafta', 'Bu Hafta'], ['ay', 'Bu Ay'], ['tum', 'Tüm Zamanlar']].map(([k, ad]) => `<button type="button" data-aralik="${k}" aria-pressed="${k === aralik}">${ad}</button>`).join('')}</div>
      ${istat ? '' : `<p class="bd-not">${istatYukleniyor ? 'İstatistikler yükleniyor…' : 'İstatistikler şu an alınamadı. Biraz sonra tekrar dene.'}</p>`}
      <div class="bd-istat-izgara">${kartlar.map(([i, s, a]) => `<div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">${i}</span><span><b>${s}</b><small>${a}</small></span></div>`).join('')}</div>
      <section class="bd-kutu dm-karne-kart" aria-label="Karnem" style="margin-top:14px;padding:16px;border-radius:20px;background:linear-gradient(135deg,#eefbf5,#f4efff);border:1px solid #d7eae5">
        <h3 style="margin:0 0 6px;color:#173b37">📘 Karnem</h3>
        <p style="margin:0 0 12px;color:#536b69;font-size:13px">Seçili dönemdeki öğrenme sonuçların</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
          <div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">📖</span><span><b>${sayi(t.ders)}</b><small>Tamamlanan ders</small></span></div>
          <div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">🧭</span><span><b>${sayi(t.parkur)}</b><small>Parkur etkinliği</small></span></div>
          <div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">✅</span><span><b>${sayi(t.dogru)}</b><small>Doğru cevap</small></span></div>
          <div class="bd-istat"><span class="bd-istat-ikon" aria-hidden="true">🎯</span><span><b>${cevap ? '%' + Math.round(t.dogru * 100 / cevap) : '—'}</b><small>Doğruluk</small></span></div>
        </div>
      </section>
      <div class="bd-kutu bd-grafik">
        <div class="bd-grafik-bas"><h3>${aralik === 'tum' ? 'Aylık Performans' : 'Günlük Performans'}</h3>
          <div class="bd-lejant"><span class="o">Oyun</span><span class="l">Ders</span><span class="p">Parkur</span></div></div>
        <div class="bd-cubuklar${aralik === 'ay' ? ' ince' : ''}">${c.map(x => {
          const top = x.o + x.l + x.p, y = v => Math.round(v * 100 / en);
          return `<div class="bd-cubuk" title="${top} etkinlik"><div class="bd-yigin"><span class="p" style="height:${y(x.p)}%"></span><span class="l" style="height:${y(x.l)}%"></span><span class="o" style="height:${y(x.o)}%"></span></div><small>${kac(x.ad)}</small></div>`;
        }).join('')}</div>
      </div>`;
    alan.querySelectorAll('[data-aralik]').forEach(b => b.onclick = () => { aralik = b.dataset.aralik; istatCiz(); });
    /* Öğretmenin gördüğü gelişim grafikleri (deneme, gelişim, kriter) eski profilden buraya taşınır */
    const oz = $('tab-ozet');
    if (oz) {
      // The retired general-score badge section is not part of statistics.
      oz.classList.add('active'); oz.style.display = 'block'; tasi(oz, $('bdGelisim'));
      setTimeout(() => ['gelisimChartInstance', 'kriterChartInstance', 'denemeChartInstance'].forEach(n => { try { const ch = window[n] || (0, eval)(n); if (ch && ch.resize) ch.resize(); } catch (e) {} }), 80);
    }
    const tc = document.querySelector('#panel-alani > .timer-card') || document.querySelector('#bdGelisim .timer-card');
    if (tc) tasi(tc, $('bdGelisim'));
  }

  /* ------------------------------------------------------------------ Rozetler */
  function rozetHtml(r, kazanildi) {
    const resim = r.resim ? `<img src="${kac(r.resim)}" alt="" loading="lazy">` : `<span class="bd-rozet-emoji" aria-hidden="true">${r.ikon}</span>`;
    const kilit = '<span class="bd-kilit-ikon" aria-hidden="true">🔒</span>';
    return `<li class="bd-rozet${kazanildi ? '' : ' kilitli'}${r.resim ? ' resimli' : ''}" title="${kac(r.kosul)}" data-share-badge="${kac(r.id)}" ${kazanildi?'role="button" tabindex="0" aria-label="'+kac(r.ad)+' rozetini büyüt ve paylaş"':''}><span class="bd-rozet-sekil">${kazanildi ? resim : (r.resim ? resim + kilit : kilit)}</span><b>${kac(r.ad)}</b><small>${kac(r.kosul)}</small></li>`;
  }
  function rozetCiz() {
    rozetleriKontrolEt();
    const c = rozetBaglami();
    const sahip = kazanilanRozetler(c);
    const kaz = ROZETLER.filter(r => sahip.has(r.id)), kalan = ROZETLER.filter(r => !sahip.has(r.id));
    $('bdRozet').innerHTML = `
      <div class="bd-baslik-satir"><h3>Kazandığım Rozetler</h3><span>${kaz.length} rozet</span></div>
      ${kaz.length ? `<ul class="bd-rozetler">${kaz.map(r => rozetHtml(r, true)).join('')}</ul>` : '<p class="bd-not">Henüz rozetin yok. İlk oyununu bitirince ilk rozetini alacaksın!</p>'}
      <div class="bd-baslik-satir"><h3>Rozet Koleksiyonum</h3><span class="bd-kol-sayi"><span class="bd-kol-bar"><span style="width:${Math.round(kaz.length * 100 / ROZETLER.length)}%"></span></span>${kaz.length} / ${ROZETLER.length}</span></div>
      <ul class="bd-rozetler">${kalan.map(r => rozetHtml(r, false)).join('')}</ul>`;
    if (!istat) istatGetir();
  }

  /* ------------------------------------------------------------------ Karakter */
  function karakterCiz() {
    const ust = $('bdKarakterUst');
    if (!izin('magaza')) {
      ust.innerHTML = kilitKart('Karakter Atölyesi', 'magaza');
    } else {
      ust.innerHTML = '';
      window.yoGomuluHedef = 'bdKarakterAlan';
      if (typeof window.yoMagazaAc === 'function') { try { window.yoMagazaAc(); } catch (e) {} }
    }
    const kol = $('profilKoleksiyon') || document.querySelector('#bdKoleksiyon #profilKoleksiyon');
    if (kol) { tasi(kol, $('bdKoleksiyon')); if (typeof window.bcKoleksiyonCiz === 'function' && !kol.children.length) window.bcKoleksiyonCiz(kol); }
  }


  const closeScreens=window.dcTumTamEkranlariKapat;
  if(typeof closeScreens==='function')window.dcTumTamEkranlariKapat=function(){geriKoy();return closeScreens.apply(this,arguments);};
  for(const name of ['dm:login','dm:state','dm:member-status'])document.addEventListener(name,()=>{rozetleriKontrolEt();});
  setInterval(()=>{if(document.hidden||!rozetOturumu())return;if(!istat)istatGetir();rozetleriKontrolEt();rozetKutla();},1000);
})();
