import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, verifyPassword, cleanupAuth, CONFIRMATION } from '../supabase/functions/account-delete/core.mjs';
const salt=new Uint8Array(16).fill(7);
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('correct'),'PBKDF2',false,['deriveBits']);
const hash=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},key,256));
const stored='pbkdf2$210000$'+Buffer.from(salt).toString('base64')+'$'+Buffer.from(hash).toString('base64');
function fixture(options={}) {
  let deleted=0,created=0,lookup='';
  const db={
    from(table){
      const builder={
        select(){return this;},eq(){return this;},ilike(column,value){lookup=value;return this;},limit(){return this;},
        async single(){return {data:{worker_key:'a'.repeat(64)}};},
        async insert(){created++;return {error:options.insertError?{message:'fail'}:null};},
        then(resolve){resolve({data:options.missing?[]:[{id:'own-id',username:'Own account',password_hash:stored}]});}
      };return builder;
    },
    async rpc(name,args){
      if(name==='diji_deletion_rate_allow')return {data:!options.locked};
      if(name==='diji_delete_account'){deleted++;assert.ok(!('account_id' in args));return options.commitError?{error:{message:options.commitError}}:{data:{ok:true}};}
      throw Error('unexpected RPC');
    }
  };
  return {
    async request(body,{method='POST',origin='https://panel.ogretmencocuk.com'}={}){
      const req=new Request('https://example.test/account-delete',{method,headers:{origin,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});
      const response=await handleRequest(req,db);return {status:response.status,data:await response.json()};
    },counts:()=>({deleted,created,lookup})
  };
}
test('PBKDF2 verifier accepts only the correct password and rejects malformed hashes',async()=>{
  assert.equal(await verifyPassword('correct',stored),true);assert.equal(await verifyPassword('wrong',stored),false);
  assert.equal(await verifyPassword('correct','plaintext'),false);
});
test('wrong credentials cannot prepare or delete an account',async()=>{
  const f=fixture();assert.equal((await f.request({operation:'prepare',role:'student',username:'Own account',password:'wrong'})).status,401);
  assert.equal(f.counts().created,0);assert.equal(f.counts().deleted,0);
});
test('reauthentication issues a ticket, never a deletion; names escape wildcards',async()=>{
  const f=fixture();const r=await f.request({operation:'prepare',role:'teacher',username:'own%_name',password:'correct'});
  assert.equal(r.status,200);assert.equal(r.data.ticket.length,73);assert.equal(f.counts().created,1);assert.equal(f.counts().deleted,0);
  assert.equal(f.counts().lookup,'own\\%\\_name');
});
test('rate limits fail before password lookups or ticket creation',async()=>{
  const f=fixture({locked:true});assert.equal((await f.request({operation:'prepare',role:'student',username:'Own',password:'correct'})).status,429);assert.equal(f.counts().created,0);
});
test('confirmation and one-time ticket are mandatory; supplied account IDs are ignored',async()=>{
  const f=fixture();assert.equal((await f.request({operation:'confirm',ticket:'x'.repeat(73),confirmation:'YES',account_id:'victim'})).status,400);assert.equal(f.counts().deleted,0);
  assert.equal((await f.request({operation:'confirm',ticket:'x'.repeat(73),confirmation:CONFIRMATION,account_id:'victim'})).status,200);assert.equal(f.counts().deleted,1);
});
test('last admin is refused and expired/revoked tickets are reported',async()=>{
  for(const [code,status] of [['last_admin',409],['ticket_expired',400],['reauth_required',400]]){
    const f=fixture({commitError:code});const r=await f.request({operation:'confirm',ticket:'x'.repeat(73),confirmation:CONFIRMATION});assert.equal(r.status,status);assert.equal(r.data.ok,false);
  }
});
test('GET and foreign browser origins cannot mutate accounts',async()=>{
  const f=fixture();assert.equal((await f.request(null,{method:'GET'})).status,405);assert.equal((await f.request({operation:'confirm'},{origin:'https://evil.test'})).status,403);assert.equal(f.counts().deleted,0);
});
test('cleanup worker refuses callers without its independent secret',async()=>{
  const f=fixture();assert.equal((await f.request({operation:'cleanup'})).status,403);assert.equal(f.counts().deleted,0);
});
test('ticket storage failures return an error without a false deletion success',async()=>{
  const f=fixture({insertError:true});assert.equal((await f.request({operation:'prepare',role:'student',username:'Own',password:'correct'})).status,503);assert.equal(f.counts().deleted,0);
});
test('Google Auth failures remain queued and a subsequent successful retry removes the queue entry',async()=>{
  let failed=true,removed=0;
  const db={rpc:async()=>({data:[{auth_user_id:'own-auth-id'}]}),auth:{admin:{deleteUser:async()=>({error:failed?{status:500}:null})}},
    from:()=>({delete(){return this;},async eq(){removed++;return {error:null};}})};
  assert.equal(await cleanupAuth(db),0);assert.equal(removed,0);
  failed=false;assert.equal(await cleanupAuth(db),1);assert.equal(removed,1);
});
