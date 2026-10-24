begin;
do $test$
declare sid uuid:=gen_random_uuid(); d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');r jsonb;v jsonb;blocked boolean;
begin
 insert into public.students(id,username,password_hash,status,role,energy,energy_max,energy_updated_at) values(sid,'qa_companion_'||replace(sid::text,'-',''),'not-a-login-hash','approved','student',30,30,now());
 insert into public.extra_data(student_id,key_name,value) values(sid,'yo','{"totalXp":10,"altin":5,"guncelleme":1}'::jsonb);
 blocked:=false;begin perform public.dm_companion_reward(sid,'story','cafe');exception when others then blocked:=true;end;if not blocked then raise exception 'incomplete story awarded';end if;
 insert into public.extra_data(student_id,key_name,value) values(sid,'practice_dialogue:cafe:'||d,'{"cursor":3,"answers":{"0":{},"1":{},"2":{}}}');
 r:=public.dm_companion_reward(sid,'story','cafe');if r->>'claimed'<>'true' or (r->>'xp')::int<>50 or (r->>'gold')::int<>20 or (r->>'energy')::int<>2 or (r->>'enerjiKalan')::int<>32 then raise exception 'wrong story reward: %',r;end if;
 r:=public.dm_companion_reward(sid,'story','cafe');if r->>'claimed'<>'false' or (r->>'xp')::int<>0 or (r->>'enerjiKalan')::int<>32 then raise exception 'duplicate reward';end if;
 insert into public.extra_data(student_id,key_name,value) values(sid,'practice_dialogue:weather:'||d,'{"cursor":3,"answers":{"0":{},"1":{},"2":{}}}');
 perform public.dm_companion_reward(sid,'story','weather');
 insert into public.extra_data(student_id,key_name,value) values(sid,'practice_plan:'||d,'{"route":true}');
 blocked:=false;begin perform public.dm_companion_reward(sid,'plan');exception when others then blocked:=true;end;if not blocked then raise exception 'forged planner checkbox accepted';end if;
 insert into public.dm_route_mission_completions(student_id,chapter) values(sid,1);
 insert into public.extra_data(student_id,key_name,value) values(sid,'review_word:due',jsonb_build_object('en','apple','tr','elma','dueAt',now()-interval '1 day'));
 blocked:=false;begin perform public.dm_companion_reward(sid,'plan');exception when others then blocked:=true;end;if not blocked then raise exception 'pending review accepted';end if;
 insert into public.extra_data(student_id,key_name,value)
 select sid,'review_word:reviewed-'||i,jsonb_build_object('dueAt',now()-interval '1 day','lastReviewedAt',((now() at time zone 'Europe/Istanbul')::date::timestamp at time zone 'Europe/Istanbul')+interval '30 minutes') from generate_series(1,3) i;
 r:=public.dm_companion_reward(sid,'plan');if r->>'claimed'<>'true' or (r->>'xp')::int<>120 or (r->>'gold')::int<>50 or (r->>'energy')::int<>0 then raise exception 'wrong plan reward';end if;
 r:=public.dm_companion_reward(sid,'plan');if r->>'claimed'<>'false' then raise exception 'daily plan paid twice';end if;
 select value into v from public.extra_data where student_id=sid and key_name='yo';
 if (v->>'totalXp')::int<>230 or (v->>'altin')::int<>95 or (select energy from public.students where id=sid)<>34 then raise exception 'incorrect final wallet %',v;end if;
 if has_function_privilege('anon','public.dm_companion_reward(uuid,text,text)','execute') or has_function_privilege('authenticated','public.dm_companion_reward(uuid,text,text)','execute') then raise exception 'public reward endpoint exposed';end if;
end $test$;
rollback;
