
/* ============ KELİME TRENİ ============ */
const TREN_SORU = 12;
let trenAktifSinif = 1, trenSecilenUniteler = [1];
let trenKuyruk = [], trenToplam = 0, trenBitti = 0, trenDogru = 0, trenYanlis = 0, trenSeri = 0, trenPuanD = 0, trenSureD = 0, trenTimer = null;
let trenSoruD = null, trenCevap = [], trenVagonlar = [], trenKilit = false, trenHatalar = [];

try { if (typeof OYUN_JOKERLERI === 'object') OYUN_JOKERLERI.tren = ['ikinci', 'kalkan', 'cift']; } catch (e) {}

function trEl(id) { return document.getElementById(id); }
function trKacir(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function trNorm(s) { return String(s).replace(/[’`]/g, "'").toLocaleLowerCase('tr').replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim(); }
function trKaristir(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function trKonus(metin, hiz) { try { let u = new SpeechSynthesisUtterance(metin); u.lang = 'en-US'; u.rate = hiz || 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
function trParcala(en) { return String(en).replace(/[.,!?;:"]/g, ' ').trim().split(/\s+/).filter(Boolean); }

function trenOyunAc() {
  if (typeof genelOyunGirisEngelliMi === 'function' && genelOyunGirisEngelliMi()) return;
  let modal = trEl('trenOyunOverlay');
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  trEl('trenGirisEkrani').style.display = 'block';
  trEl('trenOyunEkrani').style.display = 'none';
  trEl('trenBitisEkrani').style.display = 'none';
  let isim = trEl('trenIsimInput');
  if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) { isim.value = siniftaOynananOgrenci; isim.disabled = true; }
  else if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== 'teacher') { isim.value = aktifOgrenciAdi; isim.disabled = false; }
  else { isim.value = ''; isim.disabled = false; }
  sinifGridKisitlamaUygula('trenSinifGrid', function (s) { trenAktifSinif = s; }, function (s) { genericSinifGuncelle(s, 'trenUniteBox', function (u) { trenSecilenUniteler = u; }); });
}
function trenSinifSec(sinif, btn) {
  trenAktifSinif = sinif;
  trEl('trenSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  genericSinifGuncelle(sinif, 'trenUniteBox', function (u) { trenSecilenUniteler = u; });
}
function trenOyunKapat() {
  if (typeof liderlikKilitliMiKontrolEt === 'function' && liderlikKilitliMiKontrolEt('tren', 'trenBitisEkrani')) return;
  trEl('trenOyunOverlay').style.display = 'none';
  if (trenTimer) clearInterval(trenTimer);
}

/* Çeldirici: cümlede yoksa bankadan, yoksa seçilen sınıfın kelimelerinden */
function trCeldiriciler(s, adet) {
  let icinde = new Set(trParcala(s.en).map(w => w.toLowerCase()));
  let ce = (s.ce || []).map(x => x.trim()).filter(x => x && !icinde.has(x.toLowerCase()));
  if (ce.length < adet) {
    let aday = (window.masterKelimeHavuzu || []).filter(k => Number(k.sinif) === Number(trenAktifSinif))
      .map(k => String(k.ingilizce || k.en || '').trim()).filter(w => w && !/\s/.test(w) && !icinde.has(w.toLowerCase()) && !ce.includes(w));
    ce = ce.concat(trKaristir([...new Set(aday)]).slice(0, adet - ce.length));
  }
  if (ce.length < adet) ce = ce.concat(trKaristir(['is', 'are', 'the', 'my', 'your', 'have', 'has', 'in', 'on', 'to'].filter(w => !icinde.has(w))).slice(0, adet - ce.length));
  return ce.slice(0, adet);
}

async function trenOyunuBaslat() {
  if (typeof genelOyunGirisEngelliMi === 'function' && genelOyunGirisEngelliMi()) return;
  let isim = trEl('trenIsimInput').value.trim();
  if (!isim) { alert('Lütfen adınızı giriniz!'); return; }
  if (!trenSecilenUniteler || !trenSecilenUniteler.length) { alert('En az bir ünite seçmelisin.'); return; }
  let btn = trEl('trenBaslaBtn'), eskiYazi = btn.innerText;
  btn.disabled = true; btn.innerText = '🚉 Cümleler yükleniyor...';
  let cumleHavuzu = (window.masterKelimeHavuzu || []).filter(k => Number(k.sinif)===Number(trenAktifSinif) && trenSecilenUniteler.includes(Number(k.unite)) && k.ingilizce && k.turkce && k.ingilizce.trim().split(/\s+/).length>=3 && k.ingilizce.trim().split(/\s+/).length<=9).map(k => ({en:k.ingilizce.trim(),tr:k.turkce.trim(),sinif:Number(k.sinif),unite:Number(k.unite)}));
  btn.disabled = false; btn.innerText = eskiYazi;
  let secilen = OC.kelimeSec('tren', cumleHavuzu, TREN_SORU, { anahtar: s => trNorm(s.en), zk: false });
  if (secilen.length < 4) { alert('Bu sınıf ve ünitede henüz yeterli cümle yok. Başka bir ünite seç ya da öğretmenine haber ver.'); return; }

  trenKuyruk = secilen.map((s, i) => ({ ...s, id: i, tekrar: false }));
  trenToplam = trenKuyruk.length; trenBitti = 0; trenDogru = 0; trenYanlis = 0; trenSeri = 0; trenPuanD = 0; trenSureD = 0; trenHatalar = []; OC.basla('tren'); window.trenOcIkinci = false;

  if (typeof genelEnerjiHarca === 'function') genelEnerjiHarca(-3);
  trEl('trenGirisEkrani').style.display = 'none';
  trEl('trenOyunEkrani').style.display = 'block';
  if (typeof jokerTuruBaslat === 'function') jokerTuruBaslat('tren', 'trenOyunEkrani');
  if (trenTimer) clearInterval(trenTimer);
  trenTimer = setInterval(() => {
    if (OC.aktif?.pauseAt) return;
    if (typeof jk !== 'undefined' && jk && jk.donuk) return;
    trenSureD++; trEl('trenSure').innerText = `⏱️ ${trenSureD}s`;
  }, 1000);
  trenSonraki();
}

function trenSonraki() {
  trEl('trenPanel').className = 'tr-panel';
  if (!trenKuyruk.length) return trenOyunuBitir();
  let s = trenSoruD = trenKuyruk.shift();
  trenCevap = []; trenKilit = false;
  let kelimeler = trParcala(s.en);
  let ce = trCeldiriciler(s, kelimeler.length > 5 ? 2 : 3);
  trenVagonlar = trKaristir([...kelimeler, ...ce]).map((k, i) => ({ k, i, kullanildi: false }));
  trEl('trenRozet').innerHTML = s.tekrar ? '<div class="tr-rozet">🔁 Önceki hatan, bir daha dene</div>' : '';
  trEl('trenKaynak').innerText = s.kaynak === 'ders' ? '📘 Ders Çalış\'tan' : '';
  trEl('trenTabela').innerText = s.tr;
  trEl('trenIpucuBtn').disabled = false;
  let hat = trEl('trenHat'); hat.classList.remove('kalkis', 'sars');
  trBilgi();
  trCiz();
}
function trBilgi() {
  trEl('trenBar').style.width = (trenBitti / trenToplam * 100) + '%';
  trEl('trenSeri').innerText = '🔥 ' + trenSeri;
  trEl('trenPuan').innerText = trenPuanD + ' puan';
}
function trCiz() {
  let hat = trEl('trenHat'), havuz = trEl('trenHavuz');
  hat.innerHTML = trenCevap.length ? '' : '<span class="tr-empty">Cümleyi kurmak için aşağıdaki kelimelere dokun.</span>';
  trenCevap.forEach((v, sira) => {
    let b = document.createElement('button'); b.type = 'button'; b.className = 'tr-v'; b.innerText = v.k;
    b.setAttribute('aria-label', v.k + ' vagonunu çöz');
    b.onclick = () => { if (trenKilit) return; trenCevap.splice(sira, 1); v.kullanildi = false; trCiz(); };
    hat.appendChild(b);
  });
  havuz.innerHTML = '';
  trenVagonlar.forEach(v => {
    let b = document.createElement('button'); b.type = 'button'; b.className = 'tr-v' + (v.kullanildi ? ' bos' : ''); b.innerText = v.k;
    b.tabIndex = v.kullanildi ? -1 : 0;
    b.onclick = () => { if (trenKilit || v.kullanildi) return; v.kullanildi = true; trenCevap.push(v); trCiz(); trKonus(v.k, 1); };
    havuz.appendChild(b);
  });
  trEl('trenKontrolBtn').disabled = !trenCevap.length || trenKilit;
}
function trenIpucu() {
  if (trenKilit) return;
  let ilk = trParcala(trenSoruD.en)[0];
  trenVagonlar.forEach(v => v.kullanildi = false); trenCevap = [];
  let v = trenVagonlar.find(x => x.k === ilk);
  if (v) { v.kullanildi = true; trenCevap.push(v); }
  window.trenOcIkinci = true;  /* ipucu alınan cümle yarım puan */
  trEl('trenIpucuBtn').disabled = true;
  trBilgi(); trCiz();
}

function trenKontrol() {
  if (trenKilit || !trenCevap.length) return;
  let s = trenSoruD, verilen = trNorm(trenCevap.map(v => v.k).join(' '));
  window.dmVerifiedGames?.record(s.en,trenCevap.map(v=>v.k).join(' '));
  let dogruMu = [s.en, ...(s.alt || [])].some(k => trNorm(k) === verilen);

  if (!dogruMu && typeof jk !== 'undefined' && jk && jk.ikinci) {          /* 🎯 İkinci Şans */
    jk.ikinci = false; window.trenOcIkinci = true; if (typeof jokerBarCiz === 'function') jokerBarCiz();
    if (typeof jokerMesaj === 'function') jokerMesaj('🎯 İkinci şans kullanıldı, bir daha dene!');
    let hat = trEl('trenHat'); hat.classList.remove('sars'); void hat.offsetWidth; hat.classList.add('sars');
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('yanlis');
    return;
  }
  trenKilit = true; trEl('trenKontrolBtn').disabled = true;
  if (typeof window.enerjiSoruSay === 'function' && !s.tekrar) window.enerjiSoruSay(1);
  let hat = trEl('trenHat');
  if (dogruMu) {
    trenDogru++; trenBitti++; trenSeri++;
    let kazanc = OC.dogru(s.tekrar || window.trenOcIkinci ? 0.5 : 1); window.trenOcIkinci = false;
    trenPuanD = OC.puan();
    hat.classList.add('kalkis');
    trKonus(s.en, 0.9);
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('dogru');
    if (trenSeri >= 3 && typeof genelKomboGoster === 'function') genelKomboGoster(trenSeri, document.querySelector('#trenOyunOverlay .game-modal-content'));
    if (navigator.vibrate) navigator.vibrate(60);
    trPanel(true, ['Tren kalktı!', 'Süper!', 'Aynen böyle!', 'Mükemmel!'][Math.floor(Math.random() * 4)] + ` +${kazanc}`, `${s.tr} = ${s.en}`);
  } else {
    trenYanlis++;
    let kalkan = typeof jokerKalkanTuket === 'function' && jokerKalkanTuket();
    if (!kalkan) trenSeri = 0;
    OC.yanlis(kalkan); window.trenOcIkinci = false;
    if (!s.tekrar) { trenKuyruk.push({ ...s, tekrar: true }); if (!trenHatalar.includes(s)) trenHatalar.push(s); }
    else trenBitti++;
    hat.classList.remove('sars'); void hat.offsetWidth; hat.classList.add('sars');
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('yanlis');
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
    trPanel(false, 'Doğrusu:', s.en + (s.tekrar ? '' : '  (Bu cümle sonda tekrar gelecek)'));
  }
  trBilgi();
}
function trPanel(iyi, baslik, metin) {
  let p = trEl('trenPanel');
  p.className = 'tr-panel ' + (iyi ? 'iyi' : 'kotu');
  trEl('trenPanelBaslik').innerText = (iyi ? '✅ ' : '❌ ') + baslik;
  trEl('trenPanelMetin').innerText = metin;
  setTimeout(() => { let b = trEl('trenDevamBtn'); if (b) { b.focus(); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, 250);
}

async function trenOyunuBitir() {
  if (trenTimer) clearInterval(trenTimer);
  trEl('trenOyunEkrani').style.display = 'none';
  trEl('trenBitisEkrani').style.display = 'block';
  let isim = trEl('trenIsimInput').value.trim(), sinifStr = trenAktifSinif + '. Sınıf';
  let yildiz = OC.yildiz(puan);
  let puan = OC.puan();
  trEl('trenYildiz').innerText = '⭐'.repeat(yildiz) + '☆'.repeat(3 - yildiz);
  trEl('trenResIsim').innerText = isim;
  trEl('trenResDogru').innerText = `${trenDogru} / ${trenToplam}`;
  trEl('trenResSure').innerText = trenSureD + ' saniye';
  trEl('trenResPuan').innerText = puan + ' Puan';
  trEl('trenTekrarKutu').style.display = trenHatalar.length ? 'block' : 'none';
  trEl('trenTekrarListe').innerHTML = trenHatalar.map(s => `<li>${trKacir(s.tr)}<span>${trKacir(s.en)}</span></li>`).join('');

  if (typeof genelSonucEkraniGoster === 'function')
    genelSonucEkraniGoster({ oyunAdi: '🚂 Kelime Treni', isim: isim, puan: puan, dogru: trenDogru, yanlis: trenYanlis, sureSaniye: trenSureD, oyunKey: 'tren', devamFn: trenOyunKapat, tekrarFn: trenOyunAc });
  try {
    await fetch(apiURL, { method: 'POST', body: JSON.stringify({
      islem: 'trenLiderlikKaydet', tarih: new Date().toISOString().split('T')[0], isim: isim, sinif: sinifStr,
      unite: trenSecilenUniteler.join(',') + '. Ünite', dogru: trenDogru, yanlis: trenYanlis,
      detay: trenYanlis + ' yanlış', sure: trenSureD + 's', suresaniye: trenSureD, puan: puan }) });
  } catch (e) {}
  if (typeof liderlikKilitBaslat === 'function') liderlikKilitBaslat('tren');
  if (typeof oyunLiderlikGoster === 'function') oyunLiderlikGoster('trenLiderlikTumunuGetir', sinifStr, isim, 'trenGecmisSkorlar', 'Kelime Treni', 'tren');
}

/* Enter: kontrol et / devam et (klavyeli cihazlar için) */
document.addEventListener('keydown', e => {
  let ekran = trEl('trenOyunEkrani');
  if (e.key !== 'Enter' || !ekran || ekran.style.display === 'none' || trEl('trenOyunOverlay').style.display === 'none') return;
  if (trEl('trenPanel').className.indexOf('iyi') !== -1 || trEl('trenPanel').className.indexOf('kotu') !== -1) { e.preventDefault(); trenSonraki(); }
  else if (!trEl('trenKontrolBtn').disabled && document.activeElement === document.body) { e.preventDefault(); trenKontrol(); }
});

/* Oyunlar'e kart (Eşleştirme'nin, yoksa Hafıza Sandığı'nın yanına) */
(function trenKartEkle() {
  let dene = () => {
    if (document.getElementById('trenAktiviteKart')) return true;
    let komsu = document.getElementById('esAktiviteKart') || document.querySelector('#tab-aktiviteler [onclick="hafizaOyunAc()"]');
    let izgara = komsu ? komsu.parentElement : document.querySelector('#tab-aktiviteler .az-grid2x2');
    if (!izgara) return false;
    let b = document.createElement('button');
    b.className = 'az-gcard'; b.id = 'trenAktiviteKart'; b.type = 'button';
    b.style.background = 'linear-gradient(160deg,#fbbf24,#ea580c)';
    b.setAttribute('onclick', 'trenOyunAc()');
    b.innerHTML = '<div class="az-gcard-icon">🚂</div><div class="az-gcard-title">Kelime Treni</div>';
    if (komsu) komsu.insertAdjacentElement('afterend', b); else izgara.appendChild(b);
    return true;
  };
  if (!dene()) { let n = 0, t = setInterval(() => { if (dene() || ++n > 40) clearInterval(t); }, 500); }
})();
