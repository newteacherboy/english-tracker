// Kalıp durağı: 12 doğrulanmış kalıp sorusu, boşluk doldurma, ve kelime durağının bozulmadığı.
const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../supabase/functions/diji-api/verified-games.mjs');
const stops=()=>import('../supabase/functions/diji-api/parkur-stops.mjs');
const words=[{en:'pencil',tr:'kalem'},{en:'book',tr:'kitap'},{en:'ruler',tr:'cetvel'},{en:'bag',tr:'çanta'}];
const patterns=[
 {en:'I have got a ...',tr:'Benim bir ... var.',note:'Sahip olduğun bir şeyi söylerken.'},
 {en:'Is it a ...?',tr:'Bu bir ... mi?',note:'Bir eşyanın ne olduğunu kontrol ederken.'},
 {en:'Where is the ...?',tr:'... nerede?',note:'Bir eşyanın yerini sorarken.'}];

test('durak numaraları: kelime bandı 200000, kalıp bandı 300000, sınıf ve ünite doğru çözülür',async()=>{
 const s=await stops();
 assert.equal(s.kalipDuragiMi(220254),false);assert.equal(s.kalipDuragiMi(320251),true);
 assert.equal(s.durakSinif(220254),2);assert.equal(s.durakUnite(220254),2);assert.equal(s.durakParca(220254),3);
 assert.equal(s.durakSinif(320251),2,'kalıp durağında sınıf 12 değil 2');
 assert.equal(s.durakUnite(320251),2);assert.equal(s.durakParca(320251),0);
 assert.equal(s.durakSinif(381055),8);assert.equal(s.durakUnite(381055),10);
});

test('kalıp durağı tam 12 görev üretir ve her görev kendi doğru cevabıyla geçer',async()=>{
 const c=await load(),deck=c.compile('ba',words,patterns);
 assert.equal(deck.length,12,'sunucu her parkur durağında 12 cevap şartı koyuyor');
 for(const [i,t] of deck.entries()){
  const answer=t.kind==='patternTeach'?true:t.expected;
  assert.equal(c.grade(t,answer,'ba').correct,true,'görev '+i+' ('+t.kind+')');
  assert.equal(c.grade(t,answer,'ba').complete,true,'görev '+i+' tamamlanmış sayılmalı');
 }
 assert.equal(deck.filter(t=>t.kind==='patternTeach').length,2,'tanıtım iki tur');
 assert.deepEqual([...new Set(deck.map(t=>t.kind))],c.kalipTypes);
});

test('boşluk kelimeyle doldurulur, Türkçesi de birlikte dolar',async()=>{
 const c=await load();
 assert.equal(c.kalipDoldur('I have got a ...','pencil'),'I have got a pencil');
 assert.equal(c.kalipDoldur('Benim bir ... var.','kalem'),'Benim bir kalem var.');
 assert.equal(c.kalipDoldur('... nerede?','kitap'),'kitap nerede?');
 const deck=c.compile('ba',words,patterns);
 const tamamla=deck.find(t=>t.kind==='patternComplete');
 assert.equal(tamamla.expected,tamamla.word,'boşluğa gelen kelime beklenen cevap');
 assert.ok(tamamla.en.includes(tamamla.word),'cümle o kelimeyi içerir');
 assert.ok(!tamamla.en.includes('...'),'doldurulmuş cümlede boşluk kalmaz');
 assert.ok(tamamla.pattern.includes('...'),'kalıbın kendisi boşluğunu korur');
 assert.ok(tamamla.note.length>0,'çocuğa gösterilecek açıklama taşınır');
});

test('iki tur farklı kalıp ve farklı kelime kullanır',async()=>{
 const c=await load(),deck=c.compile('ba',words,patterns);
 for(let i=0;i<6;i++){
  const a=deck[i],b=deck[i+6];
  assert.equal(a.kind,b.kind,'aynı görev tipi');
  assert.notEqual(a.pattern+'|'+a.word,b.pattern+'|'+b.word,'görev '+i+' iki turda aynı soruyu sormaz');
 }
});

test('patternTeach yalnızca onay kabul eder, metin cevabı geçersizdir',async()=>{
 const c=await load(),deck=c.compile('ba',words,patterns);
 const tanit=deck.find(t=>t.kind==='patternTeach');
 assert.equal(c.grade(tanit,true,'ba').valid,true);
 assert.equal(c.grade(tanit,'I have got a pencil','ba').valid,false,'tanıtım görevinde metin gönderilemez');
});

test("Papi'nin hatası görevinde doğru cümle beklenir",async()=>{
 const c=await load(),deck=c.compile('ba',words,patterns);
 const hata=deck.find(t=>t.kind==='hata');
 assert.equal(c.grade(hata,hata.en,'ba').correct,true,'doğru cümle kabul edilir');
 const bozuk=hata.en.trim().split(/\s+/).reverse().join(' ');
 assert.notEqual(bozuk,hata.en.trim());
 assert.equal(c.grade(hata,bozuk,'ba').correct,false,'sırası bozulmuş cümle reddedilir');
 assert.equal(c.grade(hata,hata.word,'ba').correct,false,'tek kelime cevap yetmez');
 assert.equal(c.grade(hata,true,'ba').valid,false,'boolean gönderilemez');
});

test('kalıp verilmeyince kelime durağı bugünkü 12 mekaniğiyle aynı kalır',async()=>{
 const c=await load();
 const eski=c.compile('ba',words),yeni=c.compile('ba',words,[]);
 assert.deepEqual(yeni,eski,'üçüncü argüman boşken davranış değişmez');
 assert.deepEqual(eski.map(t=>t.kind),c.types,'kelime durağının görev sırası korunur');
 assert.equal(eski.length,12);
});
