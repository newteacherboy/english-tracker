/* Independent progress, achievements and wardrobe screens. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const kac = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yo === 'object';
  const ogrenci = () => typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && String(aktifOgrenciAdi).toLowerCase() !== 'teacher';
  const izin = kod => !window.dmProgression || window.dmProgression.allowed(kod);

  const panels={istatistik:{id:'tab-ilerlemem',title:'İlerlemem',content:'<div id="bdIstat"></div><details class="bd-teacher"><summary>👥 Öğretmen değerlendirmeleri <span>⌄</span></summary><p>Genel puan ve deneme sonuçların · Dönem filtresinden bağımsız</p><div id="bdGelisim"></div></details>'},rozetler:{id:'tab-basarilarim',title:'Başarılarım',content:'<div id="bdRozet"></div>'},karakter:{id:'tab-dolabim',title:'Dolabım',content:'<div id="bdKarakterUst"></div><div id="bdKarakterAlan"></div><div id="bdKoleksiyon"></div>'}};
  let beceriler=null, beceriKisi='', beceriYukleniyor=false, beceriHata=false, beceriZaman=0;
  let sekme='', aralik='hafta', istat=null, istatZaman=0, istatYukleniyor=false;
  let istatOyunSonu=0, rozetKisi='', istatDeneme=0, yenileT=null, rozetSirasi=[], kutlama=null;
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
    if(key==='istatistik'){rozetOturumu();istatCiz();beceriGetir();}else if(key==='rozetler')rozetCiz();else karakterCiz();
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
      rozetKisi = kisi; beceriler=null;beceriKisi='';beceriYukleniyor=false;beceriHata=false;beceriZaman=0; istat = null; istatZaman = 0; istatDeneme = 0; istatYukleniyor = false;
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
          /* [Kota 29 Eki 2026] Oyun sonu istatistik/rozet yenilemesi en fazla 5 dakikada bir (rozet kutlaması en çok 5 dk gecikebilir). */
          if (Date.now() - istatOyunSonu < 300000) return; istatOyunSonu = Date.now();
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
    const d=new Date(bugun);d.setDate(d.getDate()-365);return gunStr(d);
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
  async function beceriGetir(){
    if(!ogrenci()||typeof apiURL==='undefined')return;
    const kisi=String(aktifOgrenciAdi).trim().toLowerCase();
    if(beceriYukleniyor||(beceriKisi===kisi&&beceriler&&Date.now()-beceriZaman<60000))return;
    beceriKisi=kisi;beceriYukleniyor=true;beceriHata=false;
    try{
      const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'companionSummary',t:localStorage.getItem('ing_token')||''})});
      const d=await r.json();if(kisi!==String(aktifOgrenciAdi).trim().toLowerCase()||beceriKisi!==kisi)return;
      if(!r.ok||!d.ok||!d.skills||!d.review)throw Error('Beceri verileri alınamadı');
      beceriler=d;beceriZaman=Date.now();
    }catch(e){if(beceriKisi===kisi)beceriHata=true;}
    finally{if(beceriKisi===kisi){beceriYukleniyor=false;if(sekme==='istatistik'&&activePanel()?.classList.contains('active'))istatCiz();}}
  }
  function beceriSatir(label,icon,correct,total){
    const n=Math.max(0,Number(total)||0),d=Math.max(0,Math.min(n,Number(correct)||0));
    return `<div class="bd-skill"><span aria-hidden="true">${icon}</span><b>${label}</b><span class="bd-skill-result">${n?sayi(d)+' / '+sayi(n)+' doğru':'Henüz ölçüm yok'}</span>${n?`<progress max="${n}" value="${d}" aria-label="${label} alıştırma doğruluğu"></progress>`:''}</div>`;
  }
  function sureCiz(){
    const state=window.dmActiveTime?.summary?.(),seconds=state?Math.max(0,Math.floor(Number(state.seconds)||0)):null;
    const text=seconds===null?'Yükleniyor…':Math.floor(seconds/3600)+' sa '+Math.floor(seconds%3600/60)+' dk';
    const node=$('bdActiveTime');if(node)node.textContent=text;
    const stars=$('bdTimeStars');if(stars)stars.textContent=seconds===null?'—':sayi(Math.floor(seconds/600))+' yıldız';
  }
  function istatCiz() {
    const alan = $('bdIstat');if(!alan)return;
    const t=toplamlar(istat&&istat.gunler,aralikBas()),cevap=t.dogru+t.yanlis,c=cubuklar(),en=Math.max(1,...c.map(x=>x.o+x.l+x.p));
    const labels={hafta:'Bu haftaki',ay:'Son 30 gündeki',tum:'Son 1 yıldaki'};
    alan.innerHTML=`<div class="bd-aralik" role="group" aria-label="Etkinlik dönemi">${[['hafta','Bu Hafta'],['ay','Son 30 Gün'],['tum','Son 1 Yıl']].map(([k,ad])=>`<button type="button" data-aralik="${k}" aria-pressed="${k===aralik}">${ad}</button>`).join('')}</div>
      ${istat?'':`<p class="bd-not" role="status">${istatYukleniyor?'Etkinlikler yükleniyor…':'Etkinlik verileri alınamadı.'}</p>`}
      <section class="bd-progress-hero"><span aria-hidden="true">🎯</span><div><b>${istat?sayi(t.parkur)+' parkur · '+sayi(t.aktif)+' aktif gün':'Çalışmaların yükleniyor'}</b><small>${labels[aralik]} etkinliklerin</small></div><img src="study-assets/papi-read.png" alt="" onerror="this.hidden=true"></section>
      <section class="bd-skills"><div class="bd-skill-heading"><h2>Öğrenme becerilerim</h2><button type="button" data-progress-help aria-label="Veriler nasıl hesaplanıyor?">?</button></div><p>Hikâye ve tekrar sorularıyla gelişir.</p>
      <div class="bd-skill-list">${beceriler?beceriSatir('Okuma','📖',beceriler.skills.reading?.correct,beceriler.skills.reading?.total)+beceriSatir('Dinleme','🎧',beceriler.skills.listening?.correct,beceriler.skills.listening?.total)+beceriSatir('Yazma','✍️',beceriler.skills.writing?.correct,beceriler.skills.writing?.total)+beceriSatir('Kelime tekrarı','Aa',beceriler.review.correct,beceriler.review.attempts):`<p class="bd-not" role="status">${beceriHata?'Beceri verileri alınamadı.':'Becerilerin yükleniyor…'}</p>${beceriHata?'<button type="button" class="bd-skill-retry">Tekrar dene</button>':''}`}</div>
      <small class="bd-skill-scope">Hikâyeler: son 100 çalışma · Kelime: tüm tekrarlar. Dönem filtresi etkinliklere uygulanır.</small>
      <button type="button" class="bd-story-start">Bir hikâye ile başla →</button></section>
      <section class="bd-activity-summary"><b>${labels[aralik]} etkinlikler</b><div>${[['🎮','Oyun',t.oyun],['📖','Ders',t.ders],['🧭','Parkur',t.parkur]].map(([icon,label,n])=>`<span><i aria-hidden="true">${icon}</i><small>${label}</small><strong>${istat?sayi(n):'—'}</strong></span>`).join('')}</div><small>Oyun doğruluğu: ${istat&&cevap?'%'+Math.round(t.dogru*100/cevap)+' · '+sayi(t.dogru)+' / '+sayi(cevap)+' doğru':istat?'Henüz cevap kaydı yok':'Veri bekleniyor'}</small></section>
      <section class="bd-kutu bd-grafik"><div class="bd-grafik-bas"><h3>${aralik==='tum'?'Aylık':'Günlük'} etkinlik sayısı</h3><div class="bd-lejant"><span class="o">Oyun</span><span class="l">Ders</span><span class="p">Parkur</span></div></div><div class="bd-cubuklar${aralik==='ay'?' ince':''}">${c.map(x=>{const top=x.o+x.l+x.p;return `<div class="bd-cubuk" aria-label="${kac(x.ad)}: ${top} etkinlik" title="${top} etkinlik"><b>${top||''}</b><div class="bd-yigin">${['p','l','o'].map(k=>`<span class="${k}" style="height:${x[k]*100/en}%"></span>`).join('')}</div><small>${kac(x.ad)}</small></div>`;}).join('')}</div></section>
      <div class="bd-time-row"><button type="button" data-time-detail><span>⏱ Toplam aktif süre</span><b id="bdActiveTime"></b><small>Tüm dönemler</small></button><button type="button" data-time-detail><b id="bdTimeStars"></b><small>Tüm dönemler · 10 dk = 1 yıldız</small></button></div>`;
    sureCiz();
    alan.querySelectorAll('[data-aralik]').forEach(b=>b.onclick=()=>{aralik=b.dataset.aralik;istatCiz();});
    alan.querySelector('.bd-skill-retry')?.addEventListener('click',()=>{beceriZaman=0;beceriGetir();});
    alan.querySelector('.bd-story-start').onclick=()=>window.dmLearningCompanion?.dialogues?.();
    alan.querySelectorAll('[data-time-detail]').forEach(b=>b.onclick=()=>window.dmActiveTime?.panel?.());
    alan.querySelector('[data-progress-help]').onclick=()=>window.dmMemberUI?.sheet('İlerlemem nasıl hesaplanır?','<p>Okuma, dinleme ve yazma sonuçları son 100 hikâye/diyalog çalışmasından; kelime sonuçları kişisel tekrarlarından gelir. Bunlar alıştırma sonuçlarıdır, resmî dil seviyesi ölçümü değildir.</p><p>Dönem filtresi oyun, başarılı ders, parkur tamamlama ve aktif gün sayılarına uygulanır. Aktif gün, bu etkinliklerden en az birinin kaydedildiği gündür. Oyun doğruluğu yalnızca oyun cevaplarından hesaplanır.</p><p>Toplam aktif süre ve yıldızlar tüm dönemleri kapsar. Öğretmen değerlendirmeleri ayrı bir bölümde gösterilir.</p>','bdProgressHelp');
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

  document.addEventListener('dm:time',sureCiz);
  document.addEventListener('dm:login',()=>{if(sekme==='istatistik'&&activePanel()?.classList.contains('active')){rozetOturumu();istatCiz();istatGetir();beceriGetir();}});
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
