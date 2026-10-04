-- Approved one-time main-parkur XP rebase. No gold, inventory, league, daily,
-- energy, or completion rewards are issued. Only totalXp and migration metadata change.
create schema if not exists dm_private;
revoke all on schema dm_private from public, anon, authenticated;
grant usage on schema dm_private to service_role;

create table if not exists dm_private.parkur_xp_rebase_audit (
  student_id uuid not null references public.students(id) on delete cascade,
  version integer not null,
  before_value jsonb,
  before_updated_at timestamptz,
  student_gold numeric,
  seed_xp integer not null,
  completed_stops jsonb not null,
  applied_at timestamptz not null default now(),
  primary key (student_id, version)
);
alter table dm_private.parkur_xp_rebase_audit enable row level security;
revoke all on dm_private.parkur_xp_rebase_audit from public, anon, authenticated;
grant select, insert on dm_private.parkur_xp_rebase_audit to service_role;

-- Matches the frontend's old eight-word chunks -> unit conversion (>= half
-- a unit completed). A migrated unit and its old chunks are counted only once.
create or replace function dm_private.parkur_xp_seed()
returns table(student_id uuid, seed_xp integer, completed_stops jsonb)
language sql stable security invoker set search_path = '' as $function$
 with words as (
   select w.class_no,w.unit_no,
     row_number() over(order by w.class_no,w.unit_no,w.english,w.id) rn,
     count(*) over(partition by w.class_no,w.unit_no) unit_words
   from public.word_bank w
   where w.active and w.class_no between 1 and 8 and w.unit_no>0
     and coalesce(w.english,'')<>'' and coalesce(w.turkish,'')<>''
 ), units as (
   select distinct class_no,unit_no,1000+class_no*100+unit_no stop_no from words
 ), completions as (
   select distinct c.student_id,c.level_no,
     case when coalesce(e.value#>>array['baYildiz',c.level_no::text],'') ~ '^[0-9]+$'
       then least(3,greatest(1,(e.value#>>array['baYildiz',c.level_no::text])::numeric))::integer
       else 1 end stars
   from public.level_completions c
   left join public.extra_data e on e.student_id=c.student_id and e.key_name='yo'
   where c.mode='buyu'
 ), old_units as (
   select c.student_id,1000+w.class_no*100+w.unit_no stop_no,max(c.stars) stars
   from completions c join words w on c.level_no=(w.rn-1)/8+1
   where c.level_no between 1 and 999
   group by c.student_id,w.class_no,w.unit_no
   having count(distinct w.rn)>=max(w.unit_words)::numeric/2
 ), candidate_stops as (
   select c.student_id,u.stop_no,c.stars from completions c join units u on u.stop_no=c.level_no
   union all select student_id,stop_no,stars from old_units
 ), stops as (
   select student_id,stop_no,max(stars) stars from candidate_stops group by student_id,stop_no
 ), totals as (
   select student_id,sum(case stars when 3 then 60 when 2 then 48 else 42 end)::integer seed_xp,
     jsonb_agg(jsonb_build_object('stop',stop_no,'stars',stars,'xp',case stars when 3 then 60 when 2 then 48 else 42 end) order by stop_no) completed_stops
   from stops group by student_id
 )
 select s.id,coalesce(t.seed_xp,0),coalesce(t.completed_stops,'[]'::jsonb)
 from public.students s left join totals t on t.student_id=s.id where s.role='student';
$function$;
revoke all on function dm_private.parkur_xp_seed() from public, anon, authenticated;
grant execute on function dm_private.parkur_xp_seed() to service_role;

-- Runs before the existing gift/weekly triggers. Keep the migration immutable;
-- stale devices cannot restore old total XP or overwrite the server snapshot.
-- The transient protocol is NOT stored, so legacy clients never inherit it.
create or replace function public.dm_guard_parkur_xp_rebase()
returns trigger language plpgsql security invoker set search_path = '' as $function$
begin
 if new.key_name<>'yo' then return new; end if;
 if tg_op='UPDATE' and old.value#>>'{dmParkurMigration,version}'='1' then
   if new.value#>>'{dmParkurMigration,version}' is distinct from '1'
      or jsonb_typeof(new.value->'guncelleme') is distinct from 'number'
      or (new.value->>'guncelleme')::numeric < (old.value->>'guncelleme')::numeric then
     new.value:=old.value;new.updated_at:=old.updated_at;return new;
   end if;
   new.value:=jsonb_set(new.value,'{dmParkurMigration}',old.value->'dmParkurMigration');
   if new.value->>'dmProgressProtocol' is distinct from '1' then
     new.value:=jsonb_set(new.value,'{totalXp}',old.value->'totalXp');
   elsif jsonb_typeof(new.value->'totalXp') is distinct from 'number'
      or (new.value->>'totalXp')::numeric < (old.value->>'totalXp')::numeric then
     new.value:=jsonb_set(new.value,'{totalXp}',old.value->'totalXp');
   end if;
 end if;
 if jsonb_typeof(new.value)='object' then new.value:=new.value-'dmProgressProtocol';end if;
 return new;
end $function$;
revoke all on function public.dm_guard_parkur_xp_rebase() from public, anon, authenticated;
drop trigger if exists dm_00_parkur_xp_guard on public.extra_data;
create trigger dm_00_parkur_xp_guard before insert or update on public.extra_data
for each row execute function public.dm_guard_parkur_xp_rebase();

-- All accounts are rebased in one transaction, with a private before-image.
-- Re-running this migration NEVER resets progress gained after the first run.
do $migration$
declare r record; old_value jsonb; new_value jsonb; old_time timestamptz; stamp bigint; changed_ids uuid[] := '{}'; paused_triggers text[] := '{}'; trigger_name text;
begin
 lock table public.students in share mode;
 lock table public.extra_data in share row exclusive mode;
 lock table public.level_completions in share mode;
 if exists(select 1 from public.extra_data where key_name='yo' and jsonb_typeof(value)<>'object') then
   raise exception 'Unexpected yo state format; no accounts were changed';
 end if;
 -- These unrelated business triggers reorder inventories / capture weekly XP.
 -- Pause only normally enabled ones while holding the table lock; restoration
 -- happens in this same transaction, including automatic rollback on any error.
 for trigger_name in select t.tgname from pg_catalog.pg_trigger t
   where t.tgrelid='public.extra_data'::regclass and t.tgenabled='O'
     and t.tgname in ('dm_gift_retention','dm_weekly_xp_capture') loop
   execute format('alter table public.extra_data disable trigger %I',trigger_name);
   paused_triggers:=array_append(paused_triggers,trigger_name);
 end loop;
 for r in select p.*,s.gold from dm_private.parkur_xp_seed() p join public.students s on s.id=p.student_id loop
   if exists(select 1 from dm_private.parkur_xp_rebase_audit a where a.student_id=r.student_id and a.version=1) then continue;end if;
   old_value:=null;old_time:=null;
   select e.value,e.updated_at into old_value,old_time from public.extra_data e where e.student_id=r.student_id and e.key_name='yo';
   if old_value#>>'{dmParkurMigration,version}'='1' then continue;end if;
   insert into dm_private.parkur_xp_rebase_audit(student_id,version,before_value,before_updated_at,student_gold,seed_xp,completed_stops)
   values(r.student_id,1,old_value,old_time,r.gold,r.seed_xp,r.completed_stops);
   changed_ids:=array_append(changed_ids,r.student_id);
   stamp:=greatest((extract(epoch from clock_timestamp())*1000)::bigint,
     case when coalesce(old_value->>'guncelleme','') ~ '^[0-9]+$' then (old_value->>'guncelleme')::bigint+1 else 0 end);
   new_value:=coalesce(old_value,jsonb_build_object('v',1,'altin',coalesce(r.gold,0),'hedef',50,'xpGun',jsonb_build_object('tarih','','xp',0),
     'lig',jsonb_build_object('hafta','','xp',0,'gecen',null),'log','{}'::jsonb,'sahip','[]'::jsonb,'takili','{}'::jsonb,'zk','{}'::jsonb));
   new_value:=new_value||jsonb_build_object('totalXp',r.seed_xp,'guncelleme',stamp,'dmParkurMigration',jsonb_build_object(
     'version',1,'source','main-parkur','seedXp',r.seed_xp,'completed',jsonb_array_length(r.completed_stops),'appliedAt',stamp));
   insert into public.extra_data(student_id,key_name,value,updated_at) values(r.student_id,'yo',new_value,now())
   on conflict(student_id,key_name) do update set value=excluded.value,updated_at=excluded.updated_at;
 end loop;
 foreach trigger_name in array paused_triggers loop
   execute format('alter table public.extra_data enable trigger %I',trigger_name);
 end loop;
 -- Abort everything if any pre-existing field or either gold balance changed.
 if exists(select 1 from dm_private.parkur_xp_rebase_audit a join public.extra_data e on e.student_id=a.student_id and e.key_name='yo'
   where a.version=1 and a.student_id=any(changed_ids) and a.before_value is not null and
     (e.value-array['totalXp','guncelleme','dmParkurMigration']) is distinct from
     (a.before_value-array['totalXp','guncelleme','dmParkurMigration'])) then
   raise exception 'Migration changed a protected field; all changes rolled back';
 end if;
 if exists(select 1 from dm_private.parkur_xp_rebase_audit a join public.students s on s.id=a.student_id
   where a.version=1 and a.student_id=any(changed_ids) and s.gold is distinct from a.student_gold) then
   raise exception 'Student gold changed; all changes rolled back';
 end if;
end $migration$;
