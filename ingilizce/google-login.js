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
  button.textContent = 'Google ile devam et';
  button.style.cssText = 'width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#1f2937;font:700 14px inherit;cursor:pointer';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Vazgeç, mevcut girişe dön';
  cancel.hidden = true;
  cancel.style.cssText = 'margin-top:10px;background:transparent;border:0;color:inherit;cursor:pointer';
  area.append(button, cancel);
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
      callback.searchParams.set('google_return', '1');
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
  cancel.onclick = async function () {
    if (busy) return;
    reset();
    $('sifre').value = '';
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
    if (parameters.get('google_return') === '1') {
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
