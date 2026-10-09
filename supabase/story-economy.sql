-- Keep historical completions; only future first completions receive rewards.
alter table public.papi_story_progress add column if not exists replay boolean not null default false;
alter table public.papi_story_progress add column if not exists reward_claimed boolean not null default false;
alter table public.papi_story_progress add column if not exists questions_seen integer not null default 0;
alter table public.papi_story_progress add column if not exists charged_cursor integer not null default -1;
alter table public.papi_story_progress add column if not exists last_reward jsonb not null default '{}';
update public.papi_story_progress set reward_claimed=true where completed and not reward_claimed;

-- Answer validation happens in the authenticated Edge Function. This service-only
-- transaction locks progress, energy and reward writes together: retries cannot
-- spend energy twice, finish without saving, or award a chapter twice.
create or replace function public.dm_story_apply(owner_key text,chapter_no int,expected_cursor int,expected_version int,answer_correct boolean,is_question boolean,step_count int,question_count int)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.papi_story_progress; s public.students; v jsonb; reward jsonb:='{}'; regen int; e int; cap int; costs int:=0; seen int; cur int; finished boolean; first_done boolean; stars int; l int; n int; g int:=0;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$' or chapter_no not between 0 and 39 or step_count not between 2 and 10 or question_count not between 1 and 8 or answer_correct is null or is_question is null then raise exception 'Geçersiz öğrenme işlemi';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  select * into s from public.students where id=substring(owner_key from 3)::uuid for update;
  if not found then raise exception 'Öğrenci bulunamadı';end if;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Önce durağı aç';end if;
 if p.version<>expected_version or p.cursor<>expected_cursor then return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p));end if;
 if p.cursor>=step_count then return jsonb_build_object('ok',true,'alreadyCompleted',true,'correct',true,'progress',to_jsonb(p));end if;
 seen:=p.questions_seen;
 if is_question and p.charged_cursor<>p.cursor then seen:=seen+1;if seen%2=0 then costs:=1;end if;end if;
 if s.id is not null then
  cap:=coalesce(nullif(s.energy_max,0),30);e:=coalesce(s.energy,0);
  if e<cap then
   regen:=greatest(0,floor(extract(epoch from (now()-coalesce(s.energy_updated_at,now())))/900)::int);
   if regen>0 then e:=least(cap,e+regen);end if;
  end if;
  -- Exhausted energy pauses a new question; a previously paid retry stays available.
  if is_question and p.charged_cursor<>p.cursor and e<1 then return jsonb_build_object('ok',false,'energyEmpty',true,'mesaj','Enerjin bitti. Enerji dolunca bu sorudan devam edebilirsin.','enerjiKalan',e,'enerjiMax',cap);end if;
  if e<>coalesce(s.energy,0) then
   insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,e-coalesce(s.energy,0),e,'dolum');
  end if;
  if costs>0 then insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(s.id,-costs,e-costs,'papi_story:'||chapter_no||':'||p.cursor);end if;
  update public.students set energy=e-costs,energy_updated_at=case when e>=cap or s.energy_updated_at is null then now() when regen>0 then s.energy_updated_at+regen*interval '15 minutes' else s.energy_updated_at end,updated_at=now() where id=s.id;
 end if;
 cur:=p.cursor+case when answer_correct then 1 else 0 end;finished:=cur>=step_count;first_done:=finished and not p.reward_claimed;
 if first_done and s.id is not null then
  stars:=case when question_count::numeric/(question_count+p.mistakes+case when answer_correct then 0 else 1 end)>=.9 then 3 when question_count::numeric/(question_count+p.mistakes+case when answer_correct then 0 else 1 end)>=.7 then 2 else 1 end;
  reward:=public.dm_game_reward_claim(s.id,'papi-story-'||chapter_no,'ba',0,array[50+chapter_no],question_count,p.mistakes,1,true,stars,1);
  v:=reward->'yo';l:=public.dm_student_level(coalesce((v->>'totalXp')::numeric,0));
  if l>=5 then
   insert into public.dm_progress_rewards(student_id,kind,reward_key) values(s.id,'stop','papi-story-'||chapter_no) on conflict do nothing;
   if found then
    select count(*) into n from public.dm_progress_rewards where student_id=s.id and kind='stop';
    if n%3=0 then g:=(array[15,20,30,40,50,65,80,100])[least(8,(l-5)/5+1)];v:=public.dm_progress_credit(s.id,g);update public.dm_progress_rewards set gold=g where student_id=s.id and kind='stop' and reward_key='papi-story-'||chapter_no;end if;
   end if;
  end if;
  reward:=reward||jsonb_build_object('gold',g,'yo',v,'stars',stars);
 end if;
 update public.papi_story_progress set cursor=cur,completed=p.completed or finished,reward_claimed=p.reward_claimed or finished,questions_seen=seen,charged_cursor=case when is_question then p.cursor else p.charged_cursor end,mistakes=p.mistakes+case when answer_correct then 0 else 1 end,version=p.version+1,last_reward=case when finished then reward else p.last_reward end,updated_at=now() where actor_key=owner_key and chapter=chapter_no returning * into p;
 return jsonb_build_object('ok',true,'progress',to_jsonb(p),'correct',answer_correct,'finished',finished,'leaf',case when first_done then 1 else 0 end,'energySpent',costs,'enerjiKalan',case when s.id is not null then e-costs else null end,'enerjiMax',cap,'reward',p.last_reward,'yo',reward->'yo');
end $$;
revoke all on function public.dm_story_apply(text,int,int,int,boolean,boolean,int,int) from public,anon,authenticated;
grant execute on function public.dm_story_apply(text,int,int,int,boolean,boolean,int,int) to service_role;
