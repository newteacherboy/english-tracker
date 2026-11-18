// [18 Kas 2026] Öğretmen panelinde sınıf oturumunun sunucunun reddettiği işlemleri sunucuya gitmez.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
function fixture(role='participant'){
 const store=new Map([['ing_token','pupil-token'],['ing_aktifOgrenci','Pupil']]);
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i],get length(){return store.size;}};
 const document={hidden:false,addEventListener(){},removeEventListener(){}};
 const calls=[],window={fetch:async(u,o)=>{calls.push({u,o});return new Response(JSON.stringify({ok:true}));},addEventListener(){},
  dmTeacherPortalMode:true,dmTeacherRequestRole:()=>role,dmTeacherRequestToken:()=>role==='teacher'?'teacher-token':'pupil-token'};
 const ctx={window,document,localStorage:storage,sessionStorage:{getItem:()=>null},location:{href:'https://panel.test/ingilizce/'},Date,Headers,Response,URL,Map,Set,Object,Promise,JSON,setTimeout,console};
 vm.runInNewContext(fs.readFileSync('ingilizce/request-budget.js','utf8'),ctx);
 return {window,calls,post:(op,args={})=>window.fetch(API,{method:'POST',body:JSON.stringify({islem:op,...args})}),get:(q)=>window.fetch(API+'?'+q)};
}
test('participant personal reads are answered locally with the server 403',async()=>{
 const f=fixture();
 for(const op of ['bildirimlerim','benimIstatistik','safetyStatus','yayinOzellikleri','haftalikPerformans','kaydet','routeGraduations']){
  const r=await f.post(op);assert.equal(r.status,403);assert.equal((await r.json()).mesaj,'Bu işlem için kişisel hesabına geç.');
 }
 const g=await f.get('islem=akisOlaylariGetir&ogrenci=Pupil');assert.equal(g.status,403);
 assert.equal(f.calls.length,0);
});
test('allowed classroom operations still reach the server',async()=>{
 const f=fixture();
 await f.post('seviyeDurumu');await f.post('ekVeriGetir',{anahtar:'yo'});await f.post('ekonomi',{is:'durum'});await f.post('verifiedGameStart');await f.post('eslestirmeLiderlikKaydet');await f.post('oturumBilgisi');
 assert.equal(f.calls.length,6);
 const denied=await f.post('ekVeriGetir',{anahtar:'gizli'});assert.equal(denied.status,403);assert.equal(f.calls.length,6);
});
test('teacher role and explicit other tokens are never short-circuited',async()=>{
 const t=fixture('teacher');await t.post('bildirimlerim');assert.equal(t.calls.length,1);
 const p=fixture();await p.get('islem=bildirimlerim&t=teacher-token');assert.equal(p.calls.length,1);
});
