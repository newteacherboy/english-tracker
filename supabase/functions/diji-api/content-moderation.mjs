// Apply only to user-published text, never credentials or learning answers.
export function normalizeContent(value){return String(value||'').normalize('NFKC').toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu,'').replace(/[ı]/g,'i').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,'').replace(/[013457@$]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'}[c]));}
const severe=['amk','aq','siktir','orospu','yarrak','pic','fuck','shit','bitch','porn','porno'];
export function contentIssue(value,{publicText=false}={}){
 const text=normalizeContent(value),words=text.match(/[a-z]+/g)||[];
 if(severe.some(term=>words.some(word=>word===term||(['fuck','siktir','orospu','yarrak','porno'].includes(term)&&word.startsWith(term)))))return 'language';
 const squeezed=text.replace(/[^a-z]/g,'');
 // Catch letter-spacing, punctuation and repeated-letter bypasses for unambiguous terms only.
 if(['siktir','orospu','yarrak','fuck','porno'].some(term=>squeezed.includes(term)||squeezed.replace(/(.)\1+/g,'$1').includes(term)))return 'language';
 if(/\b(seni oldur[a-z]*|geber[a-z]*|kill yourself|i will kill you|go die)\b/.test(text))return 'threat';
 if(publicText&&(/(?:https?:\/\/|www\.)\S+/i.test(text)||/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(String(value))||/(?:\+?\d[\s().-]*){10,}/.test(String(value))))return 'personal_info';
 return null;
}
const fields={kayitOl:['ogrenciAdi','adSoyad','okul'],googleKayit:['ogrenciAdi','adSoyad','okul'],appleKayit:['ogrenciAdi','adSoyad','okul'],ogretmenKayitOl:['kullaniciAdi','adSoyad','kurum'],kisiselBilgiGuncelle:['adSoyad','okul'],kisiselBilgilerGuncelle:['adSoyad','okul'],bildirimGonder:['metin'],sohbetMesajGonder:['mesaj'],ogretmenCevapGonder:['mesaj'],duyuruEkle:['baslik','mesaj']};
export function moderationIssue(op,body,q){for(const key of fields[op]||[]){const issue=contentIssue(body[key]??q?.get(key),{publicText:op==='bildirimGonder'});if(issue)return issue;}return null;}
