
async function meduAkisAc() {
    dcTumTamEkranlariKapat();
    document.getElementById('tab-meduakis').classList.add('active');
    dcBottomNavSenkronize();
    maSekmeSec(maSekme || 'akis');
    maOlaylariYukle().then(() => {
        if (maProfilId) return;
        if (maSekme === 'kesfet') maCiz();
        let l = document.getElementById('maAkisListe');
        if (l && maSekme === 'akis') l.innerHTML = maAkisListeHtml();
    });
}
function meduAkisKapat() {
    document.getElementById('tab-meduakis').classList.remove('active');
    dcBottomNavSenkronize();
}

let maSekme = 'akis', maProfilId = null, maFiltre = 'herkes', maArama = '', maSinifListeSon = [], maSinifCache = null;
let maTakip = new Set(), maBegeni = new Set(), maTebrik = new Set();
async function maOlaylariYukle() {
    try {
        let r = await fetch(`${apiURL}?islem=akisOlaylariGetir&ogrenci=${encodeURIComponent(aktifOgrenciAdi)}`);
        let d = await r.json();
        maTakip = new Set(d.takip || []);
        maBegeni = new Set(d.begeni || []);
        maTebrik = new Set(d.tebrik || []);
    } catch (e) {}
}
async function maOlayGonder(hedef, tur) {
    try {
        let r = await fetch(apiURL, { method: "POST", body: JSON.stringify({ islem: "akisOlayToggle", ogrenci: aktifOgrenciAdi, hedef: hedef, tur: tur }) });
        let d = await r.json();
        return !!d.aktif;
    } catch (e) { return null; }
}

const MA_SERIT = ['#ff6b6b','#ffc93c','#34b36a','#4d96ff','#a06bff'];

function maToast(m) {
    let t = document.getElementById('maToast'); if (!t) return;
    t.innerText = m; t.classList.add('gor'); clearTimeout(t._z); t._z = setTimeout(() => t.classList.remove('gor'), 2200);
}
function maLigAd(xp) { if (xp >= 4000) return 'Elmas'; if (xp >= 2000) return 'Altın'; if (xp >= 800) return 'Gümüş'; return 'Bronz'; }
function maAvatar(o) { return `<span class="avatar" style="--av:${o.av || '#fde68a'}">${o.maskot}${o.aks ? `<span class="aks">${o.aks}</span>` : ''}</span>`; }
function maPatlat(el, ikonlar, n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < (n || 10); i++) {
        let s = document.createElement('span'); s.className = 'ma-parca'; s.innerText = ikonlar[i % ikonlar.length];
        let a = Math.random() * Math.PI * 2, u = 30 + Math.random() * 50;
        s.style.left = (x - 9) + 'px'; s.style.top = (y - 11) + 'px';
        s.style.setProperty('--tx', Math.cos(a) * u + 'px'); s.style.setProperty('--ty', (Math.sin(a) * u - 20) + 'px'); s.style.setProperty('--tr', (Math.random() * 300 - 150) + 'deg');
        document.body.appendChild(s); setTimeout(() => s.remove(), 950);
    }
}
function maTekrarOyna(el, sinif) { el.classList.remove(sinif); void el.offsetWidth; el.classList.add(sinif); }

