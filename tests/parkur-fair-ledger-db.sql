-- Non-destructive SQL integration test. Every fake account and reward rolls back.
begin;
do $qa$
declare student uuid; run text; stop_no int:=220101; results jsonb; rec public.dm_parkur_recovery_runs;
 i int; j int; right_count int; pct int; before_xp numeric; after_xp numeric; reward_xp int;
 answer text;
begin
 for j in 1..4 loop
  student:=gen_random_uuid();run:='parkurfair'||md5(student::text);
  right_count:=case j when 1 then 7 when 2 then 8 when 3 then 10 else 12 end;
  insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
   values(student,'fair-parkur-qa-'||student,'not-a-login','approved',30,30,now());
  insert into public.extra_data(student_id,key_name,value)
   values(student,'yo','{"totalXp":5000,"altin":80,"guncelleme":1,"xpGun":{"tarih":"2026-10-17","xp":0},"log":{}}');
  for i in 1..12 loop
   insert into public.dm_parkur_question_ledger(student_id,run_id,question_no,answered,correct)
    values(student,run,i,true,i<=right_count);
  end loop;
  select (value->>'totalXp')::numeric into before_xp from public.extra_data where student_id=student and key_name='yo';
  results:=public.dm_parkur_fair_claim(student,run,2,stop_no,200);
  if j=1 then
   if results->>'reason'<>'needs_recovery' or (select count(*) from public.dm_game_reward_runs where student_id=student)>0
   then raise exception 'Below 8 wrongfully rewarded: %',results;end if;
   select * into rec from public.dm_parkur_recovery_runs where student_id=student and run_id=run;
   if rec.student_id is null then raise exception 'Recovery was not generated';end if;
   -- A wrong choice cannot advance.
   results:=public.dm_parkur_fair_recover(student,run,stop_no,0,'intentionally-wrong');
   if (results->>'correct')::boolean or (results#>>'{recovery,step}')::int<>0 then raise exception 'Wrong recovery credited';end if;
   for i in 0..2 loop
    select * into rec from public.dm_parkur_recovery_runs where student_id=student and run_id=run;
    answer:=rec.deck->rec.step->>'answer';
    results:=public.dm_parkur_fair_recover(student,run,stop_no,i,answer);
    if not (results->>'correct')::boolean then raise exception 'Correct recovery rejected';end if;
   end loop;
   if not (results->>'completed')::boolean then raise exception 'Recovery did not finish';end if;
   pct:=30;
   results:=public.dm_parkur_fair_claim(student,run,2,stop_no,200);
  else
   pct:=case j when 2 then 60 when 3 then 80 else 100 end;
  end if;
  if (results->>'fairPercent')::int<>pct or (results->>'firstCorrect')::int<>right_count
  then raise exception 'Tier mismatch for case %, result %',j,results;end if;
  select (value->>'totalXp')::numeric into after_xp from public.extra_data where student_id=student and key_name='yo';
  select xp into reward_xp from public.dm_game_reward_runs where student_id=student and run_id=run;
  if reward_xp is null or (results->>'xp')::int<>reward_xp or after_xp-before_xp<>reward_xp
  then raise exception 'Reward and XP do not reconcile: %, %, %',j,after_xp-before_xp,reward_xp;end if;
  if (select count(*) from public.level_completions where student_id=student and level_no=stop_no)<>1
  then raise exception 'Passed parkur not recorded';end if;
  results:=public.dm_parkur_fair_claim(student,run,2,stop_no,200);
  if not (results->>'duplicate')::boolean or (select count(*) from public.dm_game_reward_runs where student_id=student)<>1
  then raise exception 'Duplicate award attempt';end if;
 end loop;
 if has_function_privilege('anon','public.dm_parkur_fair_claim(uuid,text,integer,integer,numeric)','EXECUTE')
  or has_table_privilege('authenticated','public.dm_parkur_recovery_runs','SELECT') then
  raise exception 'Award data exposed';end if;
end $qa$;
rollback;
