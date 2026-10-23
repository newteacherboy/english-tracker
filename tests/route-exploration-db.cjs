// Local isolated PostgreSQL only. Requires @electric-sql/pglite (see release notes).
const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const db=new PGlite(),id='00000000-0000-4000-8000-000000000001';
await db.exec(`create role anon;create role authenticated;create role service_role;
create table students(id uuid primary key,status text,role text,gold numeric,energy int,energy_max int,energy_updated_at timestamptz);
create table extra_data(student_id uuid,key_name text,value jsonb,updated_at timestamptz,primary key(student_id,key_name));
create table dm_progress_rewards(student_id uuid,kind text,reward_key text,gold int default 0,created_at timestamptz default now(),primary key(student_id,kind,reward_key));alter table dm_progress_rewards enable row level security;
create table energy_transactions(student_id uuid,change_amount int,balance_after int,reason text);
create table papi_story_progress(student_id uuid,chapter int,completed boolean);
create function dm_progress_context(actor uuid) returns jsonb language sql as $$select '{"done":[210101],"units":[[210101,210102]]}'::jsonb$$;
insert into students values('${id}','approved','student',20,5,30,now());insert into extra_data values('${id}','yo','{"altin":20}',now());
insert into papi_story_progress values('${id}',1000,true),('${id}',1001,false);`);
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261004211748_staged_progression_v1.sql'),'utf8');await db.exec(sql.slice(sql.indexOf('create or replace function public.dm_progress_credit('),sql.indexOf('create or replace function public.dm_progress_chest(')));
await db.exec(fs.readFileSync(path.join(__dirname,'../deployment/route-exploration.sql'),'utf8'));
async function call(route,stop,pickup=null){return (await db.query('select dm_route_exploration($1,$2,$3,$4) v',[id,route,stop,pickup])).rows[0].v;}
assert.deepEqual((await call('school',210101)).claims,[]);assert.equal((await call('school',210101,0)).gold,2);assert((await call('school',210101,0)).duplicate);assert.equal((await db.query('select gold from students')).rows[0].gold,'22');
assert.equal((await call('school',210101,3)).energyAdded,1);assert((await call('school',210101,3)).duplicate);assert.equal((await db.query('select energy from students')).rows[0].energy,6);
assert.equal((await call('learning',1000,0)).gold,2);for(const args of [['school',210102,0],['learning',1001,0],['school',999999,0],['school',210101,4],['other',210101,0]])await assert.rejects(()=>call(...args));
await db.exec('update students set energy=energy_max');assert((await call('learning',1000,3)).full);assert(!(await call('learning',1000)).claims.includes(3));await db.exec('update students set energy=29');assert.equal((await call('learning',1000,3)).energyAdded,1);
await db.exec('set role anon');await assert.rejects(()=>call('school',210101,1),/permission denied/);await db.exec('reset role');await db.exec('set role authenticated');await assert.rejects(()=>call('school',210101,1),/permission denied/);await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from energy_transactions')).rows[0].n,2);console.log('PASS local PostgreSQL: eligibility, duplicate gold/energy, full capacity, retry, anonymous/authenticated RPC denial');await db.close();})().catch(e=>{console.error(e);process.exit(1)});
