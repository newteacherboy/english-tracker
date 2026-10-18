import {socialSafetyAPI} from './social-safety.mjs';
import {readJsonBounded,authenticatedBudgets} from './security-guards.mjs';
import './score-rules.js';
import { progressionAPI } from './progression-api.ts';
import { releaseAPI } from './release-api.ts';
import { contactPolicyAPI } from "./contact-policy-api.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const supabase=createClient(Deno.env.get("SUPABASE_URL")!,keys.default);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-diji-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Max-Age":"86400"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"}});
const release=releaseAPI(supabase,json);
const progression=progressionAPI(supabase,json);
const contacts=contactPolicyAPI(supabase,json);
const socialSafety=socialSafetyAPI({db:supabase,json});
const DEMO_ID='dcde2026-1015-4000-8000-000000000001';
const publicParticipant=(s:any)=>![s?.id,s?.student_id,s?.player_a,s?.player_b,s?.winner].includes(DEMO_ID)&&![s?.username,s?.gonderen,s?.alici,s?.winner,s?.sender?.username,s?.a?.username,s?.b?.username].some(x=>String(x||'').trim().toLowerCase()==='dijimedu_demo');
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const val=(body:any,q:URLSearchParams,key:string)=>body[key]??q.get(key)??"";
async function studentByNameGenel(name:string){const n=String(name).trim().replace(/[\\%_]/g,m=>"\\"+m);const {data,error}=await supabase.from("students").select("id,username,teacher_id,class_no").eq("status","approved").ilike("username",n).limit(2);if(error)throw error;return data?.length===1&&publicParticipant(data[0])?data[0]:null;}
async function session(req:Request,body:any,q:URLSearchParams){
 const token=String(body.t||q.get("t")||req.headers.get("x-diji-token")||"");if(!token)return null;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
 const {data,error}=await supabase.from("portal_sessions").select("id,role,student_id,teacher_id,expires_at,last_seen_at").eq("token_hash",hash).maybeSingle();if(error)throw error;
 if(!data||Date.parse(data.expires_at)<=Date.now())return null;
 if(data.role==='teacher'){
  const allowed=new Set(['takipDavetListesi','oyunEslesmeOlustur','oyunEslesmeDurum','oyunEslesmeHazir','oyunEslesmeCevap','oyunEslesmelerim']);
  if(!allowed.has(String(val(body,q,'islem')))||!data.teacher_id||!body.classroomStudent)return null;
  const {data:teacher}=await supabase.from('teachers').select('id,active,frozen_at').eq('id',data.teacher_id).maybeSingle();
  const pupil=await studentByNameGenel(String(body.classroomStudent));
  if(!teacher||teacher.active===false||teacher.frozen_at||!pupil||pupil.teacher_id!==teacher.id)return null;
  return {...data,role:'student',student_id:pupil.id,classroomTeacher:teacher.id,classroomGrade:pupil.class_no};
 }
 if(data.role!=="student"||!data.student_id)return null;
 const {data:s}=await supabase.from("students").select("id,status,frozen_at").eq("id",data.student_id).maybeSingle();if(s?.status!=="approved"||s.frozen_at)return null;return data;
}
const DM_GAMES: Record<string,string> = {Kelime_Liderlik:'kelime',Jeopardy_Liderlik:'jeopardy',Bosluk_Tablosu:'bosluk',Hafiza_Liderlik:'hafiza',Yagmur_Liderlik:'yagmur',Asmaca_Liderlik:'asmaca',KelimeBul_Liderlik:'kelimebul',Konusma_Liderlik:'konusma',Eslesme_Liderlik:'eslestirme',Tren_Liderlik:'tren',Dikte_Liderlik:'dikte',Cumle_Liderlik:'cumle',HarfBahcesi_Liderlik:'harfbahcesi'};
async function dmBlocked(a:string,b:string){const {data,error}=await supabase.rpc('dm_blocked',{a,b});if(error)throw error;return !!data;}
async function dmPresence(op:string,body:any,a:any){
 const now=new Date(),actor=a.student_id;
 if(op==='aktifDurum'&&(!a.last_seen_at||now.getTime()-Date.parse(a.last_seen_at)>55000)){
  const {error}=await supabase.from('portal_sessions').update({last_seen_at:now.toISOString()}).eq('id',a.id);if(error)throw error;
 }
 const {data:blocks,error:be}=await supabase.from('student_blocks').select('blocker_id,blocked_id').or('blocker_id.eq.'+actor+',blocked_id.eq.'+actor);if(be)throw be;
 const blocked=new Set((blocks||[]).map((b:any)=>b.blocker_id===actor?b.blocked_id:b.blocker_id));
 let students:any[]=[];
 if(op==='takipDavetListesi'&&a.classroomTeacher){const {data,error}=await supabase.from('students').select('id,username,class_no').eq('teacher_id',a.classroomTeacher).eq('status','approved').eq('class_no',a.classroomGrade);if(error)throw error;students=(data||[]).filter((s:any)=>s.id!==actor&&!blocked.has(s.id));}
 else if(op==='takipDavetListesi'){
  const {data:follows,error}=await supabase.from('feed_events').select('target_student_id').eq('student_id',actor).eq('event_type','takip').limit(1000);if(error)throw error;
  const ids=[...new Set((follows||[]).map((f:any)=>f.target_student_id).filter((id:any)=>id&&id!==actor&&!blocked.has(id)))];
  if(ids.length){const {data,error}=await supabase.from('students').select('id,username,class_no').in('id',ids).eq('status','approved');if(error)throw error;students=data||[];}
 }else{
  const names=Array.isArray(body.isimler)?[...new Set(body.isimler.filter((n:any)=>typeof n==='string'&&n.length<=150))].slice(0,120):[];
  if(names.length){const {data,error}=await supabase.from('students').select('id,username').in('username',names).eq('status','approved');if(error)throw error;students=(data||[]).filter((s:any)=>!blocked.has(s.id));}
 }
 const showOnline=await release.on('cevrimici');
 const online=new Map<string,string>();
 if(students.length&&showOnline){const {data,error}=await supabase.from('portal_sessions').select('student_id,last_seen_at').eq('role','student').in('student_id',students.map(s=>s.id)).gt('expires_at',now.toISOString()).gte('last_seen_at',new Date(now.getTime()-300000).toISOString());if(error)throw error;for(const s of data||[]){const t=online.get(s.student_id);if(!t||s.last_seen_at>t)online.set(s.student_id,s.last_seen_at);}}
 return json({ok:true,serverNow:now.toISOString(),liste:(await socialSafety.filterStudents(students,a.student_id)).filter(publicParticipant).map(s=>({ad:s.username,sinif:s.class_no,online:showOnline&&online.has(s.id),seenAt:showOnline?(online.get(s.id)||null):null})).sort((a,b)=>Number(b.online)-Number(a.online)||a.ad.localeCompare(b.ad,'tr'))});
}
async function dmGiftMerge(id:string,value:any){
 let v=value||{};if(typeof v==='string'){try{v=JSON.parse(v);}catch{return value;}}
 const {data,error}=await supabase.from('dm_accessory_gifts').select('item_id').eq('recipient_id',id);if(error)throw error;
 if(data?.length&&v.karakter){v.karakter.sahip=[...new Set([...(v.karakter.sahip||[]),...data.map(x=>'d:'+x.item_id)])];}return v;
}

