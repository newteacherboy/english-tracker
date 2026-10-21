-- Execute in a transaction, always rolled back; no real learner is touched.
do $qa$
declare sid uuid:=gen_random_uuid();other_id uuid:=gen_random_uuid();rid uuid;d jsonb;key_data jsonb;yes jsonb;no jsonb;
 i int;before_feed int;before_scores int;before_xp numeric;wallet numeric;
begin
 insert into public.students(id,username,password_hash,status) values(sid,'topic-qa-'||sid,'not-a-login','approved'),(other_id,'topic-qa-'||other_id,'not-a-login','approved');
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":1000,"altin":100,"guncelleme":1,"log":{}}');
 select (value->>'totalXp')::numeric into before_xp from public.extra_data where student_id=sid and key_name='yo';
 select count(*) into before_feed from public.feed_events where student_id=sid;
 select count(*) into before_scores from public.game_scores where student_id=sid;
 select jsonb_agg(jsonb_build_object('correct','a','allowed',jsonb_build_array('a','b'))),jsonb_agg('a'::text),jsonb_agg(case when n<=7 then 'a' else 'b' end)
 into key_data,yes,no from generate_series(1,10) n;
 for i in 1..8 loop
  rid:=gen_random_uuid();
  insert into public.dm_topic_game_runs(run_id,student_id,topic_key,game,answer_key,question_count,started_at,expires_at)
  values(rid,sid,'A1|vocab|QA','kova',key_data,10,clock_timestamp()-case when i=6 then interval '1 second' else interval '30 seconds' end,clock_timestamp()+case when i=7 then interval '-1 second' else interval '30 minutes' end);
  if i=8 then
   d:=public.dm_topic_game_finish(other_id,rid,yes);
   if d->>'ok'<>'false' or not exists(select 1 from public.dm_topic_game_runs where run_id=rid) then raise exception 'Ownership failed: %',d;end if;
   begin perform public.dm_topic_game_finish(sid,rid,'["forged"]'::jsonb);raise exception 'Invalid picks accepted';exception when others then if sqlerrm<>'Geçersiz cevaplar.' then raise;end if;end;
   delete from public.dm_topic_game_runs where run_id=rid;continue;
  end if;
  d:=public.dm_topic_game_finish(sid,rid,case when i=1 then no else yes end);
  if i=1 and (d->>'xp')::int<>0 then raise exception 'Low accuracy paid: %',d;end if;
  if i between 2 and 4 and (d->>'xp')::int<>70 then raise exception 'Win did not pay fixed 70: %',d;end if;
  if i=5 and d->>'sebep'<>'daily_limit' then raise exception 'Fourth win paid: %',d;end if;
  if i=6 and (d->>'xp')::int<>0 then raise exception 'Fast run paid: %',d;end if;
  if i=7 and d->>'sebep'<>'expired' then raise exception 'Expired run accepted: %',d;end if;
  if exists(select 1 from public.dm_topic_game_runs where run_id=rid) then raise exception 'Finished run persisted';end if;
  d:=public.dm_topic_game_finish(sid,rid,yes);
  if d->>'ok'<>'false' then raise exception 'Replay accepted: %',d;end if;
 end loop;
 select (value->>'totalXp')::numeric into wallet from public.extra_data where student_id=sid and key_name='yo';
 if wallet-before_xp<>210 then raise exception 'XP not persistent: % -> %',before_xp,wallet;end if;
 if (select count(*) from public.dm_game_reward_runs where student_id=sid and game_key='konu:kova')<>3 then raise exception 'Receipt count incorrect';end if;
 if (select count(*) from public.feed_events where student_id=sid)<>before_feed or (select count(*) from public.game_scores where student_id=sid)<>before_scores then raise exception 'Result/feed leaked';end if;
 if has_table_privilege('anon','public.dm_topic_game_runs','select') or has_function_privilege('authenticated','public.dm_topic_game_finish(uuid,uuid,jsonb)','execute') then raise exception 'Private run access leaked';end if;
end $qa$;
