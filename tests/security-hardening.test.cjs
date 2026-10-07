const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../supabase/functions/diji-api/index.ts'),'utf8');
const {stripTypeScriptTypes}=require('node:module');
function extract(start,end){const i=src.indexOf(start);assert(i>=0,'missing '+start);return src.slice(i,src.indexOf(end,i));}
const helpers=stripTypeScriptTypes(extract('const TAKMA_AD','async function denemeYaz'),{mode:'transform'});
const H=new Function(helpers+';return {TAKMA_AD,AD_SOYAD,sadeHarf,istemciIp};')();
const req=h=>({headers:{get:k=>h[k.toLowerCase()]??null}});

test('client IP prefers the Cloudflare header and ignores a spoofed first x-forwarded-for value',()=>{
  assert.equal(H.istemciIp(req({'cf-connecting-ip':'203.0.113.9','x-forwarded-for':'1.1.1.1, 203.0.113.9'})),'203.0.113.9');
  assert.equal(H.istemciIp(req({'x-forwarded-for':'6.6.6.6, 198.51.100.4'})),'198.51.100.4');
  assert.equal(H.istemciIp(req({})),'bilinmiyor');
});
test('nickname rule rejects real names and the same-name check folds Turkish letters',()=>{
  for(const ok of ['yildiz42','papi_fan','a.b-c'])assert(H.TAKMA_AD.test(ok),ok);
  for(const bad of ['Ayşe Yılmaz','ab','x'.repeat(21),'<b>'])assert(!H.TAKMA_AD.test(bad),bad);
  assert.equal(H.sadeHarf('AyseYilmaz'),H.sadeHarf('Ayşe Yılmaz'));
  assert.notEqual(H.sadeHarf('yildiz42'),H.sadeHarf('Ayşe Yılmaz'));
});
test('new teachers wait for admin approval and only pending registrations can be rejected',()=>{
  const signup=extract('if (op === "ogretmenKayitOl")','if (op === "ogretmenBilgim")');
  assert(/active: false/.test(signup)&&!/active: true/.test(signup));
  assert(/onayBekliyor: true/.test(signup));
  const reject=extract('if (op === "kayitOnayla" || op === "kayitReddet")','return json({ status: "success" });');
  assert(/op === "kayitReddet" && s\.status !== "pending"/.test(reject));
  assert(/portal_sessions"\)\.delete\(\)\.eq\("student_id", s\.id\)/.test(reject));
});
test('teacher-only reads, https-only external links and owned leaderboard rows',()=>{
  assert(/requireTeacher\(a\)/.test(extract('if (op === "etkinlikTanimlariGetir"','const video')));
  assert(/requireTeacher\(a\)/.test(extract('if (op === "ozellikListesiGetir")','const { data }')));
  const link=extract('if (op === "disLinkEtkinlikAta") {','// [YAMA 23]');
  assert(/u\.protocol !== "https:"/.test(link)&&/!a\.yonetici/.test(link));
  assert(/if \(!s\?\.id\) return bulunamadi\(\);\n  const v3/.test(src));
});
test('student notification text loses links and phone-like numbers but keeps normal words',()=>{
  const line=src.split('\n').find(l=>l.includes('if (a?.role === "student") metin = metin'));
  const expr=line.slice(line.indexOf('metin = metin')+'metin = '.length,line.lastIndexOf(';'));
  const clean=new Function('metin','return '+expr);
  assert.equal(clean('Bravo.Merhaba harika'),'Bravo.Merhaba harika');
  assert.equal(clean('beni ara 0555 123 45 67'),'beni ara');
  assert.equal(clean('bak https://kotu.site/x ve kotu.com'),'bak ve');
  assert.equal(clean('Kelime oyununda 1451 puan'),'Kelime oyununda 1451 puan');
});
