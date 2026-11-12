
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const karistir = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const EN = k => String((k && (k.ingilizce || k.en)) || '').trim();
  const TR = k => String((k && (k.turkce || k.tr)) || '').trim();
  const harfMi = w => /^[a-z]+$/i.test(w);
  const norm = s => String(s).toLocaleLowerCase('tr').replace(/[’`]/g, "'").replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim();
  const sinifModu = () => typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci;
  const isim = () => (typeof oyunIcinAktifIsim === 'function' ? oyunIcinAktifIsim() : (typeof aktifOgrenciAdi !== 'undefined' ? aktifOgrenciAdi : '')) || '';
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yoHazirMi === 'function' && yoHazirMi();
  const ses = t => { if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal(t); };
  function oku(metin, hiz) { if(window.dmListen){window.dmListen(metin,hiz<.7);return;}try { let u = new SpeechSynthesisUtterance(metin); u.lang = 'en-US'; u.rate = hiz || .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
  function toast(m) { if (typeof yoToast === 'function') yoToast(m); else alert(m); }

  /* ================= BÖLÜMLER ve DURAKLAR ================= */
  const BOLUM = [
    { ad: 'Temel Kelimeler', alt: '1. ve 2. Sınıf', renk: 'linear-gradient(180deg,#fcd34d,#d97706)', isik: '#f59e0b88', ik: '📜',
      duraklar: ['Işık Kapısı', 'Fısıldayan Bahçe', 'Konuşan Ağaç', 'Ay Işığı Yolu', 'Sihirli Kütüphane', 'Baykuş Kulesi', 'Gökkuşağı Köprüsü', 'Yıldız Çeşmesi', 'Kristal Oda', 'Taht Salonu'] },
    { ad: 'Harf Avı', alt: '3. ve 4. Sınıf', renk: 'linear-gradient(180deg,#60a5fa,#1d4ed8)', isik: '#3b82f688', ik: '🔤',
      duraklar: ['Dağınık Harfler', 'Harf Ormanı', 'Kilitli Sandık', 'Ayna Labirenti', 'Sessiz Harfler', 'Uçan Parşömen', 'Şifreli Kapı', 'Gizli Geçit', 'Harf Kuyusu', 'Lanetin Kalbi'] },
    { ad: 'Zor Kelimeler', alt: '5. ve 6. Sınıf', renk: 'linear-gradient(180deg,#c084fc,#7e22ce)', isik: '#a855f788', ik: '🔮',
      duraklar: ['Sis Kapısı', 'Yankı Mağarası', 'Büyülü Ayna', 'Uyuyan Dev', 'Zaman Kum Saati', 'Ejder Yuvası', 'Kristal Küre', 'Fırtına Kulesi', 'Kayıp Şehir', 'Mor Taç'] },
    { ad: 'Usta Seviye', alt: '7. ve 8. Sınıf', renk: 'linear-gradient(180deg,#475569,#0f172a)', isik: '#fbbf2466', ik: '👑',
      duraklar: ['Usta Kapısı', 'Ateş Çemberi', 'Buz Sarayı', 'Gölge Köprüsü', 'Yıldız Haritası', 'Anka Tüyü', 'Kadim Kitap', 'Son Sınav', 'Işık Tacı', 'Baş Büyücü'] }
  ];
  const GECME = 7;
  const TIPLER = [
    ['lab', '🔬', 'Kelime Laboratuvarı'], ['risk', '🎈', 'Risk Balonları'], ['eksik', '✏️', 'Eksik Harf'], ['hafiza', '🃏', 'Hafıza Sandığı'],
    ['hiz', '🌪️', 'Hız Fırtınası'], ['harf', '🔤', 'Harf Avı'], ['sifre', '🔐', 'Şifre Kırıcı'], ['es', '🔗', 'Eş Bul'],
    ['tren', '🚂', 'Kelime Treni'], ['cumle', '🧱', 'Cümle Ustası'], ['dikte', '🎧', 'Kulak Dedektifi'], ['cumleTamamla','📝','Cümleyi Tamamla'], ['kelimeKur','🔤','Kelimeyi Kur'], ['eslestir','🔗','Eşleştirme'], ['duydugunuBul','👂','Duyduğunu Bul'], ['sesliFinal', '🃏', 'Kelime Kartları'], ['dinleAnlam','🎧','Dinle ve Anlamı Yakala'], ['hata','🦜',"Papi'nin Hatası"], ['hatirla','🧠','Aklında Kaldı mı?'], ['miniDiyalog','💬','Papi ile Diyalog']
  ];
  /* 4 kapı × 2 sınıf; her ünite bir durak. Durak numarası = 1000 + sınıf×100 + ünite (ör. 1203 = 2. sınıf 3. ünite) */
  const KAPI_SINIF = [[1, 2], [3, 4], [5, 6], [7, 8]];
  const VARSAYILAN_UNITE = { 1: 8, 2: 8, 3: 10, 4: 10, 5: 8, 6: 8, 7: 8, 8: 8 };
  const PARKUR_KELIME_ADEDI=4;
  let DURAK = [[], [], [], []], durakImza = -1;
  const havuzTum = () => (window.masterKelimeHavuzu || []).filter(k => EN(k) && TR(k));
  let durakHam = null, durakHamUzunluk = -1;
  function duraklariKur() {
    // Hızlı yol: kelime havuzu değişmediyse tüm havuzu yeniden süzme (her durak sorgusunda çağrılır).
    const ham = window.masterKelimeHavuzu || [];
    if (DURAK[0].length && ham === durakHam && ham.length === durakHamUzunluk) return;
    let tum = havuzTum();
    durakHam = ham; durakHamUzunluk = ham.length;
    if (DURAK[0].length && tum.length === durakImza) return;
    durakImza = tum.length;
    DURAK = KAPI_SINIF.map(siniflar => {
      let l = [];
      siniflar.forEach(sn => {
        let u = [...new Set(tum.filter(k => Number(k.sinif) === sn).map(k => Number(k.unite) || 0))].filter(x => x > 0).sort((a, c) => a - c);
        if (!u.length) u = Array.from({ length: VARSAYILAN_UNITE[sn] }, (_, i) => i + 1);
        u.forEach(un => {
          const words=[...new Map(tum.filter(k=>Number(k.sinif)===sn&&Number(k.unite)===un).map(k=>[EN(k).trim().toLocaleLowerCase('en'),k])).values()].sort((a,b)=>EN(a).localeCompare(EN(b),'en'));
          const groups=Math.max(1,Math.ceil(words.length/PARKUR_KELIME_ADEDI));
          for(let part=0;part<groups;part++)l.push({sinif:sn,unite:un,parca:part+1,parcaToplam:groups,kelimeler:words.slice(part*PARKUR_KELIME_ADEDI,(part+1)*PARKUR_KELIME_ADEDI),legacyNo:200000+sn*10000+un*100+Math.floor(part/3)+1,no:200000+sn*10000+un*100+50+part+1});
        });
        if ([1,3,7,8].includes(sn)) {
          const base=l.filter(d=>d.sinif===sn);
          const banks=u.map(un=>[...new Map(tum.filter(k=>Number(k.sinif)===sn&&Number(k.unite)===un).map(k=>[EN(k).trim().toLocaleLowerCase('en'),k])).values()].sort((a,b)=>EN(a).localeCompare(EN(b),'en')));
          base.forEach((D,i)=>{
            const selected=[],seen=new Set();
            for(let round=0;selected.length<4&&round<100;round++)for(let j=0;j<banks.length&&selected.length<4;j++){
              const bank=banks[(i+j)%banks.length],k=bank[(Math.floor(i/banks.length)+round)%bank.length];
              if(k&&!seen.has(EN(k).toLowerCase())){selected.push(k);seen.add(EN(k).toLowerCase());}
            }
            l.push({...D,no:D.no+D.parcaToplam,legacyNo:null,karisik:true,kelimeler:selected,parca:i+1,parcaToplam:base.length});
          });
        }
      });
      return l;
    });
  }
  const durakSayisi = b => { duraklariKur(); return DURAK[b].length; };
  const durakBilgi = (b, d) => { duraklariKur(); return DURAK[b][d]; };
  const durakNo = (b, d) => (durakBilgi(b, d) || {}).no;
  const durakAdi = (b, d) => BOLUM[b].duraklar[d % BOLUM[b].duraklar.length];
  const toplamDurak = () => { duraklariKur(); return DURAK.reduce((t, l) => t + l.length, 0); };
  let tamam = new Set(), hamTamam = new Set(), aktarimYildiz = {}, yuklendi = false, aktarImza = -1;
  const bolumTamam = b => { let n = 0; for (let d = 0; d < durakSayisi(b); d++) if (tamam.has(durakNo(b, d))) n++; return n; };
  /* Başlangıç yolu (sunucu): başlangıç sınıfı ve altı açık, üstü kapalı. Sınıf içinde duraklar sıralı. */
  const baslangicYolu = () => window.dmProgression?.status?.()?.startPath || null;
  const sinifAcik = sn => { const y = baslangicYolu(); return !y || sn <= y.maxGrade; };
  const bolumAcik = b => b >= 0 && b < 4 && KAPI_SINIF[b].some(sinifAcik);
  /* Her sınıfın sıradaki durağı bir kez hesaplanır. durakBilgi her çağrıda tüm kelime havuzunu
     taradığı için durak başına döngü haritayı ve açılışı dondurur (20 Eki 2026). */
  let siraOnbellek = { anahtar: '', harita: [] };
  function siraHaritasi() {
    duraklariKur();
    const anahtar = durakImza + '|' + tamam.size + '|' + DURAK.map(l => l.length).join(',');
    if (siraOnbellek.anahtar !== anahtar || siraOnbellek.tamam !== tamam) {
      siraOnbellek = { anahtar, tamam, harita: DURAK.map(list => { const m = {}; list.forEach((D, d) => { if (m[D.sinif] === undefined && !tamam.has(D.no)) m[D.sinif] = d; }); return m; }) };
    }
    return siraOnbellek.harita;
  }
  const sinifSiradaki = (b, sn) => { const d = (siraHaritasi()[b] || {})[sn]; return d === undefined ? -1 : d; };
  // Başlangıç sınıfının altındaki sınıflar tamamen serbest; başlangıç sınıfı ve üstünde duraklar sıralı.
  const durakAcik = (b, d) => { const D = (siraHaritasi(), DURAK[b] && DURAK[b][d]); if (!D || !sinifAcik(D.sinif)) return false; const y = baslangicYolu(); if (y && D.sinif < (y.startGrade || 1)) return true; return tamam.has(D.no) || sinifSiradaki(b, D.sinif) === d; };
  const sinifSirasi = () => { const y = baslangicYolu(), bas = y ? y.startGrade : 1; return [bas, ...[1, 2, 3, 4, 5, 6, 7, 8].filter(sn => sn > bas), ...[1, 2, 3, 4, 5, 6, 7, 8].filter(sn => sn < bas).reverse()].filter(sinifAcik); };
  const yildiz = no => (yoVar() && yo.baYildiz && (yo.baYildiz[no] || (tamam.has(no)&&yo.baYildiz[Math.floor(no/100)*100+Math.floor((no%100-51)/3)+1]))) || aktarimYildiz[no] || (tamam.has(no) ? 1 : 0);
  const bolumYildiz = b => { let t = 0; for (let d = 0; d < durakSayisi(b); d++) t += yildiz(durakNo(b, d)); return t; };
  const siradakiDurak = b => { for (const sn of sinifSirasi()) { if (!KAPI_SINIF[b].includes(sn)) continue; const d = sinifSiradaki(b, sn); if (d >= 0) return d; } for (let d = durakSayisi(b) - 1; d >= 0; d--) if (durakAcik(b, d)) return d; return 0; };
  function rutbe() { let n = tamam.size, T = toplamDurak() || 68; return n >= T * .75 ? '👑 Baş Büyücü' : n >= T * .5 ? '🔮 Usta Büyücü' : n >= T * .25 ? '⭐ Kalfa Büyücü' : '🌙 Çırak Büyücü'; }
  /* Eski seviyeler 8'er kelimelik parçalardı (1. sınıf 1. üniteden başlayarak). Bir ünitenin yarısından
     fazlası eski seviyelerle geçildiyse o ünitenin durağı geçilmiş sayılır; yıldızı da taşınır. */
  function aktar() {
    duraklariKur();
    tamam=new Set();
    DURAK.flat().forEach(d=>{if(hamTamam.has(d.no)||(!d.karisik&&hamTamam.has(d.legacyNo))||(!d.karisik&&d.parca<=3&&hamTamam.has(1000+d.sinif*100+d.unite)))tamam.add(d.no);});
    aktarimYildiz = {};
    let eski = [...hamTamam].filter(n => n > 0 && n < 1000), tum = havuzTum();
    if (!eski.length || !tum.length) return;
    let kapsanan = {}, toplam = {}, yil = {};
    tum.forEach(k => { let a = Number(k.sinif) * 100 + Number(k.unite); toplam[a] = (toplam[a] || 0) + 1; });
    eski.forEach(n => {
      let y = (yoVar() && yo.baYildiz && yo.baYildiz[n]) || 1;
      tum.slice((n - 1) * 8, n * 8).forEach(k => { let a = Number(k.sinif) * 100 + Number(k.unite); kapsanan[a] = (kapsanan[a] || 0) + 1; yil[a] = Math.max(yil[a] || 0, y); });
    });
    Object.keys(kapsanan).forEach(a => { if (kapsanan[a] >= toplam[a] / 2) { let no = 1000 + Number(a); DURAK.flat().filter(d=>!d.karisik&&d.parca<=3&&1000+d.sinif*100+d.unite===no).forEach(d=>{tamam.add(d.no);aktarimYildiz[d.no]=Math.min(3,yil[a]);}); } });
  }
  function aktarGerekirse() { let n = havuzTum().length; if (n !== aktarImza) { aktarImza = n; aktar(); } }

  /* [28 Eki 2026] Sekme görünmezken okuma istekleri bekletilir (request-budget); süre sınırı ancak sayfa görünürken başlasın. */
  function gorununceDevam() { return document.hidden ? new Promise(r => { const f = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', f); r(); } }; document.addEventListener('visibilitychange', f); }) : Promise.resolve(); }
  let schoolProgressOwner=null;
  async function ilerlemeYukle() {
    const owner=isim();
    await gorununceDevam();
    if(owner!==isim())return;
    const statusReady=Promise.resolve().then(()=>window.dmProgression?.refresh(true));
    // Handle rejection immediately while the independent request is in flight.
    const statusResult=statusReady.then(value=>({value}),error=>({error}));
    const controller=new AbortController(), deadline=setTimeout(()=>controller.abort(),12000);
    let completed;
    try {
      let r=await fetch(`${apiURL}?islem=buyuSeviyeIlerlemeGetir&ogrenci=${encodeURIComponent(owner)}`,{signal:controller.signal});
      if(!r.ok)throw new Error('Parkur bilgileri alınamadı');
      let l=await r.json();
      if(!Array.isArray(l))throw new Error('Parkur yanıtı geçersiz');
      completed=new Set(l.map(Number));
    } finally { clearTimeout(deadline); }
    const status=await statusResult;if(owner!==isim())return;if(status.error)throw status.error;
    try { (JSON.parse(localStorage.getItem('bz_bekleyen_' + owner.toLowerCase()) || '[]')).forEach(n => completed.add(Number(n))); } catch (e) {}
    const canonical=window.dmProgression?.status?.();if(Array.isArray(canonical?.done))canonical.done.forEach(n=>completed.add(Number(n)));
    hamTamam=completed;aktar(); aktarImza = havuzTum().length;
    yuklendi = true;schoolProgressOwner=owner;
  }
  function ilerlemeKaydet(no) {
    tamam.add(no); hamTamam.add(no);
    const owner=isim(); let anahtar = 'bz_bekleyen_' + owner.toLowerCase();
    /* [28 Eki 2026] Öğrencide durağın tamamlandığını sunucudaki ödül işlemi zaten yazıyor (7+ doğru) ve durak hediyesi
       kaldırıldı; ayrı "durağı tamamla" isteği gönderilmez. Öğretmen/sınıf denemesinde ödül işlemi olmadığı için gönderilir. */
    const denemeModu = !owner || owner.toLowerCase() === 'teacher' || (typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci);
    if (!denemeModu) return;   /* [Kota 29 Eki 2026] Seviye durumu ödül cevabından sonra zaten yenileniyor (ikinci istek gereksiz). */
    fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'buyuSeviyeTamamla', ogrenci: isim(), seviyeNo: no }) })
      .then(async r => { if (!r.ok) throw 0; const d = await r.json(); bekleyenSil(anahtar, no); if(owner!==isim())return; if(d.yo)window.dmApplyRewardState?.(d.yo,owner); if(d.gold>0) toast(`🎁 Parkur hediyesi: +${d.gold} altın`); window.dmProgression?.refresh(true); })
      .catch(() => { try { let l = JSON.parse(localStorage.getItem(anahtar) || '[]'); if (!l.includes(no)) l.push(no); localStorage.setItem(anahtar, JSON.stringify(l)); } catch (e) {} });
  }
  function bekleyenSil(anahtar, no) { try { let l = JSON.parse(localStorage.getItem(anahtar) || '[]').filter(x => x !== no); localStorage.setItem(anahtar, JSON.stringify(l)); } catch (e) {} }
  window.addEventListener('online', () => { let a = 'bz_bekleyen_' + isim().toLowerCase(); try { JSON.parse(localStorage.getItem(a) || '[]').forEach(no => fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'buyuSeviyeTamamla', ogrenci: isim(), seviyeNo: no }) }).then(r => { if (r.ok) bekleyenSil(a, no); }).catch(() => {})); } catch (e) {} });

  /* ================= KELİMELER: o ünite + önceki ünitelerden tekrar ================= */
  function sinif() {
    try { let u = (globalDataCache || []).find(x => String(x.ogrenci).trim().toLowerCase() === isim().trim().toLowerCase()); let s = Number(u && (u.Sinif || u.sinif || u.secilenSinif)); if (s) return s; } catch (e) {}
    return Number(localStorage.getItem('bz_sinif')) || 5;
  }
  function durakHavuzu(b, d) {
    let D = durakBilgi(b, d), tum = havuzTum(), sira = D.sinif * 100 + D.unite;
    let unite = D.kelimeler.slice();
    let onceki = tum.filter(k => Number(k.sinif) * 100 + Number(k.unite) < sira);
    let havuz = unite.slice();
    // İlk duraklarda önceki ünite olmayabilir. Aynı kapıdaki komşu sınıf ve
    // ünitelerden güvenli tekrar havuzu kur; kapıyı 8 kelime sınırında kilitleme.
    const bolumSiniflari = KAPI_SINIF[b] || [D.sinif];
    const ekleEksikleri = adaylar => {
      const mevcut = new Set(havuz.map(k => EN(k).trim().toLocaleLowerCase('en')));
      for (const k of karistir(adaylar)) {
        if (havuz.length >= 16) break;
        const key = EN(k).trim().toLocaleLowerCase('en');
        if (!key || mevcut.has(key)) continue;
        havuz.push(k); mevcut.add(key);
      }
    };
    if (havuz.length < 16) ekleEksikleri(onceki.filter(k => Number(k.sinif) === D.sinif));
    if (havuz.length < 16) ekleEksikleri(onceki);
    if (havuz.length < 16) ekleEksikleri(tum.filter(k => bolumSiniflari.includes(Number(k.sinif))));
    if (havuz.length < 8) ekleEksikleri(tum);
    /* tekrar: önce öğrencinin zorlandığı (Zor Kelimeler) önceki kelimeler, sonra rastgele önceki kelimeler */
    let zk = (yoVar() && yo.zk) ? yo.zk : {};
    let zor = onceki.filter(k => zk[EN(k).toLowerCase()]);
    let tekrar = [...karistir(zor), ...karistir(onceki)].filter((k, i, a) => a.indexOf(k) === i && !havuz.includes(k)).slice(0, 3);
    let sinifK = tum.filter(k => Number(k.sinif) === D.sinif);
    return { havuz, tekrar, tum: sinifK.length >= 10 ? sinifK : tum, D };
  }

  /* ================= EKRAN İSKELETİ ================= */
  let perde = null;
  function perdeAc() {
    if (!perde) { perde = document.createElement('div'); perde.className = 'bz-perde'; perde.id = 'bzPerde'; perde.setAttribute('role', 'dialog'); perde.setAttribute('aria-modal', 'true'); perde.setAttribute('aria-label', 'Büyü Akademisi'); const returnView=window.dmViewHistory?.capture();document.body.appendChild(perde);window.dmViewHistory?.track(perde,{parent:returnView,close:kapat}); }
    return perde;
  }
  const eskiGorunum = () => String(isim()).toLowerCase()==='teacher' && localStorage.getItem('bz_eski_parkur') === '1';
  function parkurAlani() {
    let tab = $('tab-dunya'); if (!tab) return perdeAc();
    tab.classList.add('bz-yeni');
    let k = $('bzParkur'); if (!k) { k = document.createElement('div'); k.id = 'bzParkur'; k.className = 'bz-parkur'; tab.appendChild(k); }
    return k;
  }
  let gorunum = { ad: 'harita', b: null };
  function goster(ad, b) {
    if (eskiGorunum()) { if (typeof orgDunya === 'function') orgDunya(); return; }
    gorunum = { ad, b: b === undefined ? null : b };
    let tab = $('tab-dunya');
    if (tab && !tab.classList.contains('active') && typeof orgDunya === 'function') { parkurAcikTut = true; orgDunya(); }
    if (ad === 'koridor') koridor(); else harita(gorunum.b === null ? aktifBolum() : gorunum.b);
  }
  /* Başlangıç yolu sunucudan harita çizildikten sonra gelebilir (uygulama açılışı). O zaman harita
     varsayılan 1. sınıf sırasıyla çizilmiş olur; yol değişince haritayı başlangıç sınıfına göre yeniden çiz. */
  let yolImza = '';
  document.addEventListener('dm:progression-status', () => {
    const y = baslangicYolu(), imza = y ? [y.startGrade, y.maxGrade, y.startCefr, y.maxCefr].join('|') : '';
    if (imza === yolImza) return; yolImza = imza;
    const k = $('bzParkur'), tab = $('tab-dunya');
    if (!k || !k.querySelector('#dmParkurScroll') || !tab?.classList.contains('active') || (perde && perde.isConnected) || document.querySelector('.bz-alt')) return;
    harita(aktifBolum());
  });
  function aktifBolum() { aktarGerekirse(); duraklariKur(); for (const sn of sinifSirasi()) { const b = KAPI_SINIF.findIndex(k => k.includes(sn)); if (sinifSiradaki(b, sn) >= 0) return b; } for (let b = 3; b >= 0; b--) if (bolumAcik(b)) return b; return 0; }
  function kapat() { if(O&&!O.finished){checkpointSave();O.pauseElapsed=Math.max(0,Date.now()-O.bas);O.paused=true;}try { speechSynthesis.cancel(); } catch (e) {} if (zamanlayici) clearInterval(zamanlayici); if (perde) {const closed=perde;perde.remove();window.dmViewHistory?.leave(closed);} perde = null; document.querySelectorAll('.bz-alt').forEach(x => x.remove()); }
  function avatar(px) { try { let s = typeof karakterSvg === 'function' ? karakterSvg(isim(), px) : ''; if (s) return s; } catch (e) {} return `<span style="display:grid;place-items:center;width:100%;height:100%;font-size:${Math.round(px * .7)}px;line-height:1">🧙</span>`; }
  function ust(geriHtml) {
    let enerji = window.genelEnerjiKalan !== undefined ? window.genelEnerjiKalan : '–', altin = yoVar() ? (yo.altin || 0) : 0;
    return `<div class="bz-bas">${geriHtml || '<button class="kapat" id="bzKapat" aria-label="Kapat">✕</button>'}
      <div class="bz-profil"><span class="av">${avatar(38)}</span><span><b>${kac(isim() || 'Büyücü')}</b><small>${rutbe()} · ${tamam.size} durak</small></span></div>
      <div class="bz-cip"><span>⚡ ${enerji}</span><span>🪙 ${altin}</span></div></div>`;
  }
  function kapatBagla() { let k = $('bzKapat'); if (k) k.onclick = kapat; }

  /* ================= 1) KORİDOR (bölüm kapıları) ================= */
  function koridor() { harita(aktifBolum()); }

  /* ================= 2) KALE HARİTASI (10 durak) ================= */
  function kaleSVG(b) {
    return `<div class="dm-palace" role="img" aria-label="Papi’nin Keşif Sarayı, bölümün son hedefi"><svg viewBox="0 0 300 190" aria-hidden="true"><defs><linearGradient id="palaceWall" x2="0" y2="1"><stop stop-color="#fff8dc"/><stop offset="1" stop-color="#eac987"/></linearGradient><linearGradient id="palaceRoof" x2="0" y2="1"><stop stop-color="#55c6ba"/><stop offset="1" stop-color="#177c83"/></linearGradient></defs><ellipse cx="150" cy="177" rx="130" ry="11" fill="#19685e" opacity=".18"/><path d="M24 174h252" stroke="#559e84" stroke-width="12" stroke-linecap="round"/><rect x="64" y="92" width="172" height="77" rx="10" fill="url(#palaceWall)" stroke="#b79860" stroke-width="3"/><path d="M58 95l29-31h126l29 31z" fill="url(#palaceRoof)" stroke="#166970" stroke-width="3"/><g fill="url(#palaceWall)" stroke="#b79860" stroke-width="3"><rect x="32" y="68" width="44" height="102" rx="12"/><rect x="224" y="68" width="44" height="102" rx="12"/><rect x="117" y="48" width="66" height="120" rx="14"/></g><g fill="url(#palaceRoof)" stroke="#166970" stroke-width="3"><path d="M25 70q29-64 58 0z"/><path d="M217 70q29-64 58 0z"/><path d="M108 50q42-75 84 0z"/></g><g fill="#fff6b3" stroke="#bf9b58" stroke-width="3"><path d="M45 113V95q9-15 18 0v18z"/><path d="M237 113V95q9-15 18 0v18z"/><circle cx="150" cy="77" r="16"/></g><path d="M138 75q6-5 12-1q6-4 12 1v11q-6-4-12 0q-6-4-12 0z" fill="#248b85"/><path d="M128 170v-35q22-35 44 0v35z" fill="#277e80" stroke="#e7ad49" stroke-width="4"/><path d="M150 130v38" stroke="#8ad5c2" stroke-width="2"/><circle cx="157" cy="151" r="3" fill="#ffd66e"/><path d="M117 173h66m-74 8h82" stroke="#e7d5ac" stroke-width="7" stroke-linecap="round"/><path d="M150 14V0l25 6-25 6" fill="#a76bd0" stroke="#775296" stroke-width="2"/><g fill="#5aa783"><ellipse cx="30" cy="160" rx="17" ry="10"/><ellipse cx="272" cy="160" rx="17" ry="10"/></g><g fill="#fff1a3"><circle cx="21" cy="151" r="4"/><circle cx="281" cy="151" r="4"/></g></svg><strong>Keşif Sarayı</strong><small>Papi ile bu bölümün zirvesine ulaş!</small></div>`;
  }
  const ADIM = 96;
  function yerHesapla(n) { let H = 260 + n * ADIM; return { H, l: Array.from({ length: n }, (_, i) => [50 + Math.sin(i * 1.15) * 24, H - 62 - i * ADIM]) }; }
  function harita(b, page) {
    aktarGerekirse();duraklariKur();
    if(!Number.isInteger(b)||b<0||b>3)b=aktifBolum();
    const p=parkurAlani();
    // Performans: tüm 1–8. sınıf mikro duraklarını aynı anda çizme.
    // Yalnızca etkin durağın yakın çevresi oluşturulur; ilerleme/ödül kayıtları değişmez.
    const progress=DURAK.map((list,section)=>({open:bolumAcik(section),next:siradakiDurak(section)}));
    const all=schoolBadgeRows(progress);
    const focus=Math.max(0,all.findIndex(st=>st.b===b&&st.d===progress[b].next));
    if(all[focus])all[focus].current=true; // Sınıflarım listesi başlangıç sınıfının sıradaki durağını açsın.
    const start=Math.max(0,focus-8),steps=all.slice(start,Math.min(all.length,start+24));
    const current=Math.max(0,focus-start);
    gorunum={ad:'harita',b};
    p.innerHTML='<div class="bz-ic">'+window.dmParkurBaslik({energy:window.genelEnerjiKalan??'–',max:window.genelEnerjiMax||30,gold:yoVar()?yo.altin||0:0})+'<div class="dm-parkur-scroll" id="dmParkurScroll">'+window.dmParkurSahne({steps,allSteps:all,current,chapter:b,page})+'</div></div>';
    p.querySelectorAll('.dm-adventure-node,.dm-map-continue').forEach(t=>t.onclick=()=>durakKarti(+t.dataset.b,+t.dataset.d));
    requestAnimationFrame(()=>{window.dmParkurMapMount?.($('dmParkurScroll'));window.dmStoryPath?.mount($('dmParkurScroll'));});
  }

  function schoolBadgeRows(progress) {
    return DURAK.flatMap((list,section)=>list.map((D,d)=>({b:section,d,no:D.no,grade:D.sinif,
      label:D.sinif+'. sınıf '+(D.karisik?'Karışık üniteler':D.unite+'. ünite')+' · '+D.parca+'/'+D.parcaToplam+' · '+D.kelimeler.length+' kelime',
      short:D.sinif+'. sınıf',done:tamam.has(D.no),available:!!progress?.[section].open&&durakAcik(section,d)})));
  }
  window.dmSchoolBadgeRows = async function () {
    const owner=isim();
    if(!owner)return [];
    if(schoolProgressOwner!==owner)await ilerlemeYukle();
    if(owner!==isim()||schoolProgressOwner!==owner)return [];
    aktarGerekirse();duraklariKur();
    return schoolBadgeRows();
  };

  window.dmSchoolStopOpen = (b,d) => durakKarti(b,d);
  /* ================= 3) DURAK KARTI ================= */
  function durakKarti(b, d) {
    if (!bolumAcik(b)) return toast('🔒 Bu sınıflar, önceki sınıfın tüm durakları bitince açılır.');
    let B = BOLUM[b], D = durakBilgi(b, d), no = D.no, N = durakSayisi(b), bitti = tamam.has(no), y = yildiz(no), n = bolumTamam(b);
    let ileride = !durakAcik(b, d), kapaliSinif = !sinifAcik(D.sinif);
    // The shared lesson entry is the only start sheet for current school sessions.
    if(!ileride&&window.dmSchoolLesson&&!checkpointRead(no)){void oyunBaslat(b,d);return;}
    const returnView=window.dmViewHistory?.capture();let k = document.createElement('div'); k.className = 'bz-alt'; k.setAttribute('role', 'dialog'); k.setAttribute('aria-modal', 'true');
    k.classList.add('sp-entry','sp-adventure-entry');
    const saved=checkpointRead(no);const possibleXp=bitti?0:192;
    k.innerHTML = `<div class="bz-alt-kart sp-start-card"><button id="bzVazgec" class="sp-close" aria-label="Kapat">✕</button>${window.DMPapi?'<span class="sp-entry-papi dm-papi-host" aria-hidden="true">'+window.DMPapi.html('merhaba','Papi',{tap:true})+'</span>':'<img class="sp-entry-papi" src="study-assets/papi-celebrate.png" alt="Papi">'}<small>MACERA HARİTASI · ${d+1}. DURAK</small><h3>${kac(window.dmParkurDurakAdi(b,d))}</h3><p>${D.sinif}. sınıf · ${D.karisik?'Karışık üniteler':D.unite+'. ünite'} · ${kac(durakAdi(b,d))}</p><div class="sp-prize"><span>Olası ödül</span><strong>⭐ ${bitti?'0': 'En çok '+possibleXp} XP</strong><small>🪙 ${bitti?'İlk geçiş ödülü alındı':'En çok 40 altın · Başarı ve süreye göre'}</small></div><p class="sp-entry-note">${kapaliSinif?'🔒 '+D.sinif+'. sınıf, '+(baslangicYolu()?.maxGrade||D.sinif-1)+'. sınıfın tüm durakları bitince açılır':ileride?'🔒 Önce sıradaki durağı tamamla':bitti?'⭐'.repeat(y)+' · En iyi sonucun':D.kelimeler.length+' kelime · Seviye '+D.parca+'/'+D.parcaToplam+' · 10 soru + kelime kartları'}</p><button class="bz-btn mor" id="bzOyna" ${ileride?'disabled':''}>${saved?'Kaldığın yerden devam et':bitti?'Tekrar başlat':'Başlat'} →</button></div>`;
    document.body.appendChild(k);
    const kap = () => {k.remove();window.dmViewHistory?.leave(k);};window.dmViewHistory?.track(k,{parent:returnView,close:kap});
    k.onclick = e => { if (e.target === k) kap(); };
    $('bzVazgec').onclick = kap;
    $('bzOyna').onclick = () => { kap(); oyunBaslat(b, d); };
    setTimeout(() => $('bzOyna') && !$('bzOyna').disabled && $('bzOyna').focus(), 50);
  }

  /* ================= 4) OYUN: 11 mini oyundan birer soru ================= */
  let O = null, zamanlayici = null;
  const checkpointKey=(no=O?.D?.no)=> 'dm_parkur_resume_v1:'+isim().toLowerCase()+':'+no;
  function checkpointRead(no){try{const c=JSON.parse(localStorage.getItem(checkpointKey(no))||'null');return c?.version===1&&c.state?.D?.no===no&&c.state.owner===isim()&&typeof c.state.runId==='string'&&Array.isArray(c.state.sorular)&&(!c.savedAt||Date.now()-c.savedAt<86400000)?c:null;}catch{return null;}}
  function checkpointSave(){if(!O||O.owner!==isim()||O.finished||sinifModu())return;try{const state=JSON.parse(JSON.stringify(O,(key,value)=>['jk','pendingAnswer'].includes(key)?undefined:value));state.elapsed=O.paused?O.pauseElapsed:Math.max(0,Date.now()-O.bas);const score=window.OC?.aktif;localStorage.setItem(checkpointKey(),JSON.stringify({version:1,savedAt:Date.now(),state,score:score?.oyun==='ba'?score:null}));}catch(e){console.warn('[Parkur] ilerleme kaydı',e);}}
  function checkpointClear(){try{localStorage.removeItem(checkpointKey());}catch{}}
  window.addEventListener('pagehide',checkpointSave);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)checkpointSave();});
  document.addEventListener('input',e=>{if(!perde?.contains(e.target)||!O)return;O.inputDraft={question:O.i,id:e.target.id,value:e.target.value};checkpointSave();});
  async function parkurEnerjiAdim(runId, soru, dogru) {
    if(dogru!==null){
      let error;
      for(let attempt=0;attempt<3;attempt++){
        try{return await window.dmVerifiedGames.flush(runId);}catch(e){error=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));}
      }
      throw error||Error('Cevap sunucuya kaydedilemedi.');
    }
    const response=await fetch(apiURL,{method:'POST',body:JSON.stringify({islem:'ekonomi',is:'parkurAdim',ogrenci:isim(),runId,soru,dogru})});
    const data=await response.json();
    if(!response.ok || !data.ok)throw new Error(data.mesaj||'Enerji işlemi onaylanmadı.');
    if(typeof data.enerjiKalan==='number'){
      window.genelEnerjiKalan=data.enerjiKalan;
      if(typeof headerEnerjiGoster==='function')headerEnerjiGoster(data.enerjiKalan,data.enerjiMax||30);
    }
    return data;
  }
  async function oyunBaslat(b, d) {
    const ownerAtStart=isim();
    if (!durakAcik(b, d)) return toast(sinifAcik((durakBilgi(b, d) || {}).sinif) ? '🔒 Önce sıradaki durağı tamamla.' : '🔒 Bu sınıf, önceki sınıfın tüm durakları bitince açılır.');
    if (typeof genelOyunGirisEngelliMi === 'function' && genelOyunGirisEngelliMi()) return;
    let { havuz, tekrar, tum, D } = durakHavuzu(b, d);
    if (!D.kelimeler.length) { toast('Bu durakta word_bank kelimeleri henüz bulunamadı.'); return; }
    // Telaffuz ve yazma doğrulaması yalnızca word_bank İngilizce alanına dayanır.
    if(ownerAtStart!==isim())return;
    if(window.dmSchoolLesson&&!checkpointRead(D.no)){
      try{await window.dmSchoolLesson.start({D,b,d,pool:tum,entryMeta:{title:window.dmParkurDurakAdi(b,d),completed:tamam.has(D.no)},onFinish:state=>{O=state;bitir();}});}catch(e){console.warn('[Okul Yolum]',e.message);}
      return;
    }
    // İlk 12 görev mevcut 12 ayrı mekaniği kullanır; final yalnızca hedef kelimeleri sorar.
    const active=D.kelimeler.slice();
    if(!active.length){toast('Bu ünitenin word_bank kelimeleri bulunamadı.');return;}
    const types=['teach','hatirla','soyle','dinleSec','eslestir','eksik',
      'lab','wordOrder','patternOrder','patternComplete','patternListen','patternTranslate'];
    const sorular=types.map((tip,i)=>({tip,k:active[i%active.length],l:active.slice()}));
    sorular.push({tip:'sesliFinal',l:active.slice()});
    O = { owner:ownerAtStart, b, d, D, sorular, speechAlternatives:{}, kombo:0, i: 0, dogru: 0, yanlis: 0, sonuclar: [], tum, bas: Date.now(), gecmis: [], jk: {}, harcanan: 0, runId:crypto.randomUUID(), pendingAnswer:null };
    const saved=checkpointRead(D.no);
    if(saved){O={...saved.state,tum,owner:ownerAtStart,pendingAnswer:null,advancing:false,jk:{},paused:false,bas:Date.now()-(saved.state.elapsed||0)};}
    checkpointSave(); // Even a failed first server handshake must not discard this run.
    if (window.OC){OC.basla('ba');if(saved?.score)Object.assign(OC.aktif,saved.score,{bas:O.bas,bitti:false});Object.assign(OC.aktif,{runId:O.runId,rewardScope:{classNo:D.sinif,units:[D.unite],stopNo:D.no}});}
    if(!sinifModu()){
      try{const verified=await window.dmVerifiedGames.start('ba',O.runId,{classNo:D.sinif,units:[D.unite],stopNo:D.no},active);O.verifiedVersion=1;const canonical=verified.words.map(w=>({en:w.en,tr:w.tr,sinif:D.sinif,unite:D.unite}));O.D.kelimeler=canonical;O.sorular.slice(0,12).forEach((task,i)=>{task.k=canonical[i%canonical.length];task.l=canonical.slice();});O.sorular[12].l=canonical.slice();O.sorular[4].matchItems=verified.slots[4].pairs;O.sorular[4].matchOrder=null;}catch(e){checkpointSave();toast('Bağlantı kurulamadı. Aynı duraktan devam etmek için yeniden dene: '+e.message);O=null;return;}
    }
    if(!saved&&!sinifModu()){
      try{await parkurEnerjiAdim(O.runId,1,null);}
      catch(e){checkpointSave();toast('Enerji bağlantısı kurulamadı; bölümün korundu. Tekrar dene.');O=null;return;}
    }
    checkpointSave();soruCiz();
  }
  function oyunUst() {
    let s = O.sorular[O.i], [, ik, ad] = TIPLER.find(t => t[0] === s.tip) || ['sesliFinal','🎙️','Papi ile Konuş'];
    let enerji = typeof window.genelEnerjiKalan === 'number' ? window.genelEnerjiKalan : '–';
    return `<div class="bz-oyun-ust"><button class="kapat" id="bzCik" ${window.dmPapiFirstPractice?.locked('school')?'disabled title="İlk çalışmanı tamamla"':''} aria-label="Oyundan çık" style="width:38px;height:38px;border-radius:12px;border:0;background:rgba(255,255,255,.14);color:#fff;font-weight:900;cursor:pointer;flex:none">✕</button>
      <button class="bz-geri-soru" id="bzGeriSoru" aria-label="Önceki soruları gör" ${O.gecmis.some(Boolean) ? '' : 'disabled'}>←</button>
      <div class="bz-noktalar" aria-label="İlerleme">${O.sorular.map((_, j) => `<i class="${j < O.i ? (O.sonuclar[j] ? 'd' : 'y') : j === O.i ? 'a' : ''}"></i>`).join('')}</div>
      <span style="font-weight:900;font-size:13px">${O.i + 1}/${O.sorular.length}</span><span class="sp-combo" aria-label="Kombo">🔥 ${O.kombo||0}</span><span class="bz-enerji-pill" aria-label="Enerji">⚡ ${enerji}</span><span class="sp-gold" aria-label="Altın">🪙 ${yoVar()?yo.altin||0:0}</span></div>
      <div class="bz-govde" id="bzGovde"><span class="bz-tip">${ik} ${ad}${s.tekrarMi ? ' · 🔁 Önceki üniteden' : ''}</span>`;
  }
  function ustTazele() { let e = document.querySelector('.bz-enerji-pill'); if (e && typeof window.genelEnerjiKalan === 'number') e.textContent = '⚡ ' + window.genelEnerjiKalan; const c=document.querySelector('.sp-combo'),g=document.querySelector('.sp-gold');if(c)c.textContent='🔥 '+(O.kombo||0);if(g)g.textContent='🪙 '+(yoVar()?yo.altin||0:0); }
  /* ---------- ← Önceki soruları gör ---------- */
  function incelemeAc(k) {
    let son = O._cevaplandi ? O.i : O.i - 1; if (son < 0) return;
    k = Math.max(0, Math.min(son, k === undefined ? son : k));
    while (k > 0 && !O.gecmis[k]) k--;
    let g = O.gecmis[k]; if (!g) return;
    let [, ik, ad] = TIPLER.find(t => t[0] === g.tip) || ['sesliFinal','🎙️','Papi ile Konuş'];
    $('bzAlan').style.display = 'none'; let tip = document.querySelector('#bzGovde .bz-tip'); if (tip) tip.style.visibility = 'hidden';
    let inc = $('bzInceleme'); inc.style.display = '';
    inc.innerHTML = `<div class="bz-inceleme-bas"><button type="button" id="bzIncOnce" ${k > 0 ? '' : 'disabled'} aria-label="Daha önceki soru">‹</button><span style="flex:1">👀 ${k + 1}. soru · ${ik} ${ad} ${O.sonuclar[k] ? '✅' : '❌'}</span><button type="button" id="bzIncSonra" ${k < son ? '' : 'disabled'} aria-label="Sonraki soru">›</button><button type="button" id="bzIncKapat">Soruya dön</button></div><div class="bz-inceleme-govde dm-question-review" data-question-type="${g.tip}">${g.html}</div>`;
    $('bzIncOnce').onclick = () => incelemeAc(k - 1); $('bzIncSonra').onclick = () => incelemeAc(k + 1);
    $('bzIncKapat').onclick = () => { inc.style.display = 'none'; inc.innerHTML = ''; $('bzAlan').style.display = ''; if (tip) tip.style.visibility = ''; };
  }
  function soruCiz() {
    if (zamanlayici) { clearInterval(zamanlayici); zamanlayici = null; }
    if (O.i >= O.sorular.length) return bitir();
    let p = perdeAc(), s = O.sorular[O.i];
    O.jk = {};
    p.innerHTML = `<div class="bz-oyun dm-question-panel" data-question-type="${s.tip}">${oyunUst()}</div></div><div id="bzAlan"></div><div class="bz-inceleme" id="bzInceleme" style="display:none"></div>`;
    $('bzCik').onclick = () => { checkpointSave();window.dmPapiFirstPractice?.recover('school');let b=O.b,d=O.d;kapat();durakKarti(b,d); };
    $('bzGeriSoru').onclick = () => incelemeAc();
    const nav=p.querySelector('.bz-oyun-ust');if(nav){const next=document.createElement('button');next.type='button';next.className='bz-geri-soru';next.textContent='→';next.title='Cevaplanan soruları ileri/geri incele';next.setAttribute('aria-label','Sonraki cevaplanmış soruyu incele');next.disabled=!O.gecmis.some(Boolean);next.onclick=()=>incelemeAc(0);nav.insertBefore(next,nav.querySelector('.bz-noktalar'));}
    let alan = $('bzAlan');
    try {
      const renderers={ lab, risk, eksik, hafiza, hiz, harf, sifre, es, tren, cumle, dikte, sesliFinal, dinleAnlam, hata, hatirla, miniDiyalog, cumleTamamla, kelimeKur, duydugunuBul, eslestir };
      if(typeof renderers[s.tip]!=='function'&&!window.DMRouteQuestions?.TYPES.includes(s.tip))throw new Error('Bilinmeyen soru: '+s.tip);
      if(O._cevaplandi&&O.gecmis[O.i]){
        alan.innerHTML=O.gecmis[O.i].html;alan.querySelectorAll('button,input').forEach(x=>x.disabled=true);
        const next=document.createElement('button');next.className='bz-btn mor';next.textContent=O.i+1<O.sorular.length?'Devam →':'Sonucu gör';next.onclick=devamEt;alan.append(next);
      }else{const state=O,index=O.i;const handled=window.DMRouteQuestions?.renderTask(s,alan,{en:EN,tr:TR,pool:O.tum,targetPool:O.D.kelimeler,shuffle:karistir,speak:oku,answer:cevap,record:actual=>window.dmVerifiedGames?.record(O.i,actual,O.runId),feedback:good=>window.dmAnswerFeedback?.(good),current:()=>O===state&&O.i===index&&!O._cevaplandi&&alan.isConnected});if(!handled)renderers[s.tip](s,alan);if(O.inputDraft?.question===O.i){const input=alan.querySelector('#'+O.inputDraft.id);if(input)input.value=O.inputDraft.value;}}
      if(!alan.textContent.trim())throw new Error('Soru içeriği boş');
      try { window.dmCalmQuestion?.(p); } catch(layoutError) { console.warn('[Parkur] görünüm',layoutError); }
      if(!alan.textContent.trim())throw new Error('Soru görünümü boşaltıldı');
      window.DMRouteQuestions?.mountSchool(p,O.i+1,O.sorular.length,O.kombo||0);
    } catch(err) {
      console.error('[DijiMedu parkur] Soru çizimi başarısız:',s.tip,err);
      alan.innerHTML='<div class="bz-etiket">🦜 Papi yardım ediyor</div><div class="bz-soru">Bu soruyu gösteremedik.</div><p class="bz-ipucu">İlerlemen korunuyor. Soruyu yeniden yükleyebilir veya haritaya dönebilirsin.</p><button type="button" class="bz-btn" id="bzRetryQuestion">↻ Soruyu yeniden dene</button><button type="button" class="bz-btn" id="bzReturnMap">🏰 Haritaya dön</button>';
      alan.querySelector('#bzRetryQuestion').onclick=()=>soruCiz();
      alan.querySelector('#bzReturnMap').onclick=()=>{let b=O.b,d=O.d;kapat();durakKarti(b,d);};
    }
    p.scrollTop = 0;
  }
  /* ---------- Öğretim ve ilk soru ücretsiz; sonraki sorular 1 ⚡ ---------- */
  async function devamEt() {
    if(!O||O.advancing)return;
    const state=O;state.advancing=true;
    try{
    const ilerle = () => { O.i++; O.answerRecorded=false; O._cevaplandi = false; O._ikinci = false; O._pas = false;O.inputDraft=null;O.matchState=null;O.letterState=null; checkpointSave();soruCiz(); };
    if(O.pendingAnswer){
      try{const r=await O.pendingAnswer;if(!r&&O.i<12)await parkurEnerjiAdim(O.runId,O.i+1,!!O.sonuclar[O.i]);O.answerRecorded=true;}catch(e){toast('Cevap kaydedilemedi: '+e.message);return;}
      O.pendingAnswer=null;
    }
    if(O._cevaplandi&&!O.answerRecorded&&!sinifModu()&&O.i<12){try{await parkurEnerjiAdim(O.runId,O.i+1,!!O.sonuclar[O.i]);O.answerRecorded=true;checkpointSave();}catch(e){toast('Cevap kaydedilemedi: '+e.message);return;}}
    const next=O.i+1;
    if(next>=O.sorular.length || sinifModu() || O.sorular[next].tip==='sesliFinal') return ilerle();
    if(next!==1 && typeof window.genelEnerjiKalan==='number' && window.genelEnerjiKalan<1)
      return enerjiBitti(ilerle);
    try{await parkurEnerjiAdim(O.runId,next+1,null);}
    catch(e){checkpointSave();const energy=/enerji|energy|yetersiz|bitti/i.test(String(e.message||''));toast(energy?'⚡ '+e.message:'Bağlantı kesildi. Aynı sorudan devam edebilirsin; yeniden dene.');if(energy)window.dmEnerjiPaketPaneli?.();return;}
    if(next!==1)O.harcanan++;
    ilerle();
    }finally{state.advancing=false;checkpointSave();}
  }
  function enerjiBitti() {
    checkpointSave();document.activeElement?.blur();window.dmPapiFirstPractice?.recover('school');
    document.getElementById('bzEnerjiDurdu')?.remove();
    if(typeof window.genelEnerjiBittiGoster==='function')window.genelEnerjiBittiGoster();else window.dmEnerjiPaketPaneli?.();
  }
  function cevap(iyi, dogruMetin,actual) {
    if (O._cevaplandi) return;
    if(O.i<12)window.dmVerifiedGames?.record(O.i,actual===undefined?O.verifiedAnswer:actual,O.runId);
    if(iyi)window.DijiMeduPapiFeedback?.correct({detail:dogruMetin||'Doğru cevap!',duration:850,card:false}); O._cevaplandi = true;
    if (zamanlayici) { clearInterval(zamanlayici); zamanlayici = null; }
    O.sonuclar[O.i] = iyi;
    const yardimli = typeof actual === 'string' && actual.startsWith(window.DMRouteQuestions?.ASSISTED || '~yardim~');
    if (iyi) {
      O.dogru++; O.kombo=yardimli?0:(O.kombo||0)+1;
      if (window.OC) OC.dogru(O._ikinci || O._pas ? 2 : 1);

    } else { O.yanlis++; O.kombo=0; if (window.OC) OC.yanlis(false); }
    if(!sinifModu() && O.i<12){
      const state=O;state.answerRecorded=false;O.pendingAnswer=parkurEnerjiAdim(O.runId,O.i+1,!!iyi).then(d=>{state.answerRecorded=true;if(O===state)checkpointSave();
        if(d.eklenen>0)window.DMRouteQuestions?.celebrate(perde,d.eklenen);window.DMRouteQuestions?.updateSchool(perde,state.kombo||0);
        return d;
      }).catch(e=>{state.answerRecorded=false;state.answerError=e.message;if(O===state)checkpointSave();return null;});
    }
    ustTazele();
    ses(iyi ? 'dogru' : 'yanlis');window.dmAnswerFeedback?.(iyi);window.DMRouteQuestions?.updateSchool(perde,O.kombo||0);
    let g = document.createElement('div'); g.className = 'bz-geri-bildirim ' + (iyi ? 'iyi' : 'kotu'); g.setAttribute('role', 'status');
    const target=O.sorular[O.i], word=target.k||(target.l&&target.l[0]);
    const translated=word&&typeof TR==='function'?TR(word):'';
    const english=word&&typeof EN==='function'?EN(word):'';
    if(!iyi&&!sinifModu()&&word)window.dmWrongWords?.add({en:english,tr:translated,source:'macera-haritasi'});
    g.innerHTML = (O._pas ? '🔄 Pas geçtin (doğru sayıldı)' : iyi ? ['✨ Büyü tuttu!', '✨ Harika!', '✨ Mükemmel!'][Math.floor(Math.random() * 3)] : '💨 Olmadı!') + (!iyi ? `<div style="font-size:13.5px;margin-top:4px">Doğru kelime: <b>${kac(english||dogruMetin||'')}</b><br>Türkçesi: <b>${kac(translated||'')}</b></div>` : dogruMetin ? `<div style="font-size:13.5px;margin-top:4px">${kac(dogruMetin)}</div>` : '');
    let alan = $('bzAlan'); alan.appendChild(g);
    O.gecmis[O.i] = { tip: O.sorular[O.i].tip, html: alan.innerHTML };
    let kalanSoru = O.i + 1 < O.sorular.length, enerjiNotu = kalanSoru && O.i!==0 && !sinifModu() && O.sorular[O.i+1].tip!=='sesliFinal' ? ' · ⚡ −1' : '';
    let dev = document.createElement('button'); dev.className = 'bz-btn mor'; dev.style.marginTop = '10px'; dev.textContent = kalanSoru ? 'Devam →' + enerjiNotu : '🏁 Sonucu gör';
    dev.onclick = devamEt;
    alan.appendChild(dev);
    if(target.tip==='teach'&&iyi){
      dev.textContent='🎉 Tebrikler! Sorulara geç →';
      const state=O,index=O.i;let advancing=false;
      dev.onclick=()=>{if(advancing||O!==state||O.i!==index||!dev.isConnected)return;advancing=true;dev.disabled=true;devamEt().finally(()=>{advancing=false;if(dev.isConnected)dev.disabled=false;});};
      setTimeout(()=>{if(O===state&&O.i===index&&dev.isConnected)dev.click();},1000);
    }
    checkpointSave(); let gs = $('bzGeriSoru'); if (gs) gs.disabled = false;
    setTimeout(() => { dev.focus({preventScroll:true}); window.dmSelectedPlayFit?.(); }, 60);
  }
  const celdirici = (k, f, adet) => karistir(O.tum.filter(x => x !== k && norm(f(x)) !== norm(f(k)))).map(f).filter((v, i, a) => a.indexOf(v) === i).slice(0, adet);
  function secenekler(alan, liste, dogru, gosterilecek) {
    alan.insertAdjacentHTML('beforeend', `<div class="bz-secenekler">${liste.map((x, i) => `<button class="bz-sec" data-i="${i}">${kac(x)}</button>`).join('')}</div>`);
    O.jk.yari = () => {
      let yanlis = [...alan.querySelectorAll('.bz-sec')].filter(b => liste[+b.dataset.i] !== dogru && !b.disabled);
      if (!yanlis.length) return false;
      karistir(yanlis).slice(0, Math.max(1, Math.floor(yanlis.length / 2 + .5))).forEach(b => b.disabled = true);
    };
    alan.querySelectorAll('.bz-sec').forEach(b => b.onclick = () => {
      let iyi = liste[+b.dataset.i] === dogru;
      alan.querySelectorAll('.bz-sec').forEach(x => { x.disabled = true; if (liste[+x.dataset.i] === dogru) x.classList.add('dogru'); });
      if (!iyi) b.classList.add('yanlis');
      cevap(iyi, iyi ? '' : gosterilecek || dogru,liste[+b.dataset.i]);
    });
  }
  /* 🔬 Kelime Laboratuvarı: İngilizceyi dinle, 2 şıktan anlamı */
  function lab(s, alan) {
    alan.innerHTML = `<div class="bz-etiket">🇬🇧 İngilizce kelime</div><div class="bz-soru">${kac(EN(s.k))}</div><div class="bz-ipucu">👉 Bu kelimenin Türkçe anlamını seç <button class="bz-ses" id="bzDinle" style="margin-left:6px;padding:6px 10px;font-size:13px">🔊</button></div>`;
    $('bzDinle').onclick = () => oku(EN(s.k)); oku(EN(s.k));
    secenekler(alan, karistir([TR(s.k), ...celdirici(s.k, TR, window.DMRouteQuestions?.advancedLearner?.() ? 3 : 1)]), TR(s.k)); /* B1–B2: 4 seçenek */
  }
  /* Yeni öğretim görevleri: tüm yanıtlar mevcut cevap/XP işleyicisini kullanır. */
  function dinleAnlam(s, alan) {
    const en=EN(s.k), tr=TR(s.k);
    alan.innerHTML='<div class="bz-etiket">🎧 Dinle ve seç</div><div class="bz-soru">Papi hangi kelimeyi söylüyor?</div>'+
      '<button type="button" class="bz-ses" id="bzDinle">🔊 Tekrar dinle</button>'+
      '<div class="bz-ipucu">Dinlediğin kelimenin Türkçe anlamını seç.</div>';
    $('bzDinle').onclick=()=>oku(en);oku(en);
    secenekler(alan,karistir([tr,...celdirici(s.k,TR,3)]),tr);
  }
  function hata(s, alan) {
    const en=EN(s.k),tr=TR(s.k),yan=celdirici(s.k,TR,1)[0];
    const yanlis=s.wrongMeaning??(!!yan&&Math.random()<0.5);s.wrongMeaning=yanlis;const anlam=yanlis?yan:tr;
    alan.innerHTML='<div class="bz-etiket">Bu anlam doğru mu?</div>'+
      '<div class="bz-soru">'+kac(en)+' = '+kac(anlam)+'</div>'+
      '<div class="bz-ipucu">Eşleştirmeyi kontrol et, sonra seç.</div>';
    secenekler(alan,['Doğru','Yanlış'],yanlis?'Yanlış':'Doğru');
  }
  function hatirla(s, alan) {
    const en=EN(s.k),tr=TR(s.k);
    alan.innerHTML='<div class="bz-etiket">🧠 Hatırlama görevi</div>'+
      '<div class="bz-soru">'+kac(tr)+'</div>'+
      '<div class="bz-ipucu">Kelimenin İngilizce karşılığını hatırla.</div>';
    secenekler(alan,karistir([en,...celdirici(s.k,EN,3)]),en);
  }
  function miniDiyalog(s, alan) {
    const en=EN(s.k),tr=TR(s.k);
    alan.innerHTML='<div class="bz-etiket">💬 Papi ile konuşma</div>'+
      '<div class="bz-soru">'+kac(tr)+' İngilizcede hangisi?</div>'+
      '<div class="bz-ipucu">Papi\'ye İngilizce doğru cevabı ver.</div>';
    secenekler(alan,karistir([en,...celdirici(s.k,EN,3)]),en);
  }
  function cumleTamamla(s,alan) {
    const en=EN(s.k),tr=TR(s.k);
    alan.innerHTML='<div class="bz-etiket">İngilizcesini seç</div><div class="bz-soru">'+kac(tr)+'</div>';
    secenekler(alan,karistir([en,...celdirici(s.k,EN,3)]),en);
  }
  function kelimeKur(s,alan) {
    const en=EN(s.k), letters=Array.from(en), positions=letters.map((c,i)=>/[a-z]/i.test(c)?i:-1).filter(i=>i>=0);
    const tokens=O.letterState?.tokens||karistir(positions.map(i=>({letter:letters[i],position:i}))),chosen=O.letterState?.chosen||[],used=new Set(chosen.map(t=>t.index));let wrong=O.letterState?.wrong||0;const saveLetters=()=>{O.letterState={tokens,chosen,wrong};checkpointSave();};
    alan.innerHTML='<div class="bz-etiket">🔤 Kelimeyi keşfet</div><div class="bz-soru">'+kac(TR(s.k))+'</div><div class="bz-ipucu">Doğru harfe dokun: yeşilse yerine yerleşir, kırmızıysa tekrar deneyebilirsin. Boşluk ve noktalama otomatik.</div><div class="dm-parkur-letters" id="bzLetterAnswer" aria-live="polite"></div><div class="dm-parkur-letters" id="bzLetterPool"></div><p class="dm-letter-notice" id="bzLetterHint" role="status"></p><button class="bz-btn" id="bzLetterUndo" type="button">↶ Son harfi geri al</button>';
    const answer=alan.querySelector('#bzLetterAnswer'),pool=alan.querySelector('#bzLetterPool'),hint=alan.querySelector('#bzLetterHint');
    const draw=()=>{
      answer.innerHTML=letters.map((ch,i)=>positions.includes(i)?'<span class="dm-parkur-letter '+(chosen.some(t=>t.position===i)?'dm-right':'')+'">'+(chosen.find(t=>t.position===i)?.letter||'＿')+'</span>':ch===' '?' <span class="dm-auto-space"> </span> ':'<span class="dm-auto-punctuation">'+kac(ch)+'</span>').join('');
      pool.innerHTML='';tokens.forEach((t,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='dm-parkur-letter';btn.textContent=t.letter;btn.disabled=used.has(i);btn.onclick=()=>{
        if(O._cevaplandi)return;
        const expected=positions[chosen.length];if(expected===undefined)return;
        if(t.letter.toLocaleLowerCase('en')!==letters[expected].toLocaleLowerCase('en')){
          wrong++;saveLetters();btn.classList.add('dm-wrong');hint.textContent='🔴 Yanlış harf ('+wrong+'/3).';if(wrong>=3){hint.textContent='Doğru cevap: '+en+' · Türkçesi: '+TR(s.k);pool.querySelectorAll('button').forEach(x=>x.disabled=true);setTimeout(()=>{if(O._cevaplandi)return;cevap(false,en);setTimeout(()=>{if(O._cevaplandi)devamEt();},1300);},900);return;}setTimeout(()=>{if(btn.isConnected)btn.classList.remove('dm-wrong')},700);return;
        }
        used.add(i);chosen.push({letter:t.letter,position:expected,index:i});hint.textContent='';saveLetters();draw();
        if(chosen.length===positions.length)cevap(true,'');
      };pool.appendChild(btn);});
    };
    alan.querySelector('#bzLetterUndo').onclick=()=>{if(O._cevaplandi)return;const item=chosen.pop();if(item)used.delete(item.index);hint.textContent='';saveLetters();draw();};draw();
  }

  function eslestir(s,alan) {
    const target=s.k;
    if(!s.matchItems){
      // Keep the indexed pairs of an already-started checkpoint from the old renderer.
      s.matchItems=O.matchState?[target,...O.tum.filter(k=>k!==target&&EN(k)&&TR(k))].filter((k,i,a)=>a.findIndex(x=>EN(x)===EN(k))===i).slice(0,4):window.DMRouteQuestions.matchingWords(target,O.tum,EN,TR,karistir,O.owner||isim());
      s.matchOrder=karistir(s.matchItems.map((_,i)=>i));checkpointSave();
    }
    const items=s.matchItems;
    if(!s.matchOrder){s.matchOrder=karistir(items.map((_,i)=>i));checkpointSave();}
    const shuffled=s.matchOrder.map(i=>items[i]);
    alan.innerHTML='<div class="bz-etiket">🔗 Anlamları eşleştir</div><div class="bz-ipucu">Soldaki İngilizce kelimeyi sağdaki Türkçe anlamıyla eşleştir.</div><div class="dm-match-grid"><div id="bzMatchEn"></div><div id="bzMatchTr"></div></div><p id="bzMatchStatus" role="status"></p>';
    const L=alan.querySelector('#bzMatchEn'),R=alan.querySelector('#bzMatchTr'),status=alan.querySelector('#bzMatchStatus');
    const matchedKeys=O.matchState?.matchedKeys||[];let selected=O.matchState?.selected??null,matched=matchedKeys.length,mistakes=O.matchState?.mistakes||0;const saveMatch=()=>{O.matchState={selected,matchedKeys,mistakes};checkpointSave();};
    items.forEach((k,i)=>{const btn=document.createElement('button');btn.className='dm-match-option';btn.textContent=EN(k);btn.dataset.key=String(i);btn.onclick=()=>{if(btn.disabled)return;L.querySelectorAll('button').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});selected=i;btn.classList.add('selected');btn.setAttribute('aria-pressed','true');status.textContent='Türkçe anlamını seç.';saveMatch();};if(matchedKeys.includes(i)){btn.disabled=true;btn.classList.add('dm-right');}else if(selected===i)btn.classList.add('selected');L.append(btn);});
    shuffled.forEach(k=>{const index=items.indexOf(k),btn=document.createElement('button');btn.className='dm-match-option';btn.textContent=TR(k);btn.onclick=()=>{
      if(selected===null||btn.disabled)return;
      if(selected===index){const left=L.querySelector('[data-key="'+index+'"]');left.disabled=true;left.classList.remove('selected');left.classList.add('dm-right');btn.disabled=true;btn.classList.add('dm-right');matchedKeys.push(index);selected=null;matched++;saveMatch();window.dmAnswerFeedback?.(true);status.textContent='🟢 Doğru eşleştirme!';if(matched===items.length)cevap(mistakes===0,mistakes?'':EN(target),items.map(k=>({en:EN(k),tr:TR(k)})));}
      else{window.dmVerifiedGames?.record(O.i,items.map((w,j)=>({en:EN(w),tr:j===selected?TR(k):TR(w)})),O.runId);window.dmAnswerFeedback?.(false);mistakes++;saveMatch();const left=L.querySelector('[data-key="'+selected+'"]');left?.classList.add('dm-wrong');btn.classList.add('dm-wrong');status.textContent='🔴 Eşleşmedi, tekrar dene.';setTimeout(()=>{btn.classList.remove('dm-wrong');left?.classList.remove('dm-wrong');},800);}
    };if(matchedKeys.includes(index)){btn.disabled=true;btn.classList.add('dm-right');}R.append(btn);});
  }
  function duydugunuBul(s,alan) {
    const en=EN(s.k);
    alan.innerHTML='<div class="bz-etiket">👂 Duyduğunu bul</div><div class="bz-soru">🔊 Hangi İngilizce sözcüğü duydun?</div><button type="button" class="bz-ses" id="bzDuyTekrar">Tekrar dinle</button><div class="bz-ipucu">Sesi dinleyip doğru İngilizceyi seç.</div>';
    alan.querySelector('#bzDuyTekrar').onclick=()=>oku(en);oku(en);
    secenekler(alan,karistir([en,...celdirici(s.k,EN,3)]),en);
  }
  /* 13th task: selectable playing cards, retaining the saved final-card cursor. */
  function sesliFinal(s, alan) {
    const list=s.l.map(k=>({en:EN(k),tr:TR(k)}));
    let remaining=Array.isArray(O.voiceRemaining)?O.voiceRemaining.slice():list.map((_,i)=>i),locked=false;
    function render(){
      if(!alan.isConnected)return;
      if(!remaining.length){cevap(true,'Tüm kelime kartları tamamlandı');return;}
      const word=list[remaining[0]],wrong=list.find(w=>norm(w.en)!==norm(word.en)&&norm(w.tr)!==norm(word.tr))?.tr||celdirici(s.l[remaining[0]],TR,1)[0]||'Bilmiyorum';
      const options=karistir([word.tr,wrong]);locked=false;
      const progress=alan.querySelector('.rq-progress');
      alan.innerHTML='<div class="bz-etiket">🃏 13. Görev · Kelime kartları</div><div class="dm-final-card dm-final-current"><span class="dm-final-card-label">'+(list.length-remaining.length+1)+' / '+list.length+'</span><strong>'+kac(word.en)+'</strong><small>Türkçe anlamını seç</small></div><div class="bz-secenekler">'+options.map((v,i)=>'<button class="bz-sec" type="button" data-final="'+i+'">'+kac(v)+'</button>').join('')+'</div><p id="bzCardStatus" role="status"></p>';
      if(progress)alan.prepend(progress);
      alan.querySelectorAll('[data-final]').forEach(btn=>btn.onclick=()=>{
        if(locked)return;locked=true;const good=norm(options[+btn.dataset.final])===norm(word.tr);
        alan.querySelectorAll('[data-final]').forEach(x=>{x.disabled=true;if(norm(options[+x.dataset.final])===norm(word.tr))x.classList.add('dogru');});
        if(!good){btn.classList.add('yanlis');window.dmWrongWords?.add({...word,source:'parkur-final'});}
        alan.querySelector('#bzCardStatus').textContent=good?'✅ Doğru!':'Doğrusu: '+word.en+' · Bu kelime tekrar listene eklendi.';
        ses(good?'dogru':'yanlis');window.dmAnswerFeedback?.(good);if(good){remaining.shift();O.voiceRemaining=remaining.slice();checkpointSave();}
        const next=document.createElement('button');next.className='bz-btn';next.textContent=!good?'Tekrar dene':remaining.length?'Sonraki kart →':'Kartları tamamla ✓';next.onclick=render;alan.append(next);
      });
    }render();
  }
  /* 🎈 Risk Balonları: Türkçeden İngilizceye, 4 şık */
  function risk(s, alan) {
    alan.innerHTML = `<div class="bz-etiket">🇹🇷 Türkçe kelime</div><div class="bz-soru">${kac(TR(s.k))}</div><div class="bz-ipucu">👉 İngilizcesi hangisi? Doğru balonu seç 🎈</div>`;
    secenekler(alan, karistir([EN(s.k), ...celdirici(s.k, EN, 3)]), EN(s.k));
  }
  /* 🌪️ Hız Fırtınası: 6 saniyede 3 şıktan anlamı */
  function hiz(s, alan) {
    alan.innerHTML = `<div class="bz-etiket">🇬🇧 İngilizce kelime</div><div class="bz-soru">${kac(EN(s.k))}</div><div class="bz-ipucu">👉 Çabuk! Süre bitmeden Türkçe anlamını seç ⏱️</div><div class="bz-sure"><i id="bzSure" style="width:100%"></i></div>`;
    let sure = 6000, bas = Date.now();
    zamanlayici = setInterval(() => {
      let kalan = Math.max(0, sure - (Date.now() - bas)); let el = $('bzSure'); if (el) el.style.width = (kalan / sure * 100) + '%';
      if (kalan <= 0) { clearInterval(zamanlayici); zamanlayici = null; alan.querySelectorAll('.bz-sec').forEach(x => { x.disabled = true; if (x.textContent === TR(s.k)) x.classList.add('dogru'); }); cevap(false, TR(s.k) + ' (süre doldu)'); }
    }, 100);
    secenekler(alan, karistir([TR(s.k), ...celdirici(s.k, TR, 2)]), TR(s.k));
  }
  /* ✏️ Eksik Harf: eksik harfleri yerleştir */
  function eksik(s, alan) {
    let w = EN(s.k).toLowerCase(), n = Math.max(1, Math.round(w.length / 3));
    let gizli = karistir([...Array(w.length).keys()].filter(i => /[a-z]/i.test(w[i]))).slice(0, n).sort((a, b) => a - b);
    let dolu = {}, harfler = karistir([...gizli.map(i => w[i]), ...karistir('aeioulnrst'.split('').filter(h => !w.includes(h))).slice(0, 2)]).map((h, i) => ({ h, i, k: false }));
    O.jk.yari = () => { let f = harfler.filter(x => !x.k && !gizli.some(i => w[i] === x.h)); if (!f.length) return false; f.forEach(x => x.k = true); ciz(); };
    O.jk.harf = () => { let bos = gizli.find(i => !dolu[i] || dolu[i].h !== w[i]); if (bos === undefined) return false; if (dolu[bos]) { dolu[bos].k = false; delete dolu[bos]; } let x = harfler.find(y => !y.k && y.h === w[bos]); if (!x) return false; dolu[bos] = x; x.k = true; ciz(); };
    const ciz = () => {
      const progress=alan.querySelector('.rq-progress');
      alan.innerHTML = `<div class="bz-etiket">🇹🇷 Türkçesi</div><div class="bz-soru" style="font-size:20px">${kac(TR(s.k))}</div><div class="bz-ipucu">👉 Aşağıdaki harflere dokunarak İngilizce kelimedeki boşlukları doldur</div>
        <div class="bz-slotlar" lang="en">${[...w].map((h, i) => gizli.includes(i) ? `<button class="bz-slot${dolu[i] ? ' dolu dm-right' : ''}" data-s="${i}" aria-label="boşluk">${dolu[i] ? dolu[i].h : ''}</button>` : `<span class="bz-slot sabit">${h}</span>`).join('')}</div>
        <div class="bz-harfler" lang="en">${harfler.map((x, j) => `<button class="bz-cip2${x.k ? ' bos' : ''}" data-h="${j}">${x.h}</button>`).join('')}</div>
        <button class="bz-btn mor" id="bzKontrol" style="margin-top:14px" ${gizli.every(i => dolu[i]) ? '' : 'disabled'}>Kontrol et</button>`;
      if(progress)alan.prepend(progress);
      alan.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { let x = harfler[+b.dataset.h]; if (x.k) return; let bos = gizli.find(i => !dolu[i]); if (bos === undefined) return; if(x.h!==w[bos]){window.dmVerifiedGames?.record(O.i,[...w].map((ch,i)=>i===bos?x.h:dolu[i]?.h||ch).join(''),O.runId);b.classList.remove('dm-wrong');void b.offsetWidth;b.classList.add('dm-wrong');ses('yanlis');window.dmAnswerFeedback?.(false);try{navigator.vibrate?.(120);}catch{}setTimeout(()=>b.classList.remove('dm-wrong'),650);return;} dolu[bos] = x; x.k = true; ciz();if(window.dmLetterFeedback)window.dmLetterFeedback('letter');else ses('dogru'); });
      alan.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { let i = +b.dataset.s; if (dolu[i]) { dolu[i].k = false; delete dolu[i]; ciz(); } });
      $('bzKontrol').onclick = () => { let iyi = gizli.every(i => dolu[i].h === w[i]); alan.querySelectorAll('button').forEach(x => x.disabled = true); cevap(iyi, iyi ? '' : w,[...w].map((ch,i)=>dolu[i]?.h||ch).join('')); };
    };
    ciz();
  }
  /* 🃏 Hafıza Sandığı: 3 çift, en fazla 2 hatayla */
  function hafiza(s, alan) {
    let kartlar = karistir(s.l.flatMap((k, i) => [{ i, t: EN(k) }, { i, t: TR(k) }])), acik = [], bulunan = 0, hata = 0, kilit = false;
    alan.innerHTML = `<div class="bz-ipucu" style="font-size:15px;color:#fff">Kartları çevir, İngilizce-Türkçe çiftleri bul 🃏<br><small style="color:#c4b5fd">En fazla 2 hatayla büyü tutar</small></div><div class="bz-kartlar">${kartlar.map((k, j) => `<button class="bz-kart2" data-j="${j}" aria-label="Kapalı kart">✨</button>`).join('')}</div>`;
    O.jk.harf = () => {
      let bulunmamis = [...new Set(kartlar.map(k => k.i))].filter(i => !alan.querySelector(`.bz-kart2.tamam[data-ci="${i}"]`));
      if (!bulunmamis.length || kilit) return false;
      let ci = bulunmamis[0]; acik = [];
      kartlar.forEach((k, j) => { let e = alan.querySelector(`[data-j="${j}"]`); if (k.i === ci) { e.classList.add('acik', 'tamam'); e.textContent = k.t; e.dataset.ci = ci; } else if (!e.classList.contains('tamam')) { e.classList.remove('acik'); e.textContent = '✨'; } });
      if (++bulunan === 3) cevap(hata <= 2, hata <= 2 ? '' : `${hata} hata yaptın`);
    };
    alan.querySelectorAll('.bz-kart2').forEach(b => b.onclick = () => {
      let j = +b.dataset.j; if (kilit || acik.includes(j) || b.classList.contains('tamam')) return;
      b.classList.add('acik'); b.textContent = kartlar[j].t; acik.push(j);
      if (acik.length < 2) return;
      let [a, c] = acik; acik = [];
      if (kartlar[a].i === kartlar[c].i) { [a, c].forEach(x => { let e = alan.querySelector(`[data-j="${x}"]`); e.classList.add('tamam'); e.dataset.ci = kartlar[x].i; }); ses('dogru'); if (++bulunan === 3) cevap(hata <= 2, hata <= 2 ? '' : `${hata} hata yaptın`); }
      else { hata++; kilit = true; setTimeout(() => { [a, c].forEach(x => { let e = alan.querySelector(`[data-j="${x}"]`); e.classList.remove('acik'); e.textContent = '✨'; }); kilit = false; }, 800); }
    });
  }
  /* 🔗 Eş Bul: 3 çift, en fazla 1 hatayla */
  function es(s, alan) {
    let sol = karistir(s.l), sag = karistir(s.l), secS = null, secG = null, hata = 0, kalan = 3;
    alan.innerHTML = `<div class="bz-ipucu" style="font-size:15px;color:#fff">İngilizceyi Türkçesiyle eşleştir 🔗</div><div class="bz-es"><div id="bzSol"></div><div id="bzSag"></div></div>`;
    const dug = (k, taraf) => { let b = document.createElement('button'); b.className = 'bz-cip2'; b.textContent = taraf === 's' ? EN(k) : TR(k); b._k = k;
      b.onclick = () => {
        if (taraf === 's') { if (secS) secS.classList.remove('secili'); secS = b; oku(EN(k)); } else { if (secG) secG.classList.remove('secili'); secG = b; }
        b.classList.add('secili'); if (!secS || !secG) return;
        let a = secS, c = secG; secS = secG = null; a.classList.remove('secili'); c.classList.remove('secili');
        if (a._k === c._k) { a.classList.add('tamam'); c.classList.add('tamam'); ses('dogru'); if (--kalan === 0) cevap(hata <= 1, hata <= 1 ? '' : `${hata} hata yaptın`); }
        else { hata++; ses('yanlis'); [a, c].forEach(z => { z.classList.add('kotu'); setTimeout(() => z.classList.remove('kotu'), 450); }); }
      }; return b; };
    sol.forEach(k => $('bzSol').appendChild(dug(k, 's'))); sag.forEach(k => $('bzSag').appendChild(dug(k, 'g')));
    O.jk.harf = () => {
      let a = [...$('bzSol').children].find(b => !b.classList.contains('tamam')); if (!a) return false;
      let c = [...$('bzSag').children].find(b => b._k === a._k); [a, c].forEach(z => { z.classList.remove('secili'); z.classList.add('tamam'); }); secS = secG = null;
      if (--kalan === 0) cevap(hata <= 1, hata <= 1 ? '' : `${hata} hata yaptın`);
    };
  }
  /* 🔤 Harf Avı: harf harf tahmin, 5 hata hakkı */
  function harf(s, alan) {
    let w = EN(s.k).toLowerCase(), bil = new Set(), hata = 0, MAX = 5;
    O.jk.harf = () => { let h = [...w].find(x => !bil.has(x)); if (!h) return false; bil.add(h); ciz(); if ([...w].every(x => bil.has(x))) { oku(w); cevap(true); } };
    const ciz = () => {
      let cozuldu = [...w].every(h => bil.has(h));
      alan.innerHTML = `<div class="bz-ipucu" style="font-size:15px;color:#fff">İpucu: <b>${kac(TR(s.k))}</b></div><div class="bz-asma" lang="en">${[...w].map(h => bil.has(h) ? h.toLocaleUpperCase('en') : '_').join(' ')}</div>
        <div class="bz-can" aria-label="Kalan hak">${'❤️'.repeat(MAX - hata)}${'🤍'.repeat(hata)}</div>
        <div class="bz-harfler" lang="en">${'abcdefghijklmnopqrstuvwxyz'.split('').map(h => `<button class="bz-cip2${bil.has(h) ? (w.includes(h) ? ' iyi' : ' kotu') : ''}" data-h="${h}" ${bil.has(h) || cozuldu || hata >= MAX ? 'disabled' : ''} style="min-width:34px;height:40px">${h}</button>`).join('')}</div>`;
      alan.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { let h = b.dataset.h; bil.add(h); if (!w.includes(h)) hata++; ciz();
        if ([...w].every(x => bil.has(x))) { oku(w); cevap(true); } else if (hata >= MAX) cevap(false, w); });
    };
    ciz();
  }
  /* 🔐 Şifre Kırıcı: renk ipuçlarıyla 5 denemede */
  function sifre(s, alan) {
    let w = EN(s.k).toLowerCase(), N = w.length, denemeler = [], yaz = '', bitti = false, MAX = 5, ipucu = {};
    O.jk.harf = () => { let p = [...Array(N).keys()].find(i => !(i in ipucu)); if (p === undefined) return false; ipucu[p] = w[p]; ciz(); };
    const renk = g => { let r = Array(N).fill('x'), kalan = {}; [...w].forEach((h, i) => { if (g[i] === h) r[i] = 'g'; else kalan[h] = (kalan[h] || 0) + 1; }); [...g].forEach((h, i) => { if (r[i] !== 'g' && kalan[h] > 0) { r[i] = 's'; kalan[h]--; } }); return r; };
    const ciz = () => {
      let satirlar = [];
      for (let r = 0; r < MAX; r++) { let g = denemeler[r] || (r === denemeler.length ? yaz : ''), rk = denemeler[r] ? renk(denemeler[r]) : [];
        satirlar.push(`<div class="satir">${[...Array(N)].map((_, i) => `<span class="h ${rk[i] || ''}">${g[i] || ''}</span>`).join('')}</div>`); }
      alan.innerHTML = `<div class="bz-ipucu" style="font-size:14.5px;color:#fff">${N} harfli gizli kelimeyi bul · İpucu: <b>${kac(TR(s.k))}</b><br><small style="color:#c4b5fd">🟩 doğru yer · 🟨 kelimede var · ⬛ yok</small>${Object.keys(ipucu).length ? `<br>💡 ${Object.keys(ipucu).map(i => `${+i + 1}. harf <b>${ipucu[i].toLocaleUpperCase('en')}</b>`).join(' · ')}` : ''}</div>
        <div class="bz-wordle" aria-live="polite" lang="en">${satirlar.join('')}</div>
        <div class="bz-klavye" lang="en">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((sat, si) => `<div>${si === 2 ? '<button class="bz-cip2" data-x="sil" aria-label="Sil">⌫</button>' : ''}${[...sat].map(h => `<button class="bz-cip2" data-h="${h}" ${bitti ? 'disabled' : ''}>${h}</button>`).join('')}${si === 2 ? `<button class="bz-cip2" data-x="tamam" style="background:#22c55e;color:#fff" ${yaz.length === N && !bitti ? '' : 'disabled'}>✓</button>` : ''}</div>`).join('')}</div>`;
      alan.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { if (yaz.length < N) { yaz += b.dataset.h; ciz(); } });
      let sil = alan.querySelector('[data-x="sil"]'); if (sil) sil.onclick = () => { yaz = yaz.slice(0, -1); ciz(); };
      let ok = alan.querySelector('[data-x="tamam"]'); if (ok) ok.onclick = () => {
        denemeler.push(yaz); let dogru = yaz === w; yaz = '';
        if (dogru || denemeler.length >= MAX) { bitti = true; ciz(); oku(w); cevap(dogru, dogru ? '' : w); } else ciz();
      };
    };
    ciz();
  }
  /* 🎧 Kulak Dedektifi: dinle, yaz */
  function dikte(s, alan) {
    let w = EN(s.k);
    alan.innerHTML = `<div class="bz-etiket">Dinle ve yaz</div>
      <div style="display:flex;gap:8px;justify-content:center"><button class="bz-ses" id="bzD1">🔊 Dinle</button><button class="bz-ses" id="bzD2" aria-label="Yavaş dinle">🐢</button></div>
      <input class="bz-input" id="bzYaz" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="buraya yaz" aria-label="Duyduğun kelime">
      <button class="bz-btn mor" id="bzKontrol">Kontrol et</button><p class="bz-ipucu">İstersen yaz, istersen duyduğun kelimeyi seç.</p><div id="bzListenChoices" class="bz-secenekler"></div>`;
    const alternatives=karistir([w,...celdirici(s.k,EN,2)]);
    alternatives.forEach(value=>{const btn=document.createElement('button');btn.type='button';btn.className='bz-sec';btn.textContent=value;btn.onclick=()=>{$('bzYaz').value=value;kontrol();};$('bzListenChoices').append(btn);});
    let auto=setTimeout(()=>oku(w,.85),300);$('bzD1').onclick=()=>{clearTimeout(auto);oku(w,.85);};$('bzD2').onclick=()=>{clearTimeout(auto);oku(w,.35);};
    O.jk.harf = () => { let y = $('bzYaz'); if (!y || y.disabled) return false; let n = Math.ceil(w.length / 2); y.placeholder = w.slice(0, n) + '…'; let ip = alan.querySelector('.bz-ipucu'); if (ip) ip.innerHTML += `<br>💡 İlk harfler: <b lang="en">${kac(w.slice(0, n))}</b>… (${w.length} harf)`; };
    const kontrol = () => { let v = $('bzYaz').value; if (!v.trim()) return; $('bzYaz').disabled = true; $('bzKontrol').disabled = true; alan.querySelectorAll('#bzListenChoices button').forEach(b=>{b.disabled=true;if(norm(b.textContent)===norm(w))b.classList.add('dogru');else if(norm(b.textContent)===norm(v))b.classList.add('yanlis');}); let iyi = norm(v) === norm(w);$('bzYaz').blur(); cevap(iyi, iyi ? '' : `${w} (${TR(s.k)})`); };
    $('bzKontrol').onclick = kontrol; $('bzYaz').onkeydown = e => { if (e.key === 'Enter') kontrol(); };
  }
  /* 🚂 Kelime Treni ve 🧱 Cümle Ustası: kelimeleri doğru sıraya diz */
  function sirala(s, alan, trenMi) {
    let parca = String(s.c.en).replace(/[.,!?;:"]/g, ' ').trim().split(/\s+/);
    /* Kolaylaştırma: fazla vagon sayısı sınıfa göre (1–2. sınıf: yok, 3–4: 1, 5+: 2) */
    let sn = (O.D && O.D.sinif) || 5, fazlaSay = trenMi ? (sn <= 2 ? 0 : sn <= 4 ? 1 : 2) : 0;
    let ekstra = fazlaSay ? celdirici(null, EN, 10).map(w => w.toLowerCase()).filter(w => !/\s/.test(w) && harfMi(w) && !parca.map(x => x.toLowerCase()).includes(w)).slice(0, fazlaSay) : [];
    let havuz = karistir([...parca.map((w, i) => ({ w, dogruSira: i })), ...ekstra.map(w => ({ w, dogruSira: -1 }))]).map((x, i) => Object.assign(x, { i, k: false })), dizi = [];
    if (havuz.map(x => x.w).join(' ') === parca.join(' ') && havuz.length > 1) havuz.reverse();
    O.jk.yari = () => { let f = havuz.filter(x => x.dogruSira < 0 && !x.gitti); if (!f.length) return false; f.forEach(x => { x.gitti = true; x.k = true; let j = dizi.indexOf(x); if (j >= 0) dizi.splice(j, 1); }); ciz(); };
    O.jk.harf = () => {
      let hata = dizi.findIndex((x, j) => norm(x.w) !== norm(parca[j]));
      if (hata >= 0) dizi.splice(hata).forEach(x => { if (!x.gitti) x.k = false; });
      if (dizi.length >= parca.length) return false;
      let gerek = parca[dizi.length], x = havuz.find(y => !y.k && norm(y.w) === norm(gerek)); if (!x) return false;
      x.k = true; dizi.push(x); ciz();
    };
    const ciz = () => {
      let bos = Math.max(0, parca.length - dizi.length);
      alan.innerHTML = (trenMi
        ? `<div class="bz-etiket">🇹🇷 Bu cümleyi İngilizce kur</div><div class="bz-soru" style="font-size:20px">${kac(s.c.tr)}</div>`
        : `<div class="bz-etiket">🧱 Karışık kelimelerden cümle kur</div>${s.c.tr ? `<div class="bz-tr-anlam" style="margin:0 0 12px">🇹🇷 Anlamı: ${kac(s.c.tr)}</div>` : ''}`) +
        `<div class="bz-ipucu">👉 Aşağıdaki kelimelere <b>sırayla</b> dokun. Cümle <b>${parca.length} kelime</b>.${ekstra.length && !havuz.every(x => x.dogruSira >= 0 || x.gitti) ? ` <b>${ekstra.length}</b> kelime fazla, onları kullanma!` : ''} Yanlış koyduğuna dokunursan geri gelir.</div>
        <div class="bz-etiket">🚂 Senin cümlen</div>
        <div class="bz-cevap">${dizi.map((x, j) => `<button class="bz-cip2" data-g="${j}">${kac(x.w)}</button>`).join('')}${Array.from({ length: bos }, (_, j) => `<span class="bz-bos-vagon" aria-hidden="true">${dizi.length + j + 1}</span>`).join('')}</div>
        <div class="bz-etiket">🧩 Kelimeler</div>
        <div class="bz-tren-havuz">${havuz.map((x, j) => `<button class="bz-cip2${x.k ? ' bos' : ''}" data-h="${j}">${kac(x.w)}</button>`).join('')}</div>
        <button class="bz-btn mor" id="bzKontrol" style="margin-top:14px" ${dizi.length === parca.length ? '' : 'disabled'}>${dizi.length === parca.length ? 'Kontrol et' : `Kontrol et (${dizi.length}/${parca.length})`}</button>`;
      alan.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { let x = havuz[+b.dataset.h]; if (x.k || dizi.length >= parca.length) return; x.k = true; dizi.push(x); ciz(); });
      alan.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { let x = dizi.splice(+b.dataset.g, 1)[0]; if (!x.gitti) x.k = false; ciz(); });
      $('bzKontrol').onclick = () => { let iyi = norm(dizi.map(x => x.w).join(' ')) === norm(s.c.en); alan.querySelectorAll('button').forEach(x => x.disabled = true); oku(s.c.en); cevap(iyi, iyi ? '' : s.c.en + (trenMi || !s.c.tr ? '' : ` (${s.c.tr})`)); };
    };
    ciz();
  }
  const tren = (s, a) => sirala(s, a, true), cumle = (s, a) => sirala(s, a, false);

  /* ================= 5) SONUÇ ================= */
  function bitir() {
    window.dmPapiFirstPractice?.complete('school');
    let no = O.D.no, gecti = O.dogru >= GECME && O.sonuclar[O.sorular.length-1]===true, sure = Math.round((Date.now() - O.bas) / 1000);
    let puan = window.OC ? OC.puan() : O.dogru * 90, yil = gecti ? (O.dogru >= (O.schoolVersion===9?10:11) ? 3 : O.dogru >= (O.schoolVersion===9?8:9) ? 2 : 1) : 0;
    let yeniAcildi = false, parkurIlk=!tamam.has(no);O.finished=true;checkpointClear();
    if (gecti) {
      document.dispatchEvent(new Event('dm:school-lesson-completed'));
      let onceAcik = bolumAcik(O.b + 1);
      if (!tamam.has(no)) ilerlemeKaydet(no);
      if (yoVar()) { yo.baYildiz = yo.baYildiz || {}; yo.baYildiz[no] = Math.max(yo.baYildiz[no] || 0, yil);
        /* [Kota 29 Eki 2026] Öğrencide yıldızlar sonuç ekranının ödül sonrası tek kaydıyla sunucuya gider; burada yalnız cihaza yazılır. */
        const ogrenciKaydi = isim() && isim().toLowerCase() !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci);
        if (ogrenciKaydi) { yo.guncelleme = Date.now(); try { localStorage.setItem('ing_yo_' + isim(), JSON.stringify(yo)); } catch (e) {} }
        else if (typeof yoKaydet === 'function') yoKaydet(); }
      yeniAcildi = O.b < 3 && !onceAcik && bolumAcik(O.b + 1);
    }
    let b = O.b, d = O.d;
    /* [Kota 29 Eki 2026] Sıradaki durak (geçtiyse bir sonraki, geçemediyse aynı durak) ödül isteğiyle birlikte hazırlanır;
       öğrenci ona geçince ayrı başlatma isteği gönderilmez. */
    let parkurSonraki = null;
    try { const nd = gecti ? d + 1 : d; if (O.schoolVersion === 9 && nd < durakSayisi(b) && durakAcik(b, nd)) { const N = durakBilgi(b, nd); if (N && N.kelimeler && N.kelimeler.length && !checkpointRead(N.no)) parkurSonraki = { classNo: N.sinif, units: [N.unite], stopNo: N.no }; } } catch (e) {}
    kapat();                                   /* oyun penceresi kapanır, altta Parkur haritası */
    goster('harita', b);
    if (typeof genelSonucEkraniGoster === 'function')
      genelSonucEkraniGoster({ oyunAdi: `🧙 ${durakBilgi(b, d).sinif}. Sınıf ${durakBilgi(b, d).unite}. Ünite`, isim: isim(), puan, dogru: O.dogru, yanlis: O.yanlis, sureSaniye: sure, oyunKey: 'ba',
        rewardScope:{classNo:O.D.sinif,units:[O.D.unite],stopNo:no},parkurStopNo:no,parkurSonraki,parkurIlk,parkurGecti:gecti,parkurYildiz:yil,siralamaYok: true, devamFn: () => goster('harita', b), tekrarFn: () => oyunBaslat(b, d) });
    setTimeout(() => toast(gecti ? (yeniAcildi ? `🚪 ${b + 2}. bölümün kapısı açıldı!` : `✨ ${O.d + 1}. durak geçildi! ${'⭐'.repeat(yil)}`) : `💪 ${O.dogru}/${O.sorular.length} doğru. Geçmek için ${GECME} doğru ve kelime kartlarının tamamlanması gerekiyor!`), 700);
  }

  /* ================= GİRİŞ NOKTALARI: Parkur sekmesi = Büyü Akademisi ================= */
  let orgDunya = window.dunyaAc, parkurAcikTut = false;
  function yeniDonDugmesi() {
    if ($('bzYeniDon')) return;
    let b = document.createElement('button'); b.id = 'bzYeniDon'; b.className = 'bz-yeni-don'; b.textContent = '✨ Yeni Büyü Akademisi görünümüne dön';
    b.onclick = () => { localStorage.removeItem('bz_eski_parkur'); b.remove(); goster('harita'); };
    let t = $('tab-dunya'); (t || document.body).appendChild(b);
  }
  window.dunyaAc = async function () {
    if(window.dmTeacherPortalMode)return;
    if (eskiGorunum()) { let r = orgDunya && orgDunya.apply(this, arguments); setTimeout(yeniDonDugmesi, 300); return r; }
    parkurAlani();   /* DÜZELTME: bz-yeni sınıfını en başta ekle; eski Gökyüzü Kulesi tasarımı hiç görünmesin */
    if (!parkurAcikTut && typeof orgDunya === 'function') orgDunya.apply(this, arguments);   /* sekmeyi açar, alt menüyü günceller */
    parkurAcikTut = false;
    if (!yuklendi) {
      const parkurYuklemeZamani = null;
      if(!parkurAlani().querySelector('.bz-harita'))harita(gorunum.b === null ? aktifBolum() : gorunum.b);
      try { try { await ilerlemeYukle(); } catch (ilk) { await new Promise(r => setTimeout(r, 1500)); await ilerlemeYukle(); } clearTimeout(parkurYuklemeZamani); } catch (e) {   /* [28 Eki 2026] bir kez sessizce yeniden dene */
        clearTimeout(parkurYuklemeZamani);
        if (!parkurAlani().querySelector('.dm-papi-loading')) parkurAlani().innerHTML = '<div class="bz-ic dm-parkur-loading"><div class="dm-papi-loading"><strong>Parkur yüklenemedi</strong><p></p><button type="button" class="dm-parkur-retry">Tekrar dene</button></div></div>';
        const host=$('bzParkur'), message=host?.querySelector('.dm-papi-loading p'), retry=host?.querySelector('.dm-parkur-retry');
        if(message)message.textContent='Parkur bilgileri alınamadı. Bağlantını kontrol edip tekrar dene.';
        if(retry){retry.hidden=false;retry.onclick=()=>window.dunyaAc();}
        host?.querySelector('.dm-papi-dots')?.remove();
        return;
      }
    }
    else ilerlemeYukle().then(() => { if (gorunum.ad === 'harita' && $('bzParkur') && !perde) harita(gorunum.b === null ? aktifBolum() : gorunum.b); }).catch(() => {});
    if (gorunum.ad === 'koridor') koridor(); else harita(gorunum.b === null ? aktifBolum() : gorunum.b);
  };
  /* Oyunlar'deki Büyü Akademisi kartı ve eski çağrılar: Parkur'u kapılarla açar */
  let eskiAc = window.baModuAc;
  window.baModuAc = async function () {
    if (!isim()) { toast('Önce giriş yapmalısın.'); return; }
    if (eskiGorunum()) return eskiAc && eskiAc.apply(this, arguments);
    gorunum = { ad: 'koridor', b: null };
    await window.dunyaAc();
  };
  window.buyuAkademisiYeniAc = window.baModuAc;
  window.dmSchoolGraduationNext = async function (cls) { await window.dunyaAc(); goster('harita',Math.max(0,Math.min(3,Math.floor((Number(cls)-1)/2)))); };
  window.dmPapiStartAdventure = async function () {
    const owner=isim();
    if(!yuklendi)await ilerlemeYukle();
    if(owner!==isim())return false;
    duraklariKur();
    let target=null;
    for(let b=0;b<4&&!target;b++)if(bolumAcik(b))for(let d=0;d<durakSayisi(b);d++)if(durakAcik(b,d)&&!tamam.has(durakNo(b,d))&&durakHavuzu(b,d).havuz.length>=8){target={b,d};break;}
    if(!target&&durakHavuzu(0,0).havuz.length>=8)target={b:0,d:0};
    if(!target)return false;
    await oyunBaslat(target.b,target.d);
    return owner===isim()&&!!document.querySelector('.bz-oyun');
  };
  /* Parkur sekmesinin üstündeki "Büyü Akademisi · Kelime Modu · Sohbet · Kelime Kartları" şeridi içeriği örtmesin */
  /* Eski seviye haritasından gelen "oyna" çağrısı yeni durak kartına yönlenir */
  window.dunyaSeviyeAc = function (n) {
    let k = havuzTum()[(Number(n) - 1) * 8], b = 0, d = 0;
    if (k) { duraklariKur(); for (let bb = 0; bb < 4; bb++) { let i = DURAK[bb].findIndex(D => D.sinif === Number(k.sinif) && D.unite === Number(k.unite)); if (i >= 0) { b = bb; d = i; break; } } }
    goster('harita', b); setTimeout(() => durakKarti(b, d), 300);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { let a = document.querySelector('.bz-alt'); if (a) a.remove(); } });
})();
