/* Isolate classroom storage in this tab; personal learner storage is never overwritten. */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);if(params.get('ogretmen')!=='1')return;
 let state;try{state=JSON.parse(sessionStorage.getItem('dm_tp_session')||'null');}catch{}
 if(!state?.teacherToken||!state?.participant?.token){location.replace('./?ogretmenGiris=1');return;}
 // Classroom game checks use a virtual allowance; the real wallet is never changed.
 Object.defineProperty(window,'genelEnerjiKalan',{configurable:true,get:()=>30,set:()=>{}});
 window.dmTeacherPortalMode=true;window.dmTeacherPortalSession=state;
 document.documentElement.classList.add('dm-teacher-portal');
 const ss=window.sessionStorage;const prefix=()=>{try{return 'dm_tp_data:'+JSON.parse(ss.getItem('dm_tp_session')||'{}').participant.name+':';}catch{return 'dm_tp_data:preview:';}};
 const isolated={getItem:k=>ss.getItem(prefix()+k),setItem:(k,v)=>ss.setItem(prefix()+k,String(v)),removeItem:k=>ss.removeItem(prefix()+k),clear(){for(const k of Object.keys(ss))if(k.startsWith(prefix()))ss.removeItem(k);},key:i=>Object.keys(ss).filter(k=>k.startsWith(prefix()))[i]?.slice(prefix().length)||null,get length(){return Object.keys(ss).filter(k=>k.startsWith(prefix())).length;}};
 Object.defineProperty(window,'localStorage',{value:isolated,configurable:true});
 isolated.setItem('ing_token',state.participant.token);isolated.setItem('ing_oturumAcik','true');isolated.setItem('ing_aktifOgrenci',state.participant.name);isolated.setItem('ing_toplamSaniye','0');
 if(!ss.getItem('dm_tp_previous_teacher_saved')){ss.setItem('dm_tp_previous_teacher',ss.getItem('ing_ogr_token')||'');ss.setItem('dm_tp_previous_teacher_saved','1');}
 ss.setItem('ing_ogr_token',state.teacherToken);
 window.dmTeacherPortalExit=()=>{
  for(const k of Object.keys(ss))if(k.startsWith('dm_tp_data:'))ss.removeItem(k);
  const old=ss.getItem('dm_tp_previous_teacher');if(old)ss.setItem('ing_ogr_token',old);else ss.removeItem('ing_ogr_token');
  for(const k of ['dm_tp_previous_teacher_saved','dm_tp_previous_teacher','dm_tp_session','dm_tp_pending'])ss.removeItem(k);
  location.assign('./');
 };
 window.dmTeacherRequestToken=(url,opt)=>{
  let op='';try{op=opt?.body?JSON.parse(opt.body).islem||'':new URL(url,location.href).searchParams.get('islem')||'';}catch{}
  const teacher=/^(teacherPortal|teacherNotification|teacherLearning|teacherPlacement|ogretmen|ogrenciSifre|bekleyenKayit|kayitOnayla|kayitReddet|rubrik|rapor|odevVer|odevSil|odevListesiOgretmen|duyuruEkle|duyuruSil|duyuruAktif|sinifIci|ozellikIzni|communication|adminStudent)/.test(op)||!op&&document.getElementById('ogretmenMenuModal')?.style.display==='flex';
  const current=JSON.parse(ss.getItem('dm_tp_session')||'null')||state;return teacher?current.teacherToken:current.participant.token;
 };
})();
