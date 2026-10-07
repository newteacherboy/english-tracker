import {guestContent} from './guest-content.ts';
export function onboardingAPI(d:any){
 const {db,json,hash,studentByName,verifyPassword,attempts,audit,sendQueued,mailShell,escape}=d;
 const portal='https://app.dijimedu.com/ingilizce/';
 async function welcome(s:any){
  const token=crypto.randomUUID()+crypto.randomUUID(),link=portal+'hesap-dogrula.html#token='+encodeURIComponent(token);
  const html=mailShell('Diji-Medu’ya hoş geldin! 🦜',`<p>Merhaba <b>${escape(s.username)}</b>,</p><p>Ben Papi! Kelimeleri keşfedeceğin, oyunlarla İngilizce öğreneceğin yolculuğuna hoş geldin.</p><p>Öğrenci hesabının e-posta adresini doğrulamak için aşağıdaki düğmeye dokun. Yeni şifreli kayıtlarda hesabın bu işlemden sonra açılır.</p><p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;background:#347b62;color:white;padding:16px 24px;border-radius:16px;text-decoration:none;font-weight:bold">Hesabımı doğrula ve başla 🦜</a></p><p>Bağlantı 24 saat geçerlidir ve bir kez kullanılır. Bu kaydı sen oluşturmadıysan e-postayı yok sayabilirsin.</p><p>Bu e-posta adresine erişimin doğrulanır; öğrenci ve veli bilgileri kayıt beyanına göre saklanır.</p>`);
  const text=`Merhaba ${s.username}, Diji-Medu’ya hoş geldin! Hesabını doğrula: ${link}\nBağlantı 24 saat geçerli ve tek kullanımlıktır.`;
  const {data,error}=await db.rpc('dm_email_issue',{actor:s.id,digest:await hash(token),mail:s.email,title:'Diji-Medu’ya hoş geldin! Hesabını doğrula 🦜',html_body:html,plain_body:text});
  if(error)throw Error(error.message);
  await sendQueued(data,{student_id:s.id,kind:'dogrulama',to_email:s.email,subject:'Diji-Medu’ya hoş geldin! Hesabını doğrula 🦜',html,text_body:text});
 }
 async function handle(req:Request,op:string,b:any){
  if(!['emailDogrula','emailDogrulamaTekrar','misafirBaslat','misafirIcerik','misafirPlatform'].includes(op))return null;
  if(req.method!=='POST')return json({ok:false,mesaj:'POST gerekli.'},405);
  if(op==='emailDogrula'){
   if(!/^[a-f0-9-]{72}$/i.test(String(b.token||'')))return json({ok:false,mesaj:'Doğrulama bağlantısı geçersiz.'},400);
   const {data,error}=await db.rpc('dm_email_verify',{digest:await hash(b.token)});if(error)throw error;return json(data,data?.ok?200:400);
  }
  if(op==='emailDogrulamaTekrar'){
   const name=String(b.ogrenci||'').trim();
   if(await attempts('email_tekrar',name.toLowerCase(),60)>=5)return json({ok:false,mesaj:'Çok fazla deneme. Bir saat sonra tekrar dene.'},429);
   await audit('email_tekrar',name.toLowerCase());
   const s=await studentByName(name);
   if(!s||!await verifyPassword(String(b.sifre||''),s.password_hash)||s.status!=='pending'||!s.email_verification_required)return json({ok:false,mesaj:'Bilgileri kontrol et. Bu işlem e-posta onayı bekleyen yeni kayıtlar içindir.'},400);
   try{await welcome(s);return json({ok:true,mesaj:'Yeni bağlantı e-posta kuyruğuna alındı. Gelen kutunu ve spam klasörünü kontrol et.'});}catch(e){return json({ok:false,mesaj:String((e as Error).message)},429);}
  }
  if(!/^[a-f0-9-]{36}$/i.test(String(b.device||'')))return json({ok:false,mesaj:'Geçersiz deneme anahtarı.'},400);
  const {data:g,error}=await db.rpc('dm_guest_preview',{digest:await hash(b.device),begin_preview:op==='misafirBaslat'});if(error)throw error;
  if(!g?.ok)return json({...g,mesaj:'10 dakikalık denemen tamamlandı. Papi ile devam etmek için ücretsiz kayıt ol.'},410);
  if(op==='misafirBaslat')return json(g);
  if(op==='misafirPlatform'){
   const kind=String(b.kind||'');
   if(kind==='claim'){
    const {data,error}=await db.rpc('dm_guest_claim',{digest:await hash(b.device),feature:String(b.feature||'')});if(error)throw error;return json({...g,...data},data?.ok?200:409);
   }
   if(kind==='bootstrap')return json({...g,data:await guestContent(db,kind,b)});
   if(kind==='lesson'){
    const key=await hash(JSON.stringify([b.seviye,b.kategori,b.konu]));
    const {data:allowed,error}=await db.rpc('dm_guest_lesson',{digest:await hash(b.device),lesson_key:key});if(error)throw error;
    if(!allowed)return json({ok:false,mesaj:'Bir konu deneme hakkını kullandın. Ücretsiz üyelikle diğer konuları keşfet.'},409);
    return json({...g,data:await guestContent(db,kind,b)});
   }
   return json({ok:false,mesaj:'Misafir alanında bu işlem kullanılamaz.'},403);
  }
  const cls=Number(b.sinif),unit=Number(b.unite);
  if(!Number.isInteger(cls)||cls<1||cls>8||!Number.isInteger(unit)||unit<1||unit>10)return json({ok:false,mesaj:'Sınıf ve ünite seç.'},400);
  const {data:words,error:err}=await db.from('word_bank').select('english,turkish').eq('active',true).eq('class_no',cls).eq('unit_no',unit).order('english').limit(100);
  if(err)throw err;
  return json({...g,words:(words||[]).filter((w:any)=>/^[a-zA-Z]{2,15}$/.test(w.english)&&w.turkish).map((w:any)=>({en:w.english,tr:w.turkish}))});
 }
 return {welcome,handle};
}
