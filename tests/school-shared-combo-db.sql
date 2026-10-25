-- Run inside BEGIN/ROLLBACK with a synthetic account; no learner data survives.
do $qa$
declare sid uuid:=gen_random_uuid();rid text:='school-shared-'||gen_random_uuid();tasks jsonb;
 r jsonb;i integer;before_energy integer;old_event text;gain_sum integer:=0;
begin
 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at)
 values(sid,'school-qa-'||sid,'not-a-login','approved','student',25,25,now());
 select jsonb_agg(jsonb_build_object('schoolVersion',9,'kind',case when n<2 then 'teach' else 'choice' end)) into tasks from generate_series(0,11) n;
 perform public.dm_verified_start(sid,rid,'ba',2,array[1],220151,tasks);
 for i in 0..6 loop
  r:=public.dm_verified_answer(sid,rid,i,'event-'||gen_random_uuid(),true,true);
  if i<6 and coalesce((r->'energy'->>'gain')::int,0)<>0 then raise exception 'Early combo awarded at %',i;end if;
 end loop;
 if (r->'energy'->>'gain')::int<>1 then raise exception 'Five graded answers did not award one energy: %',r;end if;
 -- An intermediate wrong click is retained even after that question is solved.
 perform public.dm_verified_answer(sid,rid,7,'wrong-'||gen_random_uuid(),false,false);
 r:=public.dm_verified_answer(sid,rid,7,'retry-'||gen_random_uuid(),true,true);
 if (r->>'firstCorrect')::boolean then raise exception 'A retry restored a broken combo';end if;
 for i in 8..11 loop
  r:=public.dm_verified_answer(sid,rid,i,'after-wrong-'||gen_random_uuid(),true,true);
  if coalesce((r->'energy'->>'gain')::int,0)<>0 then raise exception 'Wrong did not break the five-answer streak';end if;
 end loop;
 r:=public.dm_verified_result(sid,rid,'ba',2,array[1],220151);
 if (r->>'complete')::int<>12 then raise exception 'Shared school result cannot use existing reward gate';end if;
 rid:='school-perfect-'||gen_random_uuid();
 perform public.dm_verified_start(sid,rid,'ba',2,array[1],220151,tasks);
 for i in 0..11 loop
  old_event:='perfect-'||gen_random_uuid();r:=public.dm_verified_answer(sid,rid,i,old_event,true,true);
  gain_sum:=gain_sum+coalesce((r->'energy'->>'gain')::int,0);
 end loop;
 if gain_sum<>2 then raise exception 'Ten correct graded answers must award exactly two energy, got %',gain_sum;end if;
 select energy into before_energy from public.students where id=sid;
 perform public.dm_verified_answer(sid,rid,11,old_event,true,true);
 if (select energy from public.students where id=sid)<>before_energy then raise exception 'Duplicate answer awarded energy twice';end if;
end $qa$;
