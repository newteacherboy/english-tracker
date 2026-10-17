-- Isolated generated fixtures. No live user's balance or progress is touched.
begin;
do $test$
declare actor uuid:=gen_random_uuid(); owner text; r jsonb; i int; c int; v int; e int; xp numeric; gold numeric; before_energy int;
begin
 owner:='s:'||actor;
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at) values(actor,'thematic-v7-qa-'||actor,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{"totalXp":5000,"altin":20,"guncelleme":1}');
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version) values(owner,actor,1000,7);
 r:=public.dm_story_apply(owner,1000,0,0,true,false,12,11,true);
 if (r->>'energySpent')::int<>0 then raise exception 'Teaching cost energy';end if;
 for i in 1..5 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=1000;
  r:=public.dm_story_apply(owner,1000,c,v,true,true,12,11,true);
  if (r->>'energySpent')::int<>1 then raise exception 'Question % was not charged once',i;end if;
  if i<5 and (r->>'comboGain')::int<>0 then raise exception 'Early combo reward';end if;
 end loop;
 select energy into e from public.students where id=actor;
 if e<>26 or (r->>'comboGain')::int<>1 or (r->>'combo')::int<>5 then raise exception 'Five-answer combo incorrect: %, energy %',r,e;end if;
 r:=public.dm_story_apply(owner,1000,c,v,true,true,12,11,true);
 if not (r->>'stale')::boolean or (select energy from public.students where id=actor)<>26 then raise exception 'Stale request charged or rewarded twice';end if;
 select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=1000;
 r:=public.dm_story_apply(owner,1000,c,v,false,true,12,11,false);
 if (r->>'energySpent')::int<>1 or (r->>'combo')::int<>0 then raise exception 'Wrong answer cost/combo failed';end if;
 select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=1000;
 r:=public.dm_story_apply(owner,1000,c,v,true,true,12,11,true);
 if (r->>'energySpent')::int<>0 then raise exception 'Retry charged twice';end if;
 for i in 7..11 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=1000;
  r:=public.dm_story_apply(owner,1000,c,v,true,true,12,11,true);
 end loop;
 if not (r->>'finished')::boolean or (select energy from public.students where id=actor)<>21 then raise exception 'Eleven questions should spend 11 and return 2 energy';end if;
 select (value->>'totalXp')::numeric,(value->>'altin')::numeric into xp,gold from public.extra_data where student_id=actor and key_name='yo';
 update public.papi_story_progress set cursor=0,version=version+1,replay=true,questions_seen=0,charged_cursor=-1,mistakes=0,last_reward='{}',route_combo=0 where actor_key=owner and chapter=1000;
 for i in 0..11 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=1000;
  r:=public.dm_story_apply(owner,1000,c,v,true,i>0,12,11,true);
 end loop;
 if exists(select 1 from public.extra_data where student_id=actor and key_name='yo' and ((value->>'totalXp')::numeric<>xp or (value->>'altin')::numeric<>gold)) then raise exception 'Replay minted another completion reward';end if;
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version,cursor,route_combo,charged_cursor,questions_seen,replay,reward_claimed) values(owner,actor,1001,7,5,4,4,4,true,true);
 update public.students set energy=20,energy_updated_at=now() where id=actor;
 r:=public.dm_story_apply(owner,1001,5,0,true,true,12,11,false);
 if (r->>'combo')::int<>0 or (r->>'comboGain')::int<>0 or (r#>>'{progress,cursor}')::int<>6 or (r#>>'{progress,mistakes}')::int<>1 then raise exception 'Incorrect review must advance, reset combo, and record a mistake';end if;
 update public.students set energy=0,energy_updated_at=now() where id=actor;
 insert into public.papi_story_progress(actor_key,student_id,chapter,deck_version,cursor) values(owner,actor,1002,7,1);
 r:=public.dm_story_apply(owner,1002,1,0,true,true,12,11,true);
 if (r->>'ok')::boolean or not (r->>'energyEmpty')::boolean or (select cursor from public.papi_story_progress where actor_key=owner and chapter=1002)<>1 then raise exception 'Zero energy should pause a new question';end if;
 -- Legacy stories 0..79 retain two questions per energy and three-answer combos.
 update public.students set energy=10,energy_updated_at=now() where id=actor;
 insert into public.papi_story_progress(actor_key,student_id,chapter,cursor) values(owner,actor,0,1);
 for i in 1..3 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner and chapter=0;
  r:=public.dm_story_apply(owner,0,c,v,true,true,20,19);
  if (r->>'energySpent')::int<>(case when i=2 then 1 else 0 end) then raise exception 'Legacy energy changed';end if;
 end loop;
 if (r->>'comboGain')::int<>1 or (select energy from public.students where id=actor)<>10 then raise exception 'Legacy combo changed';end if;
 if has_function_privilege('anon','public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)','EXECUTE') or has_function_privilege('authenticated','public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer,boolean)','EXECUTE') then raise exception 'Economy RPC exposed';end if;
end $test$;
rollback;