const MA_LIGLER = {
    sampiyon: { ad:'Şampiyonlar Ligi', kisa:'Şampiyonlar', ikon:'🏆', renk:'#e0a800', grad:'linear-gradient(135deg,#ffd166,#f59e0b)', yon:"Şampiyonlar Ligi'ne", de:"Şampiyonlar Ligi'ndesin" },
    super:    { ad:'Süper Lig', kisa:'Süper', ikon:'⭐', renk:'#8b5cf6', grad:'linear-gradient(135deg,#a06bff,#ff6b9d)', yon:"Süper Lig'e", de:"Süper Lig'desin" },
    yerel:    { ad:'Yerel Lig', kisa:'Yerel', ikon:'🌱', renk:'#34b36a', grad:'linear-gradient(135deg,#6bcb77,#2f9e5a)', yon:"Yerel Lig'e", de:"Yerel Lig'desin" }
};
let maLigOnbellek = null, maLigZaman = 0, maLigSekme = null;
function maOgrenciMi(u) {
    let a = String(u.ogrenci || '').trim().toLowerCase();
    return a && a !== 'teacher' && String(u.durum || '').trim().toLowerCase() !== 'onay bekliyor';
}
let maXpHarita = {};
 function maLigSiralama(){if(maLigOnbellek&&Date.now()-maLigZaman<15000)return maLigOnbellek;const ben=String(aktifOgrenciAdi||"").trim().toLowerCase(),hafta=typeof yoHaftaKodu==="function"?yoHaftaKodu():"",benObj=maSosyalListe.find(u=>String(u.ogrenci).trim().toLowerCase()===ben);const benXp=benObj?.lig?.hafta===hafta?Number(benObj.lig.xp||0):((typeof yo!=="undefined"&&yo?.lig?.hafta===hafta)?Number(yo.lig.xp||0):0),source=maSosyalListe.length?maSosyalListe:(globalDataCache||[]).filter(maOgrenciMi);const liste=source.map(u=>{const ad=String(u.ogrenci).trim(),k=ad.toLowerCase();return{ad,sinif:String(u.sinif??u.Sinif??"").trim(),puan:Math.round(Number(u.genelOrtalama??u.genelPuan??0)*10)/10,xp:k===ben?benXp:(u.lig?.hafta===hafta?Number(u.lig.xp||0):Number(maXpHarita[k]||0))};}).sort((a,b)=>(b.xp-a.xp)||(b.puan-a.puan)||a.ad.localeCompare(b.ad,"tr"));const harita={};liste.forEach((x,i)=>{x.sira=i+1;x.kod=i<10?"sampiyon":i<30?"super":"yerel";x.benMi=x.ad.toLowerCase()===ben;harita[x.ad.toLowerCase()]=x;});maLigOnbellek={liste,harita};maLigZaman=Date.now();return maLigOnbellek;}
function maLigBilgi(isim) {
    let x = maLigSiralama().harita[String(isim || '').trim().toLowerCase()];
    let kod = x ? x.kod : 'yerel', L = MA_LIGLER[kod];
    return { kod, ad: L.ad, kisa: L.kisa, ikon: L.ikon, renk: L.renk, sira: x ? x.sira : '–', puan: x ? x.puan : 0 };
}
function maKisiKur(u, b) {
    b = b || {};
    let hafta = typeof yoHaftaKodu === 'function' ? yoHaftaKodu() : '';
    let xp = (b.lig && b.lig.hafta === hafta) ? (b.lig.xp || 0) : 0;
    let L = maLigBilgi(u.ogrenci);
    return {
        id: u.ogrenci, ad: u.ogrenci, sinif: String(u.Sinif || '').trim(),
        maskot: (typeof ogrenciMaskotSec === 'function' ? ogrenciMaskotSec(u.ogrenci) : '🦜'),
        av: (b.takili && b.takili.renk) || '#e5e7eb', aks: (b.takili && b.takili.aks) || '',
        lig: L.ad, ligKisa: L.kisa, ligIkon: L.ikon, ligRenk: L.renk, sira: L.sira, puan: L.puan,
        playerLevel: DijiProgressRules.progress(Number(b.totalXp||0)).level, xp, hafta: xp, seviye: (b.seviye && b.seviye.sonuc) || '—', seri: 0,
        rozetler: (Array.isArray(u.rozetListesi) ? u.rozetListesi : []).map(r => [r.emoji, r.rozetAdi])
    };
}
function maBen(){const u=maSosyalListe.find(x=>String(x.ogrenci).trim().toLowerCase()===String(aktifOgrenciAdi||"").toLowerCase())||(globalDataCache||[]).find(x=>String(x.ogrenci).trim().toLowerCase()===String(aktifOgrenciAdi||"").toLowerCase())||{ogrenci:aktifOgrenciAdi||"Sen"};const yerel=(typeof yo!=="undefined"&&yo)?yo:{},o=maKisiKur({ogrenci:u.ogrenci,Sinif:u.sinif??u.Sinif??"",genelOrtalama:u.genelOrtalama??u.genelPuan??0,rozetListesi:u.rozetListesi||[]},Object.keys(yerel).length?yerel:u);o.id="ben";o.av=(yerel.takili&&yerel.takili.renk)||"#bdeef6";o.seri=Number(u.streak??0);o.puan=Number(u.genelPuan??u.genelOrtalama??0);o.genelPuan=o.puan;o.dilSeviyesi=String(yerel.seviye?.sonuc||u.seviye?.sonuc||'A1');return o;}
let maTumListe = [], maTumZaman = 0, maTumSoz = null, maSosyalListe = [];
async function maTumVeriHaritasi(){try{const r=await fetch(apiURL,{method:"POST",body:JSON.stringify({islem:"sosyalOgrencilerGetir",ogrenci:aktifOgrenciAdi||"",t:localStorage.getItem("ing_token")||""})});const d=await r.json();if(Array.isArray(d)){maSosyalListe=d;const h={__students:d};d.forEach(x=>h[String(x.ogrenci).trim().toLowerCase()]=x);return h;}}catch(e){}maSosyalListe=[];try{return await yoTumVeri();}catch(e){return {};}}
const DIJI_LIG_CACHE_SURESI = 5 * 60 * 1000;

