const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const security=()=>import(pathToFileURL(require('node:path').resolve('supabase/functions/diji-api/security-guards.mjs')).href);
test('valid small request parses; no-body GET keeps defaults',async()=>{
 const s=await security();
 assert.deepEqual(await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:'{"islem":"giris","ogrenci":"test"}'})),{ok:true,data:{islem:'giris',ogrenci:'test'}});
 assert.deepEqual(await s.readJsonBounded(new Request('https://example.test/')),{ok:true,data:{}});
});
test('reject invalid JSON, arrays, primitives and empty payload',async()=>{
 const s=await security();
 for(const str of ['[1,2]', 'null','5','""','{oops','']){
  const r=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:str}));
  assert.equal(r.ok,false,str);
  assert.equal(r.status,400,str);
 }
});
test('reject streaming request above limit even without content-length',async()=>{
 const s=await security();
 const body=new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array(40));
  controller.enqueue(new Uint8Array(40));
  controller.close();
 }});
 const r=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body,duplex:'half'}),64);
 assert.equal(r.ok,false);assert.equal(r.status,413);
 const tooLarge=await s.readJsonBounded(new Request('https://example.test/',{method:'POST',body:'{"x":"abcdefghijklmnop"}'}),12);
 assert.equal(tooLarge.status,413);
});
test('sensitive account routes are throttled and benign reads remain available',async()=>{
 const s=await security();
 assert.equal(s.anonymousBudgets('seviyeDurumu','1.2.3.4','').length,0);
 assert.equal(s.anonymousBudgets('giris','1.2.3.4','student').length,2);
 assert.equal(s.anonymousBudgets('sifreSifirlamaIste','1.2.3.4','student').length,2);
 assert.equal(s.anonymousBudgets('googleGiris','1.2.3.4','').length,1);
 assert.equal(s.authenticatedBudgets('seviyeOyunOdulu','actor-123',{}).length,1);
 assert.equal(s.authenticatedBudgets('ekonomi','actor-123',{is:'parkurAdim'}).length,1);
 assert.equal(s.authenticatedBudgets('ekonomi','actor-123',{is:'durum'}).length,0);
});
test('API must validate session status, restrict oversized payload and forbid cached credentials',()=>{
 const content=fs.readFileSync('supabase/functions/diji-api/index.ts','utf8');
 assert(content.includes('student.status!=="approved"'));
 assert(content.includes('await readJsonBounded(req'));
 assert(content.includes('anonymousBudgets(op'));
 assert(content.includes('authenticatedBudgets(op'));
 assert(content.includes('"Cache-Control":"no-store"'));
 assert(content.includes('dm_security_rate_check'));
});