function scoreV3(body:any, seconds:any) {
  const correct=Number(body.dogru),wrong=Number(body.yanlis),base=Number(body.puanTemel),time=Number(seconds);
  if (!Number.isInteger(correct)||correct<0||correct>32||!Number.isInteger(wrong)||wrong<0||wrong>10000||!Number.isFinite(base)||base<0||base>correct*200+200||!Number.isFinite(time)||time<0||(correct>0&&time<=0)) return null;
  return (globalThis as any).DijiScoreRules.calculate({base,correct,wrong,seconds:time});
}

async function dmExtension(op:string,body:any,q:URLSearchParams,a:any){
 const social=new Set(['sosyalDurum','ogrenciEngelle','ogrenciEngelKaldir','hazirMesajGonder','aksesuarHediye','aksesuarKatalog','oyunEslesmeOlustur','oyunEslesmeDurum','oyunEslesmeHazir','oyunEslesmeCevap','oyunEslesmelerim','duelloSonucKaydet']);
 if(!social.has(op))return null;
 if(!a||a.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
 const actor=a.student_id;
 if(op==='aksesuarKatalog'){const {data,error}=await supabase.from('dm_accessory_catalog').select('*').order('price');if(error)throw error;return json({ok:true,liste:Array.isArray(data)?data.filter(publicParticipant):data});}
 if(op==='oyunEslesmelerim'){
  const {data,error}=await supabase.from('dm_matches').select('id,game,mode,status,player_a,player_b,created_at,expires_at,result_a,result_b,a:students!dm_matches_player_a_fkey(username),b:students!dm_matches_player_b_fkey(username)').or('player_a.eq.'+actor+',player_b.eq.'+actor).order('created_at',{ascending:false}).limit(30);if(error)throw error;
  return json({ok:true,liste:(data||[]).filter(publicParticipant).map((m:any)=>({id:m.id,game:m.game,mode:m.mode,status:m.expires_at<new Date().toISOString()&&m.status!=='finished'?'expired':m.status,opponent:m.player_a===actor?m.b?.username:m.a?.username,myResult:m.player_a===actor?m.result_a:m.result_b,opponentResult:m.player_a===actor?m.result_b:m.result_a}))});
 }
 if(op==='duelloSonucKaydet'){
  const game=String(val(body,q,'oyun'));if(!DM_GAMES[game])return json({ok:false,mesaj:'Geçersiz oyun.'},400);
  const scored=Number(body.puanSurum)===3?scoreV3(body,body.sure):null;
  if(Number(body.puanSurum)===3&&!scored)return json({ok:false,mesaj:'Geçersiz süre veya puan verisi.'},400);
  const {data,error}=await supabase.rpc(scored?'dm_classic_result_v3':'dm_classic_result',{actor,game,score:scored?scored.puan:Math.min(1000,Math.max(0,num(body.puan))),seconds:Math.max(0,num(body.sure))});if(error)return json({ok:false,mesaj:error.message},400);return json({ok:true,liste:Array.isArray(data)?data.filter(publicParticipant):data});
 }
 let target:any=null;
 if(['sosyalDurum','ogrenciEngelle','ogrenciEngelKaldir','hazirMesajGonder','aksesuarHediye','oyunEslesmeOlustur'].includes(op)){
  target=await studentByNameGenel(String(val(body,q,'alici')));if(!target)return json({ok:false,mesaj:'Öğrenci bulunamadı.'},404);
  if(a.classroomTeacher&&target.teacher_id!==a.classroomTeacher)return json({ok:false,mesaj:'Sınıf oyununda yalnızca kendi öğrencilerini seçebilirsin.'},403);
 }
 let r:any;
 if(op.startsWith('oyunEslesme')){
  const action={oyunEslesmeOlustur:'create',oyunEslesmeDurum:'state',oyunEslesmeHazir:'ready',oyunEslesmeCevap:'answer'}[op];
  r=await supabase.rpc('dm_match_action',{actor,match_id:op==='oyunEslesmeOlustur'?null:String(val(body,q,'id')),action,arg:{target:target?.id,game:val(body,q,'oyun'),mode:val(body,q,'mod'),index:body.index,choice:body.choice}});
 }else{
  const action={sosyalDurum:'status',ogrenciEngelle:'block',ogrenciEngelKaldir:'unblock',hazirMesajGonder:'message',aksesuarHediye:'gift'}[op];
  r=await supabase.rpc('dm_social_action',{actor,target:target.id,action,arg:String(val(body,q,op==='hazirMesajGonder'?'mesajId':'item'))});
 }
 if(r.error)return json({ok:false,mesaj:r.error.code==='23505'?'Bu aksesuar arkadaşında zaten var.':r.error.message},400);
 return json(r.data);
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
 if(!['GET','POST'].includes(req.method))return json({ok:false,mesaj:'Yöntem desteklenmiyor.'},405);
 const q=new URL(req.url).searchParams;let body:any={};
 if(req.method!=='GET'){const parsed=await readJsonBounded(req);if(!parsed.ok)return json({ok:false,mesaj:'Geçersiz istek.'},parsed.status);body=parsed.data;}
 const a=await session(req,body,q);if(!a)return json({ok:false,mesaj:"Öğrenci oturumu gerekli."},401);
 const op=String(val(body,q,"islem"));
 for(const plan of authenticatedBudgets(op,a.student_id,body)){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(plan.scope+'|'+plan.value));
  const key='shield:'+Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data,error}=await supabase.rpc('dm_security_rate_check',{bucket_key:key,max_hits:plan.max,window_seconds:plan.seconds});
  if(error||typeof data?.allowed!=='boolean')return json({ok:false,mesaj:'Güvenlik kontrolü tamamlanamadı.'},503);
  if(!data.allowed){const r=json({ok:false,mesaj:'Çok fazla istek. Biraz sonra tekrar dene.'},429);r.headers.set('Retry-After',String(Math.max(1,Number(data.retryAfter)||60)));return r;}
 }
 if(a.student_id===DEMO_ID&&['duelloGonder','duelloYanit','hazirMesajGonder','aksesuarHediye','oyunEslesmeOlustur','ogrenciEngelle','ogrenciEngelKaldir'].includes(op))return json({ok:false,mesaj:'Tanıtım hesabında diğer öğrencilere istek gönderilmez.'},403);
 const safetyDeny=await socialSafety.guard(op,body,q,a);if(safetyDeny)return safetyDeny;
 const protective=['sosyalDurum','ogrenciEngelle','ogrenciEngelKaldir'].includes(op);
 const contactDeny=protective?null:await contacts.guard(op,a);if(contactDeny)return contactDeny;
 const levelDeny=protective||a.classroomTeacher?null:await progression.guard(op,body,q,a);if(levelDeny)return levelDeny;
 const denied=protective?null:await release.guard(op,body,q,a);if(denied)return denied;
 if(['aktifDurum','takipDavetListesi'].includes(op))return await dmPresence(op,body,a);
 if(["duelloGonder","duelloYanit","duellolarim"].includes(op)){
  let arg:any={},action="list";
  if(op==="duelloGonder"){const target=await studentByNameGenel(String(val(body,q,"alici"))),game=String(val(body,q,"oyun"));if(!target||!DM_GAMES[game])return json({ok:false,mesaj:"Geçersiz rakip veya oyun."},400);action="create";arg={target:target.id,game};}
  if(op==="duelloYanit"){action="reply";arg={id:val(body,q,"id"),accept:[true,1,"1","true"].includes(val(body,q,"kabul"))};}
  const {data,error}=await supabase.rpc("dm_duel_action",{actor:a.student_id,action,arg});if(error)return json({ok:false,mesaj:error.message},400);if(Array.isArray(data?.liste))data.liste=data.liste.filter(publicParticipant);return json(data);
 }
 if(op==="bildirimlerim"){
  const {data,error}=await supabase.from("notifications").select("id,sender_student_id,created_at,type,message,payload,read_at,sender:students!notifications_sender_student_id_fkey(username)").eq("recipient_student_id",a.student_id).is("read_at",null).order("created_at",{ascending:false}).limit(100);if(error)throw error;
  return json({ok:true,liste:(await socialSafety.filterNotifications(data||[],a.student_id)).filter(publicParticipant).map((x:any)=>({sat:x.id,tarih:x.created_at,tur:x.type,metin:x.message,gonderen:x.sender?.username||"",matchId:x.payload?.matchId||null,okundu:false}))});
 }
 return await dmExtension(op,body,q,a)||json({ok:false,mesaj:"Bilinmeyen işlem."},404);
 }catch(e){console.error(e);return json({ok:false,mesaj:"İşlem tamamlanamadı. Tekrar dene."},500)}
});