function dijiLigCacheOku(hafta) {
    try {
        const key = "diji_lig_cache_v1_" + hafta;
        const ham = localStorage.getItem(key);

        if (!ham) return null;

        const kayit = JSON.parse(ham);

        if (
            !kayit ||
            !kayit.zaman ||
            !Array.isArray(kayit.veri)
        ) {
            localStorage.removeItem(key);
            return null;
        }

        return kayit;

    } catch (e) {
        return null;
    }
}

function dijiLigCacheYaz(hafta, veri) {
    try {
        if (!Array.isArray(veri) || !veri.length) return;

        const key = "diji_lig_cache_v1_" + hafta;

        localStorage.setItem(
            key,
            JSON.stringify({
                zaman: Date.now(),
                veri: veri
            })
        );

    } catch (e) {
        console.warn("Lig cache yazılamadı:", e);
    }
}


async function maTumGetir() {

    const aktifHafta = yoHaftaKodu();



    /* =====================================================
       1. ÖNCE CİHAZ CACHE'İNE BAK
       ===================================================== */

    const cache = dijiLigCacheOku(aktifHafta);

    if (
        cache &&
        Array.isArray(cache.veri) &&
        cache.veri.length
    ) {

        maTumListe = cache.veri;



        /* Cache 5 dakikadan eskiyse
           Supabase'den arka planda yenile */

        const cacheYasi =
            Date.now() - Number(cache.zaman || 0);

        if (
            cacheYasi > DIJI_LIG_CACHE_SURESI &&
            navigator.onLine
        ) {

            dijiLigSunucudanGuncelle(aktifHafta);

        }


        /* Kullanıcı beklemeden mevcut listeyi döndür */

        return maTumListe;
    }


    /* =====================================================
       2. CACHE YOKSA SUPABASE'DEN AL
       ===================================================== */

    return await dijiLigSunucudanGuncelle(aktifHafta);
}


