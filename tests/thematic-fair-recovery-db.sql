-- Integration fixtures only; entire test is rolled back.
begin;
do $qa$
declare a uuid; owner text; r jsonb; i int; j int; c int; pct int;
 before_xp numeric; after_xp numeric; amount numeric; fake text;
begin
 for j in 1..4 loop
  a:=gen_random_uuid();owner:='s:'||a;
  insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
   values(a,'fair-v7-test-'||a,'not-a-login','approved',30,30,now());
  insert into public.extra_data(student_id,key_name,value)
   values(a,'yo','{"totalXp":5000,"altin":100,"guncelleme":1,"xpGun":{"tarih":"2026-10-17","xp":0},"log":{}}');
  insert into public.papi_story_progress(actor_key,student_id,chapter,cursor,deck_version,questions_seen,charged_cursor,version)
   values(owner,a,1000,11,7,10,10,0);
  -- j=1: 6 correct before final (7/11: recovery)
  -- j=2: 7 correct before final (8/11: 60%)
  -- j=3: 9 correct before final (10/11: 80%)
  -- j=4: 10 correct before final (11/11: 100%)
  c:=case j when 1 then 6 when 2 then 7 when 3 then 9 else 10 end;
  for i in 1..10 loop
   insert into public.dm_thematic_first_answers(actor_key,chapter,question_cursor,first_correct)
    values(owner,1000,i,i<=c);
  end loop;
  select (value->>'totalXp')::numeric into before_xp from public.extra_data
   where student_id=a and key_name='yo';
  r:=public.dm_thematic_fair_step(owner,1000,11,0,true,true,12,11,true);
  if (r#>>'{firstAttempt,correct}')::int<>c+1 then raise exception 'Initial score wrong for scenario %: %',j,r;end if;
  if j=1 then
   if not coalesce((r->>'needsRecovery')::boolean,false)
       or coalesce((r->>'finished')::boolean,false)
       or (select completed from public.papi_story_progress where actor_key=owner and chapter=1000)
   then raise exception 'Below threshold bypassed recovery: %',r;end if;
   select (value->>'totalXp')::numeric into after_xp from public.extra_data
    where student_id=a and key_name='yo';
   if after_xp<>before_xp then raise exception 'Failed student received XP';end if;
   -- Repeat the normal final response: recovery still required, no new energy.
   r:=public.dm_thematic_fair_step(owner,1000,11,1,true,true,12,11,true);
   if not (r->>'needsRecovery')::boolean or (select count(*) from public.dm_thematic_first_answers where actor_key=owner)<>11 then raise exception 'Normal answer bypassed recovery';end if;
   r:=public.dm_thematic_recovery_answer(owner,1000,1,0,false);
   if coalesce((r->>'accepted')::boolean,true) or (select errors from public.dm_thematic_recovery where actor_key=owner)<>1 then raise exception 'Incorrect recovery answer accepted';end if;
   r:=public.dm_thematic_recovery_answer(owner,1000,1,0,true);
   if (r#>>'{recovery,step}')::int<>1 then raise exception 'Recovery stage 1 missing';end if;
   r:=public.dm_thematic_recovery_answer(owner,1000,1,0,true);
   if not (r->>'stale')::boolean then raise exception 'Duplicate answer advanced twice';end if;
   r:=public.dm_thematic_recovery_answer(owner,1000,1,1,true);
   if (r#>>'{recovery,step}')::int<>2 then raise exception 'Recovery stage 2 missing';end if;
   r:=public.dm_thematic_recovery_answer(owner,1000,1,2,true);
   pct:=30;
  else
   pct:=case j when 2 then 60 when 3 then 80 else 100 end;
  end if;
  if not (r->>'finished')::boolean or (r#>>'{reward,fairPercent}')::int<>pct
  or (select completed from public.papi_story_progress where actor_key=owner and chapter=1000)<>true
  then raise exception 'Tier %, expected %, got %',j,pct,r;end if;
  select (value->>'totalXp')::numeric into after_xp from public.extra_data
   where student_id=a and key_name='yo';
  select xp into amount from public.dm_game_reward_runs
   where student_id=a and run_id='papi-story-1000';
  if after_xp-before_xp<>amount or (r#>>'{reward,xp}')::numeric<>amount
  then raise exception 'XP and ledger disagree: %, %, %',j,after_xp-before_xp,amount;end if;
  if (select count(*) from public.dm_game_reward_runs where student_id=a and run_id='papi-story-1000')<>1
  then raise exception 'Duplicate award for %',j;end if;
  if j=1 and (select count(*) from public.dm_thematic_first_answers where actor_key=owner and chapter=1000)<>11
  then raise exception 'Recovery rewrote first tries';end if;
 end loop;
 if has_function_privilege('anon','public.dm_thematic_recovery_answer(text,integer,integer,integer,boolean)','EXECUTE')
  or has_table_privilege('authenticated','public.dm_thematic_recovery','SELECT') then raise exception 'Recovery grant leaked';end if;
end $qa$;
rollback;
