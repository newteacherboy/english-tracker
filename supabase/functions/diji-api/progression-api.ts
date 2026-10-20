import {allTimeLeague} from './league-alltime.mjs';
import {publicParticipant} from './demo-account.ts';
import {loadStartPath} from './start-path-access.mjs';
import {schoolStopProblem,studyAccess} from './start-path.mjs';
import {socialSafetyAPI} from './social-safety.mjs';
import './progression-catalog.js';
import items from './progression-shop.json' with {type:'json'};
const C=(globalThis as any).DijiProgressionCatalog;
export function progressionAPI(db:any,json:any){
 const value=(body:any,q:URLSearchParams,k:string)=>body[k]??q.get(k)??'';
 async function context(a:any,includeStudy=false){
  const {data,error}=await db.rpc('dm_progress_context',{actor:a.student_id});if(error)throw error;if(!includeStudy)return data;
  const startPath=await loadStartPath(db,a.student_id,data);
  return {...data,startPath,studyAccess:studyAccess(startPath),studyPlacementLevel:startPath.testLevel};
 }
 const deny=(n:any)=>json({ok:false,status:'kilitli',mesaj:typeof n==='number'?`Bu özellik ${n}. seviyede açılır.`:n},403);
 async function handle(op:string,body:any,q:URLSearchParams,a:any){
  if(!['haftalikHedefSec','haftalikHedefOdulAl','seviyeDurumu','seviyeSandikAc','seviyeUrunAl','seviyeEkJokerAl','seviyeLigListesi','seviyeOyunOdulu','seviyeParkurPekistirme'].includes(op))return null;
  if(a?.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
  if(op==='haftalikHedefSec'){
    const xp=Number(body.xp);
    if(![1000,1500,2500].includes(xp))return json({ok:false,mesaj:'Geçerli haftalık hedef seç.'},400);
    const {data,error}=await db.rpc('dm_weekly_target_select',{actor:a.student_id,target_xp:xp});
    if(error)return json({ok:false,mesaj:error.message},400);
    return json(data);
   }
   if(op==='haftalikHedefOdulAl'){
    const {data,error}=await db.rpc('dm_weekly_target_claim',{actor:a.student_id});
    if(error)return json({ok:false,mesaj:error.message},400);
    return json(data);
   }
  if(op==='seviyeParkurPekistirme'){
    const ctx=await context(a,true),run=String(body.runId||''),stop=Number(body.stopNo),classNo=Number(body.classNo);
    const door=ctx.units.findIndex((row:any[])=>row.includes(stop));
    if(!Number.isInteger(stop)||!Number.isInteger(classNo)||door<0
       ||Math.floor((stop-200000)/10000)!==classNo)
      return deny('Geçerli ve açık parkur durağı gerekli.');
    if(Math.floor((stop-200000)/10000)>ctx.startPath.maxGrade)return deny(schoolStopProblem(ctx.startPath,ctx,stop));
    const {data,error}=await db.rpc('dm_parkur_fair_recover',{
       actor:a.student_id,run_key:run,stop_no:stop,
       expected_step:Number(body.step),selected:String(body.answer||'')});
    if(error)return json({ok:false,mesaj:error.message},400);
    return json(data);
  }
  if(op==='seviyeOyunOdulu'){
   const ctx=await context(a,body.game==='ba'),game=String(body.game||''),code=({ky:'oyun_kelime',jp:'oyun_jeopardy',kp:'kelime_modu',ba:'parkur',harfbahcesi:'oyun_harfbahcesi',eslestirme:'oyun_eslestirme'} as any)[game]||'oyun_'+game;
   if(!Object.hasOwn(C.gates,code)||ctx.level<C.gates[code])return deny(C.gates[code]||40);
   let units=Array.isArray(body.units)?body.units.map(Number):[];
   if(game==='ba'){
    const stop=Number(body.stopNo||200000+Number(body.classNo)*10000+Number(units[0])*100+1);
    const door=ctx.units.findIndex((u:any[])=>u.includes(stop));
    if(!Number.isInteger(stop)||door<0||Math.floor((stop-200000)/10000)!==Number(body.classNo)||Math.floor((stop-200000)%10000/100)!==Number(units[0]))return deny('Geçerli ve açık parkur durağı gerekli.');
    const problem=schoolStopProblem(ctx.startPath,ctx,stop);if(problem)return deny(problem);
    units=[stop];
   }
   const checked=await db.rpc('dm_verified_result',{actor:a.student_id,run_key:String(body.runId||''),game_code:game,cls:Number(body.classNo),unit_ids:game==='ba'?[Math.floor((units[0]-200000)%10000/100)]:[...new Set(units)].sort((a,b)=>a-b),stop_id:game==='ba'?units[0]:0});
   if(checked.error){const required=await db.rpc('dm_verified_required');if(required.error||required.data!==false)return json({ok:false,mesaj:'Doğrulanmış cevaplar gerekli. Uygulamayı yenileyip oyunu yeniden başlat.'},409);}
   else body={...body,correct:checked.data.correct,wrong:checked.data.wrong,seconds:checked.data.seconds,boost:1};
   const fair=game==='ba'; // Always enforce recorded outcomes; old clients cannot bypass the fairness gate.
   const {data,error}=fair
      ?await db.rpc('dm_parkur_fair_claim',{actor:a.student_id,run_key:String(body.runId||''),
         class_id:Number(body.classNo),stop_no:units[0],seconds:Number(body.seconds)})
      :await db.rpc('dm_solo_fair_claim',{actor:a.student_id,run_key:String(body.runId||''),game_code:game,class_id:Number(body.classNo),unit_ids:units,right_count:Number(body.correct),wrong_count:Number(body.wrong),duration_seconds:Number(body.seconds),boost_factor:[2,3,4].includes(Number(body.boost))?Number(body.boost):1});
   if(error)return json({ok:false,mesaj:error.message},400);
   if(fair&&data?.ok&&['awarded','duplicate'].includes(String(data.reason||''))){
     // Idempotent existing three-stop gift; retrying a completed claim may
     // finish this independent gift if an earlier response was interrupted.
     const stopGift=await db.rpc('dm_progress_award_stop',{actor:a.student_id,stop:units[0]});
     if(stopGift.error)return json({ok:false,mesaj:'Durak ödülü kaydedilemedi. Yeniden dene.'},503);
     const gift=Number(stopGift.data?.gold||0);
     return json({...data,gold:Number(data.gold||0)+gift,yo:stopGift.data?.yo||data.yo,
       stopGiftGold:gift});
   }
   return json(data);
  }
  if(op==='seviyeDurumu')return json({ok:true,...await context(a,true)});
  if(op==='seviyeLigListesi'){
   const scope=String(body.kapsam||q.get('kapsam')||'weekly');
   if(!['weekly','alltime'].includes(scope))return json({ok:false,mesaj:'Geçerli lig kapsamı gerekli.'},400);
   if(scope==='alltime'){
    const ctx=await context(a);if(ctx.level<15)return deny(15);
    const safety=socialSafetyAPI({db,json});
    const liste=await allTimeLeague(db,(rows:any[],viewer:string)=>safety.filterStudents(rows,viewer),a.student_id,(xp:number)=>C.level(xp),publicParticipant);
    return json({ok:true,kapsam:'alltime',liste});
   }
   const {data,error}=await db.rpc('dm_progress_league');if(error)throw error;
   return json({ok:true,liste:await socialSafetyAPI({db,json}).filterStudents(data||[],a.student_id)});
  }
  if(op==='seviyeSandikAc'){const {data,error}=await db.rpc('dm_progress_chest',{actor:a.student_id,chest:String(body.sandik||'')});if(error)return deny(error.message);return json({ok:true,...data});}
  if(op==='seviyeEkJokerAl'){const {data,error}=await db.rpc('dm_progress_purchase',{actor:a.student_id,item_key:'extra-joker',is_showcase:false});if(error)return deny(error.message);return json({ok:true,...data});}
  const item=(items as any[]).find(x=>x.id===String(body.item));if(!item)return json({ok:false,mesaj:'Ürün bulunamadı.'},400);
  // Daily display rotation is deterministic and computed independently of the client.
  const {data:st,error:se}=await db.from('students').select('username').eq('id',a.student_id).single();if(se)throw se;
  const ctx=await context(a);if(!C.compatible(item,ctx.yo?.karakter?.cins))return deny('Bu ürün diğer karakter seçimine ait.');const owned=new Set(ctx.owned||[]),date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date());
  const candidates=(items as any[]).filter(x=>!x.atolye&&!x.parca&&C.compatible(x,ctx.yo?.karakter?.cins)&&x.sv!=='temel'&&!owned.has('d:'+x.id));let h=0;for(const ch of date+st.username)h=(h*31+ch.charCodeAt(0))>>>0;
  const showcase=candidates.length&&candidates[h%candidates.length].id===item.id;
  const {data,error}=await db.rpc('dm_progress_purchase',{actor:a.student_id,item_key:item.id,is_showcase:!!showcase});if(error)return deny(error.message);return json({ok:true,...data});
 }
 async function guard(op:string,body:any,q:URLSearchParams,a:any){
  if(a?.role!=='student'||!a.student_id)return null;
  if(['dersKonulariGetir','akisTumu'].includes(op))return null;
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
  const ctx=await context(a,lesson||op==='buyuSeviyeTamamla'),l=ctx.level;
  if(code==='akis'&&!ctx.feed)return deny('Akış, ana parkurda 3. durağa ulaşınca açılır.');
  if(code&&l<(C.gates[code]||1))return deny(C.gates[code]);
  if(op==='buyuSeviyeTamamla'){const supplied=Number(body.seviyeNo),no=supplied>=1000&&supplied<2000?200000+Math.floor((supplied-1000)/100)*10000+((supplied-1000)%100)*100+1:supplied,door=ctx.units.findIndex((d:any[])=>d.includes(no));if(door<0)return deny('Geçerli parkur durağı gerekli.');const problem=schoolStopProblem(ctx.startPath,ctx,no);if(problem)return deny(problem);
    // The authenticated server reward transaction now writes level_completions.
    // A direct client completion must never create a pass before the verified claim.
    if(!ctx.done.includes(no))return deny('Önce parkur sorularını başarıyla tamamla.');
   }
  if(lesson){const ce=String(value(body,q,'seviye')).toUpperCase(),n=({A1:1,A2:9,B1:16,B2:23} as any)[ce];if(!n)return deny('Geçerli ders seviyesi gerekli.');if(!ctx.studyAccess[ce])return deny(ce+' konuları, '+ctx.startPath.maxCefr+' konularının tamamı bitince veya başlangıç testiyle açılır.');const topic=String(value(body,q,op==='dersKonuDetayGetir'?'konu':'konuAdi'));const cat=String(value(body,q,'kategori'));const check=await db.from('lesson_topics').select('id').eq('active',true).eq('level',ce).eq('category',cat).eq('topic_name',topic).limit(1);if(check.error)throw check.error;if(!check.data?.length)return deny('Yayımlanmış ders konusu gerekli.');}
  if(save){let incoming=body.deger;try{if(typeof incoming==='string')incoming=JSON.parse(incoming);}catch{return deny('Geçersiz veri.');}
   const before=ctx.yo||{};
   if(incoming?.karakter?.cins&&!['k','e'].includes(incoming.karakter.cins))return deny('Geçerli karakter seçimi gerekli.');
   if(incoming?.profilKrk&&incoming?.profilKrk!==before.profilKrk&&l<20)return deny(20);
   if(l<18&&Object.entries(incoming?.jokerEnv||{}).some(([k,n])=>Number(n)>Number(before.jokerEnv?.[k]||0)))return deny(18);
   const oldOwned=new Set(before.karakter?.sahip||[]),newOwned=incoming?.karakter?.sahip||[];
   if(!Array.isArray(newOwned)||newOwned.some((id:any)=>!oldOwned.has(id)))return deny('Yeni ürünler mağazanın satın alma işlemiyle kazanılır.');
   // Paid rights, weekly XP and reward ledgers can only be credited by the server.
   if(Number(incoming?.dmExtraJoker||0)>Number(before.dmExtraJoker||0))return deny('Ek joker hakkını mağazadan satın al.');
   if(l<(C.gates.haftalik_hedef||1)&&incoming?.haftaHedef&&JSON.stringify(incoming?.haftaHedef)!==JSON.stringify(before.haftaHedef))return deny(C.gates.haftalik_hedef||1);
   if(l<(C.gates.gunluk_gorev||1)&&incoming?.gorev&&JSON.stringify(incoming?.gorev)!==JSON.stringify(before.gorev))return deny(C.gates.gunluk_gorev||1);
   if(incoming?.karakter){
    const c=incoming.karakter.cins,changedGender=c!==before.karakter?.cins;
    const defaults:any={ten:'1',sac:c==='k'?'uzun':'kisa',sacRenk:c==='k'?'#6b4226':'#2b2331',goz:'normal',agiz:'gulumse',kiyafet:c==='k'?'tisort-mor':'tisort-mavi',sapka:'yok',gozluk:'yok',dost:'yok',detay:'yanak',arka:c==='k'?'mor':'mavi',cerceve:'yok'};
    for(const kat of Object.keys(C.category)){
      const selected=incoming.karakter.s?.[kat];
      if(!selected||selected===before.karakter?.s?.[kat]&&!changedGender)continue;
      if(changedGender&&selected===defaults[kat])continue;
      const item=(items as any[]).find(x=>x.kat===kat&&(x.atolye?x.itemId===selected:x.id===selected));
      if(!item)return deny('Geçerli bir görünüm ürünü seç.');
      if(!C.compatible(item,c))return deny('Bu ürün diğer karakter seçimine ait.');
      const key=item.atolye?kat+':'+item.itemId:'d:'+item.id,owned=oldOwned.has(key);
      if(!owned&&C.itemLevel(item)>l)return deny(C.itemLevel(item));
      if(!owned&&item.f>0)return deny('Önce bu ürünü mağazadan satın al.');
    }
   }
  }
  return null;
 }
 return {handle,guard,context};
}
