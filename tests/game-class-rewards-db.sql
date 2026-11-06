begin;
do $test$
declare sid uuid:=gen_random_uuid(); own jsonb; lower_grade jsonb; advanced jsonb; duplicate jsonb; rally jsonb; run uuid:=gen_random_uuid();
begin
 insert into public.students(id,username,password_hash,class_no,status,role,energy,energy_max,energy_updated_at)
 values(sid,'game-class-qa','not-a-login',7,'approved','student',25,25,now());
 insert into public.extra_data(student_id,key_name,value)
 values(sid,'yo','{"totalXp":100000,"altin":100,"guncelleme":1,"log":{}}');
 own:=public.dm_solo_fair_claim(sid,'game-class-own','ky',7,array[10],12,0,60,1);
 lower_grade:=public.dm_solo_fair_claim(sid,'game-class-lower','ky',6,array[10],12,0,60,1);
 advanced:=public.dm_solo_fair_claim(sid,'game-class-advanced','kule',7,array[10],12,0,60,1);
 if (own->>'xp')::int<>52 or (own->>'gold')::int<>8
 or (lower_grade->>'xp')::int<>39 or (lower_grade->>'gold')::int<>6
 or (advanced->>'xp')::int<>129 or (advanced->>'gold')::int<>26 then
  raise exception 'Incorrect award: %, %, %',own,lower_grade,advanced;
 end if;
 duplicate:=public.dm_solo_fair_claim(sid,'game-class-lower','ky',7,array[10],12,0,60,1);
 if not (duplicate->>'duplicate')::boolean or duplicate->'yo'<>advanced->'yo'
 or (duplicate->>'xp')::int<>39 then raise exception 'Retry repriced an existing run';end if;
 delete from public.dm_game_reward_runs where student_id=sid;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck,state)
 select run,sid,6,array[10],'normal',jsonb_agg(jsonb_build_object('word','word'||g)),
 '{"correct":12,"wrong":0,"elapsed":60,"score":1200,"slowed":0}'::jsonb
 from generate_series(1,12) g;
 rally:=public.dm_rally_finish(sid,run);
 if (rally#>>'{reward,xp}')::int<>59 or (rally#>>'{reward,gold}')::int<>11
 then raise exception 'Rally grade adjustment missing: %',rally;end if;
 if public.dm_school_game_reward('{"xp":52,"gold":8}',null,6)<>'{"xp":52,"gold":8}'::jsonb
 or public.dm_school_game_reward('{"xp":52,"gold":8}',7,8)<>'{"xp":52,"gold":8}'::jsonb
 or has_function_privilege('anon','public.dm_school_game_reward(jsonb,integer,integer)','EXECUTE')
 then raise exception 'Grade fallback or RPC permissions incorrect';end if;
end $test$;
rollback;
