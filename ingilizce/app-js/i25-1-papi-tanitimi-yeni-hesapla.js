
(function () {
  const $ = id => document.getElementById(id);
  const kac = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kucuk = x => String(x || '').trim().toLocaleLowerCase('tr');
  const yoVar = () => typeof yo !== 'undefined' && yo && typeof yoHazirMi === 'function' && yoHazirMi();
  const OGRT = () => { try { return sessionStorage.getItem('ing_ogr_token') || ''; } catch (e) { return ''; } };
  const toast = m => { if (typeof yoToast === 'function') yoToast(m); };
  const OYUN = [['ky', '🔬', 'Kelime Laboratuvarı', 'kelimeYarismasiAc'], ['jp', '🎈', 'Risk Balonları', 'jpOyunAc'], ['bosluk', '✏️', 'Eksik Harf', 'boslukOyunAc'], ['hafiza', '🃏', 'Hafıza Sandığı', 'hafizaOyunAc'],
    ['yagmur', '🌪️', 'Hız Fırtınası', 'yagmurOyunAc'], ['asmaca', '🔤', 'Harf Avı', 'asmacaOyunAc'], ['kelimebul', '🔐', 'Şifre Kırıcı', 'kelimebulOyunAc'], ['eslestirme', '🔗', 'Eş Bul', 'esOyunAc'],
    ['tren', '🚂', 'Kelime Treni', 'trenOyunAc'], ['dikte', '🎧', 'Kulak Dedektifi', 'dikteAc'], ['cumle', '🧱', 'Cümle Ustası', 'cumleAc']];
  const KAT_AD = { grammar: 'Dil Bilgisi', vocab: 'Kelime', comm: 'İletişim', pron: 'Telaffuz' };
  const kisaTarih = t => { try { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };

  /* ===================================================================
     1) PAPİ TANITIMI: yeni hesaplarda en fazla iki giriş
     =================================================================== */
  // Guided onboarding retired; member-experience owns the route chooser.

  /* ===================================================================
     2) ÖĞRETMEN: Ödev Ver
     =================================================================== */
  let konuCache = null, secKonu = new Set(), secOyun = new Set(), secUnite = new Set(), hedefYildiz = 2;
  function menuyeEkle() {
    let menu = document.querySelector('#ogretmenMenuModal .rubric-content');
    if (!menu || $('odMenuBtn')) return;
    let b = document.createElement('button'); b.className = 'ogretmen-menu-btn'; b.id = 'odMenuBtn'; b.type = 'button';
    b.innerHTML = '<span>📝 Ödev Ver (sınıf · şube)</span>'; b.onclick = odevEkraniAc;
    let ilk = menu.querySelector('.ogretmen-menu-btn'); if (ilk) ilk.insertAdjacentElement('beforebegin', b); else menu.appendChild(b);
  }
  menuyeEkle(); setInterval(menuyeEkle, 3000);
  function ogrenciler() { return (Array.isArray(globalDataCache) ? globalDataCache : []).filter(u => u && u.ogrenci && kucuk(u.ogrenci) !== 'teacher' && (!u.durum || /approved|onay|aktif/i.test(u.durum) || u.durum === 'approved')); }
  function subeleriDoldur() {
    let s = Number($('odSinif').value), subeler = [...new Set(ogrenciler().filter(u => Number(u.Sinif || u.sinif) === s).map(u => String(u.sube || u.Sube || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
    $('odSube').innerHTML = '<option value="">Tüm şubeler</option>' + subeler.map(x => `<option value="${kac(x)}">${kac(x)} şubesi</option>`).join('');
    hedefSay(); uniteleriDoldur();
  }
  function hedefSay() {
    let s = Number($('odSinif').value), sb = kucuk($('odSube').value);
    let n = ogrenciler().filter(u => Number(u.Sinif || u.sinif) === s && (!sb || kucuk(u.sube || u.Sube) === sb)).length;
    $('odHedefSayi').innerText = `👥 Bu ödev ${n} öğrenciye gidecek`;
  }
  function uniteleriDoldur() {
    let s = Number($('odSinif').value);
    let u = [...new Set((window.masterKelimeHavuzu || []).filter(k => Number(k.sinif) === s).map(k => Number(k.unite)).filter(x => x > 0))].sort((a, b) => a - b);
    secUnite = new Set([...secUnite].filter(x => u.includes(x)));
    $('odUniteler').innerHTML = u.length ? u.map(x => `<button type="button" class="od-cip${secUnite.has(x) ? ' sec' : ''}" data-u="${x}">${x}. ünite</button>`).join('') : '<span class="od-etiket">Bu sınıfın kelimeleri yüklenmedi.</span>';
    $('odUniteler').querySelectorAll('[data-u]').forEach(b => b.onclick = () => { let x = +b.dataset.u; secUnite.has(x) ? secUnite.delete(x) : secUnite.add(x); b.classList.toggle('sec'); });
  }
  async function konulariDoldur() {
    if (!konuCache) {
      $('odKonular').innerHTML = '<div class="od-etiket">Konular yükleniyor…</div>';
      try { let r = await fetch(`${apiURL}?islem=dersKonulariGetir`); let d = await r.json(); konuCache = Array.isArray(d) ? d : []; } catch (e) { konuCache = []; }
      if (!konuCache.length && typeof dcTumKonularCache !== 'undefined' && Array.isArray(dcTumKonularCache)) konuCache = dcTumKonularCache;
    }
    let sv = $('odSeviye').value, kt = $('odKategori').value;
    const search=String($('odKonuAra')?.value||'').trim().toLocaleLowerCase('tr');
    let l = konuCache.filter(k => String(k.seviye) === sv && String(k.kategori) === kt && (!search||String(k.konuAdi).toLocaleLowerCase('tr').includes(search))).sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
    $('odKonular').innerHTML = l.length ? l.map(k => { let anahtar = `${sv}|${kt}|${k.konuAdi}`; return `<label class="od-cb${secKonu.has(anahtar) ? ' sec' : ''}"><input type="checkbox" data-k="${kac(anahtar)}" ${secKonu.has(anahtar) ? 'checked' : ''}>${kac(k.konuAdi)}</label>`; }).join('') : '<div class="od-etiket">Bu seviye ve kategoride konu yok.</div>';
    $('odKonular').querySelectorAll('input').forEach(c => c.onchange = () => { c.checked ? secKonu.add(c.dataset.k) : secKonu.delete(c.dataset.k); c.parentElement.classList.toggle('sec', c.checked); sayac(); });
    sayac();
  }
  function sayac() { $('odKonuSay').innerText = secKonu.size ? `${secKonu.size} konu seçili` : ''; $('odOyunSay').innerText = secOyun.size ? `${secOyun.size} oyun seçili` : ''; }
  async function odevEkraniAc() {
    if (!OGRT()) { if (typeof ogretmenPaneliAc === 'function') ogretmenPaneliAc(); return; }
    if (!Array.isArray(globalDataCache) || globalDataCache.length <= 1) { if (typeof listeYenile === 'function') await listeYenile(); }
    konuCache = null; secKonu = new Set(); secOyun = new Set(); secUnite = new Set(); hedefYildiz = 2;
    $('odSinif').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(s => `<option value="${s}">${s}. sınıf</option>`).join('');
    let sk = ogrenciler().map(u => Number(u.Sinif || u.sinif)).filter(Boolean); if (sk.length) $('odSinif').value = String(sk.sort((a, b) => sk.filter(x => x === b).length - sk.filter(x => x === a).length)[0]);
    $('odOyunlar').innerHTML = (window.dmAssignmentGames?.(OYUN)||OYUN).map(([k, ik, ad]) => `<label class="od-cb"><input type="checkbox" data-o="${k}">${ik} ${ad}</label>`).join('');
    $('odOyunlar').querySelectorAll('input').forEach(c => c.onchange = () => { c.checked ? secOyun.add(c.dataset.o) : secOyun.delete(c.dataset.o); c.parentElement.classList.toggle('sec', c.checked); sayac(); });
    $('odHedef').querySelectorAll('[data-y]').forEach(b => { b.classList.toggle('sec', +b.dataset.y === hedefYildiz); b.onclick = () => { hedefYildiz = +b.dataset.y; $('odHedef').querySelectorAll('[data-y]').forEach(x => x.classList.toggle('sec', x === b)); }; });
    $('odSonuc').className = 'od-sonuc'; $('odNot').value = ''; $('odSon').value = '';
    subeleriDoldur(); konulariDoldur(); gorunum('yeni');
    $('ogretmenMenuModal').style.display = 'none'; $('odModal').style.display = 'flex';
  }
  window.odevEkraniAc = odevEkraniAc;
  function gorunum(g) {
    $('odModal').querySelectorAll('.od-sekmeler button').forEach(b => b.classList.toggle('aktif', b.dataset.g === g));
    $('odYeni').style.display = g === 'yeni' ? '' : 'none'; $('odListe').style.display = g === 'liste' ? '' : 'none';
    if (g === 'liste') verilenleriGoster();
  }
  $('odModal').querySelectorAll('.od-sekmeler button').forEach(b => b.onclick = () => gorunum(b.dataset.g));
  $('odSinif').onchange = subeleriDoldur; $('odSube').onchange = hedefSay;
  const konuArama=document.createElement('input');konuArama.id='odKonuAra';konuArama.type='search';konuArama.placeholder='Ders konusu ara…';konuArama.setAttribute('aria-label','Ödev için ders konusu ara');$('odKonular').before(konuArama);konuArama.oninput=konulariDoldur;
  $('odSeviye').onchange = konulariDoldur; $('odKategori').onchange = konulariDoldur;
  $('odVer').onclick = async () => {
    let odevler = [...secKonu].map(x => { let [seviye, kategori, ...k] = x.split('|'); return { tur: 'ders', seviye, kategori, konu: k.join('|') }; })
      .concat([...secOyun].map(o => ({ tur: 'oyun', oyun: o, uniteler: [...secUnite].sort((a, b) => a - b), hedefYildiz })));
    let sonuc = $('odSonuc');
    if (!odevler.length) { sonuc.className = 'od-sonuc kotu'; sonuc.textContent = 'En az bir konu ya da oyun seç.'; return; }
    let sinif = $('odSinif').value, sube = $('odSube').value;
    if (!confirm(`${sinif}. sınıf ${sube ? sube + ' şubesi' : '(tüm şubeler)'} için ${odevler.length} ödev verilsin mi?`)) return;
    let b = $('odVer'); b.disabled = true; b.textContent = 'Gönderiliyor…';
    let d = null; try { let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'odevVer', sinif, sube, odevler, sonTarih: $('odSon').value, not: $('odNot').value }) }); d = await r.json(); } catch (e) {}
    b.disabled = false; b.textContent = '📝 Ödevi ver';
    if (d && d.ok) { sonuc.className = 'od-sonuc iyi'; sonuc.textContent = `✅ ${d.eklenen} ödev ${d.ogrenciSayisi} öğrenciye verildi. Öğrenciler Sana Özel → Ödevlerim'de görecek.`; secKonu.clear(); secOyun.clear(); konulariDoldur(); $('odOyunlar').querySelectorAll('input').forEach(c => { c.checked = false; c.parentElement.classList.remove('sec'); }); sayac(); }
    else { sonuc.className = 'od-sonuc kotu'; sonuc.textContent = (d && (d.mesaj || d.message)) || 'Ödev verilemedi. Öğretmen oturumunu ve internetini kontrol et.'; }
  };
  async function verilenleriGoster() {
    let alan = $('odListe'); alan.innerHTML = '<div class="od-etiket">Yükleniyor…</div>';
    let d = null; try { let r = await fetch(`${apiURL}?islem=odevListesiOgretmen&_=${Date.now()}`); d = await r.json(); } catch (e) {}
    let l = (d && d.liste) || [];
    if (!l.length) { alan.innerHTML = '<div class="od-etiket" style="padding:10px">Henüz verilmiş aktif ödev yok.</div>'; return; }
    alan.innerHTML = l.map(o => { let y = o.yapanlar.length, h = o.hedef || 0, p = h ? Math.round(y / h * 100) : 0;
      return `<div class="od-verilen-kart"><button type="button" data-sil="${o.id}" aria-label="Ödevi kaldır">🗑️ Kaldır</button><b>${kac(o.baslik)}</b>
        ${o.sinif}. sınıf ${o.sube ? kac(o.sube) + ' şubesi' : '· tüm şubeler'} · ${kisaTarih(o.atandi)}${o.sonTarih ? ' · son: ' + kisaTarih(o.sonTarih) : ''}
        <div class="ilerleme"><i style="width:${p}%"></i></div>✅ ${y}/${h} öğrenci yaptı
        <details><summary>Kimler yaptı / yapmadı</summary>✅ ${o.yapanlar.map(kac).join(', ') || '—'}<br>⏳ ${o.yapmayanlar.map(kac).join(', ') || '—'}</details></div>`; }).join('');
    alan.querySelectorAll('[data-sil]').forEach(b => b.onclick = async () => {
      if (!confirm('Bu ödev kaldırılsın mı? Öğrencilerin listesinden de silinir.')) return;
      try { await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'odevSil', id: b.dataset.sil }) }); } catch (e) {}
      verilenleriGoster();
    });
  }

  /* ===================================================================
     3) ÖĞRENCİ: Ödevlerim + otomatik tamamlama
     =================================================================== */
  let odevler = [], odevZaman = 0, odevKisi = '', odevIstek = null;
  const ogrenciAdi = () => (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi) || '';
  /* [Kota 29 Eki 2026] Oyun sonu ödev otomatik tamamlama kontrolü 10 dk'lık listeyi kullanır (her oyunda yeni istek yok). */
  async function odevleriYukle(zorla, sure = 30000) {
    const kisi = ogrenciAdi();
    if (kisi !== odevKisi) { odevKisi = kisi; odevler = []; odevZaman = 0; odevIstek = null; $('odoKart')?.remove(); }
    if (!kisi || kucuk(kisi) === 'teacher') return [];
    if (!zorla && Date.now() - odevZaman < sure) return odevler;
    if (odevIstek) return odevIstek;
    const istek = (async () => {
      try {
        let r = await fetch(`${apiURL}?islem=odevlerim&ogrenci=${encodeURIComponent(kisi)}&_=${Date.now()}`), d = await r.json();
        if (kisi === odevKisi && kisi === ogrenciAdi()) { if (r.ok && d && d.ok) odevler = Array.isArray(d.liste) ? d.liste : []; odevZaman = Date.now(); }
      } catch (e) { if (kisi === odevKisi) odevZaman = Date.now(); }
      return kisi === ogrenciAdi() ? odevler : [];
    })();
    odevIstek = istek;
    try { return await istek; } finally { if (odevIstek === istek) odevIstek = null; }
  }
  function kalanGun(o) {
    let gecen = Math.floor((Date.now() - Date.parse(o.atandi)) / 86400000), kalan = 5 - (gecen % 5);
    return kalan <= 1 ? '⚠️ yarın −1 puan' : `−1 puana ${kalan} gün`;
  }
  function odevBitis(o) {
    if (!o.sonTarih) return null;
    // Tarih alanı Türkiye'de belirtilen günün sonuna kadar geçerlidir.
    const tarih = String(o.sonTarih);
    const bitis = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(tarih) ? tarih + 'T23:59:59+03:00' : tarih);
    return Number.isFinite(bitis) ? bitis : null;
  }
  function odevSayaclariniGuncelle() {
    document.querySelectorAll('#odoKart [data-od-bitis]').forEach(e => {
      const kalan = Math.max(0, Math.ceil((Number(e.dataset.odBitis) - Date.now()) / 1000));
      const gun = Math.floor(kalan / 86400), saat = Math.floor(kalan % 86400 / 3600), dakika = Math.floor(kalan % 3600 / 60), saniye = kalan % 60;
      e.textContent = kalan ? `${gun ? gun + ' gün · ' : ''}${String(saat).padStart(2,'0')}:${String(dakika).padStart(2,'0')}:${String(saniye).padStart(2,'0')} kaldı` : 'Teslim süresi doldu';
      e.classList.toggle('gecikti', kalan === 0);
    });
  }
  async function kartCiz() {
    const kisi = ogrenciAdi();
    const p = $('soPanel'); if (!p) return;
    let k = $('odoKart');
    if (!k) { k = document.createElement('div'); k.id = 'odoKart'; k.className = 'odo-kart'; k.hidden = true; p.prepend(k); }
    else if (k.parentElement !== p) p.prepend(k);
    let l = await odevleriYukle();
    if (kisi !== ogrenciAdi()) return;
    // Hesap değişimi önbelleği temizlerken eski kart da kaldırılmış olabilir.
    if (!k.isConnected) { k = $('odoKart'); if (!k) { k = document.createElement('div'); k.id = 'odoKart'; k.className = 'odo-kart'; p.prepend(k); } }
    k.hidden = !l.length;
    if (!l.length) { k.replaceChildren(); return; }
    let bekleyen = l.filter(o => !o.yapildi).length;
    k.innerHTML = `<h3>Öğretmenimin Ödevleri <small>${bekleyen ? bekleyen + ' bekliyor' : 'Hepsi tamamlandı'}</small></h3>` + [...l].sort((a,b) => Number(!!a.yapildi) - Number(!!b.yapildi)).map(o => {
      const bitis = odevBitis(o);
      const durum = o.yapildi ? '✓ Tamamlandı' : bitis !== null ? `<span class="odo-sayac" data-od-bitis="${bitis}" role="timer" aria-label="Ödev teslimine kalan süre"></span>` : 'Son tarih belirtilmedi';
      return `<div class="odo-satir${o.yapildi ? ' bitti' : ''}"><span class="m"><b>${kac(o.baslik)}</b><small>${durum}</small>${o.not ? '<small class="odo-not">' + kac(o.not) + '</small>' : ''}</span><button type="button" data-od="${kac(o.id)}">${o.yapildi ? 'Tekrar' : 'Başla'}</button></div>`;
    }).join('');
    odevSayaclariniGuncelle();
    k.querySelectorAll('[data-od]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await odevBaslat(l.find(o => String(o.id) === b.dataset.od)); } finally { if (b.isConnected) b.disabled = false; }
    });
  }
  window.dmOdevKartCiz = kartCiz;
  window.dmOdevYenile = async () => { await odevleriYukle(true); return kartCiz(); };
  let sonGor = false;
  setInterval(() => {
    const eski = $('tab-sanaozel'), gor = !!(eski && eski.classList.contains('active') && eski.getClientRects().length && getComputedStyle(eski).display !== 'none');
    if (gor) {
      if (!sonGor || !$('odoKart') || Date.now() - odevZaman >= 30000) kartCiz();
      odevSayaclariniGuncelle();
    }
    sonGor = gor;
  }, 1000);
  const bekle = ms => new Promise(r => setTimeout(r, ms));
  /* [v4.8] Ödevden açılan oyun enerji harcamaz. Muafiyet, ödevin açtığı oyun penceresi açık kaldığı sürece geçerli. */
  const pencereAcik = x => !!x && x.isConnected && x.getClientRects().length > 0 && getComputedStyle(x).display !== 'none';
  function odevMuafBaslat() {
    const m = { bitis: Date.now() + 3600000, el: null, uyarildi: false };
    window.__odevEnerjiMuaf = m;
    setTimeout(() => {
      m.el = [...document.querySelectorAll('.game-modal-overlay, #yoModal.acik')].filter(pencereAcik).pop() || null;
      if (!m.el) m.bitis = Date.now() + 180000;   /* pencere bulunamazsa 3 dakika */
    }, 500);
  }
  window.dmOdevEnerjiMuaf = function () {
    const m = window.__odevEnerjiMuaf;
    if (!m || Date.now() > m.bitis) return false;
    if (m.el && !pencereAcik(m.el)) { window.__odevEnerjiMuaf = null; return false; }
    if (!m.uyarildi) { m.uyarildi = true; toast('📝 Ödev oyunu: enerji harcanmaz'); }
    return true;
  };
  async function odevBaslat(o) {
    if (!o) return;
    window.__aktifOdev = o;
    /* Ödevden açılan konu ve oyun seviye kilidine takılmaz (öğretmen bilerek verdi) */
    window.__odevAcilisBitis = Date.now() + 8000;
    if (typeof sanaOzelTamEkranKapat === 'function') try { sanaOzelTamEkranKapat(); } catch (e) {}
    if (o.tur === 'ders') {
      let v = o.veri || {};
      if (typeof dersCalisTamEkranAc === 'function') dersCalisTamEkranAc();
      /* Ders Çalış öğrencide yalnızca ödevden açılır: geri/çıkış Ödevlerim'e döner (ders-odev-modu.js). */
      window.dmDersOdevModu?.start();
      for (let i = 0; i < 30 && !(typeof dcTumKonularCache !== 'undefined' && dcTumKonularCache.length); i++) await bekle(200);
      try {
        dcAktifSeviye = v.seviye; dcAktifKategori = v.kategori;
        if (typeof dcSeviyeSec === 'function') dcSeviyeSec(v.seviye, v.seviye);
        await bekle(250);
        if (typeof dcKategoriSec === 'function') await dcKategoriSec(v.kategori, KAT_AD[v.kategori] || v.kategori);
        await bekle(250);
        if (typeof dcKonuAc === 'function') dcKonuAc(v.konu);
      } catch (e) { toast(`📘 Ödev konusu: ${v.konu} (${v.seviye} · ${KAT_AD[v.kategori] || v.kategori})`); }
      return;
    }
    let v = o.veri || {}, oy = (window.dmAssignmentGames?.(OYUN)||OYUN).find(x => x[0] === v.oyun);
    if (!oy || typeof window[oy[3]] !== 'function') { toast('Bu oyun şu an açılamadı.'); return; }
    odevMuafBaslat();
    window[oy[3]]();
    if (['dikte', 'cumle'].includes(v.oyun)) { toast(`📝 Ödev: ${oy[2]} · hedef ${'⭐'.repeat(v.hedefYildiz || 1)}`); return; }
    await bekle(450);
    /* ödevin sınıf ve ünitelerini oyunda seç */
    let kat = [...document.querySelectorAll('.game-modal-overlay')].filter(x => x.getClientRects().length && getComputedStyle(x).display !== 'none').pop();
    if (kat) {
      let sb = [...kat.querySelectorAll('.sinif-btn')].find(b => b.textContent.trim().startsWith(v.sinif + '.'));
      if (sb && !sb.disabled) { sb.click(); await bekle(250); }
      if (v.uniteler && v.uniteler.length) {
        kat.querySelectorAll('.unite-secim-box .unite-chip, .unite-secim-box button').forEach(c => {
          let n = parseInt(c.textContent), ist = v.uniteler.includes(n), secili = c.classList.contains('selected') || c.classList.contains('active');
          if (!isNaN(n) && ist !== secili) c.click();
        });
      }
    }
    toast(`📝 Ödev: ${v.sinif}. sınıf${v.uniteler && v.uniteler.length ? ' · ' + v.uniteler.join(', ') + '. ünite' : ''} · hedef ${'⭐'.repeat(v.hedefYildiz || 1)}`);
  }
  async function tamamla(o, puan, yildiz) {
    try {
      let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'odevTamamla', ogrenci: ogrenciAdi(), id: o.id, puan, yildiz }) });
      let d = await r.json();
      if (d && d.ok) { o.yapildi = true; o.yildiz = yildiz || 0; toast(`✅ Ödev tamamlandı: ${o.baslik}`); if (typeof odulGoster === 'function') setTimeout(() => odulGoster({ ikon: '📝', baslik: 'Ödevini tamamladın!', alt: o.baslik }), 2800); kartCiz(); }
    } catch (e) {}
  }
  window.dmGameAssignmentResult=async ({oyunKey,puan=0,yildiz=0,sinif,unite})=>{const list=await odevleriYukle(false,600000);for(const o of list){if(!o.yapildi&&o.tur==='oyun'&&o.veri?.oyun===oyunKey&&yildiz>=(o.veri.hedefYildiz||1)&&(!sinif||Number(o.veri.sinif)===Number(sinif))&&(!o.veri.uniteler?.length||o.veri.uniteler.includes(Number(unite))))await tamamla(o,puan,yildiz);}};
  /* Ders Çalış: konu geçilince */
  let orgDc = window.dcOdulVer;
  if (typeof orgDc === 'function') window.dcOdulVer = function () {
    let r = orgDc.apply(this, arguments);
    try {
      let sv = typeof dcAktifSeviye !== 'undefined' ? dcAktifSeviye : '', kt = typeof dcAktifKategori !== 'undefined' ? dcAktifKategori : '', kn = typeof dcAktifKonu !== 'undefined' ? dcAktifKonu : '';
      odevleriYukle(false, 600000).then(l => l.filter(o => !o.yapildi && o.tur === 'ders' && o.veri && o.veri.konu === kn && (!o.veri.seviye || o.veri.seviye === sv) && (!o.veri.kategori || o.veri.kategori === kt)).forEach(o => tamamla(o, 0, 0)));
    } catch (e) {}
    return r;
  };
  /* Mini oyunlar: hedef yıldıza ulaşılınca */
  let orgGso = window.genelSonucEkraniGoster;
  if (typeof orgGso === 'function') {
    window.genelSonucEkraniGoster = function (o) {
      let r = orgGso.apply(this, arguments);
      try {
        let key = o && o.oyunKey, s = key && window.OC ? OC.sonuc(key) : null;
        if (key && s && s.yildiz) odevleriYukle(false, 600000).then(l => l.filter(x => !x.yapildi && x.tur === 'oyun' && x.veri && x.veri.oyun === key && s.yildiz >= (x.veri.hedefYildiz || 1)).forEach(x => tamamla(x, s.puan, s.yildiz)));
      } catch (e) {}
      return r;
    };
    window.genelSonucEkraniGoster._oc = orgGso._oc;
  }
})();
