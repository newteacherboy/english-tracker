/* Same API roles as password login; server still enforces teacher/student scope. */
(function(g){
 const teacherPrefix=/^(teacherPortal|teacherNotification|teacherLearning|teacherPlacement|ogretmen|ogrenciSifre|bekleyenKayit|kayitOnayla|kayitReddet|rubrik|rapor|odevVer|odevSil|odevListesiOgretmen|duyuruEkle|duyuruSil|duyuruAktif|duyuruListesiGetir|sinifIci|ozellikIzni|communication|adminStudent)/;
 g.DMTeacherRequestPolicy={isTeacher(op,args={},context={}){return teacherPrefix.test(op)||['ekVeriTumu','ekVeriOzet','haftalikVeliRaporu','etkinlikTanimlariGetir','tumVideolariGetir','ozellikListesiGetir','etkinlikAta','disLinkEtkinlikAta','videoOgrenciEkle','planTikGuncelle'].includes(op)||!op&&!!context.tools||op==='ekVeriGetir'&&!!context.tools&&args.ogrenci&&args.ogrenci!==context.participant;}};
})(typeof window!=='undefined'?window:globalThis);
/* Device account registry uses the real storage before classroom isolation. No code is saved. */
(()=>{'use strict';
 if(typeof window==='undefined')return;
 const storage=window.localStorage,ss=window.sessionStorage,KEY='dm_teacher_sessions_v1',ACTIVE='dm_last_account_v1';
 const valid=s=>s&&typeof s.teacherToken==='string'&&s.teacherToken&&typeof s.name==='string'&&s.participant?.token&&s.participant?.name;
 const read=()=>{try{const a=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(valid):[];}catch{return [];}};
 const write=a=>storage.setItem(KEY,JSON.stringify(a));
 function remember(s,active=true){if(!valid(s))return;write([s,...read().filter(x=>x.teacherToken!==s.teacherToken&&x.name!==s.name)]);if(active)storage.setItem(ACTIVE,JSON.stringify({kind:'teacher',token:s.teacherToken}));}
 function forget(token){write(read().filter(x=>x.teacherToken!==token));try{const last=JSON.parse(storage.getItem(ACTIVE)||'null');if(last?.token===token)storage.removeItem(ACTIVE);}catch{}}
 function personal(){storage.setItem(ACTIVE,JSON.stringify({kind:'personal'}));}
 function leave(){
  personal();const old=ss.getItem('dm_tp_previous_teacher');if(old)ss.setItem('ing_ogr_token',old);else ss.removeItem('ing_ogr_token');
  for(const k of ['dm_tp_previous_teacher_saved','dm_tp_previous_teacher','dm_tp_session','dm_tp_pending'])ss.removeItem(k);
 }
 function activate(s){if(!valid(s))throw Error('Öğretmen oturumu bulunamadı. Kodunla tekrar giriş yap.');remember(s);ss.setItem('dm_tp_session',JSON.stringify(s));location.assign('./?ogretmen=1');}
 const params=new URLSearchParams(location.search);
 let last;try{last=JSON.parse(storage.getItem(ACTIVE)||'null');}catch{}
 if(params.get('ogretmen')!=='1'&&!params.has('ogretmenGiris')&&!params.has('baslangic')&&!params.has('hesap')&&!params.has('oauth')&&!params.has('code')&&!location.hash&&last?.kind==='teacher'){
  const saved=read().find(x=>x.teacherToken===last.token);if(saved){ss.setItem('dm_tp_session',JSON.stringify(saved));params.set('ogretmen','1');history.replaceState(null,'',location.pathname+'?'+params.toString());}
 }
 window.dmTeacherDevice={storage,list:read,remember,forget,personal,leave,activate};
})();
/* Isolate classroom storage in this tab; personal learner storage is never overwritten. */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);if(params.get('ogretmen')!=='1')return;
 let state;try{state=JSON.parse(sessionStorage.getItem('dm_tp_session')||'null');}catch{}
 if(!state?.teacherToken||!state?.participant?.token){window.dmTeacherDevice.personal();location.replace('./?ogretmenGiris=1');return;}
 window.dmTeacherDevice.remember(state);
 // Classroom game checks use a virtual allowance; the real wallet is never changed.
 Object.defineProperty(window,'genelEnerjiKalan',{configurable:true,get:()=>25,set:()=>{}});
 window.dmTeacherPortalMode=true;window.dmTeacherPortalSession=state;
 document.documentElement.classList.add('dm-teacher-portal');
 const ss=window.sessionStorage;const prefix=()=>{try{return 'dm_tp_data:'+JSON.parse(ss.getItem('dm_tp_session')||'{}').participant.name+':';}catch{return 'dm_tp_data:preview:';}};
 const isolated={getItem:k=>ss.getItem(prefix()+k),setItem:(k,v)=>ss.setItem(prefix()+k,String(v)),removeItem:k=>ss.removeItem(prefix()+k),clear(){for(const k of Object.keys(ss))if(k.startsWith(prefix()))ss.removeItem(k);},key:i=>Object.keys(ss).filter(k=>k.startsWith(prefix()))[i]?.slice(prefix().length)||null,get length(){return Object.keys(ss).filter(k=>k.startsWith(prefix())).length;}};
 Object.defineProperty(window,'localStorage',{value:isolated,configurable:true});
 isolated.setItem('ing_token',state.participant.token);isolated.setItem('ing_oturumAcik','true');isolated.setItem('ing_aktifOgrenci',state.participant.name);isolated.setItem('ing_toplamSaniye','0');
 if(!ss.getItem('dm_tp_previous_teacher_saved')){ss.setItem('dm_tp_previous_teacher',ss.getItem('ing_ogr_token')||'');ss.setItem('dm_tp_previous_teacher_saved','1');}
 ss.setItem('ing_ogr_token',state.teacherToken);
 window.dmTeacherPortalPersonal=()=>{window.dmTeacherDevice.leave();location.assign('./?hesap=1');};
 window.dmTeacherPortalExit=()=>{
  const current=JSON.parse(ss.getItem('dm_tp_session')||'null');if(current)window.dmTeacherDevice.forget(current.teacherToken);window.dmTeacherDevice.personal();
  for(const k of Object.keys(ss))if(k.startsWith('dm_tp_data:'))ss.removeItem(k);
  const old=ss.getItem('dm_tp_previous_teacher');if(old)ss.setItem('ing_ogr_token',old);else ss.removeItem('ing_ogr_token');
  for(const k of ['dm_tp_previous_teacher_saved','dm_tp_previous_teacher','dm_tp_session','dm_tp_pending'])ss.removeItem(k);
  // Return to the fresh welcome/sign-up entry, not the previous in-app screen.
  location.replace('./?baslangic=1');
 };
 window.addEventListener('pagehide',()=>{try{const current=JSON.parse(ss.getItem('dm_tp_session')||'null');if(current)window.dmTeacherDevice.remember(current,false);}catch{}});
 const verify=async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{
  const response=await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem:'oturumBilgisi',t:state.teacherToken})});
  if([401,403].includes(response.status)){window.dmTeacherDevice.forget(state.teacherToken);window.dmTeacherDevice.leave();location.replace('./?ogretmenGiris=1');}
 }catch{}finally{clearTimeout(timer);}};void verify();
 window.dmTeacherRequestRole=(url,opt)=>{
  let args={};try{args=Object.fromEntries(new URL(url,location.href).searchParams);if(typeof opt?.body==='string')args={...args,...JSON.parse(opt.body)};}catch{}
  const current=JSON.parse(ss.getItem('dm_tp_session')||'null')||state;
  return window.DMTeacherRequestPolicy.isTeacher(args.islem||'',args,{tools:window.dmTeacherToolsActive,participant:current.participant.name})?'teacher':'participant';
 };
 window.dmTeacherRequestToken=(url,opt)=>{const current=JSON.parse(ss.getItem('dm_tp_session')||'null')||state;return window.dmTeacherRequestRole(url,opt)==='teacher'?current.teacherToken:current.participant.token;};

 // If a deferred teacher script fails to load, leave usable recovery actions
 // instead of a permanently hidden learner shell and an empty screen.
 const showTeacherRecovery=()=>{
  if(window.tpHomeInitialized||document.querySelector('#tpTeacherHome.is-visible,#tpDashboard.is-visible,#tpTeacherEmergency'))return;
  const main=document.createElement('main');main.id='tpTeacherEmergency';
  main.setAttribute('role','alert');
  main.style.cssText='position:fixed;inset:0;z-index:2147483630;display:grid;place-items:center;padding:20px;box-sizing:border-box;background:#f1fcfc;font:16px/1.5 system-ui,sans-serif;color:#163e50;';
  main.innerHTML='<div style="width:min(460px,100%);padding:24px;border:2px solid #afdcd5;border-radius:22px;background:white;text-align:center"><h1 style="font-size:23px;margin:0 0 12px">Öğretmen ekranı açılamadı</h1><p style="margin:0 0 18px">Öğretmen hesabın korunuyor. Sayfayı yeniden açabilir veya giriş ekranına dönebilirsin.</p><button type="button" data-tp-retry style="padding:12px;margin:5px;border:0;border-radius:12px;background:#087c72;color:white;font-weight:800">Yeniden dene</button><button type="button" data-tp-exit style="padding:12px;margin:5px;border:1px solid #aac9c6;border-radius:12px;background:white;color:#164d55;font-weight:800">Öğretmen girişine dön</button></div>';
  document.body.append(main);
  main.querySelector('[data-tp-retry]').onclick=()=>location.reload();
  main.querySelector('[data-tp-exit]').onclick=()=>{if(typeof window.dmTeacherPortalExit==='function')window.dmTeacherPortalExit();else{window.dmTeacherDevice.leave();location.replace('./?ogretmenGiris=1');}};
 };
 document.addEventListener('DOMContentLoaded',()=>{setTimeout(showTeacherRecovery,4000);},{once:true});
})();
