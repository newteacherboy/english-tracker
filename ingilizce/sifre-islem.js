/* =====================================================================
   Diji-Medu · Şifre işlemleri (v4.7)
   - Şifremi unuttum  → veli e-postasına tek kullanımlık bağlantı
   - Şifremi değiştir → mevcut şifre + yeni şifre (giriş yapmışken)
   Eski telefonla sıfırlama penceresinin yerine geçer.
   ===================================================================== */
(function () {
  const API = "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";
  const MIN = 6;
  const css = `
  .si-perde{position:fixed;inset:0;z-index:100001;background:rgba(30,20,60,.55);display:flex;align-items:flex-end;justify-content:center;font-family:inherit}
  @media(min-width:640px){.si-perde{align-items:center;padding:20px}}
  .si-kutu{background:#fff;width:100%;max-width:420px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));color:#2d2350;box-shadow:0 -8px 30px rgba(60,30,120,.25)}
  @media(min-width:640px){.si-kutu{border-radius:22px}}
  .si-bas{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .si-bas h3{margin:0;font-size:19px;font-weight:900}
  .si-x{border:0;background:#f3efff;color:#5b3fb5;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer}
  .si-alt{margin:0 0 14px;font-size:13px;color:#6b5ca0;line-height:1.5}
  .si-alan{margin-bottom:11px}
  .si-alan label{display:block;font-size:12px;font-weight:800;margin-bottom:4px;color:#4b3f72}
  .si-alan input{width:100%;box-sizing:border-box;border:1.5px solid #ddd3ff;border-radius:12px;padding:11px 12px;font-size:15px;font-family:inherit;color:#2d2350}
  .si-alan input:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
  .si-mesaj{min-height:18px;font-size:13px;font-weight:700;margin:4px 0 10px;line-height:1.45}
  .si-mesaj.hata{color:#dc2626}.si-mesaj.tamam{color:#15803d}
  .si-btn{width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:900;color:#fff;background:#7c3aed;cursor:pointer;font-family:inherit}
  .si-btn:disabled{opacity:.55;cursor:default}
  .si-link{display:block;margin:12px auto 0;border:0;background:none;color:#6d28d9;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;text-decoration:underline}
  .si-btn:focus-visible,.si-x:focus-visible,.si-link:focus-visible{outline:3px solid #f0abfc;outline-offset:2px}`;

  function stil() { if (!document.getElementById("siStil")) { const s = document.createElement("style"); s.id = "siStil"; s.textContent = css; document.head.appendChild(s); } }
  async function istek(govde) {
    try { const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) }); return await r.json(); }
    catch (e) { return { ok: false, mesaj: "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et." }; }
  }
  function pencere(baslik, icerik) {
    stil();
    document.querySelectorAll(".si-perde").forEach(x => x.remove());
    ["sifreIslemModal"].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = "none"; });
    const p = document.createElement("div");
    p.className = "si-perde"; p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true"); p.setAttribute("aria-labelledby", "siBaslik");
    p.innerHTML = `<div class="si-kutu"><div class="si-bas"><h3 id="siBaslik">${baslik}</h3><button class="si-x" aria-label="Kapat">✕</button></div>${icerik}</div>`;
    document.body.appendChild(p);
    const kapat = () => { p.remove(); document.removeEventListener("keydown", esc); };
    const esc = e => { if (e.key === "Escape") kapat(); };
    document.addEventListener("keydown", esc);
    p.addEventListener("click", e => { if (e.target === p) kapat(); });
    p.querySelector(".si-x").onclick = kapat;
    const $ = id => p.querySelector("#" + id);
    const mesaj = (t, tur) => { const m = $("siMesaj"); m.textContent = t || ""; m.className = "si-mesaj" + (tur ? " " + tur : ""); };
    return { p, $, kapat, mesaj };
  }

  /* ---------- Şifremi unuttum ---------- */
  window.sifremiUnuttumAc = function (onDolu) {
    const w = pencere("🔑 Şifremi unuttum", `
      <p class="si-alt">Kullanıcı adını ve kayıtta yazdığın veli e-postasını gir. Yeni şifre belirleme bağlantısını o adrese göndereceğiz.</p>
      <div class="si-alan"><label for="siKul">Kullanıcı adı</label><input id="siKul" autocomplete="username" autocapitalize="off" spellcheck="false"></div>
      <div class="si-alan"><label for="siMail">Veli e-postası</label><input id="siMail" type="email" inputmode="email" autocomplete="email"></div>
      <div class="si-mesaj" id="siMesaj" role="status" aria-live="polite"></div>
      <button class="si-btn" id="siGonder">Bağlantı gönder</button>
      <p class="si-alt" style="margin:12px 0 0;font-size:12px">Veli e-postası kayıtlı değilse ya da artık kullanılmıyorsa öğretmeninden şifreni sıfırlamasını iste.</p>`);
    if (typeof onDolu === "string") w.$("siKul").value = onDolu;
    w.$("siGonder").onclick = async () => {
      const ogrenciAdi = w.$("siKul").value.trim(), email = w.$("siMail").value.trim();
      if (!ogrenciAdi || !email) return w.mesaj("Kullanıcı adını ve veli e-postasını yaz.", "hata");
      const b = w.$("siGonder"); b.disabled = true; b.textContent = "Gönderiliyor…"; w.mesaj("");
      const r = await istek({ islem: "sifreSifirlamaIste", ogrenciAdi, email });
      b.disabled = false; b.textContent = "Bağlantı gönder";
      w.mesaj(r.mesaj || (r.ok ? "Bağlantı gönderildi." : "Bir sorun oluştu."), r.ok ? "tamam" : "hata");
      if (r.ok) { b.textContent = "Tekrar gönder"; }
    };
    (w.$("siKul").value ? w.$("siMail") : w.$("siKul")).focus();
  };

  /* ---------- Giriş yapmışken şifre değiştir ---------- */
  window.sifreDegistirAc = function () {
    const kullanici = (typeof aktifOgrenciAdi !== "undefined" && aktifOgrenciAdi) || "";
    if (!kullanici) return window.sifremiUnuttumAc();
    const w = pencere("🔑 Şifremi değiştir", `
      <div class="si-alan"><label for="siEski">Mevcut şifren</label><input id="siEski" type="password" autocomplete="current-password"></div>
      <div class="si-alan"><label for="siYeni1">Yeni şifre (en az ${MIN} karakter)</label><input id="siYeni1" type="password" autocomplete="new-password"></div>
      <div class="si-alan"><label for="siYeni2">Yeni şifre (tekrar)</label><input id="siYeni2" type="password" autocomplete="new-password"></div>
      <div class="si-mesaj" id="siMesaj" role="status" aria-live="polite"></div>
      <button class="si-btn" id="siGonder">Şifremi değiştir</button>
      <button class="si-link" id="siUnuttum" type="button">Mevcut şifremi hatırlamıyorum</button>`);
    w.$("siUnuttum").onclick = () => { w.kapat(); window.sifremiUnuttumAc(kullanici); };
    w.$("siGonder").onclick = async () => {
      const mevcutSifre = w.$("siEski").value, y1 = w.$("siYeni1").value, y2 = w.$("siYeni2").value;
      if (!mevcutSifre) return w.mesaj("Mevcut şifreni yaz.", "hata");
      if (y1.length < MIN) return w.mesaj(`Yeni şifre en az ${MIN} karakter olmalı.`, "hata");
      if (y1 !== y2) return w.mesaj("Yeni şifreler birbiriyle aynı değil.", "hata");
      const b = w.$("siGonder"); b.disabled = true; b.textContent = "Kaydediliyor…"; w.mesaj("");
      const r = await istek({ islem: "sifremiDegistir", mevcutSifre, yeniSifre: y1 });
      b.disabled = false; b.textContent = "Şifremi değiştir";
      if (!r.ok) return w.mesaj(r.mesaj || "Şifre değiştirilemedi.", "hata");
      w.mesaj(r.mesaj || "Şifren değiştirildi.", "tamam");
      ["siEski", "siYeni1", "siYeni2"].forEach(id => w.$(id).value = "");
      setTimeout(w.kapat, 1800);
    };
    w.$("siEski").focus();
  };
})();
