
(function () {
  const $ = id => document.getElementById(id);
  const kucuk = x => String(x || '').trim().toLowerCase();
  const enc = encodeURIComponent;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const girisli = () => { let p = $('panel-alani'); return !!(p && p.style.display === 'block' && typeof aktifOgrenciAdi !== 'undefined' && aktifOgrenciAdi && kucuk(aktifOgrenciAdi) !== 'teacher' && !(typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci)); };
  const oyunda = () => (typeof odulOyunda === 'function' && odulOyunda()) || !!document.querySelector('.dv-perde');

  const OYUN_AC = { Kelime_Liderlik: 'kelimeYarismasiAc', Jeopardy_Liderlik: 'jpOyunAc', Bosluk_Tablosu: 'boslukOyunAc', Hafiza_Liderlik: 'hafizaOyunAc', Yagmur_Liderlik: 'yagmurOyunAc', Asmaca_Liderlik: 'asmacaOyunAc', KelimeBul_Liderlik: 'kelimeBulOyunAc', "Konusma_Liderlik": "kpModuAc", "Eslesme_Liderlik": "esOyunAc", "Tren_Liderlik": "trenOyunAc", "Dikte_Liderlik": "dikteAc", "Cumle_Liderlik": "cumleAc" };
  const OYUN_AD = { Kelime_Liderlik: '🔬 Kelime Laboratuvarı', Jeopardy_Liderlik: '🎈 Risk Balonları', Bosluk_Tablosu: '✏️ Eksik Harf', Hafiza_Liderlik: '🧠 Hafıza', Yagmur_Liderlik: '🌪️ Hız Fırtınası', Asmaca_Liderlik: '🔤 Harf Avı', KelimeBul_Liderlik: '🔐 Şifre Kırıcı', "Konusma_Liderlik": "🎤 Kelime Modu", "Eslesme_Liderlik": "🔗 Eş Bul", "Tren_Liderlik": "🚂 Kelime Treni", "Dikte_Liderlik": "🎧 Kulak Dedektifi", "Cumle_Liderlik": "🧱 Cümle Ustası" };
  const DL_OYUNLAR = { Kelime_Liderlik: '🔬 Kelime Laboratuvarı', Jeopardy_Liderlik: '🎈 Risk Balonları', Bosluk_Tablosu: '✏️ Eksik Harf', Hafiza_Liderlik: '🧠 Hafıza', Yagmur_Liderlik: '🌪️ Hız Fırtınası', Asmaca_Liderlik: '🔤 Harf Avı', KelimeBul_Liderlik: '🔐 Şifre Kırıcı', "Konusma_Liderlik": "🎤 Kelime Modu", "Eslesme_Liderlik": "🔗 Eş Bul", "Tren_Liderlik": "🚂 Kelime Treni", "Dikte_Liderlik": "🎧 Kulak Dedektifi", "Cumle_Liderlik": "🧱 Cümle Ustası" };

  window.duelloOyununuAc = function (oyun) {
    let f = window[OYUN_AC[oyun]];
    if (typeof dcTumTamEkranlariKapat === 'function') dcTumTamEkranlariKapat();
    if (typeof f === 'function') f(); else if (typeof aktivitelerTamEkranAc === 'function') aktivitelerTamEkranAc();
  };

  let dlListe = [];
  async function duellolarGetir() {
    try { let r = await fetch(`${apiURL}?islem=duellolarim&ogrenci=${enc(aktifOgrenciAdi)}`); let d = await r.json(); dlListe = (d && d.liste) || []; } catch (e) {}
    duelloOdulKontrol();
    return dlListe;
  }
  function duelloOdulKontrol() {
    if (!yoVar()) return;
    yo.duelloOdul = yo.duelloOdul || [];
    dlListe.filter(d => d.durum === 'bitti' && !yo.duelloOdul.includes(d.id)).forEach(d => {
      yo.duelloOdul.push(d.id);
      let rakip = kucuk(d.gonderen) === kucuk(aktifOgrenciAdi) ? d.alici : d.gonderen;
      if (kucuk(d.kazanan) === kucuk(aktifOgrenciAdi)) {
        if (typeof yoXpEkle === 'function') yoXpEkle(20, 0, 'duello', String(d.id));
        if (typeof enerjiHediye === 'function') enerjiHediye(2);
        if (typeof odulGoster === 'function') odulGoster({ ikon: '⚔️', baslik: 'Düelloyu kazandın!', alt: `${rakip} ile ${DL_OYUNLAR[d.oyun] || d.oyun} düellosu: ${d.benPuan} – ${d.rakipPuan}`, enerji: 2, xp: 30 });
      } else if (d.kazanan === 'berabere') {
        if (typeof yoXpEkle === 'function') yoXpEkle(10, 0, 'duello', String(d.id));
        if (typeof odulGoster === 'function') odulGoster({ ikon: '🤝', baslik: 'Düello berabere!', alt: `${rakip} ile eşit puan aldınız.`, xp: 10 });
      } else {
        if (typeof yoXpEkle === 'function') yoXpEkle(5, 0, 'duello', String(d.id));
        if (typeof odulGoster === 'function') odulGoster({ ikon: '🛡️', baslik: 'Düello bitti', alt: `${rakip} bu sefer kazandı (${d.rakipPuan} – ${d.benPuan}). Katıldığın için +5 XP, rövanş iste!`, xp: 5 });
      }
    });
    yoKaydet();
  }

  window.duelloGonder = async function (alici, btn) {
    let sel = $('dlOyunSec'); if (!sel) return;
    btn.disabled = true; btn.innerText = 'Gönderiliyor...';
    try {
      let r = await fetch(`${apiURL}?islem=duelloGonder&gonderen=${enc(aktifOgrenciAdi)}&alici=${enc(alici)}&oyun=${enc(sel.value)}`);
      let d = await r.json();
      btn.innerText = d.ok ? 'Gönderildi ⚔️' : (d.mesaj || 'Gönderilemedi');
      if (d.ok && typeof yoToast === 'function') yoToast('⚔️ Düello daveti gönderildi! Kabul ederse bugün ikiniz de oynayın.');
    } catch (e) { btn.disabled = false; btn.innerText = 'Tekrar dene'; }
  };

  window.duelloYanit = async function (id, kabul, btn) {
    if (btn) btn.disabled = true;
    try { await fetch(`${apiURL}?islem=duelloYanit&ogrenci=${enc(aktifOgrenciAdi)}&id=${enc(id)}&kabul=${kabul ? 1 : 0}`); } catch (e) {}
    await duellolarGetir();
    document.querySelectorAll('.dl-alan').forEach(a => a.innerHTML = dlListeHtml(true));
    if (kabul && typeof yoToast === 'function') yoToast('⚔️ Kabul ettin! Bugün o oyunu oyna, en yüksek puan kazanır.');
  };

  function dlListeHtml(koyu) {
    if (!dlListe.length) return `<div style="opacity:.75">Henüz düello yok. Takip ettiğin birinin vitrininden düello yollayabilirsin.</div>`;
    return dlListe.slice(0, 8).map(d => {
      let benGonderen = kucuk(d.gonderen) === kucuk(aktifOgrenciAdi), rakip = benGonderen ? d.alici : d.gonderen, oyun = DL_OYUNLAR[d.oyun] || d.oyun;
      let durum = d.durum === 'bekliyor' ? (benGonderen ? '⏳ Cevap bekleniyor' : '') : d.durum === 'kabul' ? `🔥 Bugün oyna! Sen: ${d.benPuan ?? '–'} · Rakip: ${d.rakipPuan ?? '–'}` : d.durum === 'red' ? '🙅 Reddedildi' : d.durum === 'bitti' ? (kucuk(d.kazanan) === kucuk(aktifOgrenciAdi) ? `🏆 Kazandın ${d.benPuan}–${d.rakipPuan}` : d.kazanan === 'berabere' ? '🤝 Berabere' : `Kaybettin ${d.benPuan}–${d.rakipPuan}`) : '⌛ Süresi doldu';
      let aks = d.durum === 'bekliyor' && !benGonderen ? `<button class="kr-evet" onclick="duelloYanit('${d.id}', true, this)">Kabul</button><button class="kr-hayir" style="${koyu ? '' : 'background:#eee;color:#3b2c66'}" onclick="duelloYanit('${d.id}', false, this)">Reddet</button>` : '';
      return `<div class="${koyu ? 'kr-dl' : 'dl-satir'}"><span>⚔️ <b>${guvenliMetin(rakip)}</b> · ${oyun}<small>${durum || '📩 Seni düelloya çağırdı!'}</small></span>${aks}</div>`;
    }).join('');
  }

  /* Vitrine ve Keşfet'e Düello Kartı Ekleme */
  let orgVitrin = window.maVitrinHtml;
  if (typeof orgVitrin === 'function') window.maVitrinHtml = function (id, benimMi) {
    let html = orgVitrin.apply(this, arguments);
    if (benimMi || id === 'ben' || typeof maTakip === 'undefined' || !maTakip.has(id)) return html;
    let sec = Object.keys(DL_OYUNLAR).map(k => `<option value="${k}">${DL_OYUNLAR[k]}</option>`).join('');
    return `<div class="dl-kart"><h4>⚔️ Düelloya çağır</h4><div style="display:flex;gap:8px;align-items:center"><select id="dlOyunSec" aria-label="Düello oyunu">${sec}</select><button class="dl-gonder" data-o="${guvenliMetin(id)}" onclick="duelloGonder(this.dataset.o, this)">Düello yolla</button></div><small style="display:block;margin-top:6px;color:#8a78b8">Kabul ederse bugün ikiniz de bu oyunu oynarsınız, en yüksek puan kazanır: +3 ⚡ +20 XP.</small></div>` + html;
  };

  let orgKesfet = window.maKesfetHtml;
  if (typeof orgKesfet === 'function') window.maKesfetHtml = function () {
    setTimeout(async () => { await duellolarGetir(); document.querySelectorAll('.dl-alan').forEach(a => a.innerHTML = dlListeHtml(false)); }, 50);
    return `<div class="dl-kart"><h4>⚔️ Düellolarım</h4><div class="dl-alan">${dlListeHtml(false)}</div></div>` + orgKesfet.apply(this, arguments);
  };

  /* Düello Davet Dinleyicisi */
  async function duelloBildirimYokla() {
    if (!girisli() || document.hidden || oyunda()) return;
    const owner=kucuk(aktifOgrenciAdi);
    try {
      let r = await fetch(`${apiURL}?islem=bildirimlerim&ogrenci=${enc(aktifOgrenciAdi)}`);
      let d = await r.json(), liste = ((d && d.liste) || []).filter(b => b.tur === 'duello');
      if (owner!==kucuk(aktifOgrenciAdi)) return;
      if (liste.length > 0) {
        const b=liste.slice().reverse().find(note=>!sessionStorage.getItem('ing_dl_gor_'+owner+':'+note.sat));
        if(!b)return;
        const gorulenKey='ing_dl_gor_'+owner+':'+b.sat;
        if (!sessionStorage.getItem(gorulenKey)) {
          sessionStorage.setItem(gorulenKey, '1');
          davetGoster(b);
        }
      }
    } catch (e) {}
  }
  setInterval(duelloBildirimYokla, 120000);
  setTimeout(duelloBildirimYokla,5000);   /* [Kota] 1 dk -> 2 dk */

  async function davetGoster(b) {
    if(window.dmPapiNotices?.defer('duel:'+b.sat,()=>davetGoster(b)))return;
    const owner=kucuk(aktifOgrenciAdi);
    let liste = [];
    try { let r = await fetch(`${apiURL}?islem=duellolarim&ogrenci=${enc(aktifOgrenciAdi)}`); let d = await r.json(); liste = (d && d.liste) || []; window._dlSon = liste; } catch (e) {}
    const dl=window.DMNotificationActions?.duelFor(b,liste,owner);
    if (!dl||owner!==kucuk(aktifOgrenciAdi)) return;
    if(window.dmPapiNotices?.defer('duel:'+b.sat,()=>davetGoster(b)))return;
    let p = document.createElement('div'); p.className = 'dv-perde'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Düello daveti');
    p.innerHTML = `<div class="dv-kart"><div class="dv-kilic">⚔️</div><h3>Düello daveti!</h3><p><b>${guvenliMetin(b.gonderen)}</b> seni <b>${OYUN_AD[dl.oyun] || dl.oyun}</b> düellosuna çağırıyor.<br>Kazanan +3 ⚡ ve +20 XP alır!</p><button class="dv-kabul">⚔️ Kabul et ve oyna</button><button class="dv-vaz">Reddet</button><p data-duel-status role="status"></p></div>`;
    document.body.appendChild(p);
    setTimeout(() => p.querySelector('.dv-kabul').focus({ preventScroll: true }), 300);
    const buttons=[...p.querySelectorAll('button')];
    async function yanit(kabul){
      if(owner!==kucuk(aktifOgrenciAdi)){p.remove();return;}
      buttons.forEach(button=>button.disabled=true);
      try{
        await window.dmMeduPro.api('duelloYanit',{id:dl.id,kabul});
        if(!p.isConnected||owner!==kucuk(aktifOgrenciAdi)){p.remove();return;}
        p.remove();
        if(kabul)duelloOyununuAc(dl.oyun);
      }catch(e){
        if(!p.isConnected)return;
        p.querySelector('[data-duel-status]').textContent=e.message||'Yanıt gönderilemedi. Tekrar dene.';
        buttons.forEach(button=>button.disabled=false);
      }
    }
    buttons[0].onclick=()=>yanit(true);
    buttons[1].onclick=()=>yanit(false);
  }

  /* Keşfet sekmesindeki Düellolarım akordiyon ve buton işlemleri */
  setInterval(() => {
    document.querySelectorAll('#tab-meduakis .dl-kart').forEach(k => {
      let h = k.querySelector('h4');
      if (!h || !/Düellolarım/.test(h.innerText)) return;
      let aktif = [...k.querySelectorAll('.dl-alan > div')].filter(x => /Kabul|Bugün oyna|Seni düelloya|🔥/.test(x.innerText)).length;
      if (!k.classList.contains('dl-katla')) {
        k.classList.add('dl-katla');
        if (!aktif) k.classList.add('kapali');
        h.setAttribute('role', 'button'); h.tabIndex = 0;
        h.onclick = () => k.classList.toggle('kapali');
        h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); k.classList.toggle('kapali'); } };
      }
      let rz = h.querySelector('.dl-rozet');
      if (aktif && !rz) h.insertAdjacentHTML('beforeend', `<span class="dl-rozet">${aktif} aktif</span>`);
      else if (rz) { if (aktif) rz.innerText = aktif + ' aktif'; else rz.remove(); }
      k.querySelectorAll('.dl-satir').forEach(s => {
        if (s.dataset.oyna || !/Bugün oyna|🔥/.test(s.innerText)) return;
        s.dataset.oyna = '1';
        let ad = Object.keys(OYUN_AD).find(o => s.innerText.includes(OYUN_AD[o].replace(/^\S+\s/, '')));
        if (ad) { let b = document.createElement('button'); b.className = 'kr-evet'; b.innerText = 'Oyna'; b.onclick = () => duelloOyununuAc(ad); s.appendChild(b); }
      });
    });
  }, 1000);
})();
