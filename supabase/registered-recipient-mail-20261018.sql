begin;
create or replace function public.dm_sync_registered_mail_recipients() returns integer language plpgsql set search_path='' as $fn$
declare n integer;
begin
 insert into public.dm_progress_mail_preferences(student_id,recipient_kind,email,opted_in_at,consent_source,unsubscribe_token_hash)
 select s.id,'parent',lower(btrim(s.email)),now(),'registration_existing_consent_owner_instruction_20261018',md5(gen_random_uuid()::text)
 from public.students s
 where s.role='student' and s.status='approved'
 and btrim(coalesce(s.email,'')) ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
 and not exists(select 1 from public.dm_progress_mail_preferences p where p.student_id=s.id and lower(p.email)=lower(btrim(s.email)))
 on conflict do nothing;
 get diagnostics n=row_count; return n;
end $fn$;
revoke all on function public.dm_sync_registered_mail_recipients() from public,anon,authenticated;
grant execute on function public.dm_sync_registered_mail_recipients() to service_role;
do $patch$
declare r record; d text;
begin
 for r in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('dm_papi_progress_queue','dm_papi_league_mail_prepare','dm_papi_take_due','dm_progress_mail_allowed')
 loop
 d:=pg_get_functiondef(r.oid);
 d:=replace(d,' and pref.verified_at is not null','');
 d:=replace(d,' and pr.verified_at is not null','');
 d:=replace(d,' and p.verified_at is not null','');
 if r.proname in ('dm_papi_progress_queue','dm_papi_league_mail_prepare') then
 d:=replace(d,E'begin\n',E'begin\n perform public.dm_sync_registered_mail_recipients();\n');
 end if;
 if r.proname='dm_papi_league_mail_prepare' then d:=replace(d,'now()+interval ''2 minutes''','now()');end if;
 execute d;
 end loop;
end $patch$;
select cron.alter_job(job_id:=jobid,schedule:='0 16 * * 0') from cron.job where jobname='dm-papi-league-sunday';
select public.dm_sync_registered_mail_recipients();
commit;