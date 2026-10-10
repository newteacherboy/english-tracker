/* Optional Google student login. Legacy login remains the default and fallback. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let linking = false;
  // Play Store (TWA) içinde Google girişi gösterilmez: Aileler politikası çocuklara yönelik uygulamada OAuth girişini kısıtlıyor.
  const androidUygulama = (() => {
    try {
      if (document.referrer.startsWith('android-app://') || new URLSearchParams(location.search).get('kaynak') === 'android') sessionStorage.setItem('dm_android_uygulama', '1');
      return sessionStorage.getItem('dm_android_uygulama') === '1';
    } catch (_) { return false; }
  })();
  window.dmAndroidUygulama = androidUygulama;
  let busy = false;
  const legacyLogin = window.girisYap;
  const legacyLogout = window.cikisYap;
  const subtitle = $('girisSubtitle');
  const originalSubtitle = subtitle.textContent;
  const area = document.createElement('div');
  area.hidden = true;
  area.style.marginTop = '14px';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dm-google-login';
  button.setAttribute('aria-label', 'Google ile devam et');
  button.innerHTML = '<img src="google-signin-approved.png" alt="Sign in with Google" width="208" style="display:block;max-width:100%;height:auto">';
  button.style.cssText = 'width:100%;min-height:52px;padding:14px 16px;border:2px solid #4285f4;border-radius:14px;background:#fff;color:#202124;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 4px 16px rgba(66,133,244,.25)';
  const loginStyle = document.createElement('style');
  loginStyle.textContent = "\n#login-container { background:#fff!important;color:#123944!important;border:1px solid #e2e8ec!important;box-shadow:0 12px 36px rgba(15,60,70,.09)!important;max-width:430px!important;width:calc(100% - 28px)!important;padding:28px 22px!important;border-radius:22px!important;font-family:Arial,sans-serif!important;}\n#login-container [hidden] { display:none!important; }\n#login-container .dm-logo-row { margin-bottom:26px!important;gap:12px!important; }\n#login-container .dm-logo-icon { width:58px!important;height:58px!important; }\n#login-container .dm-logo-word {font-size:28px!important;color:#0c6c77!important;}\n#login-container .dm-diji {color:#0c6c77!important;}\n#login-container .dm-medu {color:#079aaa!important;}\n#login-container .dm-logo-tag {font-size:10px!important;letter-spacing:1.4px;color:#37616b!important;}\n#login-container h2 { font-size:27px!important;line-height:1.25!important;color:#123944!important;margin:0 0 10px!important; }\n#login-container .subtitle {font-size:14px!important;line-height:1.6!important;color:#657786!important;margin-bottom:24px!important;}\n#login-container .form-group {margin:0 0 16px!important;text-align:left!important;}\n#login-container .form-group label {display:block!important;font-size:13px!important;font-weight:600!important;color:#344d61!important;margin-bottom:7px!important;}\n#login-container .form-group input,#login-container .form-group select {width:100%!important;min-width:0!important;min-height:48px!important;padding:12px 13px!important;border:1px solid #d5dfe5!important;border-radius:9px!important;background:#fdfefe!important;color:#263d4d!important;font-family:inherit!important;font-size:16px!important;box-shadow:none!important;box-sizing:border-box!important;}\n#login-container input::placeholder {color:#8795a6!important;font-size:14px!important;}\n#login-container input:focus,#login-container select:focus {outline:2px solid #80cad0!important;outline-offset:1px;}\n#login-container .btn-giris {min-height:48px!important;border-radius:9px!important;background:#07838c!important;color:white!important;border:0!important;box-shadow:none!important;font-size:15px!important;font-weight:700!important;padding:13px!important;width:100%!important;}\n#login-container .dm-google-login {min-height:48px!important;padding:0!important;border:0!important;border-radius:9px!important;box-shadow:none!important;font-size:14px!important;background:transparent!important;color:#202124!important;}\n#login-container .dm-google-login:hover {background:#f0f5ff!important;}\n#login-container .dm-google-login:disabled {opacity:.65;cursor:wait;}\n#login-container .dm-login-actions {display:flex;flex-direction:column;gap:10px;margin-top:14px;}\n#login-container .dm-login-actions button {width:100%;min-height:46px;padding:12px;border-radius:9px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;}\n#login-container .dm-register-action {background:#fff!important;color:#07838c!important;border:1px solid #07838c!important;}\n#login-container .dm-forgot-action {background:transparent!important;color:#315475!important;border:0!important;text-decoration:underline;font-size:13px!important;min-height:40px!important;}\n#login-container a {color:#217982!important;}\n#login-container > a[href=\"gizlilik.html\"] {border-top:1px solid #e5ebef;padding-top:18px!important;margin-top:22px!important;font-size:12px!important;color:#5a7184!important;text-decoration:none!important;}\n#login-container #mesaj {font-size:13px!important;line-height:1.5;color:#a43030;}\n#login-container .dm-divider {display:flex;align-items:center;gap:12px;margin:18px 0 0;color:#80909e;font-size:12px;}\n#login-container .dm-divider:before,#login-container .dm-divider:after {content:\"\";height:1px;flex:1;background:#e2e8ed;}\n#login-container .dm-registration {margin-top:8px!important;text-align:left;}\n#login-container .dm-verified {font-size:13px;color:#2b6850;background:#edf9f1;padding:12px;border-radius:9px;margin-bottom:12px;}\n#login-container .dm-form-intro {font-size:13px;color:#657786;line-height:1.5;margin-bottom:18px;}\n#login-container .dm-section {font-size:11px;font-weight:700;color:#778698;letter-spacing:.9px;margin:18px 0 13px;}\n#login-container .dm-field-row {display:grid;grid-template-columns:1fr 1fr;gap:12px;}\n#login-container .dm-optional {float:right;font-size:10px;background:#eef1f5;color:#667b89;padding:3px 6px;border-radius:8px;}\n#login-container .dm-consent {display:flex;align-items:flex-start;gap:10px;background:#f3f6f8;padding:12px;border-radius:10px;margin:8px 0 16px;font-size:11px!important;line-height:1.6;color:#566b7c;}\n#login-container .dm-consent input {width:18px!important;height:18px!important;min-height:18px!important;flex-shrink:0;margin-top:2px;padding:0!important;accent-color:#07838c;}\n#login-container .dm-consent small {display:block;font-size:10px;margin-top:5px;}\n#login-container .dm-link-button {background:transparent!important;border:0!important;color:#315475!important;font-family:inherit;font-size:12px;text-decoration:underline;cursor:pointer;min-height:40px;padding:8px;}\n#login-container .dm-existing-account {display:block;margin:2px auto 0;}\n#login-container button:focus-visible {outline:3px solid #80cad0;outline-offset:3px;}\n";
  document.head.append(loginStyle);
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Giriş ekranına dön';
  cancel.className = 'dm-link-button';
  cancel.hidden = true;
  cancel.style.cssText = 'margin-top:10px;background:transparent;border:0;color:inherit;cursor:pointer';
  const create = document.createElement('button');
  create.type = 'button';
  create.textContent = 'Hesabım yok, yeni öğrenci kaydı oluştur';
  create.hidden = true;
  create.style.cssText = button.style.cssText + ';margin-top:12px;background:#eef6ff';
  const registration = document.createElement('form');
  registration.hidden = true;
  registration.className = 'dm-registration';
  registration.innerHTML = `
    <div class="dm-verified">✓ Google hesabın doğrulandı.</div>
    <p class="dm-form-intro">Öğrenci ve veli bilgilerini tamamla.</p>
    <h3 class="dm-section">ÖĞRENCİ BİLGİLERİ</h3>
    <div class="form-group"><label for="googleYeniKullanici">Kullanıcı adı (takma ad)</label><input id="googleYeniKullanici" required minlength="3" maxlength="20" pattern="[A-Za-z0-9çğıöşüÇĞİÖŞÜ._\\-]{3,20}" autocapitalize="off" spellcheck="false" placeholder="ör. yildiz42" title="3-20 karakter, boşluksuz; harf, rakam, nokta, alt çizgi ya da tire"><small style="display:block;font-size:11px;color:#64748b;margin-top:3px">Liglerde herkes bunu görür. Gerçek adını yazma.</small></div><div class="form-group"><label for="googleYeniAd">Öğrencinin adı soyadı</label><input id="googleYeniAd" required minlength="3" maxlength="60" autocomplete="name" placeholder="Ad ve soyad"><small style="display:block;font-size:11px;color:#64748b;margin-top:3px">Sadece öğretmen görür.</small></div>
    <div class="dm-field-row">
      <div class="form-group"><label for="googleYeniSinif">Sınıf</label><select id="googleYeniSinif" required><option value="">Seçin</option>${Array.from({length:8}, (_, i) => `<option value="${i+1}">${i+1}. sınıf</option>`).join('')}</select></div>
      <div class="form-group"><label for="googleYeniSube">Şube</label><input id="googleYeniSube" required maxlength="10" placeholder="Örn: A"></div>
    </div>
    <h3 class="dm-section">VELİ BİLGİLERİ</h3>
    <div class="form-group"><label for="googleYeniTelefon">Veli cep telefonu</label><input id="googleYeniTelefon" type="tel" required placeholder="05XX XXX XX XX" autocomplete="tel"></div>
    <div class="form-group"><label for="googleYeniEmail">Veli e-posta adresi</label><input id="googleYeniEmail" type="email" required maxlength="120" autocomplete="email" placeholder="ornek@email.com"></div>
    <div class="form-group"><label for="googleYeniKod">Öğretmen kodu <span class="dm-optional">İsteğe bağlı</span></label><input id="googleYeniKod" maxlength="10" placeholder="Varsa öğretmeninin kodu"></div>
    <label class="dm-consent"><input id="googleYeniOnay" type="checkbox" required><span><a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası ve KVKK Aydınlatma Metni’ni</a> okudum ve bilgi edindim. <a href="kullanim-kosullari.html" target="_blank" rel="noopener">Kullanım koşullarını</a> kabul ediyorum. Çocuğun yasal temsilcisi olarak bu kayıt talebini iletiyorum.<small>Bu beyan genel açık rıza veya yurt dışı aktarım izni değildir.</small></span></label>
    <label class="dm-consent"><input id="googleYeniPapiMail" type="checkbox"><span>🦜 Papi'den İngilizce ilerleme özetleri, haftalık lig haberleri ve öğrenme hatırlatmaları almak istiyorum.<small>İsteğe bağlıdır. Öğrenci ve veli e-posta adresleri ayrıca doğrulanır; istediğimiz zaman abonelikten çıkabiliriz.</small></span></label>
    <button id="googleYeniGonder" type="submit" class="btn-giris">Kaydı tamamla ve giriş yap</button>
    <p id="googleYeniMesaj" role="status" style="font-size:12px"></p>
    <button id="googleMevcutHesap" type="button" class="dm-link-button dm-existing-account">Zaten hesabım var, Google ile bağla</button>`;
  // The new-account helper stays detached; Google return opens the form directly.
  area.append(button, registration, cancel);

  $('loginForm').after(area);
  // Keep existing registration/password handlers and place their controls directly after Google.
  const loginCard = $('login-container');
  const heading = loginCard.querySelector('h2');
  heading.textContent = 'Hoş geldin';
  subtitle.textContent = 'Öğrenmeye kaldığın yerden devam et.';
  const loginSubtitle = subtitle.textContent;
  for (const [id, text] of [['ogrenci', 'Kullanıcı adı'], ['sifre', 'Şifre']]) {
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    $(id).before(label);
  }
  const divider = document.createElement('div');
  divider.className = 'dm-divider';
  divider.textContent = 'veya';
  area.prepend(divider);
  const actions = document.createElement('div');
  actions.className = 'dm-login-actions';
  const registerLink = loginCard.querySelector('[onclick="kayitOlAc()"]');
  const forgotLink = loginCard.querySelector('[onclick="sifremiUnuttumAc()"]');
  if (registerLink && forgotLink) {
    const oldActions = registerLink.parentElement;

    for (const [link, className] of [[registerLink, 'dm-register-action'], [forgotLink, 'dm-forgot-action']]) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = className;
      action.textContent = link.textContent;
      action.onclick = () => link.click();
      actions.append(action);
    }
    area.after(actions);
    oldActions.hidden = true;
    oldActions.style.display = 'none';
  }
  loginCard.querySelectorAll('a[href="hesap-sil.html"]').forEach(link => link.remove());


  function message(text) {
    $('mesaj').className = 'error';
    $('mesaj').textContent = text;
  }
  function reset() {
    linking = false;
    subtitle.textContent = loginSubtitle;
    heading.textContent = 'Hoş geldin';
    actions.hidden = false;
    divider.hidden = false;
    $('girisBtn').textContent = 'Giriş Yap';
    cancel.hidden = true;
    button.hidden = false;
    create.hidden = true;
    registration.hidden = true;
    $('loginForm').hidden = false;
    sessionStorage.removeItem('diji_google_pending');
  }
  async function googleRequest(operation, credentials) {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) throw new Error('Google oturumu alınamadı. Tekrar dene.');
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + data.session.access_token },
      body: JSON.stringify(Object.assign({ islem: operation }, credentials || {}))
    });
    return response.json();
  }
  function enter(result) {
    if (!result.ok || !result.token || result.rol !== 'ogrenci') throw new Error('Öğrenci oturumu oluşturulamadı.');
    // Use the exact existing portal session path; learning data stays on the server.
    localStorage.setItem('ing_token', result.token);
    localStorage.setItem('ing_oturumAcik', 'true');
    localStorage.setItem('ing_aktifOgrenci', result.ogrenci);
    localStorage.setItem('ing_google_auth', 'true');
    localStorage.setItem('ing_toplamSaniye', '0');
    sessionStorage.removeItem('ing_oturum_bitti');
    sessionStorage.removeItem('ing_ogr_token');
    sessionStorage.removeItem('diji_google_pending');
    location.replace(location.pathname);
  }
  async function receive() {
    try {
      const result = await googleRequest('googleGiris');
      if (result.ok) return enter(result);
      if (!result.baglantiGerekli) throw new Error(result.mesaj || 'Google ile giriş yapılamadı.');
      linking = true;
      area.hidden = false;
      button.hidden = true;
      cancel.hidden = false;
      create.hidden = false;
      subtitle.textContent = 'Google hesabını bağlamak için mevcut öğrenci kullanıcı adını ve şifreni bir kez yaz.';
      $('girisBtn').disabled = false;
      $('girisBtn').textContent = 'Hesabımı bağla ve giriş yap';
      message(result.mesaj);
      await create.onclick();
    } catch (error) {
      reset();
      message(error.message || 'Google ile giriş yapılamadı. Mevcut girişini kullanabilirsin.');
    }
  }
  button.onclick = async function () {
    if (busy) return;
    button.disabled = true;
    try {
      sessionStorage.setItem('diji_google_pending', '1');
      const callback = new URL(location.pathname, location.origin);
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: callback.href, queryParams: { prompt: 'select_account' } }
      });
      if (error) throw error;
    } catch (error) {
      reset();
      message('Google ile giriş başlatılamadı. Mevcut kullanıcı adı ve şifrenle giriş yapabilirsin.');
      button.disabled = false;
    }
  };
  create.onclick = async function () {
    if (busy) return;
    linking = false;
    $('loginForm').hidden = true;
    create.hidden = true;
    registration.hidden = false;
    button.hidden = true;
    divider.hidden = true;
    actions.hidden = true;
    heading.textContent = 'Kaydını tamamla';
    registration.reset();
    subtitle.textContent = 'Google ile yeni öğrenci kaydı';
    $('mesaj').textContent = '';
    const { data } = await supabaseClient.auth.getSession();
    const name = data?.session?.user?.user_metadata?.full_name || '';
    // Display-only suggestion; identity and account ownership are verified by the server.
    $('googleYeniAd').value = String(name).slice(0,60);
    $('googleYeniKod').value = new URLSearchParams(location.search).get('kod') || '';
    $('googleYeniKullanici').focus();
  };
  $('googleMevcutHesap').onclick = function () {
    linking = true;
    registration.hidden = true;
    $('loginForm').hidden = false;
    heading.textContent = 'Hesabını bağla';
    subtitle.textContent = 'Mevcut öğrenci kullanıcı adını ve şifreni bir kez yaz.';
    $('girisBtn').textContent = 'Hesabımı bağla ve giriş yap';
    $('mesaj').textContent = '';
    $('ogrenci').focus();
  };
  registration.onsubmit = async function (event) {
    event.preventDefault();
    if (busy || !registration.reportValidity()) return;
    busy = true;
    const submit = $('googleYeniGonder'), resultText = $('googleYeniMesaj');
    submit.disabled = true;
    cancel.disabled = true;
    resultText.textContent = 'Kaydın oluşturuluyor…';
    try {
      const result = await googleRequest('googleKayit', {
        ogrenciAdi: $('googleYeniKullanici').value.trim(), adSoyad: $('googleYeniAd').value.trim(), sinif: $('googleYeniSinif').value,
        sube: $('googleYeniSube').value.trim(), telefon: $('googleYeniTelefon').value.trim(),
        email: $('googleYeniEmail').value.trim(), ogretmenKodu: $('googleYeniKod').value.trim(),
        kvkkOnay: $('googleYeniOnay').checked
      });
      if (!result.ok || !result.kayitOlustu) throw new Error(result.mesaj || 'Kayıt tamamlanamadı.');
      if ($('googleYeniPapiMail')?.checked) {
        try {
          const auth = await supabaseClient.auth.getSession();
          const token = auth.data?.session?.access_token;
          if (token) {
            await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/papi-progress-optin', {
              method:'POST',
              headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
              body:JSON.stringify({subscribe:true})
            });
          }
        } catch (err) { console.warn('Papi abonelik isteği sonraki girişte yeniden denenebilir.',err); }
      }
      enter(result);
    } catch (error) { resultText.textContent = error.message || 'Bağlantı hatası. Tekrar dene.'; }
    finally { busy = false; submit.disabled = false; cancel.disabled = false; }
  };
  cancel.onclick = async function () {
    if (busy) return;
    reset();
    $('sifre').value = '';
    registration.reset();
    $('mesaj').textContent = '';
    await supabaseClient.auth.signOut({ scope: 'local' });
  };
  window.girisYap = async function (event) {
    if (!linking) return legacyLogin.apply(this, arguments);
    if (event) event.preventDefault();
    if (busy) return;
    const username = $('ogrenci').value.trim();
    const password = $('sifre').value.trim();
    if (!username || !password) return message('Kullanıcı adı ve şifreni yaz.');
    busy = true;
    $('girisBtn').disabled = true;
    cancel.disabled = true;
    try {
      const result = await googleRequest('googleBagla', { ogrenci: username, sifre: password });
      if (!result.ok) throw new Error(result.mesaj || 'Hesap bağlanamadı.');
      enter(result);
    } catch (error) { message(error.message || 'Bağlantı hatası. Tekrar dene.'); }
    finally { busy = false; $('sifre').value = ''; $('girisBtn').disabled = false; cancel.disabled = false; }
  };
  window.cikisYap = async function () {
    if (localStorage.getItem('ing_google_auth') === 'true') {
      // Clear only this app's Google Auth storage, including when offline.
      try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch (_) {}
      localStorage.removeItem('ing_google_auth');
    }
    return legacyLogout.apply(this, arguments);
  };
  (async function initialize() {
    const parameters = new URLSearchParams(location.search);
    if (parameters.get('google_return') === '1' || sessionStorage.getItem('diji_google_pending') === '1') {
      // Let supabase-js parse the OAuth callback before removing URL parameters.
      await supabaseClient.auth.getSession();
      history.replaceState(null, '', location.pathname);
      if (sessionStorage.getItem('diji_google_pending') === '1') return receive();
    }
    if (androidUygulama) { area.hidden = true; return; }
    try {
      const [settings, readiness] = await Promise.all([
        fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_ANON_KEY } }).then(r => r.json()),
        fetch(apiURL + '?islem=googleDurum').then(r => r.json())
      ]);
      area.hidden = !(settings.external && settings.external.google && readiness.hazir);
    } catch (_) { area.hidden = true; }
  })().catch(() => { reset(); message('Google ile giriş tamamlanamadı. Mevcut girişini kullanabilirsin.'); });
})();
