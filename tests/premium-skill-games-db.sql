-- Run after the migration. Everything is rolled back, including the synthetic pupil.
begin;
do $qa$
declare sid uuid:=gen_random_uuid(); rid uuid; stem text; d jsonb; resumed jsonb; result jsonb;
 picks integer[]; level_no integer; expected_energy integer; rejected boolean;
begin
 if has_function_privilege('anon','public.dm_tower_start(uuid,uuid)','EXECUTE') or
    has_function_privilege('authenticated','public.dm_goal_finish(uuid,uuid,integer[])','EXECUTE') then
   raise exception 'Premium RPC exposed';
 end if;
 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at)
 values(sid,'premium-skill-qa-'||sid,'not-a-login','approved','student',25,25,now());
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":0,"altin":0,"guncelleme":1}');
 foreach stem in array array['tower','goal'] loop
  rid:=gen_random_uuid();
  execute format('select public.dm_%s_start($1,$2)',stem) into d using sid,rid;
  if jsonb_array_length(d->'rounds')<4 or exists(select 1 from jsonb_array_elements(d->'rounds')q where jsonb_array_length(q->'options')<>4) then raise exception 'Invalid four-corner deck';end if;
  expected_energy:=(d->>'energy')::int;
  execute format('select public.dm_%s_start($1,$2)',stem) into resumed using sid,gen_random_uuid();
  if resumed->>'runId'<>rid::text or (resumed->>'energy')::int<>expected_energy then raise exception 'Resume charged twice';end if;
  execute format('update public.dm_%s_runs set started_at=now()-interval ''1 minute'' where student_id=$1',stem) using sid;
  select array_agg((q->>'answer')::int order by ord) into picks from jsonb_array_elements(d->'rounds') with ordinality a(q,ord);
  execute format('select public.dm_%s_finish($1,$2,$3)',stem) into result using sid,rid,picks;
  if not (result->>'passed')::boolean or (result->>'level')::int<>2 then raise exception 'Level did not advance';end if;
  execute format('select public.dm_%s_finish($1,$2,$3)',stem) into resumed using sid,rid,picks;
  if resumed#>>'{yo,totalXp}'<>result#>>'{yo,totalXp}' then raise exception 'Duplicate reward';end if;
  rejected:=false;
  begin execute format('select public.dm_%s_start($1,$2)',stem) into d using sid,gen_random_uuid();exception when others then rejected:=true;end;
  if not rejected then raise exception 'Free daily quota bypassed';end if;
 end loop;
 foreach level_no in array array[1,80,81,100,120,140,160] loop
  if (select count(*) from public.dm_premium_course_words(level_no))<4 then raise exception 'Missing curriculum level %',level_no;end if;
 end loop;
end $qa$;
rollback;
