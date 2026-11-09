const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../supabase/functions/diji-api/password-security.mjs');
test('six-to-64 character password is accepted without character-type constraints',async()=>{
 const {requireSafePassword}=await load();
 for(const value of ['abcdef','ABCDEF','123456','!?@#._','Ab12!?','password','Papi.1','Çiçekler','a'.repeat(64)]){
  await requireSafePassword(value);
 }
});
test('a third-party breach service cannot prevent registration',async()=>{
 const {requireSafePassword}=await load();
 const throwsNetwork=()=>{throw Error('offline');};
 await requireSafePassword('ZorB1rSifre!24',throwsNetwork);
 await requireSafePassword('123456',throwsNetwork);
});
test('rejects non-string, too short, and too long values',async()=>{
 const {requireSafePassword}=await load();
 for(const value of [null,undefined,5,'','abcde','a'.repeat(65)]){
  await assert.rejects(requireSafePassword(value),/6–64/);
 }
});
