const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
test('retired API rejects every method without parsing credentials, issuing redirects or loading any database code',async()=>{
 const {retiredHandler}=await import(pathToFileURL(require('node:path').resolve('supabase/functions/diji-api-v3-canary/handler.mjs')).href);
 for(const method of ['GET','POST','OPTIONS','PUT','DELETE']){
  let read=false;const request={method,url:'https://example.test/?t=private-token',async json(){read=true;throw Error('must not read');}};
  const result=retiredHandler(request);assert.equal(result.status,410);assert.equal(read,false);
  assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal(result.headers.get('Location'),null);
  assert.equal((await result.json()).ok,false);
 }
 const source=fs.readFileSync('supabase/functions/diji-api-v3-canary/handler.mjs','utf8');
 assert(!/\bfetch\s*\(|createClient|Deno\.env|\.rpc\(/.test(source));
});
