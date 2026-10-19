// İstemcinin kurduğu durak listesi, dm_progress_context migration'ındaki SQL kuralıyla birebir aynı olmalı.
// Uyuşmazlık, sunucunun durağı "Geçerli parkur durağı gerekli" diye reddetmesi anlamına gelir.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function istemci(bank){
 const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');
 const blok=html.slice(html.indexOf("  const EN = k => String((k && (k.ingilizce || k.en)) || '').trim();"),
                       html.indexOf("  const durakSayisi = b =>"));
 const ctx={console,JSON,Math,Map,Set,Array,Number,String,Object,RegExp,Date,
  siniftaOynananOgrenci:'',speechSynthesis:undefined,
  toast(){},oku(){},isim:()=>'Ece',yoVar:()=>false};
 ctx.window=ctx;ctx.window.masterKelimeHavuzu=bank;
 // Sunucu göçü yapılmış sayılır: durak listesinde 300000 bandı görünüyor.
 ctx.window.dmProgression={status:()=>({units:[[300151],[],[],[]]})};
 vm.createContext(ctx);vm.runInContext(blok+'\n;this.__kur=duraklariKur;this.__DURAK=()=>DURAK;',ctx);
 ctx.__kur();
 // vm içindeki diziler farklı prototipte; deepEqual için ana bağlama kopyala.
 return JSON.parse(JSON.stringify(ctx.__DURAK()));
}

// Migration'daki kuralın bağımsız kopyası: kelime durağı (class,unit,part,0), kalıp durağı (class,unit,grp*4,1).
function sqlKurali(bank){
 const kapilar=[[1,2],[3,4],[5,6],[7,8]];
 const anahtar=k=>String(k.ingilizce||'').trim().toLowerCase();
 return kapilar.map(siniflar=>{
  const satirlar=[];
  for(const sn of siniflar){
   const uniteler=[...new Set(bank.filter(k=>Number(k.sinif)===sn).map(k=>Number(k.unite)))].filter(x=>x>0).sort((a,b)=>a-b);
   for(const un of uniteler){
    const hepsi=bank.filter(k=>Number(k.sinif)===sn&&Number(k.unite)===un);
    const kelime=[...new Set(hepsi.filter(k=>k.type!=='pattern').map(anahtar))].length;
    const kalip=hepsi.filter(k=>k.type==='pattern').length;
    if(!kelime)continue;
    const parcalar=Math.ceil(kelime/4);
    for(let p=1;p<=parcalar;p++)satirlar.push({sinif:sn,unite:un,sira:p,tur:0,no:200000+sn*10000+un*100+50+p});
    if(kalip)for(let g=1;g<=Math.ceil(parcalar/4);g++)satirlar.push({sinif:sn,unite:un,sira:g*4,tur:1,no:300000+sn*10000+un*100+50+g});
   }
  }
  return satirlar.sort((a,b)=>a.sinif-b.sinif||a.unite-b.unite||a.sira-b.sira||a.tur-b.tur).map(x=>x.no);
 });
}

const kelime=(sn,un,n)=>Array.from({length:n},(_,i)=>({sinif:sn,unite:un,ingilizce:'w'+sn+un+String(i).padStart(3,'0'),turkce:'k'+i,type:'word'}));
/* index.html'deki VARSAYILAN_UNITE yedeği, kelimesi hiç olmayan bir sınıf için yer tutucu durak üretir
   (main'de de böyle). Gerçek havuzda her sınıfın kelimesi var; fixture da onu taklit eder. */
const doluKapi=()=>[1,2].flatMap(sn=>[1,2,3,4,5,6,7,8].flatMap(un=>kelime(sn,un,4)));
const kalip=(sn,un,n)=>Array.from({length:n},(_,i)=>({sinif:sn,unite:un,ingilizce:'Is it a '+i+' ...?',turkce:'Bu bir ... mi?',type:'pattern',usage_note:'Soru sorarken.'}));

test('istemci ve migration aynı durak listesini aynı sırada üretir',()=>{
 for(const adet of [1,2,3,4,5,6,7,8,9,12,17,32]){
  const bank=[...doluKapi(),...kelime(1,1,adet*4),...kalip(1,1,6)];
  const istemciNo=istemci(bank)[0].map(d=>d.no);
  assert.deepEqual(istemciNo,sqlKurali(bank)[0],adet+' kelime durağı için sıra uyuşmuyor');
 }
});

