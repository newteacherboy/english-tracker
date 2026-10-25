-- Run on PostgreSQL after reward-priority-update.sql. All fixtures roll back.
begin;
do $qa$
declare
 sid uuid:=gen_random_uuid();sid2 uuid:=gen_random_uuid();r jsonb;v jsonb;lim jsonb;prev_x int:=10000;prev_g int:=10000;
 code text;rate numeric;boost int;i int;xp_before numeric;gold_before numeric;topic public.lesson_topics;
 rid text;run uuid;mid uuid;state jsonb;deck jsonb;step_no int:=0;old_wallet jsonb;
begin
 -- Every supported paid game has a strictly descending maximum in both currencies.
 foreach code in array array['cumle','rota','dikte','tren','kp','ucus','ralli','bosluk','asmaca','kelimebul','harfbahcesi','jp','yagmur','ky','eslestirme','hafiza'] loop
  lim:=public.dm_reward_limits(code);
  if lim is null or (lim->>'xp')::int>=prev_x or (lim->>'gold')::int>=prev_g then raise exception 'Reward order broken: %',code;end if;
  prev_x:=(lim->>'xp')::int;prev_g:=(lim->>'gold')::int;
  foreach rate in array array[.5,1,2]::numeric[] loop
   for boost in 1..2 loop
    for i in 0..80 loop
     r:=public.dm_ranked_game_reward(code,i,10,rate,boost,boost);
     if (r->>'xp')::int>(lim->>'xp')::int or (r->>'gold')::int>(lim->>'gold')::int
     then raise exception 'Boost escaped ceiling: %',code;end if;
    end loop;
   end loop;
  end loop;
  r:=public.dm_ranked_game_reward(code,80,10,2);
  if r<>lim then raise exception 'Full performance cannot reach advertised ceiling: % %',code,r;end if;
  r:=public.dm_ranked_game_reward(code,0,10,2,2,2);
  if r<>'{"xp":0,"gold":0}'::jsonb then raise exception 'Zero XP paid gold: %',r;end if;
 end loop;
 if (public.dm_reward_limits('cumle')->>'xp')::int>=192 or (public.dm_reward_limits('cumle')->>'gold')::int>=40 then raise exception 'Game above route';end if;
 if has_function_privilege('anon','public.dm_reward_limits(text)','EXECUTE')
 or has_function_privilege('authenticated','public.dm_ranked_game_reward(text,numeric,numeric,numeric,numeric,numeric)','EXECUTE') then raise exception 'Reward RPC exposed';end if;

 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at)
 values(sid,'reward-priority-qa-'||sid,'not-a-login','approved','student',25,25,now()),
 (sid2,'reward-priority-qa-'||sid2,'not-a-login','approved','student',25,25,now());
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":10000,"altin":100,"guncelleme":1,"log":{}}'),(sid2,'yo','{"totalXp":10000,"altin":100,"guncelleme":1,"log":{}}');
 select * into topic from public.lesson_topics where active limit 1;
 if topic.topic_name is null then raise exception 'Active lesson fixture required';end if;
 insert into public.lesson_progress(student_id,level,category,topic_name,test_success) values(sid,topic.level,topic.category,topic.topic_name,true),(sid2,topic.level,topic.category,topic.topic_name,true);
 foreach i in array array[30,60,80,100] loop
  r:=public.dm_lesson_fair_award(sid,topic.level,topic.category,topic.topic_name,i,false);
 end loop;
 select value into v from public.extra_data where student_id=sid and key_name='yo';
 if (v->>'totalXp')::numeric<>10300 or (v->>'altin')::numeric<>180 then raise exception 'Lesson increments do not total 300/80: %',v;end if;
 old_wallet:=v;
 r:=public.dm_lesson_fair_award(sid,topic.level,topic.category,topic.topic_name,100,false);
 if (r->>'xp')::int<>0 or (r->>'gold')::int<>0 then raise exception 'Lesson replay paid again';end if;
 if (select value from public.extra_data where student_id=sid and key_name='yo')<>old_wallet then raise exception 'Replay changed wallet';end if;
 r:=public.dm_lesson_fair_award(sid2,topic.level,topic.category,topic.topic_name,100,true);
 if (r->>'xp')::int<>0 or (r->>'gold')::int<>0 then raise exception 'Historical lesson was repriced';end if;

 foreach code in array array['cumle','dikte','tren','kp','bosluk','asmaca','kelimebul','harfbahcesi','jp','yagmur','ky','eslestirme','hafiza'] loop
  -- Reset only this generated fixture's daily run counter, never a real account.
  delete from public.dm_game_reward_runs where student_id=sid;
  rid:='priority-qa-'||code||'-'||sid;lim:=public.dm_reward_limits(code);
  select (value->>'totalXp')::numeric,(value->>'altin')::numeric into xp_before,gold_before from public.extra_data where student_id=sid and key_name='yo';
  r:=public.dm_solo_fair_claim(sid,rid,code,2,array[1],12,0,60,1);
  if (r->>'xp')::int<>(lim->>'xp')::int or (r->>'gold')::int<>(lim->>'gold')::int then raise exception 'Solo ceiling incorrect: % %',code,r;end if;
  select value into v from public.extra_data where student_id=sid and key_name='yo';
  if (v->>'totalXp')::numeric-xp_before<>(r->>'xp')::int or (v->>'altin')::numeric-gold_before<>(r->>'gold')::int then raise exception 'Wallet mismatch: %',code;end if;
  old_wallet:=v;r:=public.dm_solo_fair_claim(sid,rid,code,2,array[1],12,0,1,4);
  if not coalesce((r->>'duplicate')::boolean,false) or (select value from public.extra_data where student_id=sid and key_name='yo')<>old_wallet then raise exception 'Retry minted reward: %',code;end if;
 end loop;

 -- Three daily bands; boosters never evade a game's own ceiling.
 delete from public.dm_game_reward_runs where student_id=sid;
 for i in 1..13 loop
  r:=public.dm_solo_fair_claim(sid,'priority-daily-'||sid||'-'||i,'cumle',2,array[1],12,0,60,1);
  if (r->>'xp')::int<>(case when i<=3 then 140 when i<=12 then 70 else 35 end) then raise exception 'Daily band incorrect at %: %',i,r;end if;
 end loop;
 r:=public.dm_solo_fair_claim(sid,'priority-boost-'||sid,'hafiza',2,array[1],12,0,60,2);
 if (r->>'xp')::int>36 or (r->>'gold')::int>6 then raise exception 'Boost ceiling broken';end if;

 -- Existing route base and first-clear guard are unchanged.
 r:=public.dm_game_reward_claim(sid,'priority-route-'||sid,'ba',2,array[220151],12,0,1,true,3,1);
 if (r->>'xp')::int<>191 or (r->>'gold')::int<>40 then raise exception 'Route formula changed: %',r;end if;
 r:=public.dm_game_reward_claim(sid,'priority-route-replay-'||sid,'ba',2,array[220151],12,0,1,true,3,1);
 if (r->>'xp')::int<>0 then raise exception 'Route replay paid';end if;

 -- Rally uses the same limits; 12-question deck and slowdown handling remain intact.
 delete from public.dm_game_reward_runs where student_id=sid;
 deck:=(select jsonb_agg(jsonb_build_object('word','word'||g)) from generate_series(1,12) g);
 run:=gen_random_uuid();
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,state) values(run,sid,2,array[1],'normal',deck,'{"correct":12,"wrong":0,"elapsed":60,"score":1200,"slowed":0}');
 r:=public.dm_rally_finish(sid,run);
 if (r#>>'{reward,xp}')::int<>108 or (r#>>'{reward,gold}')::int<>20 then raise exception 'Rally cap incorrect: %',r;end if;
 old_wallet:=(select value from public.extra_data where student_id=sid and key_name='yo');r:=public.dm_rally_finish(sid,run);
 if (select value from public.extra_data where student_id=sid and key_name='yo')<>old_wallet then raise exception 'Rally replay paid';end if;
 run:=gen_random_uuid();insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,state) values(run,sid,2,array[1],'normal',deck,'{"correct":12,"wrong":0,"elapsed":60,"score":1200,"slowed":2}');
 r:=public.dm_rally_finish(sid,run);if (r#>>'{reward,xp}')::int<>101 then raise exception 'Slowdown discount lost: %',r;end if;

 -- Topic reward remains gated at 80%, three paid runs per topic/game/day.
 for i in 1..4 loop
  run:=gen_random_uuid();deck:=(select jsonb_agg('{"correct":"a","allowed":["a","b"]}'::jsonb) from generate_series(1,10));
  insert into public.dm_topic_game_runs(run_id,student_id,topic_key,game,answer_key,question_count,started_at,expires_at) values(run,sid,'qa|reward|topic','balon',deck,10,now()-interval '60 seconds',now()+interval '1 hour');
  r:=public.dm_topic_game_finish(sid,run,'["a","a","a","a","a","a","a","a","a","a"]');
  if (r->>'xp')::int<>(case when i<=3 then 24 else 0 end) then raise exception 'Topic cap/quota broken: %',r;end if;
 end loop;

 -- Online matches cannot bypass ceilings and polling cannot mint more rewards.
 deck:=(select jsonb_agg('{"word":"one","answer":"a","choices":["a","b"],"puanSurum":3}'::jsonb) from generate_series(1,12));
 state:=(select jsonb_object_agg(g::text,'{"answer":"a","ms":1000}'::jsonb) from generate_series(0,11) g);
 insert into public.dm_matches(player_a,player_b,game,mode,class_no,questions,status,start_a,start_b,answers_a,answers_b)
 values(sid,sid2,'rota','live',2,deck,'playing',now()-interval '200 seconds',now()-interval '200 seconds',state,state) returning id into mid;
 r:=public.dm_match_action(sid,mid,'state','{}');
 if (r#>>'{myResult,reward,xp}')::int<>136 or (r#>>'{myResult,reward,gold}')::int<>27 then raise exception 'Online reward escaped/missed cap: %',r;end if;
 old_wallet:=(select value from public.extra_data where student_id=sid and key_name='yo');r:=public.dm_match_action(sid,mid,'state','{}');
 if (select value from public.extra_data where student_id=sid and key_name='yo')<>old_wallet then raise exception 'Match polling paid again';end if;
 if public.dm_break_reward('kosu',1000,100,60)<>5 or public.dm_break_reward('zipla',1000,100,60)<>4 or public.dm_break_reward('patlat',1000,100,60)<>3 then raise exception 'Break games exceeded lowest gold tier';end if;
end $qa$;
rollback;
