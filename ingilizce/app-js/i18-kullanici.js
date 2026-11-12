
window.OC = (function () {
  const SORU = 12, TAM = 100, YARIM = 50;
  const SERI_BONUS = { 3: 50, 5: 50, 8: 100 };          /* en fazla 200 → en yüksek puan 1000 */
  const KAYIT_OYUN = { kelimeLiderlikKaydet: 'ky', jeopardyLiderlikKaydet: 'jp', boslukLiderlikKaydet: 'bosluk',
    hafizaLiderlikKaydet: 'hafiza', yagmurLiderlikKaydet: 'yagmur', asmacaLiderlikKaydet: 'asmaca',
    kelimebulLiderlikKaydet: 'kelimebul', eslestirmeLiderlikKaydet: 'eslestirme', trenLiderlikKaydet: 'tren', harfBahcesiLiderlikKaydet: 'harfbahcesi', konusmaLiderlikKaydet: 'kp', dikteLiderlikKaydet: 'dikte', cumleLiderlikKaydet: 'cumle' };
  const GETIR_ADIL = /^(kelime|jeopardy|bosluk|hafiza|yagmur|asmaca|kelimebul|eslestirme|tren|harfBahcesi|konusma|dikte|cumle)LiderlikTumunuGetir$/;
  let d = null;                     /* aktif oyun durumu */
  const sonuclar = {};              /* oyunKey → dondurulmuş sonuç */
  let donem = 'hafta';

  /* ---------- yardımcılar ---------- */
  const karistir = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const enAnahtar = k => String((k && (k.ingilizce || k.en)) || '').trim().toLowerCase();
  const sinifModu = () => typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci;
  const bugun = () => (typeof yoBugun === 'function' ? yoBugun() : new Date().toISOString().slice(0, 10));
  function kullanici() { try { return (typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && aktifOgrenciAdi.toLowerCase() !== 'teacher') ? aktifOgrenciAdi : ''; } catch (e) { return ''; } }

  /* ---------- görülen kelimeler (öğrenci + oyun başına) ---------- */
  function gkOku(oyun) {
    try {
      if (typeof yoHazirMi === 'function' && yoHazirMi()) { yo.gk = yo.gk || {}; return new Set(yo.gk[oyun] || []); }
      let v = JSON.parse(localStorage.getItem('oc_gk_' + kullanici()) || '{}'); return new Set(v[oyun] || []);
    } catch (e) { return new Set(); }
  }
  function gkYaz(oyun, set) {
    let liste = [...set].slice(-700);
    try {
      if (typeof yoHazirMi === 'function' && yoHazirMi()) { yo.gk = yo.gk || {}; yo.gk[oyun] = liste; if (typeof yoKaydet === 'function') yoKaydet(); return; }
      let v = JSON.parse(localStorage.getItem('oc_gk_' + kullanici()) || '{}'); v[oyun] = liste; localStorage.setItem('oc_gk_' + kullanici(), JSON.stringify(v));
    } catch (e) {}
  }

  /* Havuzdan `adet` öğe: önce görülmemişler, varsa 1 tane vadesi gelmiş Zor Kelime.
     Havuz bitince bu havuzun kaydı sıfırlanır ve yeni tur başlar. */
  function kelimeSec(oyun, havuz, adet, opt) {
    opt = opt || {}; adet = adet || SORU;
    const anahtar = opt.anahtar || enAnahtar;
    let tekil = [], gorulenAnahtar = new Set();
    for (const k of havuz || []) { let a = anahtar(k); if (!a || gorulenAnahtar.has(a)) continue; gorulenAnahtar.add(a); tekil.push(k); }
    if (sinifModu() || !kullanici()) return karistir(tekil).slice(0, adet);

    let scope = tekil.map(k => { let grade=Number(k.sinif??k.class_no??k[3]),unit=Number(k.unite??k.unit_no??k[4]); return Number.isInteger(grade)&&Number.isInteger(unit)?grade+':'+unit:'phrase'; });
    let groups=[...new Set(scope)].sort().join('|');
    let groupKey='shared:'+groups;
    let gorulen=gkOku(groupKey), secim=[],lastKey='oc_last:'+kullanici()+':'+groupKey,
        last=new Set((()=>{try{return JSON.parse(localStorage.getItem(lastKey)||'[]');}catch{return [];}})());
    if (opt.zk === true && typeof yo !== 'undefined' && yo && yo.zk) {
      yo.gkZk = yo.gkZk || {};
      let vadeli = tekil.filter(k => { let a = anahtar(k), z = yo.zk[a]; return z && (!z.sonraki || z.sonraki <= bugun()) && a !== yo.gkZk[oyun] && !last.has(a); });
      if (vadeli.length) { let t = vadeli[Math.floor(Math.random() * vadeli.length)]; t._tekrar = true; secim.push(t); yo.gkZk[oyun] = anahtar(t); }
      else yo.gkZk[oyun] = '';     /* bir sonraki oyunda aynı zor kelime yeniden gelebilir */
    }
    let yeni = karistir(tekil.filter(k => !gorulen.has(anahtar(k)) && !last.has(anahtar(k)) && !secim.includes(k)));
    secim.push(...yeni.slice(0, adet - secim.length));
    if (secim.length < adet) {                             /* tur tamamlandı: bu havuzu sıfırla */
      tekil.forEach(k => gorulen.delete(anahtar(k)));
      secim.push(...karistir(tekil.filter(k => !secim.includes(k)&&!last.has(anahtar(k)))).slice(0,adet-secim.length));if(secim.length<adet)secim.push(...karistir(tekil.filter(k=>!secim.includes(k))).slice(0,adet-secim.length));
    }
    secim.forEach(k => gorulen.add(anahtar(k)));
    gkYaz(groupKey, gorulen);localStorage.setItem(lastKey,JSON.stringify(secim.map(anahtar)));
    return karistir(secim);
  }

  /* ---------- puanlama ---------- */
  function basla(oyun) {
    d = { rewardScope:window.dmGameScope?.(oyun), oyun, runId: oyun + '_' + Date.now() + '_' + Math.random().toString(36).slice(2), temelPuan: 0, puan: 0, dogru: 0, yanlis: 0, seri: 0, enSeri: 0, verilenBonus: {}, bas: Date.now(), odulCarpan: 1, bitti: false };
    delete sonuclar[oyun];
  }
  /* oran: 1 = ilk denemede doğru (100), 0.5 = ikinci denemede (50), 0 = bulundu ama puansız */
  function dogru(oran, ilkDeneme) {
    if (!d || d.bitti) return 0;
    if (oran === undefined || oran === true) oran = 1;
    if (oran === false) oran = 1;
    if (ilkDeneme === undefined) ilkDeneme = oran >= 1;
    let kazanc = Math.round(TAM * oran);
    d.dogru++;
    if (ilkDeneme) {
      d.seri++; d.enSeri = Math.max(d.enSeri, d.seri);
      let b = SERI_BONUS[d.seri];
      if (b && !d.verilenBonus[d.seri]) { d.verilenBonus[d.seri] = 1; kazanc += b; }
    } else d.seri = 0;
    try { if (typeof jokerCiftCarpan === 'function' && jokerCiftCarpan() > 1) d.odulCarpan = 2; } catch (e) {}   /* çift puan → ödül ×2, liderlik değişmez */
    d.temelPuan += kazanc; d.puan = puan();
    return kazanc;
  }
  function yanlis(korundu) { if (!d || d.bitti) return; if (!korundu) { d.yanlis++; d.seri = 0; } d.puan = puan(); }
  function hataSay() { yanlis(false); }
  function hesapla() { return DijiScoreRules.calculate({base:d.temelPuan, correct:d.dogru, wrong:d.yanlis, seconds:sure()}); }
  function puan() { return d ? (d.bitti ? d.puan : hesapla().puan) : 0; }
  function sure() { return d ? (d.bitti ? d.sure : Math.max(0, Math.round(((d.pauseAt || Date.now()) - d.bas) / 10) / 100)) : 0; }
  function yildiz(p) { return p >= 800 ? 3 : p >= 500 ? 2 : 1; }
  function sonlandir(oyun) {
    if (!d || d.oyun !== oyun) return sonuclar[oyun] || null;
    if (!d.bitti) { const s = hesapla(); d.sure = s.sure; d.puan = s.puan; d.bitti = true; sonuclar[oyun] = Object.assign(s, {runId:d.runId, enSeri:d.enSeri, odulCarpan:d.odulCarpan,rewardScope:d.rewardScope}); }
    return sonuclar[oyun];
  }

  /* ---------- sonuç ekranı: puan ve süre her zaman çekirdekten ---------- */
  function sonucEkraniniSar() {
    if (typeof window.genelSonucEkraniGoster !== 'function' || window.genelSonucEkraniGoster._oc) return;
    const org = window.genelSonucEkraniGoster;
    window.genelSonucEkraniGoster = function (o) {
      if (o && o.oyunKey && d && d.oyun === o.oyunKey) {
        let s = sonlandir(o.oyunKey);
        const explicitScope=o.rewardScope;Object.assign(o, s, { sureSaniye: s.sure });if(explicitScope)o.rewardScope=explicitScope;
      }
      const result=org.call(this, o);
      if(o?.puanSurum===3){let detail=document.getElementById('dmScoreBreakdown');if(!detail){detail=document.createElement('p');detail.id='dmScoreBreakdown';detail.className='dm-score-breakdown';document.querySelector('#genelSonucOverlay .gso-istat')?.after(detail);}detail.textContent='Doğru + seri: '+o.temelPuan+' · Hız: +'+o.hizBonusu+' · Yanlış: −'+o.hataCezasi+' puan';}
      return result;
    };
    window.genelSonucEkraniGoster._oc = true;
  }

  /* ---------- ağ: kayıtta çekirdek sonucu, listede dönem ---------- */
  const orgFetch = window.fetch;
  window.fetch = function (url, opt) {
    try {
      if (opt && opt.method === 'POST' && typeof opt.body === 'string' && opt.body.indexOf('LiderlikKaydet') !== -1) {
        let b = JSON.parse(opt.body), oyun = KAYIT_OYUN[b.islem];
        let s = oyun ? (sonuclar[oyun] || (d && d.oyun === oyun ? sonlandir(oyun) : null)) : null;
        if (s) {
          Object.assign(b, { puan: s.puan, dogru: s.dogru, yanlis: s.yanlis, suresaniye: s.sure, sure: s.sure + 's', runId:s.runId, puanTemel: s.temelPuan, puanSurum: 3 });
          opt = Object.assign({}, opt, { body: JSON.stringify(b) });
        }
      }
      let u = typeof url === 'string' ? url : '';
      let m = u.match(/[?&]islem=([A-Za-z]+LiderlikTumunuGetir)/);
      if (m && GETIR_ADIL.test(m[1]) && u.indexOf('donem=') === -1) url = u + '&donem=' + donem + '&puanSurum=3';
    } catch (e) {}
    return orgFetch.call(this, url, opt);
  };

  /* ---------- liderlik: Bu hafta / Tüm zamanlar sekmeleri ---------- */
  function liderlikSar(ad) {
    const org = window[ad];
    if (typeof org !== 'function' || org._oc) return;
    const sarili = function (islem, sinifStr, isim, konteynerId) {
      let args = arguments, kutu = document.getElementById(konteynerId);
      if (kutu && GETIR_ADIL.test(islem)) {
        let id = konteynerId + '_ocSekme', bar = document.getElementById(id);
        if (!bar) {
          bar = document.createElement('div'); bar.id = id; bar.className = 'oc-sekmeler';
          bar.innerHTML = '<button type="button" class="oc-sekme" data-d="hafta">📅 Bu hafta</button><button type="button" class="oc-sekme" data-d="tum">🏛️ Tüm zamanlar</button>';
          let not = document.createElement('div'); not.className = 'oc-bilgi'; not.id = konteynerId + '_ocNot';
          not.innerText = 'Hız bonusu puana dahildir; yanlışlar puan ve tur XP’sini azaltır. Yeni sistemde herkesin en iyi skoru.';
          kutu.parentNode.insertBefore(bar, kutu); kutu.parentNode.insertBefore(not, kutu);
          bar.querySelectorAll('.oc-sekme').forEach(b => b.onclick = () => { donem = b.dataset.d; sarili.apply(null, bar._args); });
        }
        bar._args = args;
        bar.querySelectorAll('.oc-sekme').forEach(b => b.classList.toggle('aktif', b.dataset.d === donem));
      }
      return org.apply(this, args);
    };
    sarili._oc = true;
    window[ad] = sarili;
  }

  function kur() { sonucEkraniniSar(); liderlikSar('oyunLiderlikGoster'); liderlikSar('oyunLiderlikGosterDetayli'); }
  kur(); setTimeout(kur, 1500);

  return { SORU, kelimeSec, basla, dogru, yanlis, hataSay, puan, sure, yildiz, sonlandir,
           get aktif() { return d; }, sonuc: oyun => sonuclar[oyun] || null };
})();
