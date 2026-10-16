-- Isolated fixtures; all changes, rewards, ledger and feed writes roll back.
begin;
do $$
declare actor uuid:=gen_random_uuid(); owner_key text; r jsonb; i int; c int; v int; xp numeric; g numeric;
begin
 owner_key:='s:'||actor;
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at) values(actor,'thematic-qa-'||actor,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{"totalXp":5000,"altin":20,"guncelleme":1}');
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version) values(owner_key,actor,1000,5);
 r:=public.dm_story_apply(owner_key,1000,0,0,true,false,10,9);
 if (r->>'energySpent')::int<>0 or (r#>>'{progress,cursor}')::int<>1 then raise exception 'Teaching step charged energy or failed';end if;
 for i in 1..9 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=1000;
  r:=public.dm_story_apply(owner_key,1000,c,v,true,true,10,9);
 end loop;
 if not (r->>'finished')::boolean or (r#>>'{reward,xp}')::numeric<=0 then raise exception 'Thematic finish reward missing: %',r;end if;
 select (value->>'totalXp')::numeric,(value->>'altin')::numeric into xp,g from public.extra_data where student_id=actor and key_name='yo';
 r:=public.dm_story_apply(owner_key,1000,c,v,true,true,10,9);
 if not (r->>'stale')::boolean then raise exception 'Duplicate request was not rejected as stale';end if;
 update public.papi_story_progress set cursor=0,version=version+1,replay=true,questions_seen=0,charged_cursor=-1,mistakes=0,last_reward='{}',route_combo=0 where actor_key=owner_key and chapter=1000;
 for i in 0..9 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=1000;
  r:=public.dm_story_apply(owner_key,1000,c,v,true,i>0,10,9);
 end loop;
 if exists(select 1 from public.extra_data where student_id=actor and key_name='yo' and ((value->>'totalXp')::numeric<>xp or (value->>'altin')::numeric<>g)) then raise exception 'Replay credited twice';end if;
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version,reward_claimed,replay) values(owner_key,actor,1001,5,true,true);
 for i in 0..9 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=1001;
  r:=public.dm_story_apply(owner_key,1001,c,v,true,i>0,10,9);
 end loop;
 if r->'reward'<>'{}'::jsonb then raise exception 'Inherited chapter issued a reward';end if;
 begin
  insert into public.papi_story_progress(actor_key,student_id,chapter) values(owner_key,actor,1240);
  raise exception 'Out of range chapter accepted';
 exception when check_violation then null;
 end;
 if has_table_privilege('anon','public.dm_thematic_enrollment','SELECT') or has_table_privilege('authenticated','public.dm_thematic_enrollment','SELECT') then raise exception 'Enrollment exposed';end if;
 if has_function_privilege('anon','public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer)','EXECUTE') then raise exception 'Economy RPC exposed';end if;
 if exists(select 1 from public.level_completions where student_id=actor and not (mode='buyu' and class_no=0 and unit_no=0 and level_no between 1050 and 1289)) then raise exception 'School path was modified';end if;
end $$;
rollback;
