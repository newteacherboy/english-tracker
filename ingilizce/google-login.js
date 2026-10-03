/* Optional Google student login. Legacy login remains the default and fallback. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let linking = false;
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
  button.textContent = 'Google ile giriş / kayıt';
  button.style.cssText = 'width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#1f2937;font:700 14px inherit;cursor:pointer';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Vazgeç, mevcut girişe dön';
  cancel.hidden = true;
  cancel.style.cssText = 'margin-top:10px;background:transparent;border:0;color:inherit;cursor:pointer';
  const create = document.createElement('button');
  create.type = 'button';
  create.textContent = 'Hesabım yok, yeni öğrenci kaydı oluştur';
  create.hidden = true;
  create.style.cssText = button.style.cssText + ';margin-top:12px;background:#eef6ff';
  const registration = document.createElement('form');
  registration.hidden = true;
  registration.style.cssText = 'margin-top:14px;text-align:left';
  registration.innerHTML = `
    <p style="font-size:13px">Google hesabın doğrulandı. Öğrenci ve veli bilgilerini tamamla; hemen giriş yapabilirsin.</p>
    <div class="form-group"><label for="googleYeniAd">Öğrenci ad soyadı</label><input id="googleYeniAd" required minlength="3" maxlength="50" autocomplete="name"></div>
    <div class="form-group"><label for="googleYeniSinif">Sınıf</label><select id="googleYeniSinif" required style="width:100%;padding:10px;border-radius:10px"><option value="">Seçin</option>${Array.from({length:8}, (_, i) => `<option value="${i+1}">${i+1}. sınıf</option>`).join('')}</select></div>
    <div class="form-group"><label for="googleYeniSube">Şube</label><input id="googleYeniSube" required maxlength="10" placeholder="Örn: A"></div>
    <div class="form-group"><label for="googleYeniTelefon">Veli cep telefonu</label><input id="googleYeniTelefon" type="tel" required placeholder="05XX XXX XX XX" autocomplete="tel"></div>
    <div class="form-group"><label for="googleYeniEmail">Veli e-posta adresi</label><input id="googleYeniEmail" type="email" required maxlength="120" autocomplete="email"></div>
    <div class="form-group"><label for="googleYeniKod">Öğretmen kodu (isteğe bağlı)</label><input id="googleYeniKod" maxlength="10" placeholder="Varsa öğretmeninin kodu"></div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;margin:12px 0"><input id="googleYeniOnay" type="checkbox" required style="width:auto;flex-shrink:0"><span><a href="gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası ve KVKK Aydınlatma Metni'ni</a> okudum ve bilgi edindim. Çocuğun yasal temsilcisi olarak bu kayıt talebini iletiyorum. Bu beyan genel açık rıza veya yurt dışı aktarım izni değildir.</span></label>
    <button id="googleYeniGonder" type="submit" class="btn-giris">Google ile kaydol ve giriş yap</button>
    <p id="googleYeniMesaj" role="status" style="font-size:12px"></p>`;
  area.append(button, create, registration, cancel);
  $('loginForm').after(area);

  function message(text) {
    $('mesaj').className = 'error';
    $('mesaj').textContent = text;
  }
  function reset() {
    linking = false;
    subtitle.textContent = originalSubtitle;
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
      $('ogrenci').focus();
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
    registration.reset();
    subtitle.textContent = 'Google ile yeni öğrenci kaydı';
    $('mesaj').textContent = '';
    const { data } = await supabaseClient.auth.getSession();
    const name = data?.session?.user?.user_metadata?.full_name || '';
    // Display-only suggestion; identity and account ownership are verified by the server.
    $('googleYeniAd').value = String(name).slice(0,50);
    $('googleYeniKod').value = new URLSearchParams(location.search).get('kod') || '';
    $('googleYeniAd').focus();
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
        ogrenciAdi: $('googleYeniAd').value.trim(), sinif: $('googleYeniSinif').value,
        sube: $('googleYeniSube').value.trim(), telefon: $('googleYeniTelefon').value.trim(),
        email: $('googleYeniEmail').value.trim(), ogretmenKodu: $('googleYeniKod').value.trim(),
        kvkkOnay: $('googleYeniOnay').checked
      });
      if (!result.ok || !result.kayitOlustu) throw new Error(result.mesaj || 'Kayıt tamamlanamadı.');
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
    try {
      const [settings, readiness] = await Promise.all([
        fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_ANON_KEY } }).then(r => r.json()),
        fetch(apiURL + '?islem=googleDurum').then(r => r.json())
      ]);
      area.hidden = !(settings.external && settings.external.google && readiness.hazir);
    } catch (_) { area.hidden = true; }
  })().catch(() => { reset(); message('Google ile giriş tamamlanamadı. Mevcut girişini kullanabilirsin.'); });
})();
