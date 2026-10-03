(function () {
  'use strict';
  const endpoint = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/account-delete';
  const $ = id => document.getElementById(id);
  let ticket = '', account = null, busy = false;
  const parameters = new URLSearchParams(location.search);
  $('role').value = parameters.get('role') === 'teacher' ? 'teacher' : 'student';
  try { $('username').value = localStorage.getItem('ing_aktifOgrenci') || ''; } catch (_) {}
  const result = (text, success = false) => { $('result').className = success ? 'success' : 'error'; $('result').textContent = text; };
  async function request(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal, cache: 'no-store' });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'İşlem tamamlanamadı. Tekrar dene.');
      return data;
    } finally { clearTimeout(timeout); }
  }
  function reset() {
    ticket = ''; account = null;
    $('verifyForm').hidden = false; $('confirmForm').hidden = true;
    $('password').value = ''; $('consent').checked = false; $('confirmation').value = '';
    $('result').textContent = ''; $('result').className = '';
  }
  function setBusy(value) {
    busy = value;
    ['verifyButton','deleteButton','cancelButton'].forEach(id => { $(id).disabled = value; });
  }
  $('verifyForm').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const data = await request({ operation: 'prepare', role: $('role').value, username: $('username').value.trim(), password: $('password').value });
      ticket = data.ticket; account = data;
      $('accountLabel').textContent = data.username + ' · ' + (data.role === 'teacher' ? 'Öğretmen hesabı' : 'Öğrenci hesabı');
      $('deleteDetails').textContent = data.role === 'teacher'
        ? 'Öğretmen girişin, kişisel profilin, oyun verilerin ve oturumların silinecek. Öğrencilerinin hesapları, ilerlemeleri ve ortak ders içerikleri korunacak. Son aktif yönetici hesabı silinemez.'
        : 'Öğrenci hesabın, şifren, iletişim bilgilerin, ilerlemen, puanların, oyun sonuçların, hediyelerin, düelloların, mesajların ve oturumların silinecek.';
      $('verifyForm').hidden = true; $('confirmForm').hidden = false;
      $('result').textContent = ''; $('result').className = '';
      $('consent').focus();
    } catch (error) { result(error.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı. Tekrar dene.' : error.message); }
    finally { $('password').value = ''; setBusy(false); }
  };
  $('cancelButton').onclick = () => { if (!busy) reset(); };
  function clearEnglishStorage(username, role) {
    // Preserve the independent Coaching app's keys and other users' cached profiles.
    const names = [username,username.toLowerCase(),username.toLocaleLowerCase('tr')];
    const current = localStorage.getItem('ing_aktifOgrenci') || '';
    const currentDeleted = names.includes(current) || current.toLocaleLowerCase('tr') === username.toLocaleLowerCase('tr');
    const prefixes = ['ing_yo_', 'ing_kelime_gecmis_', 'oc_gk_', 'bz_bekleyen_', 'diji_krk_toplu_', 'diji_duello_gosterilen_', 'diji_ders_konulari_v1_'];
    for (const key of Object.keys(localStorage)) {
      const own = names.some(name => prefixes.some(prefix => key === prefix+name) || key.startsWith('diji_yanit_v1_'+name+'_') || key === 'diji_kuyruk_v1_'+name);
      const currentCache = (currentDeleted || role === 'teacher') && (key.startsWith('diji_global_cache_') || key.startsWith('diji_cache_') || key === 'diji_ma_akis_v1');
      if (own || currentCache) localStorage.removeItem(key);
    }
    if (currentDeleted) {
      ['ing_token','ing_oturumAcik','ing_aktifOgrenci','ing_toplamSaniye','ing_google_auth','ing_girisSerisiSayisi','ing_girisSerisiSonTarih'].forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('sb-nxfqlutulxqzqgwewssd-auth-token');
    }
    if (role === 'teacher') sessionStorage.removeItem('ing_ogr_token');
    sessionStorage.removeItem('diji_google_pending');
  }
  $('confirmForm').onsubmit = async event => {
    event.preventDefault();
    if (busy || !ticket || !account) return;
    if (!$('consent').checked || $('confirmation').value.trim() !== 'HESABIMI SİL') return result('Onay kutusunu işaretle ve HESABIMI SİL yaz.');
    setBusy(true);
    try {
      const data = await request({ operation: 'confirm', ticket, confirmation: 'HESABIMI SİL' });
      try { clearEnglishStorage(account.username, account.role); } catch (_) {}
      ticket = ''; account = null;
      $('verifyForm').hidden = true; $('confirmForm').hidden = true;
      result(data.message, true);
      $('backLink').textContent = 'İngilizce girişine dön';
    } catch (error) { result(error.name === 'AbortError' ? 'Yanıt alınamadı. Aynı onayı tekrar gönderebilirsin; silme işlemi tekrarlanmaz.' : error.message); }
    finally { setBusy(false); }
  };
  window.addEventListener('pagehide', () => { ticket = ''; account = null; $('password').value = ''; });
})();