test('her dört kelime durağından sonra kalıp durağı gelir',()=>{
 const bank=[...doluKapi(),...kelime(1,1,32),...kalip(1,1,6)];   // 1/1'de 8 kelime durağı
 const d=istemci(bank)[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.deepEqual(d.map(x=>x.kalip?'K':'w'),['w','w','w','w','K','w','w','w','w','K']);
 const k=d.filter(x=>x.kalip);
 assert.equal(k.length,2);
 assert.equal(k[0].no,310151);assert.equal(k[1].no,310152);
 assert.equal(k[0].kelimeler.length,16,'kalıp durağı önceki 4 durağın 16 kelimesini çalıştırır');
 assert.equal(k[0].kaliplar.length,6,'ünitenin kalıpları taşınır');
});

test('kalıbı olmayan ünitede kalıp durağı oluşmaz',()=>{
 const d=istemci([...doluKapi(),...kelime(1,1,32)])[0];
 assert.equal(d.filter(x=>x.kalip).length,0,'hiçbir ünitede kalıp durağı yok');
 assert.equal(d.filter(x=>x.sinif===1&&x.unite===1).length,8);
});

test('eksik son grup da kalıp durağını alır',()=>{
 const d=istemci([...doluKapi(),...kelime(1,1,24),...kalip(1,1,4)])[0].filter(x=>x.sinif===1&&x.unite===1);  // 6 kelime durağı -> 2 kalıp grubu
 assert.deepEqual(d.map(x=>x.kalip?'K':'w'),['w','w','w','w','K','w','w','K']);
 assert.equal(d.at(-1).kelimeler.length,8,'son grup kalan kelimelerle çalışır');
});

test('boşluğu olmayan kayıt kalıp durağı kurmaz',()=>{
 const sozde=[{sinif:1,unite:1,ingilizce:'have got',turkce:'sahip olmak',type:'pattern'},
              {sinif:1,unite:1,ingilizce:'There is',turkce:'vardır',type:'pattern'}];
 const d=istemci([...doluKapi(),...kelime(1,1,32),...sozde])[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.equal(d.filter(x=>x.kalip).length,0,'boşluksuz kayıtlar kalıp sayılmaz');
 assert.equal(d.length,8,'kelime durağı sayısı da etkilenmez');
 // Boşluğu olan tek bir kalıp yeterlidir.
 const gercek=[{sinif:1,unite:1,ingilizce:'Is it a ...?',turkce:'Bu bir ... mi?',type:'pattern'}];
 const d2=istemci([...doluKapi(),...kelime(1,1,32),...sozde,...gercek])[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.equal(d2.filter(x=>x.kalip).length,2);
 assert.equal(d2.find(x=>x.kalip).kaliplar.length,1,'yalnızca boşluklu kalıp taşınır');
});

test('öğretmenin çıkardığı kalıp (pattern_usable=false) durak kurmaz',()=>{
 const cikarilan=[{sinif:1,unite:1,ingilizce:'I have got ...',turkce:'Benim ... var.',type:'pattern',pattern_usable:false}];
 const d=istemci([...doluKapi(),...kelime(1,1,32),...cikarilan])[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.equal(d.filter(x=>x.kalip).length,0,'çıkarılan kalıp durak doğurmaz');
 const karisik=[...cikarilan,{sinif:1,unite:1,ingilizce:'Is it a ...?',turkce:'Bu bir ... mi?',type:'pattern'}];
 const d2=istemci([...doluKapi(),...kelime(1,1,32),...karisik])[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.equal(d2.filter(x=>x.kalip).length,2,'kalan sağlam kalıp durağı kurar');
 assert.deepEqual(d2.find(x=>x.kalip).kaliplar.map(k=>k.ingilizce),['Is it a ...?'],'çıkarılan kalıp soruya girmez');
});

test('kalıplar kelime durağına sızmaz',()=>{
 const d=istemci([...doluKapi(),...kelime(1,1,8),...kalip(1,1,3)])[0];
 for(const durak of d.filter(x=>!x.kalip))
  for(const k of durak.kelimeler)
   assert.notEqual(k.type,'pattern','kelime durağında kalıp kartı var: '+k.ingilizce);
});

test('sunucu kalıp duraklarını tanımıyorsa istemci de kurmaz ve kalıpları eskisi gibi sayar',()=>{
 const bank=[...doluKapi(),...kelime(1,1,32),...kalip(1,1,6)];
 const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');
 const blok=html.slice(html.indexOf("  const EN = k => String((k && (k.ingilizce || k.en)) || '').trim();"),
                       html.indexOf("  const durakSayisi = b =>"));
 const ctx={console,JSON,Math,Map,Set,Array,Number,String,Object,RegExp,Date,
  siniftaOynananOgrenci:'',toast(){},oku(){},isim:()=>'Ece',yoVar:()=>false};
 ctx.window=ctx;ctx.window.masterKelimeHavuzu=bank;
 ctx.window.dmProgression={status:()=>({units:[[210151],[],[],[]]})};   // göç yapılmamış
 vm.createContext(ctx);vm.runInContext(blok+'\n;this.__kur=duraklariKur;this.__DURAK=()=>DURAK;',ctx);
 ctx.__kur();
 const d=JSON.parse(JSON.stringify(ctx.__DURAK()))[0].filter(x=>x.sinif===1&&x.unite===1);
 assert.equal(d.filter(x=>x.kalip).length,0,'kalıp durağı kurulmaz');
 assert.equal(d.length,Math.ceil((32+6)/4),'kalıplar eski davranıştaki gibi kelime sayımına girer');
});

test('istemci ve sunucu aynı sabitleri kullanır',()=>{
 const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');
 const sql=fs.readFileSync(__dirname+'/../supabase/migrations/20261020000500_parkur_pattern_stops.sql','utf8');
 const stops=fs.readFileSync(__dirname+'/../supabase/functions/diji-api/parkur-stops.mjs','utf8');
 assert.match(html,/KALIP_DURAK_TABAN\s*=\s*300000/);
 assert.match(html,/KALIP_GRUP_DURAK\s*=\s*4/);
 assert.match(stops,/PARKUR_KALIP_TABAN\s*=\s*300000/);
 assert.match(sql,/300000\+c\.class_no\*10000\+c\.unit_no\*100\+50\+grp/);
 assert.match(sql,/ceil\(ceil\(c\.word_count\/4\.0\)\/4\.0\)/,'kalıp grubu dört kelime durağına karşılık gelir');
 assert.match(sql,/filter \(where coalesce\(extra->>'type','word'\)<>'pattern'\)/,'durak sayımı kalıpları saymaz');
 assert.match(sql,/n:=jsonb_array_length\(word_stops\)/,'kapı tamamlama yalnızca kelime duraklarına bakar');
});
