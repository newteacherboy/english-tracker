
/* ============ EŞLEŞTİRME OYUNU ============ */
const ES_KELIME = 12, ES_TUR_BOYU = 4;
let esAktifSinif = 1, esSecilenUniteler = [1];
let esTurlar = [], esTurNo = 0, esKalan = 0, esDogru = 0, esYanlis = 0, esSure = 0, esTimer = null;
let esKombo = 0, esKomboBonus = 0, esCiftBonus = 0, esHatalilar = [], esSecEn = null, esSecTr = null, esKilit = false;

/* Joker seti: zaman dondur, kombo kalkanı, çift puan */
try { if (typeof OYUN_JOKERLERI === 'object') OYUN_JOKERLERI.eslestirme = ['dondur', 'kalkan', 'cift']; } catch (e) {}

function esEl(id) { return document.getElementById(id); }
function esSeslendir(metin) {
  try { let u = new SpeechSynthesisUtterance(metin); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}

function esOyunAc() {
  if (typeof genelOyunGirisEngelliMi === 'function' && genelOyunGirisEngelliMi()) return;
  let modal = esEl('esOyunOverlay');
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  esEl('esGirisEkrani').style.display = 'block';
  esEl('esOyunEkrani').style.display = 'none';
  esEl('esBitisEkrani').style.display = 'none';
  let isim = esEl('esIsimInput');
  if (typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci) { isim.value = siniftaOynananOgrenci; isim.disabled = true; }
  else if (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== 'teacher') { isim.value = aktifOgrenciAdi; isim.disabled = false; }
  else { isim.value = ''; isim.disabled = false; }
  sinifGridKisitlamaUygula('esSinifGrid', function (s) { esAktifSinif = s; }, function (s) { genericSinifGuncelle(s, 'esUniteBox', function (u) { esSecilenUniteler = u; }); });
}
function esSinifSec(sinif, btn) {
  esAktifSinif = sinif;
  esEl('esSinifGrid').querySelectorAll('.sinif-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  genericSinifGuncelle(sinif, 'esUniteBox', function (u) { esSecilenUniteler = u; });
}
function esOyunKapat() {
  if (typeof liderlikKilitliMiKontrolEt === 'function' && liderlikKilitliMiKontrolEt('eslestirme', 'esBitisEkrani')) return;
  esEl('esOyunOverlay').style.display = 'none';
  if (esTimer) clearInterval(esTimer);
}

function esOyunuBaslat() {
  if (typeof genelOyunGirisEngelliMi === 'function' && genelOyunGirisEngelliMi()) return;
  let isim = esEl('esIsimInput').value.trim();
  if (!isim) { alert('Lütfen adınızı giriniz!'); return; }
  if (!esSecilenUniteler || !esSecilenUniteler.length) { alert('En az bir ünite seçmelisin.'); return; }
  /* Aynı İngilizce kelime iki kez gelmesin */
  let gorulen = new Set();
  let havuz = oyunHavuzGetir(esAktifSinif, esSecilenUniteler).filter(k => {
    let en = String(k.ingilizce || k.en || '').trim().toLowerCase(), tr = String(k.turkce || k.tr || '').trim();
    if (!en || !tr || gorulen.has(en)) return false;
    gorulen.add(en); return true;
  });
  if (havuz.length < 6) { alert('Bu ünitelerde yeterli kelime yok (en az 6 gerekli). Başka ünite de seç.'); return; }
  let secilen = OC.kelimeSec('eslestirme', havuz, ES_KELIME)
    .map((k, i) => ({ id: i, en: String(k.ingilizce || k.en).trim(), tr: String(k.turkce || k.tr).trim(), kaynak: k }));
  esTurlar = [];
  for (let i = 0; i < secilen.length; i += ES_TUR_BOYU) esTurlar.push(secilen.slice(i, i + ES_TUR_BOYU));
  esTurNo = 0; esDogru = 0; esYanlis = 0; esSure = 0; esKombo = 0; esKomboBonus = 0; esCiftBonus = 0; esHatalilar = []; OC.basla('eslestirme');

  if (typeof genelEnerjiHarca === 'function') genelEnerjiHarca(-3);
  esEl('esGirisEkrani').style.display = 'none';
  esEl('esOyunEkrani').style.display = 'block';
  if (typeof jokerTuruBaslat === 'function') jokerTuruBaslat('eslestirme', 'esOyunEkrani');
  esTurCiz();
  if (esTimer) clearInterval(esTimer);
  esTimer = setInterval(() => {
    if (typeof jk !== 'undefined' && jk && jk.donuk) return;
    esSure++; esEl('esSureInfo').innerText = `⏱️ ${esSure}s`;
  }, 1000);
}

function esToplam() { return esTurlar.reduce((t, x) => t + x.length, 0); }
function esBilgiGuncelle() {
  esEl('esTurInfo').innerText = `Tur ${esTurNo + 1}/${esTurlar.length}`;
  esEl('esDogruInfo').innerText = `✅ ${esDogru}/${esToplam()}`;
  esEl('esBar').style.width = (esDogru / esToplam() * 100) + '%';
}
function esTurCiz() {
  let liste = esTurlar[esTurNo];
  esKalan = liste.length; esSecEn = esSecTr = null; esKilit = false;
  let karistir = a => [...a].sort(() => Math.random() - 0.5);
  let sol = esEl('esSol'), sag = esEl('esSag');
  sol.innerHTML = '<div class="es-sutun-baslik">🇬🇧 İngilizce</div>';
  sag.innerHTML = '<div class="es-sutun-baslik">🇹🇷 Türkçe</div>';
  const dugme = (k, dil) => {
    let b = document.createElement('button');
    b.type = 'button'; b.className = 'es-k ' + dil; b.innerText = k[dil]; b.dataset.id = k.id;
    b.setAttribute('aria-label', (dil === 'en' ? 'İngilizce: ' : 'Türkçe: ') + k[dil]);
    b.onclick = () => esSec(b, dil);
    return b;
  };
  karistir(liste).forEach(k => sol.appendChild(dugme(k, 'en')));
  karistir(liste).forEach(k => sag.appendChild(dugme(k, 'tr')));
  esBilgiGuncelle();
}
function esKelime(id) { for (let t of esTurlar) for (let k of t) if (String(k.id) === String(id)) return k; return null; }

function esSec(b, dil) {
  if (esKilit || b.classList.contains('tamam')) return;
  if (dil === 'en') { if (esSecEn) esSecEn.classList.remove('secili'); esSecEn = b; }
  else { if (esSecTr) esSecTr.classList.remove('secili'); esSecTr = b; }
  b.classList.add('secili');
  if (!esSecEn || !esSecTr) return;

  let a = esSecEn, t = esSecTr; esSecEn = esSecTr = null;
  a.classList.remove('secili'); t.classList.remove('secili');
  let k = esKelime(a.dataset.id);

  window.dmVerifiedGames?.record(k.en,t.textContent);
  if (a.dataset.id === t.dataset.id) {
    a.classList.add('tamam'); t.classList.add('tamam');
    esDogru++; esKalan--; esKombo++;
    OC.dogru(esHatalilar.some(x => x.id === k.id) ? 0.5 : 1);
    esSeslendir(k.en);
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('dogru');
    if (esKombo >= 3 && typeof genelKomboGoster === 'function') genelKomboGoster(esKombo, document.querySelector('#esOyunOverlay .game-modal-content'));
    if (navigator.vibrate) navigator.vibrate(60);
    if (typeof window.enerjiSoruSay === 'function') window.enerjiSoruSay(1);
    esBilgiGuncelle();
    if (esKalan === 0) {
      esKilit = true;
      setTimeout(() => {
        esTurNo++;
        if (esTurNo < esTurlar.length) esTurCiz(); else esOyunuBitir();
      }, 650);
    }
  } else {
    let kalkan = typeof jokerKalkanTuket === 'function' && jokerKalkanTuket();
    OC.yanlis(kalkan);
    if (!kalkan) {
      esYanlis++; esKombo = 0;
      if (k && !esHatalilar.some(x => x.id === k.id)) esHatalilar.push(k);
      if (k && typeof zkEkle === 'function') { try { zkEkle(k.kaynak || { en: k.en, tr: k.tr, sinif: esAktifSinif }); } catch (e) {} }
    }
    if (typeof genelSesEfektiCal === 'function') genelSesEfektiCal('yanlis');
    if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
    [a, t].forEach(x => { x.classList.remove('hata'); void x.offsetWidth; x.classList.add('hata'); setTimeout(() => x.classList.remove('hata'), 450); });
  }
}

async function esOyunuBitir() {
  if (esTimer) clearInterval(esTimer);
  esEl('esOyunEkrani').style.display = 'none';
  esEl('esBitisEkrani').style.display = 'block';
  let isim = esEl('esIsimInput').value.trim();
  let sinifStr = esAktifSinif + '. Sınıf';
  let toplam = esToplam();
  let puan = OC.puan();
  let yildiz = OC.yildiz(puan);

  esEl('esYildiz').innerText = '⭐'.repeat(yildiz) + '☆'.repeat(3 - yildiz);
  esEl('esResIsim').innerText = isim;
  esEl('esResHata').innerText = esYanlis;
  esEl('esResSure').innerText = esSure + ' saniye';
  esEl('esResPuan').innerText = puan + ' Puan';
  esEl('esTekrarKutu').style.display = esHatalilar.length ? 'block' : 'none';
  esEl('esTekrarListe').innerHTML = esHatalilar.map(k => `<li>${String(k.en).replace(/</g, '&lt;')} = ${String(k.tr).replace(/</g, '&lt;')}</li>`).join('');

  if (typeof genelSonucEkraniGoster === 'function')
    genelSonucEkraniGoster({ oyunAdi: '🔗 Eş Bul', isim: isim, puan: puan, dogru: esDogru, yanlis: esYanlis, sureSaniye: esSure, oyunKey: 'eslestirme', devamFn: esOyunKapat, tekrarFn: esOyunAc });
  try {
    await fetch(apiURL, { method: 'POST', body: JSON.stringify({
      islem: 'eslestirmeLiderlikKaydet', tarih: new Date().toISOString().split('T')[0], isim: isim, sinif: sinifStr,
      unite: esSecilenUniteler.join(',') + '. Ünite', dogru: esDogru, yanlis: esYanlis,
      detay: esYanlis + ' yanlış', sure: esSure + 's', suresaniye: esSure, puan: puan }) });
  } catch (e) {}
  if (typeof liderlikKilitBaslat === 'function') liderlikKilitBaslat('eslestirme');
  if (typeof oyunLiderlikGoster === 'function') oyunLiderlikGoster('eslestirmeLiderlikTumunuGetir', sinifStr, isim, 'esGecmisSkorlarListesi', 'Eş Bul', 'eslestirme');
}

/* Oyunlar'e kartı ekle (Hafıza Sandığı'nın hemen yanına) */
(function esKartEkle() {
  let dene = () => {
    if (document.getElementById('esAktiviteKart')) return true;
    let hafiza = document.querySelector('#tab-aktiviteler [onclick="hafizaOyunAc()"]');
    let izgara = hafiza ? hafiza.parentElement : document.querySelector('#tab-aktiviteler .az-grid2x2');
    if (!izgara) return false;
    let b = document.createElement('button');
    b.className = 'az-gcard'; b.id = 'esAktiviteKart'; b.type = 'button';
    b.style.background = 'linear-gradient(160deg,#c084fc,#db2777)';
    b.setAttribute('onclick', 'esOyunAc()');
    b.innerHTML = '<div class="az-gcard-icon">🧩</div><div class="az-gcard-title">Eş Bul</div>';
    if (hafiza) hafiza.insertAdjacentElement('afterend', b); else izgara.appendChild(b);
    return true;
  };
  if (!dene()) { let n = 0, t = setInterval(() => { if (dene() || ++n > 40) clearInterval(t); }, 500); }
})();
