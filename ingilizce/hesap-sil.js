(function () {
  'use strict';
  const endpoint = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/account-delete';
  const $ = id => document.getElementById(id);
  let ticket = '', account = null, busy = false;
  const action=location.pathname.endsWith('hesap-dondur.html')?'freeze':location.pathname.endsWith('hesap-ac.html')?'restore':'delete';
  const confirmationText=action==='freeze'?'HESABIMI DONDUR':action==='restore'?'HESABIMI AÇ':'HESABIMI SİL';
  const authClient=window.supabase?.createClient('https://nxfqlutulxqzqgwewssd.supabase.co','sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF',{auth:{storageKey:'diji-account-action-auth',persistSession:true}});
  function showConfirmation(data){
    ticket=data.ticket;account=data;
    $('accountLabel').textContent=data.username+' · '+(data.role==='teacher'?'Öğretmen hesabı':'Öğrenci hesabı');
    $('deleteDetails').textContent=action==='freeze'?'Hesabın geçici olarak kapanır, tüm cihazlardaki oturumların sona erer ve sosyal profilin gizlenir. İlerlemen ve satın alma hakların korunur. Aboneliğin varsa dondurma, mağazadaki aboneliği iptal etmez.':action==='restore'?'Hesabın yeniden kullanıma açılır. Önceki ilerlemen korunur. Öğretmen veya yönetici kısıtlamaları kaldırılmaz.':data.role==='teacher'?'Öğretmen hesabın ve kişisel kayıtların silinecek; öğrencilerinin hesapları ve ortak dersler korunacak. Son aktif yönetici silinemez.':'Hesabın, iletişim bilgilerin, ilerlemen, puanların, mesajların ve oturumların silinecek. Mağaza aboneliğin varsa ayrıca mağazadan iptal et.';
    $('verifyForm').hidden=true;$('oauthActions').hidden=true;$('confirmForm').hidden=false;
    $('result').textContent='';$('consent').focus();
  }
  async function oauth(provider){if(busy||!authClient)return;setBusy(true);try{
    sessionStorage.setItem('dm_account_action_pending',action);sessionStorage.setItem('dm_account_action_started',String(Date.now()));sessionStorage.setItem('dm_account_action_provider',provider);
    const callback=new URL('./',location.href); // Reuse the already configured portal OAuth return URL.
    const {error}=await authClient.auth.signInWithOAuth({provider,options:{redirectTo:callback.href,queryParams:provider==='google'?{prompt:'select_account',max_age:'0'}:{}}});if(error)throw error;
  }catch(e){sessionStorage.removeItem('dm_account_action_pending');result('Doğrulama başlatılamadı. '+e.message);setBusy(false);}}
  $('googleVerify').onclick=()=>oauth('google');$('appleVerify').onclick=()=>oauth('apple');
  (async()=>{
    try{const settings=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF'}}).then(r=>r.json());$('appleVerify').hidden=!settings.external?.apple;}catch{}
    if(!new URLSearchParams(location.search).has('oauth')||sessionStorage.getItem('dm_account_action_pending')!==action||!authClient)return;
    sessionStorage.removeItem('dm_account_action_pending');setBusy(true);
    try{const {data,error}=await authClient.auth.getSession();history.replaceState(null,'',location.pathname);if(error||!data.session)throw Error('Kimlik doğrulaması tamamlanamadı. Yeniden dene.');showConfirmation(await request({operation:'prepare_oauth',action,role:'student',username:''},data.session.access_token));}
    catch(e){result(e.message);}finally{await authClient.auth.signOut({scope:'local'}).catch(()=>{});setBusy(false);}
  })();
  const parameters = new URLSearchParams(location.search);
  $('role').value = parameters.get('role') === 'teacher' ? 'teacher' : 'student';
  try { $('username').value = localStorage.getItem('ing_aktifOgrenci') || ''; } catch (_) {}
  const result = (text, success = false) => { $('result').className = success ? 'success' : 'error'; $('result').textContent = text; };
  async function request(body,accessToken) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{}) }, body: JSON.stringify(body), signal: controller.signal, cache: 'no-store' });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'İşlem tamamlanamadı. Tekrar dene.');
      return data;
    } finally { clearTimeout(timeout); }
  }
  function reset() {
    ticket = ''; account = null;
    $('verifyForm').hidden = false; $('confirmForm').hidden = true;$('oauthActions').hidden=false;
    $('password').value = ''; $('consent').checked = false; $('confirmation').value = '';
    $('result').textContent = ''; $('result').className = '';
  }
  function setBusy(value) {
    busy = value;
    ['verifyButton','deleteButton','cancelButton','googleVerify','appleVerify'].forEach(id => { $(id).disabled = value; });
  }
  $('verifyForm').onsubmit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const data = await request({ operation: 'prepare', action, role: $('role').value, username: $('username').value.trim(), password: $('password').value });
      showConfirmation(data);
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
      localStorage.removeItem('diji-ingilizce-google-auth');
    }
    if (role === 'teacher') sessionStorage.removeItem('ing_ogr_token');
    sessionStorage.removeItem('diji_google_pending');
  }
  $('confirmForm').onsubmit = async event => {
    event.preventDefault();
    if (busy || !ticket || !account) return;
    if (!$('consent').checked || $('confirmation').value.trim() !== confirmationText) return result('Onay kutusunu işaretle ve '+confirmationText+' yaz.');
    setBusy(true);
    try {
      const data = await request({ operation: action==='delete'?'confirm':'confirm_action', action, ticket, confirmation: confirmationText });
      try { if(action!=='restore')clearEnglishStorage(account.username, account.role); } catch (_) {}
      ticket = ''; account = null;
      $('verifyForm').hidden = true; $('confirmForm').hidden = true;
      result(data.message, true);
      $('backLink').textContent = 'İngilizce girişine dön';
    } catch (error) { result(error.name === 'AbortError' ? 'Yanıt alınamadı. Aynı onayı tekrar gönderebilirsin; silme işlemi tekrarlanmaz.' : error.message); }
    finally { setBusy(false); }
  };
  window.addEventListener('pagehide', () => { ticket = ''; account = null; $('password').value = ''; });
})();