async function dijiLigSunucudanGuncelle(aktifHafta) {

    try {



        const { data, error } = await supabaseClient

            .from("student_xp_weekly")

            .select(`
                student_id,
                student_name,
                week_code,
                week_xp,
                total_xp,
                gold,
                freeze_count,
                unlocked_character_count
            `)

            .eq("week_code", aktifHafta)

            .order("week_xp", {
                ascending: false
            });


        if (error) {

            console.error(
                "Lig veri hatası:",
                error
            );


            /* Supabase başarısızsa eski cache'i kullan */

            const eski =
                dijiLigCacheOku(aktifHafta);

            if (
                eski &&
                Array.isArray(eski.veri)
            ) {

                maTumListe = eski.veri;

                return maTumListe;
            }

            return [];
        }


        /* =================================================
           SUPABASE VERİSİNİ UYGULAMANIN FORMATINA ÇEVİR
           ================================================= */

        maTumListe = (data || []).map(
            (ogrenci, index) => {

                const sira = index + 1;

                return {

                    id: ogrenci.student_name,

                    ogrenci: ogrenci.student_name,

                    ad: ogrenci.student_name,

                    xp: Number(
                        ogrenci.week_xp || 0
                    ),

                    toplamXP: Number(
                        ogrenci.total_xp || 0
                    ),

                    altin: Number(
                        ogrenci.gold || 0
                    ),

                    ligSirasi: sira,

                    lig: null,

                    hafta: ogrenci.week_code
                };
            }
        );


        /* =================================================
           YENİ LİSTEYİ CİHAZA KAYDET
           ================================================= */

        dijiLigCacheYaz(
            aktifHafta,
            maTumListe
        );




        return maTumListe;


    } catch (e) {

        console.error(
            "Lig yükleme hatası:",
            e
        );


        /* İnternet/Supabase yoksa eski cache */

        const eski =
            dijiLigCacheOku(aktifHafta);

        if (
            eski &&
            Array.isArray(eski.veri)
        ) {

            maTumListe = eski.veri;

            return maTumListe;
        }

        return [];
    }
}
async function maSinifGetir() { await maTumGetir(); return maSinifListeSon; }
function maBul(id) { if(id === 'ben') return maBen(); const u=maSosyalListe.find(x=>String(x.ogrenci).toLowerCase()===String(id).toLowerCase()); if(u){const x=maKisiKur(u,u);return {...x,seri:Number(u.streak||0),puan:Number(u.genelPuan||0),seviye:x.playerLevel,dilSeviyesi:String(u.seviye?.sonuc||'A1')};} return maTumListe.find(o=>o.id===id)||maSinifListeSon.find(o=>o.id===id); }

let maCizNo = 0;
function maOzetGeriKoy() {
    let oz = document.getElementById('tab-ozet'), ek = document.getElementById('maEkran'), pa = document.getElementById('panel-alani');
    if (!ek || !pa) return;
    let ref = pa.querySelector('.tabs-container');
    ['.user-header-bar', '.timer-card'].forEach(s => {
        let el = ek.querySelector(s);
        if (el) pa.insertBefore(el, ref);
    });
    if (oz && ek.contains(oz)) {
        oz.classList.remove('active');
        oz.style.cssText = '';
        pa.appendChild(oz);
    }
}
async function maCiz() {
    let no = ++maCizNo;
         let siraMap = { parkur: 0, akis: 1, kesfet: 2, vitrin: 3, lig: 4, profil: 5 };
    let iz = document.getElementById('maSegmentIz');
    if (iz) iz.style.transform = `translateX(${(siraMap[maSekme] || 0) * 100}%)`;
    document.querySelectorAll('#maSegment button').forEach(b => b.classList.toggle('aktif', b.dataset.s === maSekme));
    let ekran = document.getElementById('maEkran');
    maOzetGeriKoy();
    window.yoGomuluHedef = null;

    if (maSekme === 'profil' && !maProfilId) {
        ekran.innerHTML = '<div class="ma-gir" id="maProfilKapsayici" style="padding:14px 12px"></div>';
        ['.user-header-bar', '.timer-card'].forEach(s => {
            let el = document.querySelector('#panel-alani > ' + s);
            if (el) document.getElementById('maProfilKapsayici').appendChild(el);
        });
        let ozet = document.getElementById('tab-ozet');
        if (ozet) {
            ozet.classList.add('active');
            ozet.style.cssText = 'display:block;';
            document.getElementById('maProfilKapsayici').appendChild(ozet);
            setTimeout(() => {
                if (typeof gelisimChartInstance !== 'undefined' && gelisimChartInstance) gelisimChartInstance.resize();
                if (typeof kriterChartInstance !== 'undefined' && kriterChartInstance) kriterChartInstance.resize();
                if (typeof denemeChartInstance !== 'undefined' && denemeChartInstance) denemeChartInstance.resize();
            }, 60);
        }
        return;
    }
    if (maSekme === 'magaza' && !maProfilId) {
        if(!window.dmProgression?.require('magaza')) return;
        ekran.innerHTML = '<div class="ma-gir" style="padding:14px 12px"><div id="maGomuluAlan"></div></div>';
        window.yoGomuluHedef = 'maGomuluAlan';
        if (typeof yoMagazaAc === 'function') yoMagazaAc();
        return;
    }
        if (maSekme === 'lig' && !maProfilId) {
        if(!window.dmProgression?.require('lig')) return;
        if (!maTumListe.length) ekran.innerHTML = '<div class="ma-bos">Lig yükleniyor...</div>';
        await maTumGetir();
        if (no !== maCizNo) return;
        ekran.innerHTML = `<div class="ma-gir">${maLigHtml()}</div>`;
        return;
    }
    if (maSekme === 'akis' && !maProfilId) {
        if(!window.dmProgression?.require('akis')) return;
        ekran.innerHTML = `<div class="ma-gir">${maAkisHtml()}</div>`;
        maAkisYukle().then(() => {
            if (no !== maCizNo) return;
            let l = document.getElementById('maAkisListe');
            if (l) l.innerHTML = maAkisListeHtml();
        });
        maTumGetir().then(() => {if (no !== maCizNo) return;const list=document.getElementById('maAkisListe');if(list){list.innerHTML=maAkisListeHtml();window.dmProgression?.paint?.();}});
        return;
    }

    ekran.innerHTML = '<div class="ma-bos">Yükleniyor...</div>';
    await Promise.all([maTumGetir(),maTumVeriHaritasi()]);
    if (no !== maCizNo) return;
    let html = maSekme === 'kesfet' ? maKesfetHtml() : '';
    ekran.innerHTML = `<div class="ma-gir">${html}</div>`;
}
function maSekmeSec(s) { window.dmUserCard?.close(); if(s === 'vitrin') s = 'hub'; maSekme = s; maProfilId = null; maCiz(); document.getElementById('tab-meduakis').scrollTop = 0; }
function maProfilAc(id, anchor) { return window.dmUserCard?.open(id, anchor); }

