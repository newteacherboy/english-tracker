const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../supabase/functions/diji-api/password-security.mjs');
test('sends only five hash characters with padding; rejects a known leaked password',async()=>{
 const p=await load();await assert.rejects(p.requireSafePassword('password',async(url,opts)=>{assert.equal(url,'https://api.pwnedpasswords.com/range/5BAA6');assert.equal(opts.headers['Add-Padding'],'true');return new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:1000');}),/sızdırılmış/);
});
test('rejects weak lengths and unavailable or malformed service responses',async()=>{
 const p=await load();await assert.rejects(p.requireSafePassword('short',()=>{throw Error('must not call')}),/6–64/);
 await assert.rejects(p.requireSafePassword('SomeLongPassword#928',async()=>{throw Error('offline')}),e=>e.status===503);
 await assert.rejects(p.requireSafePassword('SomeLongPassword#928',async()=>new Response('not a range')),e=>e.status===503);
 await p.requireSafePassword('SomeLongPassword#928',async()=>new Response('00000000000000000000000000000000000:0'));
});

test('accepts six-character passwords without character-class requirements',async()=>{
 const p=await load();
 for(const value of ['abcdef','ABCDEF','123456','!?@#._','Ab12!?']){
  let checked=false;
  await p.requireSafePassword(value,async()=>{checked=true;return new Response('00000000000000000000000000000000000:0');});
  assert.equal(checked,true);
 }
 await assert.rejects(p.requireSafePassword('a'.repeat(65),()=>{throw Error('must not call')}),/6–64/);
});
