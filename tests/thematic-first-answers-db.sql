-- Run after the migration; all fake-student state is rolled back.
begin;
do $test$
declare actor uuid:=gen_random_uuid(); owner text; r jsonb; v int; first int;
begin
 owner:='s:'||actor;
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
 values(actor,'first-attempt-test-'||actor,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value)
 values(actor,'yo','{"totalXp":5000,"altin":20,"guncelleme":1}');
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version)
 values(owner,actor,1000,7);
 r:=public.dm_thematic_fair_step(owner,1000,0,0,true,false,12,11,true);
 if (r#>>'{firstAttempt,answered}')::int<>0 then raise exception 'Teaching recorded an answer';end if;
 r:=public.dm_thematic_fair_step(owner,1000,1,1,false,true,12,11,false);
 if (r#>>'{firstAttempt,answered}')::int<>1
 or (r#>>'{firstAttempt,correct}')::int<>0
 or (r#>>'{progress,cursor}')::int<>1 then raise exception 'Wrong first try not recorded: %',r;end if;
 r:=public.dm_thematic_fair_step(owner,1000,1,2,true,true,12,11,true);
 if (r#>>'{firstAttempt,answered}')::int<>1
 or (r#>>'{firstAttempt,correct}')::int<>0
 or (r#>>'{progress,cursor}')::int<>2 then raise exception 'Correct retry changed initial score: %',r;end if;
 r:=public.dm_thematic_fair_step(owner,1000,1,2,true,true,12,11,true);
 if not coalesce((r->>'stale')::boolean,false)
 or (select count(*) from public.dm_thematic_first_answers where actor_key=owner)<>1 then
 raise exception 'Stale request duplicated score';end if;
 select version into v from public.papi_story_progress where actor_key=owner and chapter=1000;
 r:=public.dm_thematic_fair_step(owner,1000,2,v,true,true,12,11,true);
 if (r#>>'{firstAttempt,answered}')::int<>2
 or (r#>>'{firstAttempt,correct}')::int<>1 then raise exception 'Correct next answer missing';end if;
 update public.papi_story_progress set replay=true where actor_key=owner and chapter=1000;
 select version into v from public.papi_story_progress where actor_key=owner and chapter=1000;
 r:=public.dm_thematic_fair_step(owner,1000,3,v,true,true,12,11,true);
 if (r#>>'{firstAttempt,answered}')::int<>2
 or (r#>>'{firstAttempt,eligible}')::boolean then raise exception 'Replay affected first-try score';end if;
 if has_function_privilege('anon','public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)','EXECUTE')
 or has_function_privilege('authenticated','public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)','EXECUTE')
 or has_table_privilege('anon','public.dm_thematic_first_answers','SELECT') then raise exception 'Unprivileged score access';end if;
end $test$;
rollback;
