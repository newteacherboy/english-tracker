const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const c={Intl,Date};vm.createContext(c);vm.runInContext(fs.readFileSync('ingilizce/friends-feed-model.js','utf8'),c);const {DMTime:T,DMFriendsFeed:F}=c;
test('ISO, milliseconds, seconds and Turkish timestamps agree in Istanbul',()=>{const iso='2026-10-24T19:30:00Z',ms=Date.parse(iso);for(const x of [iso,ms,ms/1000,String(ms),'24.10.2026 22:30']){assert.equal(T.parse(x),ms);assert.match(T.format(x),/24 Ekim 2026.*22:30/);}});
test('missing and malformed dates never become NaN or an invented current date',()=>{for(const x of [null,undefined,'','bozuk',NaN,Infinity,{},'2026-99-99']){assert.equal(T.parse(x),null);assert.equal(T.format(x),'Zaman bilgisi yok');}});
test('feed accepts useful milestones and rejects purchases, energy and reward duplicates',()=>{const e=metin=>({metin,t:Date.now()});for(const [text,kind] of [['Yeni bir bölüm tamamladı','route'],['Hafıza Sandığı oyununda 3820 puan kazandı','game'],['Bir hikâye tamamladı','story'],['Yeni rozet kazandı','badge'],['21. seviyeye yükseldi','level'],['Haftalık görevlerini tamamladı','mission'],['7 günlük çalışma serisine ulaştı','streak'],['Süper Lige yükseldi','league']])assert.equal(F.classify(e(text))?.kind,kind,text);for(const text of ['Yeni kıyafet satın aldı','2 enerji hediye etti','Hafıza Sandığı etkinliğinde 40 XP ve 5 altın kazandı'])assert.equal(F.classify(e(text)),null);});
test('games show first completion per day and later personal records, not every round',()=>{const at=Date.parse('2026-10-24T10:00:00Z');const rows=[100,80,90,120,110].map((score,i)=>({k:String(i),ogr:'Ada',t:at+i*60000,metin:'Hafıza Sandığı oyununda '+score+' puan kazandı'}));assert.deepEqual(Array.from(F.select(rows),e=>e.k),[],'routine solo-game scores do not occupy Medu Akış');assert.equal(F.classify(rows[0]).game[1],'hafizaOyunAc');});

test('finalized weekly podium and earned gold/energy are displayed, not a generic league update',()=>{
 const event={metin:'Şampiyonlar Ligi haftasını 1. sırada tamamladı! Kazandığı ödül: 100 altın, 15 enerji.',t:Date.now(),ogr:'Ada'};
 assert.equal(F.classify(event)?.kind,'weekly');
 assert.match(F.summarize(event),/Haftayı 1\. bitirdi/);
 assert.match(F.summarize(event),/100 altın, 15 enerji/);
 assert.equal(F.classify({metin:'Bir düelloya davet etti',t:Date.now()}),null);
});

test('Medu Akış selects only milestones, keeps weekly awards and handles class advancement',()=>{
 const t=Date.parse('2026-11-09T10:00:00Z');
 const messages=[
  'Günün 3 görevini tamamladı ve ödülünü aldı!',
  'Haftalık görevini tamamladı! 75 altın kazandı.',
  'Okul Yolum 7. sınıfta 25 durağı tamamladı! Yeni rozet yolunda!',
  'Okul Yolum 7. sınıf parkurunu bitirdi, 8. sınıfa geçti!',
  'Şampiyonlar Ligi haftasını 2. sırada tamamladı! Kazandığı ödül: 75 altın, 12 enerji.',
  '31. seviyeye yükseldi!',
  'Süper Lig sıralamasında 4. sıradan 3. sıraya yükseldi!',
  'Bir oyunda 100 puan kazandı',
  'Yeni rozet kazandı',
  'Parkurda bir durak tamamladı'
 ];
 const rows=messages.map((metin,i)=>({k:String(i),ogr:'Ada',metin,t:t+i*1000}));
 const selected=Array.from(F.select(rows),r=>r.k);
 assert.deepEqual(selected,['6','5','4','3','2','1','0']);
 assert.equal(F.classify(rows[1]).kind,'weeklyGoal');
 assert.equal(F.classify(rows[2]).kind,'fiveStops');
 assert.equal(F.classify(rows[3]).kind,'classGraduation');
 assert.match(F.summarize(rows[3]),/8\. sınıfa geçti/);
 assert.match(F.summarize(rows[2]),/25 durağı/);
});