let maAkisVeri = [];
let maAkisYuklendi = false;
let maAkisSoz = null;

const DIJI_AKIS_CACHE_SURESI = 30 * 1000;

const DIJI_AKIS_CACHE_KEY = "diji_ma_akis_v2";


function dijiAkisCacheOku() {

    try {

        const ham =
            localStorage.getItem(DIJI_AKIS_CACHE_KEY);

        if (!ham) return null;

        const kayit =
            JSON.parse(ham);

        if (
            !kayit ||
            !kayit.zaman ||
            !Array.isArray(kayit.veri)
        ) {

            localStorage.removeItem(
                DIJI_AKIS_CACHE_KEY
            );

            return null;
        }

        return kayit;

    } catch (e) {

        return null;
    }
}


function dijiAkisCacheYaz(veri) {

    try {

        if (!Array.isArray(veri)) return;

        /*
         * Akışın tamamını değil,
         * ekranda kullanılacak son 60 kaydı tut.
         */

        const kayitlikVeri =
            veri.slice(0, 60);

        localStorage.setItem(
            DIJI_AKIS_CACHE_KEY,
            JSON.stringify({
                zaman: Date.now(),
                veri: kayitlikVeri
            })
        );

    } catch (e) {

        console.warn(
            "Akış cache yazılamadı:",
            e
        );
    }
}


async function dijiAkisSunucudanGuncelle() {

    try {


        const merged=window.dmIncrementalReads?await window.dmIncrementalReads.feed():null;
        const r=merged?new Response(JSON.stringify(merged)):await fetch(`${apiURL}?islem=akisTumu`);

        if (!r.ok) {
            throw new Error(
                "HTTP " + r.status
            );
        }

        const d =
            await r.json();

        if (
            d &&
            Array.isArray(d.liste)
        ) {

            maAkisVeri =
                d.liste;

            dijiAkisCacheYaz(
                maAkisVeri
            );


            return maAkisVeri;
        }

    } catch (e) {

        console.warn(
            "Akış Supabase'den alınamadı:",
            e
        );
    }

    return maAkisVeri;
}


