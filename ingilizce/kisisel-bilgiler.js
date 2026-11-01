/* =====================================================================
   Diji-Medu · Kişisel Bilgiler
   Açmak için: kisiselBilgilerAc()
   index.html'de account-settings.js satırının ALTINA ekleyin:
   <script src="kisisel-bilgiler.js?v=1"></script>
   ===================================================================== */
(function () {
  const API = "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";

  const css = `
  .kb-perde{box-sizing:border-box;position:fixed;inset:0;z-index:100000;background:rgba(30,20,60,.55);display:flex;align-items:flex-end;justify-content:center;padding:0;font-family:inherit}
  @media(min-width:640px){.kb-perde{align-items:center;padding:20px}}
  .kb-kutu{box-sizing:border-box;background:#fff;width:100%;max-width:460px;height:min(92dvh,920px);max-height:92dvh;display:flex;flex-direction:column;min-height:0;overflow:hidden;border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));color:#2d2350;box-shadow:0 -8px 30px rgba(60,30,120,.25)}
  @media(min-width:640px){.kb-kutu{border-radius:22px}}
  .kb-icerik{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:12px}
  .kb-altbar{flex:0 0 auto;position:relative;z-index:5;background:#fff;padding:10px 0 max(8px,env(safe-area-inset-bottom,0px));box-shadow:0 -10px 16px #fff}
  .kb-bas{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px;flex:0 0 auto}
  .kb-ustbar{flex:0 0 auto;display:flex;flex-direction:column;gap:5px;padding:8px 0;background:#fff;position:relative;z-index:8;border-bottom:1px solid #ece6ff}
  .kb-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
  .kb-actions>button{box-sizing:border-box;min-width:0;width:100%}
  .kb-cikis{border:2px solid #9bbdb4;background:#edf6f2;color:#174839;border-radius:14px;padding:10px;font:800 15px system-ui;min-height:48px;cursor:pointer;touch-action:manipulation}
  .kb-perde button[hidden]{display:none!important}
  .kb-ustbar .kb-mesaj{margin:0;min-height:0}
  .kb-ustbar .kb-mesaj:empty{display:none}
  .kb-ustbar .kb-kaydet{margin:0!important;min-height:48px;box-shadow:none!important}
  @media(max-height:530px){.kb-kutu{height:100dvh;max-height:100dvh}.kb-ustbar{padding:4px 0}}
  .kb-bas h3{margin:0;font-size:19px;font-weight:900}
  .kb-x{border:0;background:#f3efff;color:#5b3fb5;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer}
  .kb-alt{margin:0 0 14px;font-size:12.5px;color:#7a6ca8}
  .kb-grup{border:1px solid #ece6ff;border-radius:16px;padding:12px 14px;margin-bottom:12px}
  .kb-grup h4{margin:0 0 8px;font-size:13px;color:#5b3fb5}
  .kb-alan{margin-bottom:10px}
  .kb-alan:last-child{margin-bottom:0}
  .kb-alan label{display:block;font-size:12px;font-weight:800;margin-bottom:4px;color:#4b3f72}
  .kb-alan input,.kb-alan select{width:100%;box-sizing:border-box;border:1.5px solid #ddd3ff;border-radius:12px;padding:11px 12px;font-size:16px;font-family:inherit;color:#2d2350;background:#fff}
  .kb-alan input:focus,.kb-alan select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.18)}
  .kb-alan input[readonly]{background:#f6f4fb;color:#7a6ca8}
  .kb-ipucu{font-size:11.5px;color:#8a7cb8;margin-top:4px}
  .kb-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .kb-sifre{display:none;background:#fff8e6;border-color:#f6dc9b}
  .kb-sifre.acik{display:block}
  .kb-mesaj{min-height:18px;font-size:13px;font-weight:700;margin:4px 0 10px}
  .kb-mesaj.hata{color:#dc2626}.kb-mesaj.tamam{color:#15803d}
  .kb-kaydet{width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:900;color:#fff;background:#7c3aed;cursor:pointer;font-family:inherit}
  .kb-kaydet#kbKaydet{position:relative;z-index:6;box-shadow:0 -8px 14px rgba(255,255,255,.95);margin-top:8px;min-height:52px;touch-action:manipulation}
  .kb-kaydet:disabled{opacity:.55;cursor:default}
  .kb-kaydet:focus-visible,.kb-x:focus-visible{outline:3px solid #f0abfc;outline-offset:2px}
  .kb-everyone-art{width:100%;border-radius:16px;margin:0 0 14px}.kb-kutu{background:#fffdf3;color:#102d52}.kb-kaydet{background:#00a4a7}.kb-grup{border-color:#cce4de}.kb-grup h4{color:#0b666b;font-size:16px}.kb-alan label{font-size:14px;color:#193b53}.kb-ipucu,.kb-alt{color:#41606b;font-size:13px}.kb-placement{border:1px solid #00a4a7;color:#07656b;background:#e6faf6;border-radius:12px;padding:12px;font-weight:800;width:100%}.kb-grup[hidden]{display:none}.kb-iki[hidden]{display:none}
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
  const telSade = t => {
    const d = String(t || "").replace(/\D/g, "");
    return /^5\d{9}$/.test(d) ? "0"+d : /^905\d{9}$/.test(d) ? "0"+d.slice(2) : d;
  };

  window.kisiselBilgilerAc = async function (secenek = {}) {
    const ownerToken=localStorage.getItem('ing_token')||'';
    const returnView=window.dmViewHistory?.capture();stilEkle();
    document.querySelectorAll(".kb-perde").forEach(x => x.remove());
    const perde = document.createElement("div");
    perde.className = "kb-perde";
    if(secenek.zorunlu) perde.style.zIndex='100000001';
    perde.setAttribute("role", "dialog"); perde.setAttribute("aria-modal", "true"); perde.setAttribute("aria-labelledby", "kbBaslik");
    perde.innerHTML = `<div class="kb-kutu"><div class="kb-bas"><h3 id="kbBaslik">👤 Kişisel bilgiler</h3><button class="kb-cikis" type="button">Çıkış yap</button><button class="kb-x" aria-label="Kapat">✕</button></div><div class="kb-yukleniyor">Bilgilerin yükleniyor…</div></div>`;
    document.body.appendChild(perde);
    const kapat = (force=false) => { if(force!==true && secenek.zorunlu && window.dmContactFrozen)return; perde.remove();window.dmViewHistory?.leave(perde); document.removeEventListener("keydown", esc);document.removeEventListener('dm:contact-exit',forceClose); };
    const forceClose=()=>kapat(true);
    const logout=()=>{if((localStorage.getItem('ing_token')||'')!==ownerToken){forceClose();return;}if(!window.dmContactPolicy?.logout(ownerToken))window.cikisYap?.();};
    document.addEventListener('dm:contact-exit',forceClose);
    perde.querySelector('.kb-cikis').onclick=logout;
    const esc = e => { if (e.key === "Escape") kapat(); if(e.key==='Tab' && secenek.zorunlu && window.dmContactFrozen){const list=[...perde.querySelectorAll('button:not([hidden]):not([disabled]),input:not([readonly]),select')];const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}} };
    window.dmViewHistory?.track(perde,{parent:returnView,close:kapat});document.addEventListener("keydown", esc);
    perde.addEventListener("click", e => { if (e.target === perde) kapat(); });
    perde.querySelector(".kb-x").onclick = kapat;
    if(secenek.zorunlu)perde.querySelector('.kb-x').hidden=true;

    const d = await istek({ islem: "kisiselBilgilerim" });
    if(!perde.isConnected||(localStorage.getItem('ing_token')||'')!==ownerToken)return;
    const kutu = perde.querySelector(".kb-kutu");
    if (!d.ok) { kutu.querySelector(".kb-yukleniyor").textContent = d.mesaj || "Bilgiler alınamadı."; const tekrar=document.createElement('button');tekrar.className='kb-kaydet';tekrar.textContent='Tekrar dene';tekrar.onclick=()=>window.kisiselBilgilerAc(secenek);kutu.appendChild(tekrar);return; }

    kutu.innerHTML = `
      <div class="kb-bas"><h3 id="kbBaslik">👤 Kişisel bilgiler</h3><button class="kb-x" aria-label="Kapat">✕</button></div>
      <p class="kb-alt">Kullanıcı adın giriş için kullanılır ve değiştirilemez.</p>
      <div class="kb-grup"><h4>Ben</h4>
        <div class="kb-alan"><label for="kbKul">Kullanıcı adı</label><input id="kbKul" readonly></div>
        <div class="kb-alan"><label for="kbAd">Ad soyad <span style="font-weight:600;color:#8a7cb8">(isteğe bağlı)</span></label><input id="kbAd" maxlength="60" autocomplete="name"></div>
      </div>
      <img class="kb-everyone-art" src="discovery-assets/her-yasta-ogren.webp" alt="Her yaşta öğrenenler ve Papi">
      <div class="kb-grup"><h4>Öğrenme tercihlerim</h4>
        <div class="kb-alan"><label for="kbPurpose">Öğrenme amacım</label><select id="kbPurpose"><option value="school">Okul derslerim için</option><option value="independent">Kendim için</option></select></div>
        <div class="kb-alan"><label for="kbAge">Yaş aralığım (profilimde paylaşılmaz)</label><select id="kbAge"><option value="">Seç</option><option value="under13">13 yaş altı</option><option value="teen">13–17 yaş</option><option value="adult">18 yaş ve üzeri</option></select></div>
        <div class="kb-alan"><label for="kbGoal">Öğrenme hedefim</label><select id="kbGoal"><option value="daily">Günlük yaşam</option><option value="travel">Seyahat</option><option value="school">Derslerime destek</option><option value="exam">Sınava hazırlık</option></select></div>
        <button type="button" class="kb-placement">Başlangıç seviyemi bul</button><p class="kb-ipucu">Test isteğe bağlıdır; Şimdilik geç ile doğrudan başlayabilirsin.</p>
      </div>
      <div class="kb-grup kb-teacher-link"><h4>👩‍🏫 Öğretmenim</h4><p id="kbTeacherStatus" class="kb-ipucu" role="status"></p><p class="kb-ipucu">Öğretmeninin öğrenci davet kodunu gir. Kendi öğretmen paneli giriş şifresini değil, öğrencilere verdiği kodu kullan.</p><div class="kb-alan"><label for="kbTeacherCode">Öğretmen davet kodu</label><input id="kbTeacherCode" maxlength="10" autocapitalize="characters" autocomplete="off" placeholder="Öğretmenimin kodu"></div><button type="button" id="kbTeacherConnect" class="kb-kaydet" style="margin-top:10px;background:#087f73">Öğretmenime bağlan</button></div>
      <div class="kb-grup" id="kbEducation"><h4>Eğitim bilgilerim</h4>
        <div class="kb-alan"><label for="kbStage">Eğitim kademem</label><select id="kbStage"><option value="">Seç</option><option value="primary">İlkokul</option><option value="middle">Ortaokul</option><option value="high">Lise</option><option value="university">Üniversite</option></select></div>
        <div class="kb-alan"><label for="kbOkul">Okul adı <span style="font-weight:600;color:#8a7cb8">(isteğe bağlı)</span></label><input id="kbOkul" maxlength="120"></div>
        <div class="kb-iki">
          <div class="kb-alan"><label for="kbSinif">Sınıf (ilkokul ve ortaokulda zorunlu)</label><select id="kbSinif"><option value="">Belirtmek istemiyorum</option>${Array.from({length:12},(_,i)=>i+1).map(n => `<option value="${n}">${n}. sınıf</option>`).join("")}</select></div>
          <div class="kb-alan"><label for="kbSube">Şube</label><input id="kbSube" maxlength="10" autocapitalize="characters"></div>
        </div>
        <div class="kb-ipucu" id="kbSinifIpucu"></div>
      </div>
      <div class="kb-grup"><h4 id="kbContactTitle">İletişim bilgilerim</h4>
        <div class="kb-alan"><label for="kbTel">Telefon (isteğe bağlı)</label><input id="kbTel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XX XXX XX XX"></div>
        <div class="kb-alan"><label for="kbMail">E-posta adresi</label><input id="kbMail" type="email" inputmode="email" autocomplete="email"></div>
        <div class="kb-email-help" style="margin:8px 0 14px;padding:12px;border:2px solid #bce6d1;border-radius:14px;background:#ecfff5">
          <strong style="color:#135d4f;font-size:15px">✉ E-posta doğrulama yardımı</strong>
          <p style="margin:6px 0 10px;font-size:14px;color:#245568;line-height:1.5">Gmail, Outlook ve diğer e-posta uygulamalarında doğrulama mesajını bulmayı görsellerle öğren.</p>
          <button id="kbEmailGuideButton" type="button" style="width:100%;min-height:45px;border:0;border-radius:12px;background:#0d957f;color:white;font-size:15px;font-weight:800">📖 Görselli rehberi aç</button>
        </div>
        <div class="kb-ipucu">E-posta adresin hesap güvenliği için kullanılır. Mevcut iletişim bilgilerini değiştirirken şifren istenir.</div>
      </div>
      <div class="kb-grup kb-sifre" id="kbSifreGrup">
        <div class="kb-alan"><label for="kbSifre">Mevcut şifren</label><input id="kbSifre" type="password" autocomplete="current-password"></div>
        <div class="kb-ipucu" id="kbSifreIpucu">Telefon veya e-postayı değiştirmek için şifreni yaz.</div>
      </div>
      <div class="kb-mesaj" id="kbMesaj" role="status" aria-live="polite"></div>
      <button class="kb-kaydet" id="kbKaydet">Kaydet</button>`;
    // The action and feedback stay ABOVE the scrollable fields on every viewport.
    const saveButton = kutu.querySelector('#kbKaydet');
    const feedback = kutu.querySelector('#kbMesaj');
    const header = kutu.querySelector('.kb-bas');
    const topbar = document.createElement('div'); topbar.className='kb-ustbar';
    const body = document.createElement('div'); body.className='kb-icerik';
    while(kutu.firstChild)body.appendChild(kutu.firstChild);
    header.remove();
    kutu.appendChild(header);
    const actions=document.createElement('div');actions.className='kb-actions';
    const exitButton=document.createElement('button');exitButton.type='button';exitButton.className='kb-cikis';exitButton.textContent='Çıkış yap';exitButton.onclick=logout;
    actions.append(saveButton,exitButton);topbar.appendChild(actions);
    topbar.appendChild(feedback);
    kutu.appendChild(topbar);
    kutu.appendChild(body);
    kutu.querySelector(".kb-x").onclick = kapat;
    if(secenek.zorunlu)kutu.querySelector('.kb-x').hidden=true;

    const $ = id => kutu.querySelector("#" + id);
    let mevcut = d, sifreZorunlu = false;
    function doldur(x) {
      $("kbKul").value = x.kullaniciAdi || "";
      $("kbAd").value = x.adSoyad || "";
      $("kbOkul").value = x.okul || "";
      const pref=x.learnerProfile||{purpose:x.sinif?'school':'independent',educationStage:Number(x.sinif)<=4?'primary':Number(x.sinif)<=8?'middle':'high',ageBand:'',goal:'daily'};
      $("kbPurpose").value=pref.purpose;$("kbAge").value=pref.ageBand||'';$("kbGoal").value=pref.goal||'daily';$("kbStage").value=pref.educationStage||'';
      $("kbSinif").value=String(x.sinif||''); education(false);
      $("kbSube").value = String(x.sube || "").toLocaleUpperCase("tr-TR");$("kbTeacherCode").value="";$("kbTeacherStatus").textContent=x.ogretmenBagli?"Bir öğretmene bağlısın. Öğrenme amacını değiştirmek bu bağlantıyı kaldırmaz.":"Bağımsız öğreniyorsun; öğretmen kodu zorunlu değil.";
      $("kbTel").value = telGoster(x.telefon);
      $("kbMail").value = x.email || "";
      $("kbSifre").value = "";
      $("kbSinifIpucu").textContent = x.ogretmenBagli ? "Sınıfını değiştirirsen öğretmenine bilgi verilir." : "";
      if (x.googleBagli) $("kbSifreIpucu").textContent = "Google ile kayıt olduysan şifren yoktur; öğretmeninden şifre belirlemesini iste.";
      sifreGoster();
    }
    function education(reset=false){const school=$("kbPurpose").value==='school',stage=$("kbStage").value,bounds={primary:[1,4],middle:[5,8],high:[9,12],university:[0,0]}[stage]||[0,0];$("kbEducation").hidden=!school;for(const o of $("kbSinif").options)o.hidden=!!o.value&&(Number(o.value)<bounds[0]||Number(o.value)>bounds[1]);$("kbSinif").closest('.kb-iki').hidden=!stage||stage==='university';if(reset||$("kbSinif").selectedOptions[0]?.hidden)$("kbSinif").value='';$("kbContactTitle").textContent=$("kbAge").value==='adult'?'İletişim bilgilerim':'Veli iletişim bilgileri';}
    for(const id of ['kbPurpose','kbStage','kbAge'])$(id).addEventListener('change',()=>education(id==='kbStage'));
    kutu.querySelector('.kb-placement').onclick=()=>{kapat();window.seviyeTestAc?.();};
    const iletisimDegisti = () => (Boolean(telSade(mevcut.telefon)) && telSade($("kbTel").value) !== telSade(mevcut.telefon)) || (Boolean(String(mevcut.email||'').trim()) && $("kbMail").value.trim().toLowerCase() !== String(mevcut.email || "").trim().toLowerCase());
    function sifreGoster() {
      const gerekli = sifreZorunlu || iletisimDegisti(), grup = $("kbSifreGrup");
      grup.classList.toggle("acik", gerekli);
      grup.hidden = !gerekli;
      grup.style.display = gerekli ? "block" : "none";
    }
    function sifreIste() {
      sifreZorunlu = true; sifreGoster();
      $("kbSifre").scrollIntoView?.({block:"center",behavior:"smooth"});
      $("kbSifre").focus();
    }
    $("kbTel").addEventListener("input", sifreGoster);
    $("kbMail").addEventListener("input", sifreGoster);
    $("kbEmailGuideButton")?.addEventListener("click",()=>window.dmEmailGuide?.open("profile"));
    doldur(d);

    const mesaj = (t, tur) => { const m = $("kbMesaj"); m.textContent = t || ""; m.className = "kb-mesaj" + (tur ? " " + tur : ""); };
    $("kbTeacherConnect").onclick = () => {
      const code=$("kbTeacherCode").value.trim().toUpperCase();
      if(!/^[A-Z0-9]{1,10}$/.test(code))return mesaj("Öğretmen davet kodunu kontrol et.", "hata");
      if(mevcut.ogretmenBagli)return mesaj("Zaten bir öğretmene bağlısın. Öğretmen değişikliği için destek al.", "hata");
      $("kbTeacherCode").value=code;
      $("kbKaydet").click();
    };
    $("kbKaydet").onclick = async () => {
      if((localStorage.getItem('ing_token')||'')!==ownerToken){forceClose();return;}
      const govde = {
        islem: "kisiselBilgiGuncelle",
        adSoyad: $("kbAd").value.trim(), okul: $("kbOkul").value.trim(),
        ...($("kbPurpose").value==='school'?{sinif:!$("kbStage").value||$("kbStage").value==='university'||!$("kbSinif").value?null:Number($("kbSinif").value),sube:$("kbSube").value.trim().toLocaleUpperCase("tr-TR")}:{}),
        learnerProfile:{version:1,purpose:$("kbPurpose").value,ageBand:$("kbAge").value,educationStage:$("kbPurpose").value==='school'?$("kbStage").value:'',goal:$("kbGoal").value,startChoice:mevcut.learnerProfile?.startChoice||'new',knownLevel:mevcut.learnerProfile?.knownLevel||'A1'},
        ogretmenKodu: $("kbTeacherCode").value.trim(),telefon: $("kbTel").value.trim(), email: $("kbMail").value.trim()
      };
      if (!govde.learnerProfile.ageBand) return mesaj("Yaş aralığını seç.", "hata");
      if (!govde.email) return mesaj("E-posta adresi boş bırakılamaz.", "hata");

      sifreGoster();
      if (sifreZorunlu || iletisimDegisti() || $("kbSifre").value) {
        govde.mevcutSifre = $("kbSifre").value;
        if (!govde.mevcutSifre) { sifreIste(); return mesaj("Telefon veya e-postayı değiştirmek için mevcut şifreni yaz.", "hata"); }
      }
      const b = $("kbKaydet"); b.disabled = true; b.textContent = "Kaydediliyor…"; mesaj("");
      const r = await istek(govde);
      if(!perde.isConnected||(localStorage.getItem('ing_token')||'')!==ownerToken)return;
      b.disabled = false; b.textContent = "Kaydet";
      if (!r.ok) { if (r.sifreGerekli) { $("kbSifre").value = ""; sifreIste(); } return mesaj(r.mesaj || "Kaydedilemedi.", "hata"); }
      const oldPurpose=mevcut.learnerProfile?.purpose,oldStage=mevcut.learnerProfile?.educationStage;
      mevcut = r; sifreZorunlu = false; doldur(r);
      if((oldPurpose!==r.learnerProfile?.purpose||oldStage!==r.learnerProfile?.educationStage)&&window.dmLearningRoute?.set){const route=r.learnerProfile?.purpose==='school'&&r.sinif&&['primary','middle'].includes(r.learnerProfile?.educationStage)?'school':'independent';await window.dmLearningRoute.set(route,{reopen:false});}
      window.dmLearnerProfile=r.learnerProfile;
      mesaj(r.mesaj || "Bilgilerin kaydedildi.", "tamam");
      try { document.dispatchEvent(new CustomEvent("dm:kisisel-bilgiler", { detail: r })); } catch (e) {}
      if(secenek.zorunlu) { window.dmContactFrozen=false; kapat(); }
    };
    $("kbAd").focus();
  };
})();
