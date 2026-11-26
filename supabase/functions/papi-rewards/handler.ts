// [17 Kas 2026] Papi'nin Kanadı (tüy).
// [24 Kas 2026] Parkurdaki Sürpriz Yumurta kaldırıldı: 'yumurta' / 'yumurta_cat' eylemleri artık kabul edilmez,
// veritabanına hiç gidilmeden 400 döner (dm_papi_egg fonksiyonu da silindi).
// Öğrenci yalnız eylemi seçer; sayımlar, tarih ve bütün altın/enerji yazımları veritabanı fonksiyonlarındadır.
type Db={from:(t:string)=>any,rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:any,error:any}>};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-diji-token','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const fail=(code:string,status:number)=>json({ok:false,code,mesaj:({auth:'Öğrenci hesabınla giriş yap.',demo:'Bu özellik kişisel öğrenci hesabında açılır.',invalid:'Geçersiz istek.',busy:'Bağlantı yoğun. Biraz sonra tekrar dene.'} as Record<string,string>)[code]||'Şu an yüklenemedi. Tekrar dene.'},status);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const ACTIONS=['tuy','daily_status','daily_claim'] as const;
export function papiRewardsHandler(db:Db){
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return fail('invalid',405);
  try{
   const raw=await req.text();if(raw.length>2048)return fail('invalid',413);
   let b:any;try{b=JSON.parse(raw||'{}');}catch{return fail('invalid',400);}
   const action=String(b?.action||'');if(!(ACTIONS as readonly string[]).includes(action))return fail('invalid',400);
   if(action==='tuy')return json({ok:true,retired:true,day:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),feathers:0,level:1,todayDone:true,justEarned:false,wingDone:false,days:[],eklenen:0});
   const token=String(req.headers.get('x-diji-token')||b.t||'');if(!token||token.length>512)return fail('auth',401);
   const s=await db.from('portal_sessions').select('role,student_id,expires_at,teacher_portal_access_id').eq('token_hash',await hash(token)).maybeSingle();
   const exp=Date.parse(s.data?.expires_at||'');
   if(s.error||s.data?.role!=='student'||s.data?.teacher_portal_access_id||!s.data?.student_id||!Number.isFinite(exp)||exp<=Date.now())return fail('auth',401);
   const actor=s.data.student_id;
   const account=await db.from('students').select('id,username,role,status,frozen_at').eq('id',actor).maybeSingle();
   if(account.error||!account.data||account.data.role!=='student'||account.data.status!=='approved'||account.data.frozen_at)return fail('auth',403);
   if(['teacher','dijimedu_demo'].includes(String(account.data.username||'').toLowerCase()))return fail('demo',403);
   const r=await db.rpc('dm_daily_energy_gift_v2',{actor,claim:action==='daily_claim'});
   if(r.error){console.error('papi-rewards',action,r.error);return fail('provider',503);}
   if(!r.data?.ok)return fail(String(r.data?.code||'provider'),403);
   return json(r.data);
  }catch(e){console.error('papi-rewards',e);return fail('provider',503);}
 };
}
