-- Run against Postgres; fixtures and all writes roll back.
begin;
do $$
declare actor uuid:=gen_random_uuid(); owner_key text; r jsonb; i int; c int; v int; before_xp numeric; after_xp numeric; before_gold numeric;
begin
 owner_key:='s:'||actor;
 insert into public.students(id,username,password_hash,status,energy,energy_updated_at) values(actor,'story-qa-'||actor,'not-a-login','approved',30,now());
 insert into public.extra_data(student_id,key_name,value) values(actor,'yo','{"totalXp":5000,"altin":20,"guncelleme":1}');
 insert into public.papi_story_progress(actor_key,student_id,chapter) values(owner_key,actor,0);
 r:=public.dm_story_apply(owner_key,0,0,0,true,false,9,7);
 r:=public.dm_story_apply(owner_key,0,1,1,true,false,9,7);
 r:=public.dm_story_apply(owner_key,0,2,2,true,true,9,7);
 r:=public.dm_story_apply(owner_key,0,3,3,false,true,9,7);
 if (r->>'energySpent')::int<>1 or (r->>'enerjiKalan')::int<>29 then raise exception 'Energy pair failed: %',r;end if;
 r:=public.dm_story_apply(owner_key,0,3,3,false,true,9,7);
 if not (r->>'stale')::boolean then raise exception 'Expected stale';end if;
 r:=public.dm_story_apply(owner_key,0,3,4,false,true,9,7);
 if (r->>'energySpent')::int<>0 or (r->>'enerjiKalan')::int<>29 then raise exception 'Retry charged twice';end if;
 update public.students set energy=0 where id=actor;
 r:=public.dm_story_apply(owner_key,0,3,5,true,true,9,7);
 if not (r->>'correct')::boolean then raise exception 'Paid retry blocked';end if;
 r:=public.dm_story_apply(owner_key,0,4,6,true,true,9,7);
 if not (r->>'energyEmpty')::boolean then raise exception 'Zero energy not blocked';end if;
 update public.students set energy=30 where id=actor;
 for i in 4..8 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=0;
  r:=public.dm_story_apply(owner_key,0,c,v,true,true,9,7);
 end loop;
 if not (r->>'finished')::boolean or (r#>>'{reward,xp}')::int<>48 then raise exception 'Completion XP failed: %',r;end if;
 select (value->>'totalXp')::numeric into before_xp from public.extra_data where student_id=actor and key_name='yo';
 select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=0;
 r:=public.dm_story_apply(owner_key,0,c,v,true,true,9,7);
 if not (r->>'alreadyCompleted')::boolean then raise exception 'Duplicate completed failed';end if;
 update public.papi_story_progress set cursor=0,version=version+1,replay=true,questions_seen=0,charged_cursor=-1,mistakes=0,last_reward='{}' where actor_key=owner_key and chapter=0;
 for i in 0..8 loop
  select cursor,version into c,v from public.papi_story_progress where actor_key=owner_key and chapter=0;
  r:=public.dm_story_apply(owner_key,0,c,v,true,i>=2,9,7);
 end loop;
 select (value->>'totalXp')::numeric into after_xp from public.extra_data where student_id=actor and key_name='yo';
 if before_xp<>after_xp or r->'reward'<>'{}'::jsonb then raise exception 'Replay awarded twice';end if;
 -- Third combined stop grants existing level-dependent gold; two ledger rows from chapter 0 and this fixture.
 insert into public.dm_progress_rewards(student_id,kind,reward_key) values(actor,'stop','qa-existing-stop');
 insert into public.papi_story_progress(actor_key,student_id,chapter,cursor,version,questions_seen,charged_cursor) values(owner_key,actor,1,9,0,7,8);
 select gold into before_gold from public.students where id=actor;
 r:=public.dm_story_apply(owner_key,1,9,0,true,true,10,8);
 if (r#>>'{reward,gold}')::int<=0 then raise exception 'Third stop gold missing: %',r;end if;
 if not exists(select 1 from public.students where id=actor and gold=before_gold+(r#>>'{reward,gold}')::int) then raise exception 'Gold balance mismatch';end if;
 -- Regeneration resumes the saved question using the normal 15-minute interval.
 insert into public.papi_story_progress(actor_key,student_id,chapter,cursor,version) values(owner_key,actor,2,2,0);
 update public.students set energy=0,energy_updated_at=now()-interval '16 minutes' where id=actor;
 r:=public.dm_story_apply(owner_key,2,2,0,true,true,10,8);
 if (r->>'enerjiKalan')::int<>1 then raise exception 'Regeneration failed';end if;
 if exists(select 1 from public.level_completions where student_id=actor) then raise exception 'Learning modified game-map completions';end if;
end $$;
rollback;
