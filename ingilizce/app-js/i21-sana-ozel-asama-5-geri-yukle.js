
(function () {
  /* =========================================================
     SANA ÖZEL · AŞAMA 5 — GERİ YÜKLEME
     Günün 3 Görevi · Tekrar Zamanı · Beceri Radarı
     Haftalık Hedef · Öğretmenimin Ödevleri

     NOT:
     - Mevcut Supabase/backend yapısını değiştirmez.
     - Mevcut öğrenci verilerini silmez.
     - Var olan yo / oyun / XP sistemini kullanır.
     ========================================================= */

  const $ = id => document.getElementById(id);

  const kac = s => String(s ?? '').replace(
    /[&<>"]/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c])
  );

  const yoVar = () =>
    typeof yo !== 'undefined' &&
    yo &&
    typeof yoHazirMi === 'function' &&
    yoHazirMi();

  const bugun = () =>
    typeof yoBugun === 'function'
      ? yoBugun()
      : new Date().toISOString().slice(0, 10);

  const sinifModu = () =>
    typeof siniftaOynananOgrenci !== 'undefined' &&
    !!siniftaOynananOgrenci;

  const toast = m => {
    if (typeof yoToast === 'function') yoToast(m);
  };


  /* =========================================================
     BECERİLER
     ========================================================= */

  const BECERI = [
    ['anlam', '📚', 'Anlam'],
    ['yazim', '✏️', 'Yazım'],
    ['dinleme', '🎧', 'Dinleme'],
    ['konusma', '🎤', 'Konuşma'],
    ['cumle', '🧱', 'Cümle'],
    ['hiz', '⏱️', 'Hız']
  ];

  const OYUN_BECERI = {
    ky: 'anlam',
    jp: 'anlam',
    eslestirme: 'anlam',
    hafiza: 'anlam',

    bosluk: 'yazim',
    asmaca: 'yazim',
    kelimebul: 'yazim',
    harfbahcesi: 'yazim',

    dikte: 'dinleme',

    kp: 'konusma',
    konusma: 'konusma',

    cumle: 'cumle',
    tren: 'cumle',

    yagmur: 'hiz'
  };

  const BECERI_OYUN = {
    anlam: ['esOyunAc', 'Eş Bul'],
    yazim: ['boslukOyunAc', 'Eksik Harf'],
    dinleme: ['dikteAc', 'Kulak Dedektifi'],
    konusma: ['kpModuAc', 'Kelime Modu'],
    cumle: ['trenOyunAc', 'Kelime Treni'],
    hiz: ['yagmurOyunAc', 'Hız Fırtınası']
  };


  /* =========================================================
     GÜNÜN 3 GÖREVİ
     ========================================================= */

  const GOREV_HAVUZ = [
    {
      id: 'oyun3',
      i: '🎮',
      ad: '3 oyun oyna',
      hedef: 3,
      olay: 'oyun'
    },
    {
      id: 'oyun5',
      i: '🕹️',
      ad: '5 oyun oyna',
      hedef: 5,
      olay: 'oyun'
    },
    {
      id: 'yildiz3',
      i: '⭐',
      ad: 'Bir oyunda ⭐⭐⭐ al',
      hedef: 1,
      olay: 'yildiz3'
    },
    {
      id: 'ders1',
      i: '📘',
      ad: '1 Ders Çalış konusu bitir',
      hedef: 1,
      olay: 'ders'
    },
    {
      id: 'dinleme',
      i: '🎧',
      ad: 'Kulak Dedektifi oyna',
      hedef: 1,
      olay: 'beceri:dinleme'
    },
    {
      id: 'yazim',
      i: '✏️',
      ad: 'Bir yazım oyununda ⭐⭐ al',
      hedef: 1,
      olay: 'beceri2:yazim'
    },
    {
      id: 'cumle',
      i: '🧱',
      ad: 'Cümle oyunu oyna (Treni ya da Cümle Ustası)',
      hedef: 1,
      olay: 'beceri:cumle'
    },
    {
      id: 'hiz',
      i: '⏱️',
      ad: "Hız Fırtınası'nda ⭐⭐ al",
      hedef: 1,
      olay: 'beceri2:hiz'
    },
    {
      id: 'zk',
      i: '🔁',
      ad: 'Zor Kelimelerini tekrar et',
      hedef: 1,
      olay: 'zk'
    }
  ];
  window.dmGorevHavuz = GOREV_HAVUZ; /* Günlük görevlerin ortak verisi */


  function tohum(str) {
    let h = 0;

    for (const c of str) {
      h = (h * 31 + c.charCodeAt(0)) >>> 0;
    }

    return h;
  }


 window.dmGunGorevleri = () => gunGorevleri(); /* Günlük görev ekranı için */
 function gunGorevleri() {

  if (!yoVar() || !window.dmProgression?.allowed('gunluk_gorev')) return null;

  const b = bugun();

  if (!yo.gorev || yo.gorev.t !== b) {

    const h = tohum(
      b +
      (
        typeof aktifOgrenciAdi !== 'undefined'
          ? aktifOgrenciAdi
          : ''
      )
    );

    /* 1. görev: oyun */
    const oyunG = GOREV_HAVUZ.filter(
      g =>
        g &&
        (
          g.olay === 'oyun' ||
          g.olay === 'yildiz3'
        )
    );

    /* 2. görev: ders */
    const dersG = GOREV_HAVUZ.find(
      g => g && g.id === 'ders1'
    );

    /* 3. görev: beceri veya zor kelime */
    let cesit = GOREV_HAVUZ.filter(
      g =>
        g &&
        (
          (String(g.olay || '').startsWith('beceri') && window.dmProgression?.allowed(({dinleme:'oyun_dikte',cumle:'oyun_tren',hiz:'oyun_yagmur',yazim:'oyun_bosluk'})[g.id] || 'aktiviteler')) ||
          (g.id === 'zk' && window.dmProgression?.allowed('zor_kelimeler'))
        )
    );

    if(!cesit.length) cesit=oyunG;
    const secim = [];

    /* Oyun görevi */
    if (oyunG.length) {
      secim.push(
        oyunG[h % oyunG.length]
      );
    }

    /* Ders görevi */
    if (dersG) {
      secim.push(dersG);
    }

    /* Beceri / tekrar görevi */
    if (cesit.length) {
      secim.push(
        cesit[
          (h >>> 3) % cesit.length
        ]
      );
    }

    /*
      Herhangi bir nedenle yukarıdan 3 görev çıkmazsa
      güvenli yedek görevlerle tamamla.
    */
    const kullanilan =
      new Set(
        secim
          .filter(Boolean)
          .map(g => g.id)
      );

    for (const aday of GOREV_HAVUZ) {

      if (secim.length >= 3) break;

      if (
        aday &&
        aday.id &&
        !kullanilan.has(aday.id)
      ) {

        secim.push(aday);
        kullanilan.add(aday.id);
      }
    }

    /*
      Son güvenlik:
      undefined/null elemanları temizle.
    */
    const temizSecim =
      secim
        .filter(
          g =>
            g &&
            typeof g.id === 'string'
        )
        .slice(0, 3);

    /*
      Görev havuzu ciddi şekilde bozulmuşsa
      uygulamayı çökertme.
    */
    if (!temizSecim.length) {

      console.warn(
        'Sana Özel: Günlük görev oluşturulamadı.',
        GOREV_HAVUZ
      );

      return null;
    }

    yo.gorev = {
      t: b,

      liste: temizSecim.map(g => ({
        id: g.id,
        ilerleme: 0
      })),

      alindi: false
    };

    if (typeof yoKaydet === 'function') {
      yoKaydet();
    }
  }

  // Repair today's incomplete/obsolete records without resetting valid progress or reward claims.
  const mevcut = new Map();
  for (const x of Array.isArray(yo.gorev.liste) ? yo.gorev.liste : []) {
    if (x && GOREV_HAVUZ.some(g => g.id === x.id) && !mevcut.has(x.id)) {
      mevcut.set(x.id, {id:x.id, ilerleme:Math.max(0, Number(x.ilerleme) || 0)});
    }
  }
  const onceki = JSON.stringify(yo.gorev.liste);
  for (const g of GOREV_HAVUZ) {
    if (mevcut.size >= 3) break;
    if (!mevcut.has(g.id)) mevcut.set(g.id, {id:g.id, ilerleme:0});
  }
  yo.gorev.liste = [...mevcut.values()].slice(0,3);
  if (onceki !== JSON.stringify(yo.gorev.liste) && typeof yoKaydet === 'function') yoKaydet();
  return yo.gorev;
}


  function olay(tur) {
    if(tur==='oyun')document.dispatchEvent(new Event('dm:mission-refresh'));

    const g = gunGorevleri();

    if (!g) return;

    let degisti = false;

    g.liste.forEach(x => {

      const t = GOREV_HAVUZ.find(
        y => y.id === x.id
      );

      if (!t || x.ilerleme >= t.hedef) return;

      if (t.olay === tur) {

        x.ilerleme++;

        degisti = true;

        if (x.ilerleme >= t.hedef) {

          setTimeout(() => {
            toast(`✅ Görev tamam: ${t.ad}`);
          }, 2600);

        }
      }
    });

    if (degisti) {

      if (typeof yoKaydet === 'function') {
        yoKaydet();
      }

      ciz();
    }
  }


  /* =========================================================
     GÜNLÜK GÖREV ÖDÜLÜ
     ========================================================= */

  function gorevOdulu() {

    const g = gunGorevleri();

    if (!g || g.alindi) return;

    const hepsiTamam = g.liste.every(x => {

      const t = GOREV_HAVUZ.find(
        y => y.id === x.id
      );

      return t && x.ilerleme >= t.hedef;
    });

    if (!hepsiTamam) return;


    g.alindi = true;

    const hafta = haftaKodu();

    const haftaIlk =
      yo.gorevHafta !== hafta;

    yo.gorevHafta = hafta;


    if (typeof yoXpEkle === 'function') {
      yoXpEkle(10, 5, 'sana_ozel_gunluk', yoBugun());
    }


    // Günlük görevlerin küçük ödülü XP ve altındır; ekstra enerji verilmez.


    if (typeof odulGoster === 'function') {

      odulGoster({
        ikon: '📋',
        baslik: 'Günün görevleri tamam!',
        alt: 'Yarın yeni görevler seni bekliyor',
        xp: 10,
        altin: 5
      });

    }


    if (
      false && haftaIlk &&
      typeof dolapSandikAc === 'function'
    ) {

      setTimeout(() => {
        dolapSandikAc(0, true);
      }, 2500);

    }


    if (typeof yoKaydet === 'function') {
      yoKaydet();
    }

    ciz();
  }


  /* =========================================================
     BECERİ KAYDI
     ========================================================= */

  function beceriKaydet(o, s) {

    if (
      !yoVar() ||
      sinifModu() ||
      !o ||
      !o.oyunKey
    ) return;


    const b = OYUN_BECERI[o.oyunKey];


    const yuzde =
      s && typeof s.puan === 'number'
        ? Math.round(s.puan / 10)
        : (() => {

            const d = +o.dogru || 0;
            const y = +o.yanlis || 0;

            return d + y
              ? Math.round(d / (d + y) * 100)
              : 0;

          })();


    const yildiz =
      s && s.yildiz
        ? s.yildiz
        : (
            yuzde >= 80
              ? 3
              : yuzde >= 50
                ? 2
                : 1
          );


    if (b) {

      yo.beceri = yo.beceri || {};

      const l =
        yo.beceri[b] =
        yo.beceri[b] || [];

      l.push(
        Math.max(
          0,
          Math.min(100, yuzde)
        )
      );

      if (l.length > 10) {
        l.shift();
      }
    }


    olay('oyun');


    if (yildiz >= 3) {
      olay('yildiz3');
    }


    if (b) {

      olay('beceri:' + b);

      if (yildiz >= 2) {
        olay('beceri2:' + b);
      }
    }


    if (typeof yoKaydet === 'function') {
      yoKaydet();
    }
  }


  /* =========================================================
     MEVCUT OYUN SONU SİSTEMİNE BAĞLA
     ========================================================= */

  const orgGso =
    window.genelSonucEkraniGoster;


  if (
    typeof orgGso === 'function' &&
    !orgGso._sanaOzelAsama5
  ) {

    const yeniGso = function(o) {

      const r =
        orgGso.apply(this, arguments);

      try {

        beceriKaydet(
          o,
          window.OC &&
          o &&
          o.oyunKey
            ? OC.sonuc(o.oyunKey)
            : null
        );

      } catch (e) {
        console.warn(
          'Sana Özel beceri kaydı:',
          e
        );
      }

      return r;
    };

    yeniGso._oc = orgGso._oc;
    yeniGso._sanaOzelAsama5 = true;

    window.genelSonucEkraniGoster =
      yeniGso;
  }


  /* =========================================================
     DERS TAMAMLAMA GÖREVİ
     ========================================================= */

  const orgDc =
    window.dcOdulVer;


  if (
    typeof orgDc === 'function' &&
    !orgDc._sanaOzelAsama5
  ) {

    const yeniDc = function() {

      const r =
        orgDc.apply(this, arguments);

      try {
        olay('ders');
      } catch (e) {}

      return r;
    };

    yeniDc._sanaOzelAsama5 = true;

    window.dcOdulVer = yeniDc;
  }


  /* =========================================================
     ZOR KELİME TEKRAR GÖREVİ
     ========================================================= */

  const orgZk =
    window.yoZkAc;


  if (
    typeof orgZk === 'function' &&
    !orgZk._sanaOzelAsama5
  ) {

    const yeniZk = function() {

      const r =
        orgZk.apply(this, arguments);

      try {
        olay('zk');
      } catch (e) {}

      return r;
    };

    yeniZk._sanaOzelAsama5 = true;

    window.yoZkAc = yeniZk;
  }


  /* =========================================================
     HAFTALIK HEDEF
     ========================================================= */

  function haftaKodu() {

    const d =
      new Date(
        Date.now() + 3 * 3600000
      );

    d.setUTCDate(
      d.getUTCDate() -
      (d.getUTCDay() + 6) % 7
    );

    return d
      .toISOString()
      .slice(0, 10);
  }


  function haftaXp() {
    try { return window.dmWeeklyXp ? window.dmWeeklyXp(yo) : (Number(yo.lig && yo.lig.xp) || 0); }
    catch (e) { return 0; }
  }

  // Only the API may credit a weekly goal; the UI cannot award coins.
  let hedefOdulIslemi = false, hedefOdulSonKontrol = 0;
  async function hedefKontrol() {
    if (!window.dmProgression?.allowed("haftalik_hedef") || !yoVar()) return;
    const hedef = yo.haftaHedef;
    if (!hedef || hedef.h !== haftaKodu() || hedef.odul || hedefOdulIslemi
      || ![1000,1500,2500].includes(Number(hedef.xp))
      || haftaXp() < Number(hedef.xp) || Date.now() < hedefOdulSonKontrol) return;
    hedefOdulIslemi = true;
    hedefOdulSonKontrol = Date.now() + 1500;
    const owner = typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi);
    const state = yo;
    try {
      const response = await fetch(apiURL, {
        method:'POST',
        body:JSON.stringify({islem:'haftalikHedefOdulAl',ogrenci:owner})
      });
      const d = await response.json();
      if (!response.ok || !d?.ok) throw new Error(d?.mesaj || d?.message || 'Ödül onaylanamadı.');
      if (yo !== state || owner !== String(aktifOgrenciAdi || '')) return;
      if (d.haftaHedef?.h === haftaKodu()) {
        yo.haftaHedef = d.haftaHedef;
      }
      // Apply the authoritative balance, never add the displayed prize a second time.
      if (Number.isFinite(Number(d.altin))) yo.altin = Number(d.altin);
      if (d.yo?.dmRewardVersion) yo.dmRewardVersion = d.yo.dmRewardVersion;
      if (d.yo?.guncelleme) yo.guncelleme = Math.max(Number(yo.guncelleme)||0, Number(d.yo.guncelleme));
      if (d.newlyAwarded) {
        const rozet = 'Haftalık hedef ' + d.haftaHedef.xp + ' XP';
        yo.rozetler = yo.rozetler || [];
        if (!yo.rozetler.some(item => item.ad === rozet && item.h === d.haftaHedef.h)) {
          yo.rozetler.push({ad:rozet,t:bugun(),h:d.haftaHedef.h});
        }
        if (typeof odulGoster === 'function') odulGoster({
          ikon:'🏅',
          baslik:'Haftalık hedefine ulaştın!',
          alt:`${d.haftaHedef.xp} XP · rozet kazandın`,
          altin:Number(d.awardedGold)||0
        });
      }
      if (typeof yoKaydet === 'function') yoKaydet();
      ciz();
    } catch (e) {
      if(typeof yoToast === 'function') yoToast('Ödül alınamadı, yeniden dene.');
      console.warn('[DijiMedu] Haftalık hedef ödülü:',e);
    } finally {
      hedefOdulIslemi = false;
    }
  }


  /* =========================================================
     BECERİ RADARI SVG
     ========================================================= */

  function radarSVG(degerler) {

    const cx = 110;
    const cy = 100;
    const R0 = 72;
    const n = 6;


    const nokta = (i, r) => {

      const a =
        -Math.PI / 2 +
        i * 2 * Math.PI / n;

      return [
        cx + r * Math.cos(a),
        cy + r * Math.sin(a)
      ];
    };


    const izgara =
      [0.33, 0.66, 1]
        .map(k =>
          `<polygon points="${
            [...Array(n)]
              .map(
                (_, i) =>
                  nokta(i, R0 * k)
                    .join(',')
              )
              .join(' ')
          }"
          fill="none"
          stroke="#e4dafc"
          stroke-width="1.5"/>`
        )
        .join('');


    const eksen =
      [...Array(n)]
        .map(
          (_, i) =>
            `<line
              x1="${cx}"
              y1="${cy}"
              x2="${nokta(i, R0)[0]}"
              y2="${nokta(i, R0)[1]}"
              stroke="#efe8ff"/>`
        )
        .join('');


    const alan =
      `<polygon
        points="${
          degerler
            .map(
              (v, i) =>
                nokta(
                  i,
                  R0 *
                  Math.max(
                    .06,
                    v / 100
                  )
                ).join(',')
            )
            .join(' ')
        }"
        fill="rgba(124,58,237,.28)"
        stroke="#7c3aed"
        stroke-width="2.5"
        stroke-linejoin="round"/>`;


    const etiket =
      BECERI
        .map(([k, ik, ad], i) => {

          const [x, y] =
            nokta(i, R0 + 20);

          return `
            <text
              x="${x}"
              y="${y + 4}"
              text-anchor="middle"
              font-size="11"
              font-weight="800"
              fill="#5b21b6">
              ${ik} ${ad}
            </text>
          `;

        })
        .join('');


    return `
      <svg
        viewBox="0 0 220 200"
        width="100%"
        style="max-width:260px"
        role="img">

        ${izgara}
        ${eksen}
        ${alan}
        ${etiket}

      </svg>
    `;
  }


  /* =========================================================
     ÖĞRETMENİMİN ÖDEVLERİ
     ========================================================= */

  let odevCache = null;
  let odevZaman = 0;


  async function odevleriGetir() {

    if (
      odevCache &&
      Date.now() - odevZaman < 120000
    ) {
      return odevCache;
    }


    const ad =
      encodeURIComponent(
        typeof aktifOgrenciAdi !== 'undefined'
          ? aktifOgrenciAdi
          : ''
      );


    let hata = 0;


    const [e, v] =
      await Promise.all([

        fetch(
          `${apiURL}?islem=etkinlikleriGetir&ogrenci=${ad}`
        )
          .then(r => r.json())
          .catch(() => {
            hata++;
            return [];
          }),

        fetch(
          `${apiURL}?islem=videolariGetir&ogrenci=${ad}`
        )
          .then(r => r.json())
          .catch(() => {
            hata++;
            return [];
          })

      ]);


    if (hata === 2) {
      return null;
    }


    const liste = [];


    (Array.isArray(e) ? e : [])
      .filter(
        x =>
          !(
            x.yapildiMi ||
            x.durum === 'completed' ||
            x.tamamlandi
          )
      )
      .forEach(x => {

        liste.push({
          tur: '🎯',
          ad:
            x.gorunenAd ||
            'Etkinlik',
          atandi:
            x.atandi ||
            x.atanmaTarihi ||
            null
        });

      });


    (Array.isArray(v) ? v : [])
      .filter(
        x => !x.izlendiMi
      )
      .forEach(x => {

        liste.push({
          tur: '🎬',
          ad:
            x.baslik ||
            'Video',
          atandi:
            x.atandi ||
            x.atanmaTarihi ||
            null
        });

      });


    odevCache = liste;
    odevZaman = Date.now();

    return liste;
  }


  function kalanGun(atandi) {

    if (!atandi) return '';


    const tarih =
      Date.parse(atandi);

    if (!Number.isFinite(tarih)) {
      return '';
    }


    const gecen =
      Math.max(
        0,
        Math.floor(
          (Date.now() - tarih) /
          86400000
        )
      );


    const kalan =
      5 - (gecen % 5);


    return kalan <= 1
      ? `<span style="color:#dc2626">
           ⚠️ yarın −1 puan
         </span>`
      : `<span style="color:#b45309">
           −1 puana ${kalan} gün
         </span>`;
  }


  /* =========================================================
     PANEL ÇİZİMİ
     ========================================================= */

  async function ciz() {

    const kok = $('soPanel');

    if (
      !kok ||
      !yoVar()
    ) return;


    const g =
      gunGorevleri();

    if (!g) return;


    const tamam =
      g.liste.filter(x => {

        const t =
          GOREV_HAVUZ.find(
            y => y.id === x.id
          );

        return (
          t &&
          x.ilerleme >= t.hedef
        );

      }).length;


    const gorevHtml =
      g.liste
        .map(x => {

          const t =
            GOREV_HAVUZ.find(
              y => y.id === x.id
            );

          if (!t) return '';


          const ok =
            x.ilerleme >= t.hedef;


          return `
            <div class="so-gorev${ok ? ' bitti' : ''}">

              <span class="i">
                ${ok ? '✅' : t.i}
              </span>

              <span class="m">

                <b>
                  ${kac(t.ad)}
                </b>

                <div class="so-cubuk">
                  <i style="
                    width:${
                      Math.min(
                        100,
                        x.ilerleme /
                        t.hedef *
                        100
                      )
                    }%
                  "></i>
                </div>

              </span>

              <span class="s">
                ${
                  Math.min(
                    x.ilerleme,
                    t.hedef
                  )
                }/${t.hedef}
              </span>

            </div>
          `;

        })
        .join('');


    const haftaIlk =
      yo.gorevHafta !== haftaKodu();


    const odulBtn =
      g.alindi

        ? `
          <button
            class="so-btn"
            disabled>
            ✅ Ödül alındı · yarın yeni görevler gelir
          </button>
        `

        : `
          <button
            class="so-btn sari"
            id="soGorevOdul"
            ${tamam === 3 ? '' : 'disabled'}>

            🎁 Ödülü Al: +5 🪙 +10 XP
            ${haftaIlk
              ? ''
              : ''
            }

          </button>
        `;


    /* ---------- BECERİ RADARI ---------- */

    const degerler =
      BECERI.map(([k]) => {

        const l =
          (yo.beceri || {})[k] || [];

        return l.length
          ? Math.round(
              l.reduce(
                (a, b) => a + b,
                0
              ) / l.length
            )
          : 0;

      });


    const oynanan =
      BECERI.filter(
        ([k]) =>
          ((yo.beceri || {})[k] || [])
            .length
      );


    let zayifI;


    if (oynanan.length) {

      zayifI =
        BECERI
          .map(([k], i) => i)
          .filter(
            i =>
              (
                (yo.beceri || {})[
                  BECERI[i][0]
                ] || []
              ).length
          )
          .sort(
            (a, b) =>
              degerler[a] -
              degerler[b]
          )[0];

    } else {

      zayifI =
        BECERI.findIndex(
          ([k]) =>
            !(
              (yo.beceri || {})[k] || []
            ).length
        );

    }


    const eksik =
      BECERI.filter(
        ([k]) =>
          !(
            (yo.beceri || {})[k] || []
          ).length
      );


    const ipucu =
      eksik.length === BECERI.length

        ? 'Oyun oynadıkça radarın dolacak. Her oyun bir beceriyi geliştirir!'

        : eksik.length

          ? `Henüz denemediğin beceri:
             <b>
               ${eksik[0][1]}
               ${eksik[0][2]}
             </b>.
             ${BECERI_OYUN[eksik[0][0]][1]}
             ile başla!`

          : `En çok gelişebilecek becerin:
             <b>
               ${BECERI[zayifI][1]}
               ${BECERI[zayifI][2]}
             </b>
             (%${degerler[zayifI]}).
             ${BECERI_OYUN[BECERI[zayifI][0]][1]}
             oyna!`;


    const hedefBeceri =
      eksik.length
        ? eksik[0][0]
        : BECERI[zayifI][0];


    /* ---------- HAFTALIK HEDEF ---------- */

    const hh =
      yo.haftaHedef &&
      yo.haftaHedef.h === haftaKodu()
        ? yo.haftaHedef
        : null;


    const xp =
      haftaXp();


    const hedefHtml =
      hh

        ? `
          <div
            style="
              font-size:26px;
              font-weight:900">

            ${xp}

            <span
              style="
                font-size:14px;
                color:#8a78b8">

              / ${hh.xp} XP

            </span>

          </div>

          <div
            class="so-cubuk"
            style="height:12px">

            <i
              style="
                width:${
                  Math.min(
                    100,
                    xp / hh.xp * 100
                  )
                }%">
            </i>

          </div>

          <div class="so-ipucu">

            ${
              hh.odul
                ? '✅ Ödül alındı! Rozet ve altının hesabında.'
                : xp >= Number(hh.xp)
                  ? '🏆 Haftalık hedef tamamlandı! Ödülünü aşağıdan al.'
                  : `Hedefe ${
                    Math.max(
                      0,
                      hh.xp - xp
                    )
                  } XP kaldı · ödül:
                  ${
                    Math.round(
                      hh.xp / 20
                    )
                  } 🪙 + rozet`
            }

          </div>
          ${xp >= Number(hh.xp) && !hh.odul ? '<button id="soHaftaOdul" class="so-btn sari" type="button">🎁 Ödülü Al</button>' : ''}
        `

        : `
          <div class="so-ipucu">
            Bu hafta kendine bir XP hedefi seç.
            Tutturursan rozet ve altın kazanırsın!
          </div>

          <div class="so-hedef">

            ${[1000, 1500, 2500]
              .map(x => `
                <button
                  type="button"
                  data-h="${x}">

                  ${
                    x === 1000
                      ? '🙂'
                      : x === 1500
                        ? '💪'
                        : '🔥'
                  }

                  ${x}

                </button>
              `)
              .join('')}

          </div>
        `;


    /* ---------- ZOR KELİME ---------- */

    let zk = 0;

    try {

      zk =
        typeof zkVadesiGelen === 'function'
          ? zkVadesiGelen().length
          : 0;

    } catch (e) {}


    /* =========================================================
       HTML
       ========================================================= */

    kok.innerHTML = `

      <div class="so-kart" data-dm-goals="daily">

        <h3>
          📋 Günün 3 Görevi
          <small>${tamam}/3</small>
        </h3>

        ${gorevHtml}

        ${odulBtn}

      </div>


      <div class="so-iki">


        <div class="so-kart">

          <h3>
            📈 Beceri Radarı
          </h3>

          <div class="so-radar">
            ${radarSVG(degerler)}
          </div>

          <div class="so-ipucu">
            ${ipucu}
          </div>

        </div>


        <div
          style="
            display:grid;
            gap:12px;
            align-content:start">


          <div class="so-kart">

            <h3>

              🔁 Tekrar Zamanı

              <small>
                ${
                  zk
                    ? zk + ' kelime'
                    : ''
                }
              </small>

            </h3>


            <div class="so-ipucu">

              ${
                zk
                  ? `${zk} kelimen unutulmak üzere!
                     1, 3, 7, 14 gün arayla
                     tekrar edersen kalıcı olur.`

                  : 'Şu an tekrar zamanı gelen kelimen yok. Harika gidiyorsun! 🌟'
              }

            </div>


            <button
              class="so-btn"
              id="soZkBtn"
              ${zk ? '' : 'disabled'}>

              🔁 Şimdi tekrar et

            </button>

          </div>


          <div class="so-kart" data-dm-goals="weekly">

            <h3>
              🏅 Haftalık Hedef
            </h3>

            ${hedefHtml}

          </div>


        </div>

      </div>


      <div class="so-kart">

        <h3>

          👩‍🏫 Öğretmenimin Ödevleri

          <small id="soOdevSay"></small>

        </h3>


        <div id="soOdevler">

          <div class="so-bos">
            Yükleniyor...
          </div>

        </div>

      </div>

    `;


    /* =========================================================
       BUTONLAR
       ========================================================= */

    const ob =
      $('soGorevOdul');

    if (ob) {
      ob.onclick = gorevOdulu;
    }


    const beceriBtn =
      $('soBeceriBtn');

    if (beceriBtn) {

      beceriBtn.onclick = () => {

        const f =
          window[
            BECERI_OYUN[
              hedefBeceri
            ][0]
          ];


        if (
          typeof sanaOzelTamEkranKapat ===
          'function'
        ) {
          sanaOzelTamEkranKapat();
        }


        if (typeof f === 'function') {

          setTimeout(
            f,
            200
          );

        }
      };
    }


    const zb =
      $('soZkBtn');

    if (zb) {

      zb.onclick = () => {

        if (
          typeof yoZkAc ===
          'function'
        ) {
          yoZkAc();
        }

      };
    }


    kok
      .querySelectorAll(
        '.so-hedef button'
      )
      .forEach(b => {

        b.onclick = async () => {
          if(!window.dmProgression?.require('haftalik_hedef') || b.disabled) return;
          b.disabled = true;
          const owner = typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi);
          const state = yo;
          try {
            const response = await fetch(apiURL,{
              method:'POST',
              body:JSON.stringify({islem:'haftalikHedefSec',ogrenci:owner,xp:Number(b.dataset.h)})
            });
            const d = await response.json();
            if(!response.ok || !d?.ok || !d.haftaHedef) throw new Error(d?.mesaj || 'Haftalık hedef kaydedilemedi.');
            if(yo !== state || owner !== String(aktifOgrenciAdi || '')) return;
            yo.haftaHedef = d.haftaHedef;
            if(typeof yoKaydet === 'function') yoKaydet();
            ciz();
          } catch(e) {
            if(typeof yoToast === 'function') yoToast('Hedef kaydedilemedi. Tekrar dene.');
            console.warn('[DijiMedu] Haftalık hedef seçimi:',e);
          } finally {
            if(b.isConnected) b.disabled = false;
          }
        };
      });


    const haftalikOdulButonu = $('soHaftaOdul');
    if (haftalikOdulButonu) haftalikOdulButonu.onclick = async () => {
      haftalikOdulButonu.disabled = true;
      haftalikOdulButonu.textContent = 'Ödül kaydediliyor…';
      await hedefKontrol();
      if (haftalikOdulButonu.isConnected) { haftalikOdulButonu.disabled = false; haftalikOdulButonu.textContent = '🎁 Ödülü Al'; }
    };


    /* =========================================================
       ÖDEVLERİ YÜKLE
       ========================================================= */

    try {

      const od =
        await odevleriGetir();

      const alan =
        $('soOdevler');

      if (!alan) return;


      if (od === null) {

        alan.innerHTML = `
          <div class="so-bos">
            ⚠️ Ödevler şu an yüklenemedi.
            İnternetini kontrol et;
            Etkinlikler ve Videolar
            sayfalarından da bakabilirsin.
          </div>
        `;

        return;
      }


      const say =
        $('soOdevSay');

      if (say) {

        say.innerText =
          od.length
            ? od.length + ' bekliyor'
            : '';

      }


      if (od.length) {

        alan.innerHTML =

          od
            .slice(0, 5)
            .map(x => `

              <div class="so-odev">

                <span>
                  ${x.tur}
                </span>

                <span>
                  ${kac(x.ad)}
                </span>

                ${kalanGun(x.atandi)}

              </div>

            `)
            .join('')

          +

          (
            od.length > 5

              ? `
                <div class="so-bos">
                  +${od.length - 5}
                  ödev daha
                </div>
              `

              : ''
          )

          +

          `
            <div class="so-ipucu">

              Yapılmayan her ödev,
              verildiği günden itibaren
              5 günde bir genel puanından
              1 puan düşürür.

            </div>


            <div
              style="
                display:flex;
                gap:8px">


              <button
                class="so-btn"
                style="flex:1"
                onclick="etkinliklerModalAc()">

                🎯 Etkinlikler

              </button>


              <button
                class="so-btn"
                style="flex:1"
                onclick="videolarModalAc()">

                🎬 Videolar

              </button>


            </div>
          `;

      } else {

        alan.innerHTML = `
          <div class="so-bos">
            🎉 Bekleyen ödevin yok.
            Harikasın!
          </div>
        `;

      }

    } catch (e) {

      console.warn(
        'Sana Özel ödev paneli:',
        e
      );

    }

  }


  /* =========================================================
     SANA ÖZEL'E YERLEŞTİR
     ========================================================= */

  function yerlestir() {

    if (
      !yoVar() ||
      sinifModu()
    ) return;


    const tab =
      document.getElementById(
        'tab-sanaozel'
      );

    if (!tab) return;


    /*
       Önce eski sürümde kullanılan dc-focus-card aranır.
       Güncel tasarımda yoksa doğrudan Sana Özel sekmesine
       eklenir. Böylece mevcut kartlar silinmez.
    */

    const kart =
      tab.querySelector(
        '.dc-focus-card'
      );


    if (!$('soPanel')) {

      const p =
        document.createElement('div');

      p.id = 'soPanel';
      p.className = 'so-panel';


      if (kart) {

        kart.insertBefore(
          p,
          kart.firstChild
        );

      } else {

        tab.insertBefore(
          p,
          tab.firstChild
        );

      }


      ciz();
    }
  }


  /* =========================================================
     SEKME TAKİBİ
     ========================================================= */

  let sonGorunur = false;


  setInterval(() => {

    try {

      yerlestir();


      const t =
        $('tab-sanaozel');


      const gor =
        !!(
          t &&
          getComputedStyle(t).display !==
            'none' &&
          t.getClientRects().length
        );


      if (
        gor &&
        !sonGorunur
      ) {

        odevCache = null;

        ciz();
      }


      sonGorunur = gor;


      // Haftalık ödül otomatik alınmaz; yalnızca öğrencinin tıklamasıyla.

    } catch (e) {

      console.warn(
        'Sana Özel Aşama 5:',
        e
      );

    }

  }, 1200);


  /* Gerekirse diğer kodlar paneli manuel yenileyebilir */
  window.soPanelCiz = ciz;

})();
