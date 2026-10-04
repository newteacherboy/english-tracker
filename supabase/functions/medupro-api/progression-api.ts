import './progression-catalog.js';
import items from './progression-shop.json' with {type:'json'};
const C=(globalThis as any).DijiProgressionCatalog;
export function progressionAPI(db:any,json:any){
 const value=(body:any,q:URLSearchParams,k:string)=>body[k]??q.get(k)??'';
 async function context(a:any){const {data,error}=await db.rpc('dm_progress_context',{actor:a.student_id});if(error)throw error;return data;}
 const deny=(n:any)=>json({ok:false,status:'kilitli',mesaj:typeof n==='number'?`Bu özellik ${n}. seviyede açılır.`:n},403);
 async function handle(op:string,body:any,q:URLSearchParams,a:any){
  if(!['seviyeDurumu','seviyeSandikAc','seviyeUrunAl','seviyeEkJokerAl','seviyeLigListesi'].includes(op))return null;
  if(a?.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
  if(op==='seviyeDurumu')return json({ok:true,...await context(a)});
  if(op==='seviyeLigListesi'){const {data,error}=await db.rpc('dm_progress_league');if(error)throw error;return json({ok:true,liste:data});}
  if(op==='seviyeSandikAc'){const {data,error}=await db.rpc('dm_progress_chest',{actor:a.student_id,chest:String(body.sandik||'')});if(error)return deny(error.message);return json({ok:true,...data});}
  if(op==='seviyeEkJokerAl'){const {data,error}=await db.rpc('dm_progress_purchase',{actor:a.student_id,item_key:'extra-joker',is_showcase:false});if(error)return deny(error.message);return json({ok:true,...data});}
  const item=(items as any[]).find(x=>x.id===String(body.item));if(!item)return json({ok:false,mesaj:'Ürün bulunamadı.'},400);
  // Daily display rotation is deterministic and computed independently of the client.
  const {data:st,error:se}=await db.from('students').select('username').eq('id',a.student_id).single();if(se)throw se;
  const ctx=await context(a),owned=new Set(ctx.owned||[]),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date());
  const candidates=(items as any[]).filter(x=>!x.atolye&&!x.parca&&x.sv!=='temel'&&!owned.has('d:'+x.id));let h=0;for(const ch of date+st.username)h=(h*31+ch.charCodeAt(0))>>>0;
  const showcase=candidates.length&&candidates[h%candidates.length].id===item.id;
  const {data,error}=await db.rpc('dm_progress_purchase',{actor:a.student_id,item_key:item.id,is_showcase:!!showcase});if(error)return deny(error.message);return json({ok:true,...data});
 }
 async function guard(op:string,body:any,q:URLSearchParams,a:any){
  if(a?.role!=='student'||!a.student_id)return null;
  if(op==='dersKonulariGetir')return null;
  let code=C.features.find((f:any)=>f.ops.includes(op))?.code;
  if(['akisOlayToggle','bildirimGonder'].includes(op)){const t=String(value(body,q,'tur'));code=t==='takip'?'takip':['begeni','tebrik','like','congrats'].includes(t)?'tebrik':undefined;}
  if(['duelloKabul','duelloRed','duelloSonuc','duelloYanit','duelloSonucKaydet','duelloGonder'].includes(op))code='duello';
  if(['oyunEslesmeOlustur','oyunEslesmeHazir','oyunEslesmeCevap','oyunEslesmeDurum','oyunEslesmelerim'].includes(op))code='iki_kisilik';
  if(op==='takipDavetListesi')code='takip';
  if(op==='okumaKaydet')code='okuma_hizi';
  if(op==='enerjiDegistir'&&String(body.oyun))code='oyun_'+String(body.oyun);
  const lesson=['dersKonuDetayGetir','dersTestSonucKaydet','dersBilmiyordumToggle'].includes(op);
  const save=op==='ekVeriKaydet'&&body.anahtar==='yo';
  if(!code&&!lesson&&!save&&op!=='buyuSeviyeTamamla')return null;
  const ctx=await context(a),l=ctx.level;
  if(code==='akis'&&!ctx.feed)return deny('Akış, ana parkurda 3. durağa ulaşınca açılır.');
  if(code&&l<(C.gates[code]||1))return deny(C.gates[code]);
  if(op==='buyuSeviyeTamamla'){const no=Number(body.seviyeNo),door=ctx.units.findIndex((d:any[])=>d.includes(no));if(door<0)return deny('Geçerli parkur durağı gerekli.');const n=[1,10,20,30][door];if(l<n)return deny(n);if(door>0&&!ctx.complete[door-1])return deny('Önce önceki parkuru tamamla.');const position=ctx.units[door].indexOf(no);if(position>0&&!ctx.done.includes(ctx.units[door][position-1]))return deny('Önce önceki durağı tamamla.');}
  if(lesson){const ce=String(value(body,q,'seviye')).toUpperCase(),n=({A1:2,A2:9,B1:16,B2:23} as any)[ce];if(!n)return deny('Geçerli ders seviyesi gerekli.');if(l<n)return deny(n);if(!ctx.lessons[ce])return deny('Önce önceki ders seviyesini tamamen bitir.');const topic=String(value(body,q,op==='dersKonuDetayGetir'?'konu':'konuAdi'));const cat=String(value(body,q,'kategori'));const check=await db.from('lesson_topics').select('id').eq('active',true).eq('level',ce).eq('category',cat).eq('topic_name',topic).limit(1);if(check.error)throw check.error;if(!check.data?.length)return deny('Yayımlanmış ders konusu gerekli.');}
  if(save){let incoming=body.deger;try{if(typeof incoming==='string')incoming=JSON.parse(incoming);}catch{return deny('Geçersiz veri.');}
   const before=ctx.yo||{};
   if(JSON.stringify(incoming?.karakter)!==JSON.stringify(before.karakter)&&incoming?.karakter?.cins&&l<15)return deny(15);
   if(incoming?.profilKrk&&incoming?.profilKrk!==before.profilKrk&&l<20)return deny(20);
   if(l<18&&Object.entries(incoming?.jokerEnv||{}).some(([k,n])=>Number(n)>Number(before.jokerEnv?.[k]||0)))return deny(18);
   const oldOwned=new Set(before.karakter?.sahip||[]),newOwned=incoming?.karakter?.sahip||[];
   if(!Array.isArray(newOwned)||newOwned.some((id:any)=>!oldOwned.has(id)))return deny('Yeni ürünler mağazanın satın alma işlemiyle kazanılır.');
   // Paid rights, weekly XP and reward ledgers can only be credited by the server.
   if(Number(incoming?.dmExtraJoker||0)>Number(before.dmExtraJoker||0))return deny('Ek joker hakkını mağazadan satın al.');
   if(l<16&&incoming?.haftaHedef&&JSON.stringify(incoming?.haftaHedef)!==JSON.stringify(before.haftaHedef))return deny(16);
   if(l<12&&incoming?.gorev&&JSON.stringify(incoming?.gorev)!==JSON.stringify(before.gorev))return deny(12);
   if(incoming?.karakter&&before.karakter){for(const [kat,n] of Object.entries(C.category)){if(l<Number(n)&&incoming.karakter.s?.[kat]!==before.karakter.s?.[kat])return deny(Number(n));}}
  }
  return null;
 }
 return {handle,guard,context};
}
