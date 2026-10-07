/* =====================================================================
   Diji-Medu · Kişisel Bilgiler
   Açmak için: kisiselBilgilerAc()
   index.html'de account-settings.js satırının ALTINA ekleyin:
   <script src="kisisel-bilgiler.js?v=1"></script>
   ===================================================================== */
(function () {
  const API = "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";

  const css = `
  .kb-perde{position:fixed;inset:0;z-index:100000;background:rgba(30,20,60,.55);display:flex;align-items:flex-end;justify-content:center;padding:0;font-family:inherit}
  @media(min-width:640px){.kb-perde{align-items:center;padding:20px}}
  .kb-kutu{background:#fff;width:100%;max-width:460px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));color:#2d2350;box-shadow:0 -8px 30px rgba(60,30,120,.25)}
  @media(min-width:640px){.kb-kutu{border-radius:22px}}
  .kb-bas{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
  .kb-bas h3{margin:0;font-size:19px;font-weight:900}
  .kb-x{border:0;background:#f3efff;color:#5b3fb5;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer}
  .kb-alt{margin:0 0 14px;font-size:12.5px;color:#7a6ca8}
  .kb-grup{border:1px solid #ece6ff;border-radius:16px;padding:12px 14px;margin-bottom:12px}
  .kb-grup h4{margin:0 0 8px;font-size:13px;color:#5b3fb5}
  .kb-alan{margin-bottom:10px}
  .kb-alan:last-child{margin-bottom:0}
  .kb-alan label{display:block;font-size:12px;font-weight:800;margin-bottom:4px;color:#4b3f72}
  .kb-alan input,.kb-alan select{width:100%;box-sizing:border-box;border:1.5px solid #ddd3ff;border-radius:12px;padding:11px 12px;font-size:15px;font-family:inherit;color:#2d2350;background:#fff}
  .kb-alan input:focus,.kb-alan select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
  .kb-alan input[readonly]{background:#f6f4fb;color:#7a6ca8}
  .kb-ipucu{font-size:11.5px;color:#8a7cb8;margin-top:4px}
  .kb-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .kb-sifre{display:none;background:#fff8e6;border-color:#f6dc9b}
  .kb-sifre.acik{display:block}
  .kb-mesaj{min-height:18px;font-size:13px;font-weight:700;margin:4px 0 10px}
  .kb-mesaj.hata{color:#dc2626}.kb-mesaj.tamam{color:#15803d}
  .kb-kaydet{width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:900;color:#fff;background:#7c3aed;cursor:pointer;font-family:inherit}
  .kb-kaydet:disabled{opacity:.55;cursor:default}
  .kb-kaydet:focus-visible,.kb-x:focus-visible{outline:3px solid #f0abfc;outline-offset:2px}
  .kb-yukleniyor{padding:30px 0;text-align:center;color:#7a6ca8}`;

  function stilEkle() {
    if (document.getElementById("kbStil")) return;
    const s = document.createElement("style"); s.id = "kbStil"; s.textContent = css; document.head.appendChild(s);
  }
  async function istek(govde) {
    let r; try { r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...govde,t:localStorage.getItem('ing_token')||''}) }); } catch(e) { return {ok:false,mesaj:'İnternet bağlantını kontrol edip tekrar dene.'}; }
    let d = null; try { d = await r.json(); } catch (e) {}
    return d || { ok: false, mesaj: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et." };
  }
  const telGoster = t => { const d = String(t || "").replace(/\D/g, ""); return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : String(t || ""); };
  const telSade = t => String(t || "").replace(/\D/g, "");

  window.kisiselBilgilerAc = async function (secenek = {}) {
    stilEkle();
    document.querySelectorAll(".kb-perde").forEach(x => x.remove());
    const perde = document.createElement("div");
    perde.className = "kb-perde";
    if(secenek.zorunlu) perde.style.zIndex='100000001';
    perde.setAttribute("role", "dialog"); perde.setAttribute("aria-modal", "true"); perde.setAttribute("aria-labelledby", "kbBaslik");
    perde.innerHTML = `<div class="kb-kutu"><div class="kb-bas"><h3 id="kbBaslik">👤 Kişisel bilgiler</h3><button class="kb-x" aria-label="Kapat">✕</button></div><div class="kb-yukleniyor">Bilgilerin yükleniyor…</div></div>`;
    document.body.appendChild(perde);
    const kapat = () => { if(secenek.zorunlu && window.dmContactFrozen)return; perde.remove(); document.removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") kapat(); if(e.key==='Tab' && secenek.zorunlu && window.dmContactFrozen){const list=[...perde.querySelectorAll('button:not([hidden]):not([disabled]),input:not([readonly]),select')];const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}} };
    document.addEventListener("keydown", esc);
    perde.addEventListener("click", e => { if (e.target === perde) kapat(); });
    perde.querySelector(".kb-x").onclick = kapat;
    if(secenek.zorunlu)perde.querySelector('.kb-x').hidden=true;

    const d = await istek({ islem: "kisiselBilgilerim" });
    const kutu = perde.querySelector(".kb-kutu");
    if (!d.ok) { kutu.querySelector(".kb-yukleniyor").textContent = d.mesaj || "Bilgiler alınamadı."; const tekrar=document.createElement('button');tekrar.className='kb-kaydet';tekrar.textContent='Tekrar dene';tekrar.onclick=()=>window.kisiselBilgilerAc(secenek);kutu.appendChild(tekrar);return; }

    kutu.innerHTML = `
      <div class="kb-bas"><h3 id="kbBaslik">👤 Kişisel bilgiler</h3><button class="kb-x" aria-label="Kapat">✕</button></div>
      <p class="kb-alt">Kullanıcı adın giriş için kullanılır ve değiştirilemez.</p>
      <div class="kb-grup"><h4>Ben</h4>
        <div class="kb-alan"><label for="kbKul">Kullanıcı adı</label><input id="kbKul" readonly></div>
        <div class="kb-alan"><label for="kbAd">Ad soyad <span style="font-weight:600;color:#8a7cb8">(isteğe bağlı)</span></label><input id="kbAd" maxlength="60" autocomplete="name"></div>
      </div>
      <div class="kb-grup"><h4>Okul</h4>
        <div class="kb-alan"><label for="kbOkul">Okul adı <span style="font-weight:600;color:#8a7cb8">(isteğe bağlı)</span></label><input id="kbOkul" maxlength="120"></div>
        <div class="kb-iki">
          <div class="kb-alan"><label for="kbSinif">Sınıf</label><select id="kbSinif">${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}">${n}. sınıf</option>`).join("")}</select></div>
          <div class="kb-alan"><label for="kbSube">Şube</label><input id="kbSube" maxlength="10" autocapitalize="characters"></div>
        </div>
        <div class="kb-ipucu" id="kbSinifIpucu"></div>
      </div>
      <div class="kb-grup"><h4>Veli iletişim</h4>
        <div class="kb-alan"><label for="kbTel">Veli telefonu</label><input id="kbTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XX XXX XX XX"></div>
        <div class="kb-alan"><label for="kbMail">Veli e-postası</label><input id="kbMail" type="email" inputmode="email" autocomplete="email"></div>
        <div class="kb-ipucu">Telefon ve e-posta silinemez, sadece değiştirilebilir. Raporlar ve şifre yenileme bunlarla yapılır.</div>
      </div>
      <div class="kb-grup kb-sifre" id="kbSifreGrup">
        <div class="kb-alan"><label for="kbSifre">Mevcut şifren</label><input id="kbSifre" type="password" autocomplete="current-password"></div>
        <div class="kb-ipucu" id="kbSifreIpucu">Telefon veya e-postayı değiştirmek için şifreni yaz.</div>
      </div>
      <div class="kb-mesaj" id="kbMesaj" role="status" aria-live="polite"></div>
      <button class="kb-kaydet" id="kbKaydet">Kaydet</button>`;
    kutu.querySelector(".kb-x").onclick = kapat;
    if(secenek.zorunlu)kutu.querySelector('.kb-x').hidden=true;

    const $ = id => kutu.querySelector("#" + id);
    let mevcut = d;
    function doldur(x) {
      $("kbKul").value = x.kullaniciAdi || "";
      $("kbAd").value = x.adSoyad || "";
      $("kbOkul").value = x.okul || "";
      $("kbSinif").value = String(x.sinif || 5);
      $("kbSube").value = x.sube || "";
      $("kbTel").value = telGoster(x.telefon);
      $("kbMail").value = x.email || "";
      $("kbSifre").value = "";
      $("kbSinifIpucu").textContent = x.ogretmenBagli ? "Sınıfını değiştirirsen öğretmenine bilgi verilir." : "";
      if (x.googleBagli) $("kbSifreIpucu").textContent = "Google ile kayıt olduysan şifren yoktur; öğretmeninden şifre belirlemesini iste.";
      sifreGoster();
    }
    const iletisimDegisti = () => (Boolean(telSade(mevcut.telefon)) && telSade($("kbTel").value) !== telSade(mevcut.telefon)) || (Boolean(String(mevcut.email||'').trim()) && $("kbMail").value.trim().toLowerCase() !== String(mevcut.email || "").trim().toLowerCase());
    function sifreGoster() { $("kbSifreGrup").classList.toggle("acik", iletisimDegisti()); }
    $("kbTel").addEventListener("input", sifreGoster);
    $("kbMail").addEventListener("input", sifreGoster);
    doldur(d);

    const mesaj = (t, tur) => { const m = $("kbMesaj"); m.textContent = t || ""; m.className = "kb-mesaj" + (tur ? " " + tur : ""); };
    $("kbKaydet").onclick = async () => {
      const govde = {
        islem: "kisiselBilgiGuncelle",
        adSoyad: $("kbAd").value.trim(), okul: $("kbOkul").value.trim(),
        sinif: Number($("kbSinif").value), sube: $("kbSube").value.trim(),
        telefon: $("kbTel").value.trim(), email: $("kbMail").value.trim()
      };
      if (!telSade(govde.telefon)) return mesaj("Telefon numarası boş bırakılamaz.", "hata");
      if (!govde.email) return mesaj("E-posta adresi boş bırakılamaz.", "hata");
      if (!govde.sube) return mesaj("Şube boş bırakılamaz.", "hata");
      if (iletisimDegisti()) {
        govde.mevcutSifre = $("kbSifre").value;
        if (!govde.mevcutSifre) { $("kbSifre").focus(); return mesaj("Telefon veya e-postayı değiştirmek için mevcut şifreni yaz.", "hata"); }
      }
      const b = $("kbKaydet"); b.disabled = true; b.textContent = "Kaydediliyor…"; mesaj("");
      const r = await istek(govde);
      b.disabled = false; b.textContent = "Kaydet";
      if (!r.ok) { if (r.sifreGerekli) { $("kbSifre").value = ""; $("kbSifre").focus(); } return mesaj(r.mesaj || "Kaydedilemedi.", "hata"); }
      mevcut = r; doldur(r);
      mesaj(r.mesaj || "Bilgilerin kaydedildi.", "tamam");
      try { document.dispatchEvent(new CustomEvent("dm:kisisel-bilgiler", { detail: r })); } catch (e) {}
      if(secenek.zorunlu) { window.dmContactFrozen=false; kapat(); }
    };
    $("kbAd").focus();
  };
})();
