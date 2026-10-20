'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('only the authenticated fixed student UUID receives demo restrictions',async()=>{
 const {isDemo,DEMO_ID,DEMO_BLOCKED}=await import('../supabase/functions/diji-api/demo-account.ts');
 assert.equal(isDemo({role:'student',student_id:DEMO_ID}),true);
 for(const a of [null,{role:'student',student_id:'other',username:'dijimedu_demo'},{role:'teacher',student_id:DEMO_ID}])assert.equal(isDemo(a),false);
 for(const op of ['sohbetMesajGonder','sifreDegistir','sifremiDegistir','iletisimGuncelle'])assert.ok(DEMO_BLOCKED.has(op));
 // Demo hesabı oyun, parkur, sosyal ve kişisel bilgi ekranlarını kullanabilir (20 Eki 2026).
 for(const op of ['kisiselBilgiGuncelle','sohbetGetir','enerjiGonder','duelloGonder','akisOlayToggle'])assert.equal(DEMO_BLOCKED.has(op),false);
});
test('demo restrictions precede request handlers and deletion ticket issuance',()=>{
 const api=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 assert.ok(api.indexOf('DEMO_BLOCKED.has(op)')<api.indexOf('const memberResponse='));
 const deletion=fs.readFileSync('supabase/functions/account-delete/core.mjs','utf8');
 assert.ok(deletion.indexOf("username.toLocaleLowerCase('tr')==='dijimedu_demo'")<deletion.indexOf("const ticket = crypto.randomUUID()"));
 new vm.Script(fs.readFileSync('ingilizce/demo-account.js','utf8'));
});
