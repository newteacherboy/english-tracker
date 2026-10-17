begin;
do $qa$
declare sid uuid:=gen_random_uuid(); result jsonb; first_xp int; second_xp int; best_xp int;
 prior numeric; later numeric; first_run text:='solo-upgrade-run-111111111'; second_run text:='solo-upgrade-run-222222222';
 third_run text:='solo-upgrade-run-333333333';
begin
 insert into public.students(id,username,password_hash,status,energy,energy_max,energy_updated_at)
 values(sid,'fair-upgrade-'+sid,'not-a-login','approved',30,30,now());
 insert into public.extra_data(student_id,key_name,value)
 values(sid,'yo','{"totalXp":5000,"altin":100,"guncelleme":1,"log":{}}');
 select (value->>'totalXp')::numeric into prior from public.extra_data where student_id=sid and key_name='yo';
 result:=public.dm_solo_fair_claim(sid,first_run,'ky',2,array[1],6,2,120,1);
 first_xp:=(result->>'xp')::int;
 if first_xp<=0 then raise exception 'Initial game should earn XP';end if;
 result:=public.dm_solo_fair_claim(sid,second_run,'ky',2,array[1],6,2,120,1);
 second_xp:=(result->>'xp')::int;
 if second_xp<>0 or (result->>'reason')<>'already_practiced'
 then raise exception 'Same game/unit/repeat paid extra: %',result;end if;
 result:=public.dm_solo_fair_claim(sid,third_run,'ky',2,array[1],12,0,120,1);
 best_xp:=(result->>'xp')::int;
 if best_xp<=0 then raise exception 'Improved result should earn only its difference: %',result;end if;
 select (value->>'totalXp')::numeric into later from public.extra_data where student_id=sid and key_name='yo';
 if later-prior <> first_xp+best_xp or
 (select sum(xp) from public.dm_game_reward_runs where student_id=sid and game_key='ky')<>first_xp+best_xp
 then raise exception 'Daily best cumulative XP mismatch';end if;
 -- Another game at the same unit has its own independent reward.
 result:=public.dm_solo_fair_claim(sid,'solo-upgrade-run-444444444','hafiza',2,array[1],8,1,120,1);
 if (result->>'xp')::int<=0 then raise exception 'Different game falsely throttled';end if;
end $qa$;
rollback;
