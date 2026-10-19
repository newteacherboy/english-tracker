const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../ingilizce/index.html','utf8');
test('every in-app reward names a server reward reason (retired chest flow excepted)',()=>{
 const calls=[...html.matchAll(/yoXpEkle\(([^;]*?)\);/g)].map(m=>m[1]).filter(a=>!/^xp, altin, neden, anahtar$/.test(a));
 const untagged=calls.filter(a=>!/'(sana_ozel_gunluk|etkinlik|video|seviye_bonus|kombo|sohbet|oyun_sonu|duello|lig|enerji_altin|ders_tekrar)'/.test(a));
 assert.deepEqual(untagged,['xp, al'],'only the retired chest ceremony may stay untagged: '+JSON.stringify(untagged));
 assert.match(html,/function yoXpEkle\(xp, altin, neden, anahtar\)/);
 assert.match(html,/window\.dmOdulYaz\?\.\(xp, altin, neden, anahtar\)/);
 assert.doesNotMatch(html,/if \(altin > 0\) window\.dmEkonomi\?\.kazan\(altin\)/,'gold is no longer sent to the ignoring compatibility endpoint');
});
test('dmOdulYaz sends the reward to the server and applies the returned wallet',async()=>{
 const src=fs.readFileSync(__dirname+'/../ingilizce/ekonomi.js','utf8');const sent=[],applied=[];
 const w={document:{hidden:false,addEventListener(){}},aktifOgrenciAdi:'Ece',yo:{altin:10,ekoV:2},siniftaOynananOgrenci:'',dmGuestMode:false,dmApplyRewardState:(y,o)=>applied.push([y.totalXp,o]),setInterval(){},setTimeout,clearTimeout,localStorage:{getItem:()=>'tok'},console};
 w.window=w;w.fetch=async(url,o)=>{const b=JSON.parse(o.body);sent.push(b);return {ok:true,json:async()=>(b.is==='odulTalep'?{ok:true,eklenen:2,xp:10,yo:{totalXp:110,dmRewardVersion:5},ekonomi:{altin:12}}:{ok:true,ekonomi:{altin:10}})};};
 vm.createContext(w);vm.runInContext('var apiURL="https://papi.test/api";'+src,w);
 assert.equal(typeof w.dmOdulYaz,'function');
 await w.dmOdulYaz(10,2,'etkinlik','12');
 const req=sent.find(b=>b.is==='odulTalep');assert(req,'server request sent');assert.equal(req.islem,'ekonomi');assert.equal(req.neden,'etkinlik');assert.equal(req.anahtar,'12');assert.equal(req.xp,10);assert.equal(req.altin,2);
 assert.deepEqual(applied,[[110,'Ece']]);
});
