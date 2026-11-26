const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('premium retirement rejects all roles before any DB access',async()=>{
 const src=fs.readFileSync('supabase/functions/premium-games/index.ts','utf8');
 let handler,requests=0;
 const ctx={Deno:{env:{get:()=> 'fixture'},serve:fn=>handler=fn},Response,Request,fetch:()=>{requests++;throw Error('unexpected database request');}};
 vm.runInNewContext(require('node:module').stripTypeScriptTypes(src),ctx);
 for(const game of ['tower','word-blocks','kule','premiumtower','premiumblok']){
  for(const op of ['status','access','start','finish','ad-prepare','ad-redeem']){
   const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({game,op,t:'valid-looking-test-token-'})}));
   assert.equal(response.status,410);
  }
 }
 assert.equal(requests,0);
});
test('legacy tower retired in both teacher and personal sessions; remaining games untouched',async()=>{
 const {retiredStudentOperation,retiredForActor}=await import('../supabase/functions/diji-api/student-game-retirement.mjs');
 for(const actor of [{role:'student'},{role:'student',teacher_portal_access_id:'teacher'},{role:'teacher'},{role:'student',teacherProxy:true}]){
  assert(retiredForActor('kule',actor));
  assert(retiredStudentOperation('verifiedGameStart',{game:'kule'},new URLSearchParams(),actor));
  assert(retiredStudentOperation('kuleLiderlikKaydet',{},new URLSearchParams(),actor));
  assert(!retiredForActor('fener',actor));
 }
});
test('old Block Papi script is an inert compatibility opener',()=>{let toast=0;const window={yoToast:()=>toast++};vm.runInNewContext(fs.readFileSync('ingilizce/premium-word-blocks.js','utf8'),{window});assert.equal(toast,0);window.premiumKelimeBloklariAc();assert.equal(toast,1);});
