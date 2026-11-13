
(function () {
  const $ = id => document.getElementById(id);
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const kucuk = x => String(x || '').trim().toLowerCase();
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci)); };
  const oyunda = () => typeof odulOyunda === 'function' && odulOyunda();
  const toast = m => { if (typeof yoToast === 'function') yoToast(m); };

  /* ================= 1) EKONOMİ ================= */
  window.seriCarpani = () => { let s = parseInt(localStorage.getItem('ing_girisSerisiSayisi') || '0') || 0; return s >= 7 ? 1.5 : s >= 3 ? 1.25 : 1; };


  async function enerjiPaketiAl(miktar = 5, hataGoster = toast) {
    if (!yoVar()) { hataGoster('Enerji almak için önce giriş yapmalısın.'); return false; }
    const pack = [5,10,15].includes(Number(miktar)) ? Number(miktar) : 5;
    const price = ({5:350,10:600,15:850})[pack];
    const key = 'paket_' + Date.now() + '_' + Math.random().toString(36).slice(2,12);
    const d = await window.dmEkonomi.islem('enerjiPaketAl', {miktar:pack, islemKimligi:key});
    if (!d?.ok) {
      if (d?.mesaj === 'Yetersiz altın') {
        const balance = Number(d.ekonomi?.altin ?? yo.altin ?? 0);
        window.DijiReklam?.altinEksik({tip:'enerji',id:String(pack)});
        hataGoster(`🪙 Bu paket için ${Math.max(0, price-balance)} altın daha gerekiyor.`);
      } else {
        hataGoster(d?.mesaj || 'Enerji satın alınamadı. Tekrar dene.');
      }
      return false;
    }
    if (typeof headerEnerjiGoster === 'function') headerEnerjiGoster(d.enerjiKalan, window.genelEnerjiMax);
    window.genelEnerjiKalan = d.enerjiKalan;
    toast(`⚡ +${pack} enerji satın alındı!`);
    return true;
  }
  window.enerjiPaketiAl = enerjiPaketiAl;
  window.dmEnerjiPaketPaneli = function(){
    if(window.DijiMeduPapiFeedback?.energy)return window.DijiMeduPapiFeedback.energy();
    if(document.querySelector('.sa-perde'))return;
    const bg=document.createElement('div');bg.className='sa-perde';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-label','Enerji paketleri');
    bg.innerHTML='<div class="sa-kart"><div class="sa-gorsel">🦜⚡</div><h3>Papi Enerji Mağazası</h3><p>Altınlarınla enerji alabilir veya enerjinin yenilenmesini bekleyebilirsin.</p><div style="display:grid;gap:9px;margin:15px 0">'+[[5,350],[10,600],[15,850]].map(([n,price])=>`<button type="button" class="dm-energy-buy" data-amount="${n}" style="padding:12px;border-radius:12px;border:1px solid #b8ebc9;background:#eefdf3;color:#155e40;font-weight:800">⚡ ${n} enerji — 🪙 ${price} altın</button>`).join('')+'</div><div class="sa-btn"><button type="button" class="sa-hayir">Şimdi değil</button></div></div>';
    document.body.appendChild(bg);
    bg.querySelector('.sa-hayir').onclick=()=>bg.remove();
    bg.addEventListener('click',e=>{if(e.target===bg)bg.remove();});
    const buttons = [...bg.querySelectorAll('.dm-energy-buy')];
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.dataset.energyStatus = '';
    bg.querySelector('.sa-btn').before(status);
    void window.DijiMeduPapiFeedback?.energyLimit(status);
    buttons.forEach(btn => btn.onclick = async () => {
      buttons.forEach(button => button.disabled = true);
      try {
        if (await enerjiPaketiAl(Number(btn.dataset.amount), message => status.textContent = message)) bg.remove();
      } catch {
        status.textContent = 'Bağlantı kurulamadı. Tekrar dene.';
      } finally {
        buttons.forEach(button => button.disabled = false);
      }
    });
  };
  window.genelEnerjiBittiGoster = function(){window.dmEnerjiPaketPaneli();};

  /* ================= 2) GÜZEL SATIN ALMA ONAYI ================= */
  function onayKarti(o) {
    let p = document.createElement('div'); p.className = 'sa-perde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', o.baslik);
    let altin = yoVar() ? yo.altin || 0 : 0, yeter = altin >= o.fiyat;
    p.innerHTML = `<div class="sa-kart"><div class="sa-gorsel" style="--z:${o.z || '#efe6ff'}">${o.gorsel}</div><h3>${o.baslik}</h3><p>${o.metin}</p>
      <div class="sa-fiyat">🪙 ${o.fiyat}</div><div class="sa-kalan">${o.alt ? o.alt + ' · ' : ''}Altının: ${altin}${yeter ? ` → ${altin - o.fiyat}` : ` · ${o.fiyat - altin} altın daha lazım`}</div>
      <div class="sa-btn"><button class="sa-hayir">${o.hayir || 'Vazgeç'}</button><button class="sa-evet" ${yeter ? '' : 'disabled'}>${o.evet || 'Satın al'}</button></div></div>`;
    document.body.appendChild(p);
    if (!yeter) window.DijiReklam?.teklif(p.querySelector('.sa-kart'), 'altin', o.urun);
    let kapat = () => p.remove();
    p.addEventListener('click', e => { if (e.target === p) kapat(); });
    p.querySelector('.sa-hayir').onclick = () => { kapat(); if (o.vazgec) o.vazgec(); };
    p.querySelector('.sa-evet').onclick = async () => { kapat(); let ok = await o.al(); if (ok !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches) konfeti(); };
    setTimeout(() => (p.querySelector('.sa-evet:not(:disabled)') || p.querySelector('.sa-hayir')).focus({ preventScroll: true }), 250);
  }
  window.onayKarti = onayKarti;
  function konfeti() {
    for (let i = 0; i < 18; i++) {
      let s = document.createElement('span'); s.innerText = ['🎉', '✨', '🪙', '⭐'][i % 4];
      s.style.cssText = `position:fixed;z-index:100000020;left:50%;top:45%;font-size:20px;pointer-events:none;transition:transform 1s ease-out,opacity 1s;`;
      document.body.appendChild(s);
      let a = Math.random() * Math.PI * 2, u = 80 + Math.random() * 120;
      requestAnimationFrame(() => { s.style.transform = `translate(${Math.cos(a) * u}px,${Math.sin(a) * u}px) rotate(${Math.random() * 360}deg)`; s.style.opacity = '0'; });
      setTimeout(() => s.remove(), 1050);
    }
  }
  /* ================= 3) SANDIK SATIN ALMA ================= */
  const SANDIK = [[0, 'Bronz Sandık', 200, '#fdf2e9', '1 Dolap öğesi · %85 temel, %15 özel'], [1, 'Gümüş Sandık', 450, '#f1f5f9', '2 Dolap öğesi · en az 1 özel · %5 efsane'], [2, 'Altın Sandık', 1000, '#fffbeb', '3 Dolap öğesi · en az 1 özel · %15 efsane'], [3, 'Efsane Sandık', 1800, '#f5f0ff', '3 Dolap öğesi · 1 efsane garanti']];
  function sandikAl(k) {
    let s = SANDIK[k];
    onayKarti({ gorsel: ['🧰', '🗃️', '💰', '👑'][k], z: s[3], baslik: s[1], metin: `İçinden: ${s[4]}. Sahip olduğun öğe çıkarsa yarı değeri altın olarak döner.`, fiyat: s[2], evet: '🎁 Satın al ve aç',
      al: () => {
        if (typeof dolapSandikAc === 'function') { dolapSandikAc(k, false); return; }
        yo.altin -= s[2]; yoKaydet();
        let g = ['ba', 'kp', 'sh', 'kk'][Math.floor(Math.random() * 4)];
        if (typeof bcSandikAc === 'function') bcSandikAc(g, (yo.sandik && yo.sandik[g]) || 0, k);
      } });
  }
  function sandikBolum() {
    let al = $('bcMgAlan'); if (!al || al.style.display === 'none' || !/Kayıp Hazineler/.test(al.innerText) || $('sdKutu')) return;
    let altin = yoVar() ? yo.altin || 0 : 0;
    al.insertAdjacentHTML('beforeend', `<div class="sd-kutu" id="sdKutu"><h3>🛒 Sandık Dükkânı</h3><p>Seviye beklemeden sandık aç! İçinden çıkanlar kademeye göre artar.</p><div class="sd-izgara">${SANDIK.map((s, i) => `<div class="sd-kart" style="--z:${s[3]};--g:${i * .3}s"><span class="e">${['🧰', '🗃️', '💰', '👑'][i]}</span><b>${s[1]}</b><small>${s[4]}</small><button data-k="${i}" ${altin >= s[2] ? '' : 'disabled'}>🪙 ${s[2]}</button></div>`).join('')}</div></div>`);
    $('sdKutu').querySelectorAll('button').forEach(b => b.onclick = () => sandikAl(Number(b.dataset.k)));
  }

  /* ================= 4) TAVSİYE KARTLARI (nadiren) ================= */
  let sonTavsiye = 0, oturumSay = 0, gosterilen = new Set();
  function tavsiye(o, zorla) {
    if(window.dmPapiNotices?.defer('recommendation:'+o.metin,()=>tavsiye(o,zorla)))return true;
    if (!zorla && (Date.now() - sonTavsiye < 5 * 60000 || oturumSay >= 6)) return false;
    if (document.querySelector('.tv-kart, .sa-perde')) return false;
    sonTavsiye = Date.now(); oturumSay++;
    let k = document.createElement('div'); k.className = 'tv-kart'; k.setAttribute('role', 'status');
    k.innerHTML = `<div class="tv-ikon">${o.ikon}</div><span class="m">${o.metin}${o.alt ? `<small>${o.alt}</small>` : ''}</span>${o.btn ? `<button class="tv-al">${o.btn}</button>` : ''}<button class="tv-x" aria-label="Kapat">✕</button>`;
    document.body.appendChild(k);
    requestAnimationFrame(() => requestAnimationFrame(() => k.classList.add('gor')));
    let kapat = () => { k.classList.remove('gor'); setTimeout(() => k.remove(), 500); };
    k.querySelector('.tv-x').onclick = kapat;
    if (o.btn) k.querySelector('.tv-al').onclick = () => { kapat(); o.fn(); };
    (window.dmPapiNotices?.later||((el,fn,ms)=>setTimeout(fn,ms)))(k,kapat,9000);
    return true;
  }
  /* Mağaza sekmesine girince hemen öneri */
  function magazaSekme() {
    let bar = $('bcMgBar'); if (!bar || !($('tab-magaza') && $('tab-magaza').classList.contains('active'))) return null;
    let a = bar.querySelector('button.aktif'); return a ? a.innerText : null;
  }
  let sonSekme = null;
  setInterval(() => {
    if (!girisli() || !yoVar()) return;
    let s = magazaSekme();
    if (/Sandık/.test(s || '')) sandikBolum();
    if (s && s !== sonSekme) {
      let altin = yo.altin || 0;
      if (/Sandık/.test(s)) tavsiye({ ikon: '🧰', metin: 'Seviye beklemeden sandık aç!', alt: `Bronz Sandık 🪙 150 · Altının: ${altin}`, btn: 'İncele', fn: () => sandikAl(0) }, true);
      else if (/Atölye/.test(s) && altin >= 30) tavsiye({ ikon: '🎨', metin: `${altin} altının var! Karakterine yeni bir şapka ya da kıyafet dene.`, alt: 'Önce dene, beğenirsen al' }, true);
    }
    sonSekme = s;
  }, 700);
  /* Enerji azalınca */
  setInterval(() => {
    if (!girisli() || oyunda() || !yoVar()) return;
    let k = window.genelEnerjiKalan;
    if (typeof k === 'number' && k <= 3 && (yo.altin || 0) >= 15 && !gosterilen.has('enerji' + k))
      if (tavsiye({ ikon: '🪫', metin: `Enerjin azalıyor (${k} kaldı)!`, alt: '5 enerji = 🪙 100 · oyun bölünmesin', btn: '⚡ Al', fn: () => window.dmEnerjiPaketPaneli?.() })) gosterilen.add('enerji' + k);
  }, 20000);
})();
