// Low-volume, unauthenticated denial checks for this project's deployed services.
// Sends no credentials, creates no accounts and never invokes a mail endpoint.
import assert from 'node:assert/strict';
const base='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/';
for(const [slug,body] of [
 ['diji-api',{islem:'oturumBilgisi'}],
 ['thematic-learning',{action:'status'}],
 ['teacher-oral',{action:'setup'}],
 ['kelime-rallisi',{action:'setup'}],
 ['papi-chat',{action:'status'}],
 ['diji-api-v3-canary',{}]
]){
 const response=await fetch(base+slug,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,t:'security-invalid-'+crypto.randomUUID()}),signal:AbortSignal.timeout(15000),redirect:'manual'});
 const expected=slug==='diji-api-v3-canary'?[410]:[401,403];
 assert(expected.includes(response.status),slug+' unexpected status '+response.status);
 assert.equal(response.headers.get('Location'),null,slug+' must not redirect credentials');
 assert.match(response.headers.get('Cache-Control')||'',/no-store/i,slug+' must not cache auth responses');
 await response.arrayBuffer();console.log('PASS '+slug+' rejects invalid session: '+response.status);
}
for(const slug of ['thematic-learning','teacher-oral','kelime-rallisi','papi-chat']){
 for(const [body,status] of [['null',400],[JSON.stringify({action:'status',pad:'x'.repeat(9000)}),413]]){
  const response=await fetch(base+slug,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000),redirect:'manual'});
  assert.equal(response.status,status,slug+' rejects invalid/oversized input');
  await response.arrayBuffer();console.log('PASS '+slug+' rejects invalid body: '+status);
 }
}
