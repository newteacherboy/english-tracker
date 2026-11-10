const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync('supabase/migrations/20261026204014_revoke_unused_speech_ingest_public_access.sql','utf8');
test('legacy definer RPC loses browser execution while service access and unrelated functions survive',async()=>{
 const db=new PGlite();try{
  await db.exec("create role anon; create role authenticated; create role service_role; create function public.ses_metni_bildir(text,text) returns void language plpgsql security definer as $$begin return; end;$$; create function public.unrelated() returns int language sql as $$select 1$$; grant execute on function public.ses_metni_bildir(text,text) to anon,authenticated,service_role;");
  await db.exec(migration);await db.exec(migration);
  const {rows}=await db.query("select has_function_privilege('anon','public.ses_metni_bildir(text,text)','execute') as anon,has_function_privilege('authenticated','public.ses_metni_bildir(text,text)','execute') as authenticated,has_function_privilege('service_role','public.ses_metni_bildir(text,text)','execute') as service,has_function_privilege('anon','public.unrelated()','execute') as unrelated");
  assert.deepEqual(rows[0],{anon:false,authenticated:false,service:true,unrelated:true});
  await db.exec('set role anon');await assert.rejects(db.query("select public.ses_metni_bildir('test','hello')"),/permission denied/);
 }finally{await db.close();}
});
test('migration also supports environments that never installed the legacy collector',async()=>{
 const db=new PGlite();try{await db.exec(migration);}finally{await db.close();}
});
