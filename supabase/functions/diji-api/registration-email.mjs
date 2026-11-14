// Cheap common-provider checks; custom organizational domains require a live MX record.
const providers=new Set(['gmail.com','googlemail.com','hotmail.com','hotmail.com.tr','outlook.com','outlook.com.tr','live.com','live.com.tr','msn.com','yahoo.com','yahoo.com.tr','yahoo.co.uk','ymail.com','icloud.com','me.com','mac.com','proton.me','protonmail.com','yandex.com','yandex.com.tr','yandex.ru','aol.com','gmx.com','gmx.de','mail.com','zoho.com','tuta.com','tutanota.com','mynet.com','windowslive.com']);
const blocked=new Set(['hogmail.com','gtmail.com','gmai.com','gmial.com','gamil.com','gmaill.com','gmail.con','gmail.co','hotmial.com','hotmai.com','hotnail.com','outlok.com','outlook.con','mailinator.com','tempmail.com','10minutemail.com','guerrillamail.com','yopmail.com','example.com','example.org','example.net','test.com']);
const cache=new Map();
export function emailDomainProblem(value){
 const email=String(value||'').trim().toLowerCase();
 if(email.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(email)||email.includes('..'))return 'Geçerli bir e-posta adresi yaz.';
 const domain=email.split('@')[1];
 if(blocked.has(domain)||domain.split('.').some(p=>p.startsWith('-')||p.endsWith('-')))return 'E-posta sağlayıcısını kontrol et. Gmail, Hotmail, Outlook veya geçerli kurum adresini doğru yaz.';
 return '';
}
export async function validateRegistrationEmail(value,request=fetch){
 const problem=emailDomainProblem(value);if(problem)return {ok:false,message:problem};
 const domain=String(value).trim().toLowerCase().split('@')[1];if(providers.has(domain))return {ok:true};
 const prior=cache.get(domain);if(prior&&prior.until>Date.now())return prior.result;
 try{
  const r=await request('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(domain)+'&type=MX',{headers:{Accept:'application/dns-json'},signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw Error('dns');const d=await r.json();
  if(d.Status!==0&&d.Status!==3)throw Error('dns');
  const ok=d.Status===0&&Array.isArray(d.Answer)&&d.Answer.some(a=>a.type===15&&/^\d+\s+(?!\.$)[a-z0-9.-]+\.?$/i.test(a.data));
  const result=ok?{ok:true}:{ok:false,message:'Bu alan adı e-posta alamıyor. E-posta adresini kontrol et.'};
  if(cache.size>1000)cache.clear();cache.set(domain,{until:Date.now()+3600000,result});return result;
 }catch{return {ok:false,temporary:true,message:'E-posta alan adı şu anda doğrulanamadı. Kısa süre sonra tekrar dene.'};}
}
