const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8');
function policy(){const c={URLSearchParams,location:{search:''}};vm.runInNewContext(code,c);return c.DMTeacherRequestPolicy;}
test('legacy teacher operations use the teacher session including missing report/announcement endpoints',()=>{
 const p=policy();for(const op of ['ogretmenBilgim','teacherPlacementResults','ogretmenSohbetListesi','ogretmenCevapGonder','bekleyenKayitlariGetir','kayitOnayla','rubrikKaydet','sinifIciPuanVer','odevVer','odevSil','odevListesiOgretmen','duyuruListesiGetir','duyuruEkle','duyuruSil','etkinlikAta','disLinkEtkinlikAta','etkinlikTanimlariGetir','tumVideolariGetir','videoOgrenciEkle','planTikGuncelle','ozellikListesiGetir','ekVeriTumu','haftalikVeliRaporu','raporMail','ogrenciSifreSifirla'])assert.equal(p.isTeacher(op),true,op);
});
test('root teacher data and another pupil report are scoped to tools; gameplay keeps participant session',()=>{
 const p=policy(),ctx={tools:true,participant:'Preview'};
 assert.equal(p.isTeacher('',{},ctx),true);assert.equal(p.isTeacher('',{},{tools:false}),false);
 assert.equal(p.isTeacher('ekVeriGetir',{ogrenci:'Ada'},ctx),true);
 assert.equal(p.isTeacher('ekVeriGetir',{ogrenci:'Preview'},ctx),false);
 for(const op of ['oturumBilgisi','enerjiDurumuGetir','ekonomi','verifiedGameStart','companionSummary','bildirimlerim','seviyeDurumu'])assert.equal(p.isTeacher(op,{},ctx),false,op);
});
function prepareFixture(response,identity=()=>({teacherToken:'owner-token'})){
 const s=fs.readFileSync('ingilizce/teacher-portal.js','utf8'),start=s.indexOf(' async function prepareTeacherTools(){'),end=s.indexOf(' async function legacyTool(',start),saved=new Map();
 const ctx={requestAnimationFrame:f=>f(),paginateDashboard(){},preparingTools:null,globalDataCache:[{ogrenci:'stale'}],state:identity,api:response,window:{},sessionStorage:{setItem:(k,v)=>saved.set(k,v)},document:{querySelector:()=>null,getElementById:()=>null}};
 vm.runInNewContext(s.slice(start,end),ctx);return {ctx,saved};
}
test('fresh teacher lists replace preview data and an empty teacher list clears previous pupils',async()=>{
 for(const rows of [[{ogrenci:'Ada'}],[]]){
  const calls=[],f=prepareFixture(async(op,data,t)=>{calls.push({op,t});return op?{ok:true,kullanici:'ActualTeacher',yonetici:false}:rows;});
  await f.ctx.prepareTeacherTools();assert.equal(f.ctx.globalDataCache,rows);assert.equal(f.saved.get('ing_ogr_token'),'owner-token');assert.equal(f.saved.get('ing_ogr_ad'),'ActualTeacher');assert.deepEqual(calls.map(x=>x.t),['owner-token','owner-token']);
 }
});
test('failed or stale teacher data never replaces the current account list',async()=>{
 let owner='owner-token',release;const f=prepareFixture(op=>op?Promise.resolve({ok:true}):new Promise(r=>release=r),()=>({teacherToken:owner}));
 const p=f.ctx.prepareTeacherTools();owner='new-owner';release([{ogrenci:'OldOwnerPupil'}]);await assert.rejects(p,/hesabı değişti/);assert.equal(f.ctx.globalDataCache[0].ogrenci,'stale');assert.equal(f.saved.size,0);
 const g=prepareFixture(async()=>{throw Error('offline');});await assert.rejects(g.ctx.prepareTeacherTools(),/offline/);assert.equal(g.ctx.globalDataCache[0].ogrenci,'stale');assert.equal(g.ctx.preparingTools,null);
});

test('Papi Cards uses the teacher session for self-play and participant session for chosen-pupil play',()=>{for(const op of ['papiKartSonucKaydet','papiKartSiralamaGetir']){assert.equal(policy().isTeacher(op,{}, {self:true}),true);assert.equal(policy().isTeacher(op,{}, {self:false}),false);}assert.equal(policy().isTeacher('verifiedGameStart',{}, {self:true}),false);});
