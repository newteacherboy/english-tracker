/* Break games only mutate gold via locked, service-role-only database functions. */
export function breakGamesAPI(db:any,json:any){
 const games=['kosu','zipla','patlat'];
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 return {async handle(op:string,b:any,q:URLSearchParams,a:any,method:string){
  if(!['molaDurum','molaBaslat','molaBitir','molaSiralama'].includes(op))return null;
  if(a?.role!=='student'||!a.student_id)return json({ok:false,mesaj:'Öğrenci oturumu gerekli.'},401);
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  const args:any={actor:a.student_id};let fn='dm_break_status';
  if(op==='molaBaslat'||op==='molaSiralama'){
   if(!games.includes(b.game))return json({ok:false,mesaj:'Geçersiz oyun.'},400);
   args.game_code=b.game;
  }
  if(op==='molaBaslat'||op==='molaBitir'){
   if(!uuid.test(String(b.runId||'')))return json({ok:false,mesaj:'Geçersiz oyun kimliği.'},400);
   args.run_key=b.runId;
  }
  if(op==='molaBaslat')fn='dm_break_start';
  if(op==='molaBitir'){
   if(![b.score,b.collectedGold,b.seconds].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=4500000)||b.seconds>1800)return json({ok:false,mesaj:'Geçersiz oyun sonucu.'},400);
   Object.assign(args,{score:b.score,collected_gold:b.collectedGold,seconds:b.seconds});fn='dm_break_finish';
  }
  if(op==='molaSiralama'){
   if(!['week','all'].includes(b.period))return json({ok:false,mesaj:'Geçersiz sıralama.'},400);
   args.period=b.period;fn='dm_break_ranking';
  }
  const {data,error}=await db.rpc(fn,args);
  if(error){
   // Only deliberate policy errors are safe to display; never expose database internals.
   const msg=String(error.message||'');
   const policy=/^(Bugünkü 2 hakkın bitti|Oyuna başlamak için 5 enerji|Öğrenci oturumu gerekli|Geçersiz oyun|Oyun sonucu süreyle|Oyun süresi doğrulanamadı|Oyun bulunamadı|Hesap bilgileri hazır değil)/.test(msg);
   return json({ok:false,mesaj:policy?msg:'Mola oyunu kaydedilemedi. Tekrar dene.',hata:/5 enerji/.test(msg)?'enerji':/2 hakkın/.test(msg)?'hak':'mola'},policy?400:503);
  }
  return json(data);
 }};
}
