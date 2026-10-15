'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('only the authenticated fixed student UUID receives demo restrictions',async()=>{
 const {isDemo,DEMO_ID,DEMO_BLOCKED}=await import('../supabase/functions/diji-api/demo-account.ts');
 assert.equal(isDemo({role:'student',student_id:DEMO_ID}),true);
 for(const a of [null,{role:'student',student_id:'other',username:'dijimedu_demo'},{role:'teacher',student_id:DEMO_ID}])assert.equal(isDemo(a),false);
 for(const op of ['kisiselBilgiGuncelle','sohbetMesajGonder','sifreDegistir','sifremiDegistir'])assert.ok(DEMO_BLOCKED.has(op));
});
test('demo restrictions precede request handlers and deletion ticket issuance',()=>{
 const api=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 assert.ok(api.indexOf('DEMO_BLOCKED.has(op)')<api.indexOf('const memberResponse='));
 const deletion=fs.readFileSync('supabase/functions/account-delete/core.mjs','utf8');
 assert.ok(deletion.indexOf("username.toLocaleLowerCase('tr')==='dijimedu_demo'")<deletion.indexOf("const ticket = crypto.randomUUID()"));
 new vm.Script(fs.readFileSync('ingilizce/demo-account.js','utf8'));
});
