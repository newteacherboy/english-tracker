export function onboardingAPI(d:any){
 const {db,json,hash,studentByName,verifyPassword,attempts,audit,sendQueued,mailShell,escape,issueSession}=d;
 const portal='https://app.dijimedu.com/ingilizce/';
 async function welcome(s:any){
  const token=crypto.randomUUID()+crypto.randomUUID(),link=portal+'hesap-dogrula.html#token='+encodeURIComponent(token);
  const html=mailShell('Diji-Medu’ya hoş geldin! 🦜',`<p>Merhaba <b>${escape(s.username)}</b>,</p><p>Ben Papi! Kelimeleri keşfedeceğin, oyunlarla İngilizce öğreneceğin yolculuğuna hoş geldin.</p><p>Öğrenci hesabının e-posta adresini doğrulamak için aşağıdaki düğmeye dokun. Uygulamayı hemen kullanabilirsin; bu işlem e-posta adresine erişimini doğrular.</p><p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;background:#347b62;color:white;padding:16px 24px;border-radius:16px;text-decoration:none;font-weight:bold">Hesabımı doğrula ve başla 🦜</a></p><p>Bağlantı 24 saat geçerlidir ve bir kez kullanılır. Bu kaydı sen oluşturmadıysan e-postayı yok sayabilirsin.</p><p>Bu e-posta adresine erişimin doğrulanır; öğrenci ve veli bilgileri kayıt beyanına göre saklanır.</p>`);
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
   const {data,error}=await db.rpc('dm_email_verify',{digest:await hash(b.token)});if(error)throw error;
   if(!data?.ok)return json(data,400);
   // Only the identity returned by the one-use verification RPC can open a session.
   const verified=await studentByName(String(data.ogrenci||''));
   if(!verified?.email_verified_at||verified.status!=='approved')return json({ok:false,mesaj:'E-posta doğrulandı. Uygulamaya giriş ekranından devam et.'},409);
   try{await d.afterVerified?.(verified.id);}catch(e){console.error('teacher code queue',e);}
   const token=await issueSession('student',verified.id);
   return json({...data,token,ogrenci:verified.username,emailVerified:true});
  }
  if(op==='emailDogrulamaTekrar'){
   const name=String(b.ogrenci||'').trim();
   if(await attempts('email_tekrar',name.toLowerCase(),60)>=5)return json({ok:false,mesaj:'Çok fazla deneme. Bir saat sonra tekrar dene.'},429);
   await audit('email_tekrar',name.toLowerCase());
   const s=await studentByName(name);
   if(!s||!await verifyPassword(String(b.sifre||''),s.password_hash)||!['pending','approved'].includes(s.status)||!s.email_verification_required)return json({ok:false,mesaj:'Bilgileri kontrol et. Bu işlem e-posta onayı bekleyen yeni kayıtlar içindir.'},400);
   try{await welcome(s);return json({ok:true,mesaj:'Yeni bağlantı e-posta kuyruğuna alındı. Gelen kutunu ve spam klasörünü kontrol et.'});}catch(e){return json({ok:false,mesaj:String((e as Error).message)},429);}
  }
  return json({ok:false,hata:'guest_retired',mesaj:'Misafir keşfi kaldırıldı. Hesabına giriş yap veya ücretsiz kayıt ol.'},410);
 }
 return {welcome,handle};
}
