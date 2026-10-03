import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
// Install the pinned test dependency outside the repository:
// npm install --prefix /tmp/diji-deletion-qa @electric-sql/pglite@0.5.8
const { PGlite } = require(process.env.DIJI_QA_MODULES || '/tmp/diji-deletion-qa/node_modules/@electric-sql/pglite');
const read = path => fs.readFile(new URL(path, import.meta.url), 'utf8');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema extensions;
-- Local substitute only: production uses the installed pgcrypto CSPRNG.
create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$
select decode(left(string_agg(replace(gen_random_uuid()::text,'-',''),''),n*2),'hex') from generate_series(1,n)
$$;`);
await db.exec(await read('./schema-snapshot.sql'));
const migration=await read('../supabase/account-deletion.sql');
// pg_cron/pg_net do not exist in the local WASM runtime. No network scheduling is run.
await db.exec(migration.replace(/^select cron\.schedule\([^\n]+\);$/m,''));
await db.exec(await read('./account-deletion.sql'));
console.log('PASS: student deletion, dependent records, legacy copies, other student preservation, teacher deletion, shared content, idempotency and rate limits');

await db.exec(`do $$
declare aid uuid:=gen_random_uuid(); token text:='last-admin-test';
begin
 insert into teachers(id,username,password_hash,active,is_admin) values(aid,'Synthetic last admin','hash',true,true);
 insert into diji_deletion_tickets(token_hash,account_id,account_role,password_hash_snapshot) values(token,aid,'teacher','hash');
 begin
  perform diji_delete_account(token,'HESABIMI SİL'); raise exception 'test_guard_missing';
 exception when others then if sqlerrm<>'last_admin' then raise; end if; end;
 if not exists(select 1 from teachers where teachers.id=aid) then raise exception 'test_admin_lost'; end if;
end $$;`);
console.log('PASS: last active administrator is preserved');

await db.exec(`do $$
declare aid uuid:=gen_random_uuid(); token text:='password-reset-test';
begin
 insert into students(id,username,password_hash) values(aid,'Synthetic reset','new-hash');
 insert into diji_deletion_tickets(token_hash,account_id,account_role,password_hash_snapshot) values(token,aid,'student','old-hash');
 begin
  perform diji_delete_account(token,'HESABIMI SİL'); raise exception 'test_guard_missing';
 exception when others then if sqlerrm<>'reauth_required' then raise; end if; end;
 update diji_deletion_tickets set expires_at=now()-interval '1 minute' where token_hash=token;
 begin
  perform diji_delete_account(token,'HESABIMI SİL'); raise exception 'test_expiry_missing';
 exception when others then if sqlerrm<>'ticket_expired' then raise; end if; end;
 if not exists(select 1 from students where students.id=aid) then raise exception 'test_student_lost'; end if;
end $$;`);
console.log('PASS: changed-password and expired tickets cannot delete accounts');

// The new tables and privileged functions must be unreachable through public roles.
const permissions=await db.query(`select has_function_privilege('anon','public.diji_delete_account(text,text)','execute') as anon_rpc,
has_function_privilege('authenticated','public.diji_delete_account(text,text)','execute') as authenticated_rpc,
has_table_privilege('anon','public.diji_deletion_tickets','select') as anon_tickets,
has_function_privilege('service_role','public.diji_delete_account(text,text)','execute') as server_rpc;`);
assert.deepEqual(permissions.rows[0],{anon_rpc:false,authenticated_rpc:false,anon_tickets:false,server_rpc:true});
console.log('PASS: only the server role can call deletion RPCs or read tickets');
await db.exec(`create schema auth; create table auth.users(id uuid primary key);
create table public.student_google_accounts(auth_user_id uuid primary key references auth.users(id) on delete cascade,student_id uuid unique references students(id) on delete cascade);
do $$
declare sid uuid:=gen_random_uuid(); gid uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(gid);
 insert into students(id,username,password_hash) values(sid,'Synthetic Google account','hash');
 insert into student_google_accounts(auth_user_id,student_id) values(gid,sid);
 insert into diji_deletion_tickets(token_hash,account_id,account_role,password_hash_snapshot) values('google-test',sid,'student','hash');
 perform diji_delete_account('google-test','HESABIMI SİL');
 if exists(select 1 from students where id=sid) or exists(select 1 from student_google_accounts where student_id=sid)
  or not exists(select 1 from diji_deletion_auth_queue where auth_user_id=gid) then raise exception 'test_google_cleanup_not_durable'; end if;
end $$;`);
console.log('PASS: future Google links are revoked transactionally and Auth cleanup is durably queued');
await db.close();
