// This module only reads words and writes separate self-assessment records.
// It never calls game rewards, feed events, energy, goals, XP or gold APIs.
export function papiCardsAPI(db:any,json:any){
 return {async handle(op:string,body:any,q:URLSearchParams,a:any,method:string){
  if(!['papiKartSonucKaydet','papiKartSiralamaGetir'].includes(op))return null;
  if(!a||!['student','teacher'].includes(a.role)||!(a.student_id||a.teacher_id))return json({ok:false,hata:'oturum',mesaj:'Sonuç kaydı ve sıralama için giriş yapmalısın.'},401);
  const cls=Number(body.sinif??q.get('sinif')),unit=Number(body.unite??q.get('unite'));
  if(!Number.isInteger(cls)||cls<1||cls>12||!Number.isInteger(unit)||unit<1||unit>100)return json({ok:false,mesaj:'Geçersiz sınıf veya ünite.'},400);
  if(op==='papiKartSiralamaGetir'){
   const {data,error}=await db.from('papi_card_results').select('owner_key,display_name,score,known_count,review_count,total,created_at').eq('class_no',cls).eq('unit_no',unit).order('score',{ascending:false}).order('created_at',{ascending:true}).limit(2000);
   if(error)return json({ok:false,mesaj:'Sıralama yüklenemedi.'},503);
   const seen=new Set();const liste=(data||[]).filter((r:any)=>{const k=r.owner_key;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,100).map((r:any)=>({isim:r.display_name,puan:r.score,biliyorum:r.known_count,tekrar:r.review_count,toplam:r.total,tarih:r.created_at}));
   return json({ok:true,liste});
  }
  if(method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  const total=Number(body.toplam),known=Number(body.biliyorum),review=Number(body.tekrar),seconds=Number(body.suresaniye),run=String(body.runId||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(run)||!Number.isInteger(total)||total<1||total>2000||!Number.isInteger(known)||known<0||known>total||!Number.isInteger(review)||review!==total-known||!Number.isInteger(seconds)||seconds<0||seconds>604800)return json({ok:false,mesaj:'Geçersiz kart sonucu.'},400);
  const name=String(body.isim||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40)||'İsimsiz öğrenci';
  // Display aliases never determine authorization or the account receiving the record.
  const owner=a.role==='student'?'s:'+a.student_id:'t:'+a.teacher_id+':'+name.toLocaleLowerCase('tr');
  const prior=await db.from('papi_card_results').select('display_name,score').eq('owner_key',owner).eq('run_id',run).limit(1);
  if(prior.error)return json({ok:false,mesaj:'Kayıt doğrulanamadı.'},503);
  if(prior.data?.length)return json({ok:true,isim:prior.data[0].display_name,puan:prior.data[0].score});
  const bank=await db.from('word_bank').select('english,turkish').eq('active',true).eq('class_no',cls).eq('unit_no',unit).limit(2001);
  if(bank.error)return json({ok:false,mesaj:'Kelime destesi doğrulanamadı.'},503);
  const count=new Set((bank.data||[]).filter((r:any)=>String(r.english||'').trim()&&String(r.turkish||'').trim()).map((r:any)=>String(r.english).trim().toLocaleLowerCase('en'))).size;
  if(count!==total)return json({ok:false,mesaj:'Kelime destesi değişmiş. Üniteyi yeniden açıp çalış.'},409);
  const score=Math.round(known/total*100);
  const {error}=await db.from('papi_card_results').upsert({owner_key:owner,run_id:run,student_id:a.role==='student'?a.student_id:null,teacher_id:a.role==='teacher'?a.teacher_id:null,display_name:name,class_no:cls,unit_no:unit,total,known_count:known,review_count:review,score,duration_seconds:seconds},{onConflict:'owner_key,run_id',ignoreDuplicates:true});
  if(error)return json({ok:false,mesaj:'Sonuç kaydedilemedi. Tekrar dene.'},503);
  return json({ok:true,isim:name,puan:score});
 }};
}
