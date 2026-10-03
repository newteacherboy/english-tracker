import { FEATURES } from './feature-catalog.ts';
export function releaseAPI(db:any,json:any){
 let flags:any=null,at=0;
 async function state(force=false){
  if(!force&&flags&&Date.now()-at<5000)return flags;
  const {data,error}=await db.from('dm_release_flags').select('code,enabled,updated_at');if(error)throw error;
  flags=Object.fromEntries(FEATURES.map(f=>[f.code,true]));for(const f of data||[])flags[f.code]=f.enabled;at=Date.now();return flags;
 }
 async function on(code:string,depth=0):Promise<boolean>{const s=await state();if(s[code]===false)return false;const f=FEATURES.find(f=>f.code===code);return f?.parent&&depth<5?on(f.parent,depth+1):true;}
 async function handle(op:string,body:any,q:URLSearchParams,a:any){
  if(op==='yayinOzellikleri')return json({ok:true,flags:await state(true),admin:!!a?.yonetici});
  if(op==='yayinOzellikKaydet'){
   if(a?.role!=='teacher'||!a.yonetici)return json({ok:false,mesaj:'Bu bölüm yalnızca yöneticiye ait.'},403);
   const list=body.degisiklikler;
   if(!Array.isArray(list)||!list.length||list.length>FEATURES.length||list.some(x=>!FEATURES.some(f=>f.code===x.code)||typeof x.enabled!=='boolean'))return json({ok:false,mesaj:'Geçersiz özellik seçimi.'},400);
   const {error}=await db.from('dm_release_flags').upsert([...new Map(list.map(x=>[x.code,{code:x.code,enabled:x.enabled,updated_at:new Date().toISOString(),updated_by:a.teacher_id}])).values()],{onConflict:'code'});if(error)throw error;
   at=0;await db.from('audit_logs').insert({actor_role:'teacher',actor_id:a.teacher_id,operation:'yayinOzellikKaydet',payload:{degisiklikler:list}});
   return json({ok:true,flags:await state(true),admin:true});
  }
  if(op==='haftalikVeliRaporu'){
   if(a?.role!=='teacher'||!a.teacher_id)return json({ok:false,mesaj:'Öğretmen oturumu gerekli.'},401);
   if(!a.yonetici&&!await on('veli_ozet'))return json({ok:false,mesaj:'Bu özellik henüz yayında değil.'},403);
   const cl=Number(body.sinif||q.get('sinif'));if(!Number.isInteger(cl)||cl<1||cl>12)return json({ok:false,mesaj:'Sınıf seç.'},400);
   const {data,error}=await db.rpc('dm_parent_report',{actor:a.teacher_id,class_filter:cl});if(error)throw error;return json({ok:true,liste:data||[]});
  }
  if(op==='haftalikPerformans'||op==='haftalikPerformansGoruldu'){
   if(a?.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
   if(op==='haftalikPerformansGoruldu'){
    const w=String(body.hafta||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(w))return json({ok:false},400);
    const {error}=await db.rpc('dm_weekly_ack',{actor:a.student_id,week:w});if(error)throw error;return json({ok:true});
   }
   const settled=await db.rpc('dm_settle_weeks');if(settled.error)throw settled.error;
   const {data,error}=await db.rpc('dm_weekly_claim',{actor:a.student_id});if(error)throw error;return json({ok:true,rapor:data});
  }
  return null;
 }
 async function guard(op:string,body:any,q:URLSearchParams,a:any){
  if(a?.yonetici)return null;
  let f=FEATURES.find(f=>f.ops.includes(op));
  if(['akisOlayToggle','bildirimGonder'].includes(op)){
   const t=String(body.tur||q.get('tur')||'');f=FEATURES.find(f=>f.code===(t==='takip'?'takip':t==='begeni'||t==='tebrik'?'tebrik':''));
  }
  if(op==='oyunEslesmeOlustur'){const g=String(body.oyun||q.get('oyun'));f=FEATURES.find(f=>f.code==='oyun_'+g);}
  if(['duelloGonder','duelloSonucKaydet'].includes(op)){
   if(!await on('duello'))return json({ok:false,mesaj:'Düello özelliği henüz yayında değil.'},403);
   const keys:any={Kelime_Liderlik:'kelime',Jeopardy_Liderlik:'jeopardy',Bosluk_Tablosu:'bosluk',Hafiza_Liderlik:'hafiza',Yagmur_Liderlik:'yagmur',Asmaca_Liderlik:'asmaca',KelimeBul_Liderlik:'kelimebul',Eslesme_Liderlik:'eslestirme',Tren_Liderlik:'tren',Dikte_Liderlik:'dikte',Cumle_Liderlik:'cumle'};
   const g=keys[String(body.oyun||q.get('oyun'))];if(g&&!await on('oyun_'+g))return json({ok:false,mesaj:'Bu oyun henüz yayında değil.'},403);
  }
  if(f&&!await on(f.code))return json({ok:false,status:'kapali',mesaj:'Bu özellik henüz yayında değil. Yakında görüşürüz! 🦜'},403);
  return null;
 }
 return {handle,guard,on};
}
