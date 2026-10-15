/* Loaded before the guest sandbox. Existing member sessions always take priority. */
(()=>{'use strict';
 const raw=window.localStorage,session=window.sessionStorage,params=new URLSearchParams(location.search);
 const member=raw.getItem('ing_oturumAcik')==='true'&&!!raw.getItem('ing_token')&&!!raw.getItem('ing_aktifOgrenci');
 const oauth=params.get('kesifKayit')==='google';
 const guest=false;
 if(params.has('misafir')||params.has('kesif')){params.delete('misafir');params.delete('kesif');history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);}
 const welcome=!member&&!guest&&!oauth&&params.get('giris')!=='1'&&params.get('kayit')!=='1'&&!params.has('google_return')&&!session.getItem('diji_google_pending')&&!location.hash.includes('access_token');
 const nativeFetch=window.fetch.bind(window),api='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 const allowed=new Set(['kayitOl','ogretmenKayitOl','googleGiris','googleKayit','googleDurum','emailDogrulamaTekrar','memberStatus','memberEmailResend','ekVeriGetir','ekVeriKaydet']);
 window.dmDiscoveryContext={raw,session,member,guest,oauth,welcome,
  async googleAvailable(key){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{const r=await nativeFetch('https://nxfqlutulxqzqgwewssd.supabase.co/auth/v1/settings',{headers:{apikey:key},signal:controller.signal});const settings=await r.json();return !!settings.external?.google;}finally{clearTimeout(timeout);}},
  async request(body,accessToken){
   if(!allowed.has(body.islem))throw Error('Bu işlem kayıt akışında kullanılamaz.');
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
   try{const response=await nativeFetch(api,{method:'POST',headers:{'Content-Type':'application/json',...(accessToken?{Authorization:'Bearer '+accessToken}:{})},body:JSON.stringify(body),signal:controller.signal});
    const result=await response.json();if(result===null&&body.islem==='ekVeriGetir')return null;
    if(body.islem==='googleGiris'&&result.baglantiGerekli)return result;
    if(!response.ok||result.ok===false||result.status==='error')throw Error(result.message||result.mesaj||'İşlem tamamlanamadı. Tekrar dene.');return result;
   }finally{clearTimeout(timeout);}
  }
 };
 document.addEventListener?.('keydown',e=>{if(e.key==='Tab')document.documentElement.classList.add('dm-keyboard-input');});
 document.addEventListener?.('pointerdown',()=>document.documentElement.classList.remove('dm-keyboard-input'));
 if(welcome)document.documentElement.classList.add('dm-first-entry');
 if(guest)document.documentElement.classList.add('dm-discovery-guest');
})();