async function maAkisYukle() {

    if (maAkisSoz) {
        return maAkisSoz;
    }


    maAkisSoz =
        (async () => {

            const cache =
                dijiAkisCacheOku();


            /*
             * 1. CACHE VARSA
             */

            if (
                cache &&
                Array.isArray(cache.veri) &&
                cache.veri.length
            ) {

                maAkisVeri =
                    cache.veri;



                const cacheYasi =
                    Date.now() -
                    Number(cache.zaman || 0);


                /*
                 * Cache 5 dakikadan eskiyse
                 * kullanıcıyı bekletmeden
                 * arka planda güncelle.
                 */

                if (
                    cacheYasi >
                        DIJI_AKIS_CACHE_SURESI &&
                    navigator.onLine
                ) {

                    await dijiAkisSunucudanGuncelle();

                }

            }


            /*
             * 2. CACHE YOKSA
             * SUPABASE'DEN AL
             */

            else {

                await dijiAkisSunucudanGuncelle();

            }


            maAkisYuklendi = true;



            return maAkisVeri;

        })().finally(() => { maAkisSoz = null; });


    return maAkisSoz;
}
function maZamanOnce(e) { return window.DMTime.format(e.t); }
function maAkisHtml() {
    let ust = `<div class="filtre"><button class="${maFiltre === 'herkes' ? 'aktif' : ''}" onclick="maFiltre='herkes'; maCiz()">Herkes</button><button class="${maFiltre === 'takip' ? 'aktif' : ''}" onclick="maFiltre='takip'; maCiz()">Takip ettiklerim (${maTakip.size})</button><span class="ma-canli">● Canlı</span></div>`;
    return ust + `<div id="maAkisListe">${maAkisListeHtml()}</div>`;
}
function maAkisListeHtml() {
       if (!maAkisVeri.length) return maAkisYuklendi ? '<div class="ma-bos">Henüz bir hareket yok.<br>Kazanılan rozetler, karakterler, ödüller, lig ve sıralama yükselişleri, tamamlanan dersler ve parkur bölümleri burada paylaşılır.</div>' : '<div class="ma-bos">Akış yükleniyor...</div>';
    let liste = maAkisVeri.filter(e => maFiltre === 'herkes' || maTakip.has(e.ogr));
    if (!liste.length) return '<div class="ma-bos">Takip ettiklerinden henüz bir hareket yok.</div>';
    return liste.map((e, i) => {
        let id = 'akis-' + e.k, b = maBegeni.has(id), t = maTebrik.has(id);
                let o = { ad: e.ogr, maskot: typeof ogrenciMaskotSec === 'function' ? ogrenciMaskotSec(e.ogr) : '🦜', av: '#fde68a' };
        let renk = e.tur === 'eksi' ? '#cbd5e1' : MA_SERIT[i % 5];
        let aksiyon = e.tur === 'eksi' ? '' : `<div class="aksiyon"><button class="${b ? 'basili' : ''}" onclick="maBegen('${id}', this)">${b ? '❤️' : '🤍'} Beğen</button><button class="${t ? 'basili' : ''}" onclick="maTebrikEt('${id}', this)">🎉 Tebrik et</button></div>`;
        return `<div class="akis-kart" data-safety-event="${guvenliMetin(String(e.k))}" style="--serit:${renk}"><span class="akis-ikon">${guvenliMetin(String(e.ikon || "✨"))}</span>
      <div class="akis-ust" data-o="${guvenliMetin(String(e.ogr))}" onclick="maAkisKisiAc(this.dataset.o)">${maAvatar(o)}<span><b>${guvenliMetin(String(e.ad))}</b><small>${maZamanOnce(e)}</small></span></div>
      <div class="akis-metin">${guvenliMetin(String(e.metin))}</div>${aksiyon}</div>`;
    }).join('');
}
function maAkisKisiAc(ad, anchor) { return maProfilAc(ad, anchor); }
function maBegen(id, btn) {
    let hedef = id.replace(/^akis-/, '');
    let b = !maBegeni.has(id);
    b ? maBegeni.add(id) : maBegeni.delete(id);
    btn.classList.toggle('basili', b); btn.innerHTML = `${b ? '❤️' : '🤍'} Beğen`; maTekrarOyna(btn, 'ma-pop');
    if (b) maPatlat(btn, ['❤️','💖','✨'], 9);
       maOlayGonder(hedef, 'begeni');
    if (b && typeof maBildirimGonder === 'function') maBildirimGonder(hedef, 'begeni');
}
function maTebrikEt(id, btn) {
    let hedef = id.replace(/^akis-/, '');
    let t = !maTebrik.has(id);
    t ? maTebrik.add(id) : maTebrik.delete(id);
    btn.classList.toggle('basili', t); btn.innerHTML = `🎉 Tebrik et`; maTekrarOyna(btn, 'ma-pop');
    if (t) maPatlat(btn, ['🎉','🎊','⭐'], 12);
      maOlayGonder(hedef, 'tebrik');
    if (t && typeof maBildirimGonder === 'function') maBildirimGonder(hedef, 'tebrik');
}

       function maKesfetHtml() {
    let hepsi = [...maTumListe, maBen()];
    let ilk3 = hepsi.filter(o => o.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 3);
    let podyum = '';
    if (ilk3.length) {
        let sira = [ilk3[1], ilk3[0], ilk3[2]], yuk = [58, 80, 44], renk = ['#8b9bb4','#e0a800','#c98a4a'], no = [2, 1, 3];
        podyum = `<div class="podyum">` + sira.map((o, i) => o ? `<div class="podyum-kisi" data-o="${guvenliMetin(o.id)}" onclick="maProfilAc(this.dataset.o)">${maAvatar(o)}<b>${o.id === 'ben' ? 'Sen' : guvenliMetin(o.ad)}</b><small>${o.xp} XP${o.sinif ? ' · ' + o.sinif + '. sınıf' : ''}</small><div class="basamak" style="height:${yuk[i]}px;background:${renk[i]}">${no[i]}</div></div>` : '<div></div>').join('') + `</div>`;
    } else podyum = '<div class="ma-bos" style="padding:18px">Bu hafta henüz XP kazanan yok. İlk sen ol! 🚀</div>';
    let benSeviye = maSinifListeSon.filter(o => o.seviye === maBen().seviye && o.seviye !== '—');
    return `<div class="bolum"><div class="bolum-baslik">Haftanın yıldızları <small style="font:800 12px 'Nunito',sans-serif;color:var(--soluk)">· tüm öğrenciler</small></div>${podyum}
    ${benSeviye.length ? `<div class="bolum-baslik">Sınıfında seninle aynı seviyede</div><div>${benSeviye.map(maKisiHtml).join('')}</div>` : ''}
    <input class="ara" placeholder="Öğrenci ara" value="${guvenliMetin(maArama)}" oninput="maArama=this.value; document.getElementById('maKesfetListe').innerHTML = maKesfetListe()">
    <div id="maKesfetListe">${maKesfetListe()}</div></div>`;
}
function maKisiHtml(o) {
    return `<div class="kisi" data-o="${guvenliMetin(o.id)}" onclick="maProfilAc(this.dataset.o)">${maAvatar(o)}<div class="kisi-ad"><b>${guvenliMetin(o.ad)}</b><small>${o.ligIkon} ${o.lig}${o.sinif ? ' · ' + o.sinif + '. sınıf' : ''}</small></div>
    <button class="mini-takip ${maTakip.has(o.id) ? 'takipte' : ''}" data-o="${guvenliMetin(o.id)}" onclick="event.stopPropagation(); maTakipDegistir(this.dataset.o, this)">${maTakip.has(o.id) ? 'Takipte' : 'Takip et'}</button></div>`;
}
function maKesfetListe() {
    let q = maArama.toLocaleLowerCase('tr');
    let kaynak = q ? maTumListe : maSinifListeSon;
    let l = kaynak.filter(o => o.ad.toLocaleLowerCase('tr').includes(q)).slice(0, 60);
    return l.length ? l.map(maKisiHtml).join('') : '<div class="ma-bos">Bu isimde bir öğrenci bulunamadı.</div>';
}
function maLigHtml() {
    let { liste } = maLigSiralama();
    let ben = liste.find(x => x.benMi);
    let secili = maLigSekme || (ben ? ben.kod : 'yerel');
    const studentLevel=window.dmProgression?.level()||1;if(studentLevel<({sampiyon:15,super:10,yerel:5}[secili]))secili='yerel';
    let ozet = '';
    if (ben) {
        let L=MA_LIGLER[ben.kod], hedef=ben.kod==='sampiyon'?'👑 Şampiyonlar Ligi’nde yerini koru!':ben.kod==='super'?'Şampiyonlar Ligi: 15. seviye ve bu hafta en az 1800 yarışma XP’si':'Süper Lig: 10. seviye ve bu hafta en az 750 yarışma XP’si';
        ozet = `<div class="ml-ben" style="--lg:${L.grad}"><div class="ml-ben-ikon">${L.ikon}</div><div><small>${L.de}</small><b>${ben.sira}. sıra</b><span>Bu hafta: ${ben.xp} XP</span></div></div><div class="ml-hedef">${hedef}</div>`;
    }
    let sekmeler = ['sampiyon', 'super', 'yerel'].map(k => {
        let L = MA_LIGLER[k], n = liste.filter(x => x.kod === k).length;
        return `<button data-dm-league-level="${{sampiyon:15,super:10,yerel:5}[k]}" class="${k === secili ? 'aktif' : ''}" style="--lg:${L.grad}" onclick="maLigSekme='${k}'; maCiz()">${L.ikon} ${L.kisa}<small>${n} kişi</small></button>`;
    }).join('');
    let madalya = ['🥇', '🥈', '🥉'];
    let satirlar = liste.filter(x => x.kod === secili).slice(0, 120).map(x =>
        `<div class="ml-satir${x.benMi ? ' ben' : ''}" data-o="${guvenliMetin(x.ad)}" onclick="maAkisKisiAc(this.dataset.o)">
          <span class="ml-sira">${x.sira <= 3 ? madalya[x.sira - 1] : x.sira}</span>
          ${maAvatar({ ad: x.ad, maskot: typeof ogrenciMaskotSec === 'function' ? ogrenciMaskotSec(x.ad) : '🦜', av: '#f3ebff' })}
          <span class="ml-ad"><b>${x.benMi ? 'Sen' : guvenliMetin(x.ad)}</b><small>${x.sinif ? x.sinif + '. sınıf' : ''}</small></span>
          <span class="ml-puan">${x.xp} <small style="font-size:11px">XP</small></span></div>`).join('');
    return `<div class="bolum">${ozet}<div class="ml-sekme">${sekmeler}</div>
      <div class="ml-liste">${satirlar || '<div class="ma-bos">Bu ligde henüz kimse yok.</div>'}</div>
      <div class="ml-kural">Yerel Lig 5. seviyede açılır. Süper Lig: 10. seviye + bu hafta 750 yarışma XP’si. Şampiyonlar Ligi: 15. seviye + bu hafta 1800 yarışma XP’si. Yarışma XP’sine joker ve günlük çarpanlar eklenmez. Her hafta katılım yeniden değerlendirilir; öğrenci seviyen kalıcıdır.</div></div>`;
}
function maTakipDegistir(id, btn) {
    let t = !maTakip.has(id); t ? maTakip.add(id) : maTakip.delete(id);
    btn.classList.toggle('takipte', t); maTekrarOyna(btn, 'ma-pop');
    if (btn.classList.contains('takip-btn')) btn.innerHTML = t ? '✓ Takip ediliyor' : '🎈 Takip et';
    else btn.innerText = t ? 'Takipte' : 'Takip et';
    if (t) { maPatlat(btn, ['🎈','⭐','✨'], 10); maToast('Artık Arkadaşlar\'ında takip ediyorsun 🎡'); }
    maOlayGonder(id, 'takip');
}



