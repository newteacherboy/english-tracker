// [Kota 27 Eki 2026] Ödül yeniden deneme: kesin redde 3 denemede bırakılır, ağ hatasında beklenir.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../ingilizce/game-feedback.js','utf8');
const start=src.indexOf('const claimFails=new Map();');
const end=src.indexOf('async function claim(o)');
assert.ok(start>0&&end>start,'yeniden deneme yardımcıları bulunamadı');
function load(){
 const removed=[];let now=1000;
 const ctx={Map,Math,Date:{now:()=>now},remove:id=>removed.push(id)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end)+';this.api={claimDue,claimFailed,claimFails};',ctx);
 return {api:ctx.api,removed,tick:ms=>{now+=ms;}};
}
test('kesin red (409) üç denemeden sonra bekleyen kayıttan çıkar',()=>{
 const {api,removed}=load();const o={runId:'r1'};
 assert.equal(api.claimFailed(o,409),false);
 assert.equal(api.claimFailed(o,409),false);
 assert.equal(api.claimFailed(o,409),true);
 assert.deepEqual(removed,['r1']);
 assert.equal(api.claimFails.has('r1'),false);
});
test('ağ hatası (0) ve sunucu hatası (500) asla bırakılmaz, bekleme artar ve 10 dakikada sınırlanır',()=>{
 const {api,removed,tick}=load();const o={runId:'r2'};
 for(let i=0;i<12;i++)assert.equal(api.claimFailed(o,i%2?500:0),false);
 assert.deepEqual(removed,[]);
 assert.equal(api.claimDue(o),false);
 tick(599000);assert.equal(api.claimDue(o),false);
 tick(1000);assert.equal(api.claimDue(o),true);
});
test('bekleme süresi dolmadan tekrar denenmez',()=>{
 const {api,tick}=load();const o={runId:'r3'};
 assert.equal(api.claimDue(o),true);
 api.claimFailed(o,0);assert.equal(api.claimDue(o),false);
 tick(14999);assert.equal(api.claimDue(o),false);
 tick(1);assert.equal(api.claimDue(o),true);
 api.claimFailed(o,0);tick(15000);assert.equal(api.claimDue(o),false);tick(15000);assert.equal(api.claimDue(o),true);
});
test('oturum hatası (401) ve hız sınırı (429) bırakılmaz',()=>{
 const {api,removed}=load();
 for(let i=0;i<6;i++){api.claimFailed({runId:'a'},401);api.claimFailed({runId:'b'},429);}
 assert.deepEqual(removed,[]);
});
