-- All fixtures, energy changes, feed events and wallet awards roll back.
begin;
set local role service_role;
do $$
declare sid uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();rid2 uuid:=gen_random_uuid();deck jsonb;v jsonb;again jsonb;n int;balance int;g numeric;early boolean:=false;blocked boolean:=false;
begin
 insert into public.students(id,username,password_hash,status,role,energy,energy_max) values(sid,'qa_rally_'||replace(sid::text,'-',''),'disabled-test-only','approved','student',20,20);
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":10000,"altin":100,"guncelleme":1}');
 select jsonb_agg(jsonb_build_object('en','word '||i,'tr','anlam '||i,'word','word '||i,'direction','en-tr','options',jsonb_build_array('yanlış','anlam '||i,'başka'),'answer',1)) into deck from generate_series(1,15) i;
 update public.extra_data set value=jsonb_set(value,'{totalXp}','5949') where student_id=sid and key_name='yo';
 begin perform public.dm_rally_start(sid,rid,5,array[1],deck,'normal');exception when others then if sqlerrm not like '%15. seviyede%' then raise;end if;blocked:=true;end;
 if not blocked or (select energy from public.students where id=sid)<>20 then raise exception 'level 14 access or energy charge';end if;
 update public.extra_data set value=jsonb_set(value,'{totalXp}','5950') where student_id=sid and key_name='yo';
 v:=public.dm_rally_start(sid,rid,5,array[1],deck,'normal');again:=public.dm_rally_start(sid,rid,5,array[1],deck,'normal');
 if (v->>'energy')::int<>17 or v->'question' ? 'answer' or v ? 'deck' then raise exception 'start, energy or answer leak';end if;
 select energy into balance from public.students where id=sid;if balance<>17 then raise exception 'duplicate energy charge';end if;
 begin perform public.dm_rally_answer(sid,rid,0,1);exception when others then early:=true;end;if not early then raise exception 'instant-answer farming accepted';end if;
 for i in 0..14 loop
  update public.dm_rally_runs set round_at=clock_timestamp()-interval '6 seconds' where id=rid;
  v:=public.dm_rally_answer(sid,rid,i,1);
  again:=public.dm_rally_answer(sid,rid,i,1);
  if (again#>>'{state,index}')::int<>i+1 then raise exception 'duplicate answer advanced twice';end if;
 end loop;
 if not(v->>'finished')::boolean or (v#>>'{state,correct}')::int<>15 or (v#>>'{reward,xp}')::int<=0 then raise exception 'complete race reward failed: %',v;end if;
 select gold into g from public.students where id=sid;
 again:=public.dm_rally_finish(sid,rid);
 if (select gold from public.students where id=sid)<>g then raise exception 'duplicate reward';end if;
 select count(*) into n from public.dm_game_reward_runs where student_id=sid and run_id=rid::text;if n<>1 then raise exception 'reward ledger duplicate';end if;
 select count(*) into n from public.game_scores where student_id=sid and game_key='ralli';if n<>1 then raise exception 'leaderboard score duplicate';end if;
 v:=public.dm_rally_start(sid,rid2,5,array[1],deck,'easy');
 for i in 0..1 loop
  update public.dm_rally_runs set round_at=clock_timestamp()-interval '7 seconds' where id=rid2;
  v:=public.dm_rally_answer(sid,rid2,i,0);
  if i=0 and ((v->>'finished')::boolean or (v#>>'{state,hearts}')::int<>1) then raise exception 'first wrong must leave one heart';end if;
 end loop;
 if not(v->>'finished')::boolean or (v#>>'{state,hearts}')::int<>0 or (v#>>'{reward,xp}')::int<>0 or (v#>>'{reward,gold}')::int<>0 then raise exception 'zero-correct run awarded or hearts failed';end if;
 if has_function_privilege('anon','public.dm_rally_answer(uuid,uuid,integer,integer)','EXECUTE') or has_table_privilege('anon','public.dm_rally_runs','SELECT') then raise exception 'public access to private race state';end if;
end $$;
select 'PASS: 15-question race, private deck, atomic energy, replay idempotency, early answer rejection, 2 hearts, rewards and zero-correct result' as result;
rollback;
