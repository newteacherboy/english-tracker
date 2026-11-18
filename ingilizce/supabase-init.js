/* [18 Kas 2026] Supabase istemcisi (Google/Apple girişi, canlı düello kanalı).
   Kitaplık artık defer yükleniyor; istemci burada, aynı ayarlarla kurulur. google-login.js, apple-login.js,
   first-discovery.js ve live-duel.js bu dosyadan SONRA çalışan defer betiklerdir. */
(function(){
  'use strict';
  try{
    var client=window.supabase&&typeof window.supabase.createClient==='function'
      ? window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{storageKey:'diji-ingilizce-google-auth',storage:(window.dmDiscoveryContext&&window.dmDiscoveryContext.raw)||window.localStorage}})
      : null;
    supabaseClient=client;window.supabaseClient=client;
  }catch(e){try{console.warn('[DijiMedu] Supabase istemcisi kurulamadı',e);}catch(_){}}
})();
