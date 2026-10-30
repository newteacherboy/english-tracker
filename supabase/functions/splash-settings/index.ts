import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const ORIGIN='https://app.dijimedu.com';
const HEADERS={'Content-Type':'application/json','Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'content-type,authorization,apikey','Cache-Control':'no-store','Vary':'Origin'};
const holidays=['23-nisan','19-mayis','30-agustos','29-ekim','10-kasim','15-temmuz','ramazan-ayi','ramazan-bayrami','kurban-bayrami'];
const names={ '23-nisan':'23 Nisan', '19-mayis':'19 Mayıs', '30-agustos':'30 Ağustos', '29-ekim':'29 Ekim','10-kasim':'10 Kasım','15-temmuz':'15 Temmuz','ramazan-ayi':'Ramazan ayı','ramazan-bayrami':'Ramazan Bayramı','kurban-bayrami':'Kurban Bayramı'};
const variants={'23-nisan':['23-nisan-1.jpg','23-nisan-2.jpg'],'19-mayis':['19-mayis-1.jpg','19-mayis-2.jpg'],'30-agustos':['30-agustos-1.jpg','30-agustos-2.jpg'],'29-ekim':['29-ekim-1.jpg','29-ekim-2.jpg'],'10-kasim':['10-kasim-1.jpg','10-kasim-2.jpg'],'15-temmuz':['15-temmuz-1.jpg'],'ramazan-ayi':['ramazan-ayi-2.jpg'],'ramazan-bayrami':['ramazan-bayrami-1.jpg'],'kurban-bayrami':['kurban-bayrami-2.jpg']};
const defaults={mode:'auto',disabled:[],manual:null};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:HEADERS});
 if(req.method!=='GET'&&req.method!=='POST')return response({ok:false,message:'Method not allowed'},405);
 const origin=req.headers.get('Origin');if(origin&&origin!==ORIGIN)return response({ok:false,message:'Origin denied'},403);
 const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!secret)return response({ok:false,message:'Service unavailable'},503);
 const db=createClient(url,secret,{auth:{persistSession:false}});
 try{
  if(req.method==='GET'){
   const {data,error}=await db.from('dm_splash_preferences').select('config,updated_at').eq('id',1).single();
   if(error)throw error;
   return response({ok:true,config:data?.config||defaults,updatedAt:data?.updated_at,catalog:holidays.map(id=>({id,name:names[id],variants:variants[id]}))});
  }
  const body=await req.json().catch(()=>({}));
  const token=String(body.teacherToken||'');
  if(!token||token.length>4000)return response({ok:false,message:'Yönetici öğretmen oturumu gerekli.'},401);
  // Reuse existing, server-validated teacher owner gate. Never trust a claimed user ID.
  const allowed=await fetch(url+'/functions/v1/diji-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'teacherPortalList',t:token})});
  const verified=await allowed.json().catch(()=>({}));
  if(!allowed.ok||verified?.ok!==true||!Array.isArray(verified.items))return response({ok:false,message:'Yalnızca yönetici teacher hesabı değiştirebilir.'},403);
  const value=body.config;
  if(!value||!['auto','normal','manual'].includes(value.mode)||!Array.isArray(value.disabled)||value.disabled.length>9||value.disabled.some((x)=>!holidays.includes(x))||new Set(value.disabled).size!==value.disabled.length)return response({ok:false,message:'Geçersiz animasyon ayarları'},400);
  const manual=value.manual;
  if(value.mode==='manual'&&(!manual||!variants[manual.id]||!variants[manual.id].includes(manual.file)))return response({ok:false,message:'Geçerli özel gün ve görsel seç'},400);
  if(manual&&(!variants[manual.id]||!variants[manual.id].includes(manual.file)))return response({ok:false,message:'Geçersiz görsel'},400);
  const clean={mode:value.mode,disabled:value.disabled,manual:manual?{id:manual.id,file:manual.file}:null};
  const {error}=await db.from('dm_splash_preferences').update({config:clean,updated_at:new Date().toISOString()}).eq('id',1);
  if(error)throw error;
  return response({ok:true,config:clean});
 }catch(e){console.error('Splash settings error',e);return response({ok:false,message:'Ayarlar alınamadı veya kaydedilemedi.'},503);}
});