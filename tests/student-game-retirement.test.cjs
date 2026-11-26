const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('retired student operations short-circuit before game database access, teacher scopes remain',async()=>{
 const {retiredStudentOperation,retiredGame,personalStudent}=await import('../supabase/functions/diji-api/student-game-retirement.mjs');
 const personal={role:'student',student_id:'p'},teacher={...personal,teacher_portal_access_id:'granted'},legacy={...personal,teacherProxy:true},q=new URLSearchParams();
 for(const game of ['jp','jeopardy','kelimebul','dikte','canavar','harfbahcesi','tren','cumle']){
  assert(retiredGame(game));for(const op of ['verifiedGameStart','soloLevelStatus','soloLevelComplete','seviyeOyunOdulu']){
   assert(retiredStudentOperation(op,{game},q,personal));assert(!retiredStudentOperation(op,{game},q,teacher));assert(!retiredStudentOperation(op,{game},q,legacy));
  }
 }
 for(const op of ['molaDurum','molaBaslat','molaBitir','molaSiralama','molaBolumGec','jeopardyLiderlikKaydet','kelimebulLiderlikTumunuGetir','dikteLiderlikKaydet','canavarLiderlikKaydet','harfBahcesiLiderlikKaydet','trenLiderlikTumunuGetir','cumleLiderlikKaydet']){
  assert(retiredStudentOperation(op,{},q,personal));assert(!retiredStudentOperation(op,{},q,teacher));
 }
 for(const game of ['ky','ba','hafiza','fener'])assert(!retiredStudentOperation('verifiedGameStart',{game},q,personal));
 assert(!personalStudent(teacher));assert(!personalStudent(legacy));
});
test('student Mola script does not mount, schedule, register or request anything',()=>{
 const trap=()=>{throw Error('student Mola performed work');},window={dmTeacherPortalMode:false,addEventListener:trap};
 vm.runInNewContext(fs.readFileSync('ingilizce/mola-vakti.js','utf8'),{window,document:new Proxy({},{get:trap}),setInterval:trap,fetch:trap});
 assert.equal(window.dmMola,undefined);
});
test('retired Mola API calls never reach a database for a personal student',async()=>{
 const source=fs.readFileSync('supabase/functions/diji-api/break-games-api.ts','utf8');
 const context={};vm.createContext(context);vm.runInContext(require('node:module').stripTypeScriptTypes(source).replace('export ', '')+';globalThis.build=breakGamesAPI;',context);
 let calls=0;const handler=context.build({rpc:async()=>{calls++;return {data:{ok:true},error:null}}},(body,code=200)=>({body,code}));
 const q=new URLSearchParams(),a={role:'student',student_id:'p'};
 for(const op of ['molaDurum','molaBaslat','molaBitir','molaSiralama','molaBolumGec'])assert.equal((await handler.handle(op,{},q,a,'POST')).code,410);
 assert.equal(calls,0);assert.equal((await handler.handle('molaDurum',{},q,{...a,teacher_portal_access_id:'grant'},'POST')).code,200);assert.equal(calls,1);
});

test('newly retired free games never open from student deep links',()=>{
 const source=fs.readFileSync('ingilizce/app-js/i17-kelime-treni.js','utf8');
 const ctx={window:{yoToast:()=>{}},document:{addEventListener(){},getElementById(){return {}}},aktifOgrenciAdi:'learner'};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.document=new Proxy({},{get(){throw Error('retired train touched DOM')}});ctx.trenOyunAc();return ctx.trenOyunuBaslat();
});
