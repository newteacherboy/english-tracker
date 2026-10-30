begin;
do $qa$
declare sid uuid:=gen_random_uuid();r jsonb;rid text;game text;i int;failed boolean;before_energy int;tasks jsonb:='[{"en":"bus","tr":"otobüs","kind":"en"},{"en":"car","tr":"araba","kind":"en"}]';
begin
 if has_function_privilege('anon','public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.dm_arcade_verified_start(uuid,text,text,integer,integer[],integer,jsonb)','EXECUTE') then raise exception 'Arcade API exposed';end if;
 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at) values(sid,'arcade-qa-'||sid,'not-a-login','approved','student',25,25,now());
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":0,"altin":100,"guncelleme":1}');
 foreach game in array array['canavar','kule'] loop
  rid:='arcade-qa-'||gen_random_uuid();failed:=false;
  begin perform public.dm_arcade_verified_start(sid,rid,game,5,array[1],0,tasks);exception when others then failed:=true;end;
  if not failed then raise exception 'Level gate bypass: %',game;end if;
 end loop;
 update public.extra_data set value=value||'{"totalXp":1000000}'::jsonb where student_id=sid and key_name='yo';
 foreach game in array array['canavar','kule'] loop
  rid:='arcade-qa-'||gen_random_uuid();select energy into before_energy from public.students where id=sid;
  r:=public.dm_arcade_verified_start(sid,rid,game,5,array[1],0,tasks);
  if (r->>'enerjiKalan')::int<>before_energy-3 then raise exception 'Incorrect entry cost';end if;
  r:=public.dm_arcade_verified_start(sid,rid,game,5,array[1],0,tasks);
  if (r->>'enerjiKalan')::int<>before_energy-3 then raise exception 'Double energy charge';end if;
  perform public.dm_verified_answer(sid,rid,0,'arcade-event-right',true,true);
  perform public.dm_verified_answer(sid,rid,1,'arcade-event-wrong',false,true);
  r:=public.dm_verified_result(sid,rid,game,5,array[1],0);
  if (r->>'correct')::int<>1 or (r->>'wrong')::int<>1 or (r->>'complete')::int<>2 then raise exception 'Wrong evidence count: %',r;end if;
  r:=public.dm_solo_fair_claim(sid,rid,game,5,array[1],1,1,30,1);
  if not (r->>'ok')::boolean then raise exception 'Reward failed';end if;
  r:=public.dm_solo_fair_claim(sid,rid,game,5,array[1],1,1,30,1);
  if not (r->>'duplicate')::boolean then raise exception 'Duplicate reward';end if;
  if public.dm_reward_limits(game)<>public.dm_reward_limits('ky') then raise exception 'Solo policy differs';end if;
 end loop;
 update public.students set energy=2,energy_updated_at=now() where id=sid;
 rid:='arcade-empty-'||gen_random_uuid();failed:=false;
 begin perform public.dm_arcade_verified_start(sid,rid,'canavar',5,array[1],0,tasks);exception when others then failed:=true;end;
 if not failed or exists(select 1 from public.dm_verified_runs where student_id=sid and run_id=rid) then raise exception 'Insufficient energy created a run';end if;
 r:=public.dm_teacher_verified_start(sid,rid,'kule',5,array[1],0,tasks);
 if not (r->>'rankingOnly')::boolean or (select energy from public.students where id=sid)<>2 then raise exception 'Teacher charged energy';end if;
end $qa$;
rollback;
