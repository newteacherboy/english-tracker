// Pwned Passwords range API: send five SHA-1 characters, never the password or full hash.
export class PasswordPolicyError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export async function requireSafePassword(password,request=fetch){
 if(typeof password!=='string'||password.length<8||password.length>64)throw new PasswordPolicyError('Yeni şifre 8–64 karakter olmalı.');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(password)))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
 let response;try{response=await request('https://api.pwnedpasswords.com/range/'+digest.slice(0,5),{headers:{'Add-Padding':'true','User-Agent':'DijiMedu-Password-Security'},signal:AbortSignal.timeout(5000)});}catch{throw new PasswordPolicyError('Şifre güvenlik kontrolüne ulaşılamadı. Biraz sonra tekrar dene.',503);}
 if(!response.ok)throw new PasswordPolicyError('Şifre güvenlik kontrolü şu anda tamamlanamadı.',503);
 const text=await response.text();
 const lines=text.trim().split(/\r?\n/);if(text.length>250000||!lines.length||lines.some(x=>!/^([0-9A-F]{35}):\d+$/i.test(x)))throw new PasswordPolicyError('Şifre güvenlik yanıtı doğrulanamadı.',503);
 if(lines.some(line=>{const [suffix,count]=line.split(':');return suffix.toUpperCase()===digest.slice(5)&&Number(count)>0;}))throw new PasswordPolicyError('Bu şifre daha önce sızdırılmış. Farklı ve daha uzun bir şifre seç.');
}
