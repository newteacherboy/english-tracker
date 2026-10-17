-- Thematic v7 fairness: keep original dm_story_apply and all legacy chapters intact.
-- Only server-verified FIRST attempts of a full 11-question deck activate the gate.
begin;
create table if not exists public.dm_thematic_recovery (
 actor_key text not null check(actor_key ~ '^[st]:[0-9a-f-]{36}$'),
 chapter integer not null check(chapter between 1000 and 1239),
 step integer not null default 0 check(step between 0 and 3),
 errors integer not null default 0 check(errors>=0),
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(actor_key,chapter)
);
alter table public.dm_thematic_recovery enable row level security;
revoke all on public.dm_thematic_recovery from public,anon,authenticated;
grant select,insert,update on public.dm_thematic_recovery to service_role;

-- The original award is issued atomically exactly once by dm_story_apply.
-- Adjust only its BASE XP/gold proportion, preserve separate milestone bonuses,
-- then synchronize the immutable per-run reward ledger and daily/week logs.
create or replace function public.dm_thematic_discount_final(
 owner_key text, chapter_no integer, award jsonb, percent integer
) returns jsonb language plpgsql security invoker set search_path='' as $discount$
declare sid uuid; previous public.dm_game_reward_runs; v jsonb;
 base_x integer; base_g integer; next_x integer; next_g integer; dx integer; dg integer;
 day text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); ver bigint;
 result_reward jsonb;
begin
 if owner_key !~ '^s:[0-9a-f-]{36}$' or chapter_no not between 1000 and 1239 or percent not in (30,60,80,100)
 then raise exception 'Geçersiz ödül oranı';end if;
 sid:=substring(owner_key from 3)::uuid;
 select * into previous from public.dm_game_reward_runs where student_id=sid
   and run_id='papi-story-'||chapter_no for update;
 if not found or previous.game_key<>'ba' then raise exception 'Tamamlama ödül kaydı eksik';end if;
 base_x:=previous.xp; base_g:=previous.gold;
 next_x:=floor(base_x*percent/100.0)::int;
 next_g:=floor(base_g*percent/100.0)::int;
 dx:=base_x-next_x;dg:=base_g-next_g;
 select value into v from public.extra_data where student_id=sid and key_name='yo' for update;
 if v is null then raise exception 'Öğrenci ödül verisi bulunamadı';end if;
 if dx>0 or dg>0 then
  ver:=greatest(floor(extract(epoch from clock_timestamp())*1000)::bigint,coalesce((v->>'guncelleme')::bigint,0)+1);
  v:=v||jsonb_build_object('totalXp',greatest(0,coalesce((v->>'totalXp')::numeric,0)-dx),
    'altin',greatest(0,coalesce((v->>'altin')::numeric,0)-dg),
    'guncelleme',ver,'dmRewardVersion',ver);
  if v#>>'{xpGun,tarih}'=day then
   v:=jsonb_set(v,'{xpGun,xp}',to_jsonb(greatest(0,coalesce((v#>>'{xpGun,xp}')::numeric,0)-dx)));
  end if;
  v:=jsonb_set(v,array['log',day],to_jsonb(greatest(0,coalesce((v#>>array['log',day])::numeric,0)-dx)),true);
  update public.extra_data set value=v,updated_at=now() where student_id=sid and key_name='yo';
  update public.students set gold=(v->>'altin')::numeric where id=sid;
  update public.dm_game_reward_runs set xp=next_x,gold=next_g where student_id=sid and run_id=previous.run_id;
 end if;
 result_reward:=coalesce(award,'{}'::jsonb)||
    jsonb_build_object('xp',next_x,'gold',greatest(0,coalesce((award->>'gold')::int,base_g)-dg),'yo',v,
      'fairPercent',percent,'fairTier',case percent when 100 then 'perfect' when 80 then 'high' when 60 then 'pass' else 'recovery' end);
 update public.papi_story_progress set last_reward=result_reward
 where actor_key=owner_key and chapter=chapter_no;
 return result_reward;
end $discount$;

create or replace function public.dm_thematic_fair_step(
 owner_key text, chapter_no integer, expected_cursor integer, expected_version integer,
 answer_correct boolean, is_question boolean, step_count integer, question_count integer,
 combo_correct boolean
) returns jsonb language plpgsql security invoker set search_path='' as $fair$
declare p public.papi_story_progress; r jsonb; n integer; correct_count integer;
 existing_answer boolean; effective_correct boolean; tier integer:=0; score_eligible boolean:=false;
 rec public.dm_thematic_recovery; new_award jsonb;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$'
 or chapter_no not between 1000 and 1239 or expected_cursor not between 0 and 11
 or expected_version<0 or step_count not in (10,11,12)
 or question_count<>step_count-1 or answer_correct is null or is_question is null or combo_correct is null
 then raise exception 'Geçersiz öğrenme işlemi';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  perform 1 from public.students where id=substring(owner_key from 3)::uuid for update;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Önce bölümü aç';end if;
 if p.cursor<>expected_cursor or p.version<>expected_version then
  return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p));
 end if;
 select * into rec from public.dm_thematic_recovery
 where actor_key=owner_key and chapter=chapter_no for update;
 if rec.actor_key is not null and not rec.completed and not p.completed then
  select count(*),count(*) filter(where first_correct)
   into n,correct_count from public.dm_thematic_first_answers
   where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',false,'needsRecovery',true,
   'progress',to_jsonb(p),'firstAttempt',jsonb_build_object('answered',n,'correct',correct_count,
     'total',question_count,'complete',n=question_count,'percentage',round(100.0*correct_count/greatest(n,1))),
   'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 -- Inspect the final task without accepting client-supplied correctness counts.
 -- Legacy/in-progress decks missing a complete historical first-answer ledger
 -- are grandfathered: do not block or discount those students.
 if step_count=12 and p.cursor=11 and not p.replay and not p.reward_claimed then
  select count(*),count(*) filter(where first_correct) into n,correct_count
  from public.dm_thematic_first_answers where actor_key=owner_key and chapter=chapter_no;
  if not exists(select 1 from public.dm_thematic_first_answers where actor_key=owner_key
        and chapter=chapter_no and question_cursor=11) and p.charged_cursor<>p.cursor then
   n:=n+1;
   if combo_correct then correct_count:=correct_count+1;end if;
  end if;
  score_eligible:=n=11;
  if score_eligible then
   tier:=case when correct_count=11 then 100 when correct_count>=10 then 80
         when correct_count>=8 then 60 else 0 end;
  end if;
 end if;
 -- A below-8/11 learner finishes the review QUESTION but not the lesson.
 -- This deliberately returns cursor=11 and requires three new recovery questions.
 if score_eligible and tier=0 then
  r:=public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,
     false,is_question,step_count,question_count,combo_correct);
 else
  r:=public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,
     answer_correct,is_question,step_count,question_count,combo_correct);
 end if;
 if not coalesce((r->>'ok')::boolean,false)
  or coalesce((r->>'stale')::boolean,false)
  or coalesce((r->>'energyEmpty')::boolean,false) then return r;end if;
 if is_question and p.cursor>0 and p.cursor<step_count
  and p.charged_cursor<>p.cursor and not p.replay and not p.completed then
  insert into public.dm_thematic_first_answers(actor_key,chapter,question_cursor,first_correct)
  values(owner_key,chapter_no,p.cursor,combo_correct) on conflict do nothing;
 end if;
 select count(*),count(*) filter(where first_correct)
  into n,correct_count from public.dm_thematic_first_answers
  where actor_key=owner_key and chapter=chapter_no;
 if score_eligible and tier=0 then
  insert into public.dm_thematic_recovery(actor_key,chapter)
  values(owner_key,chapter_no) on conflict do nothing;
  r:=r||jsonb_build_object('needsRecovery',true,
     'recovery',jsonb_build_object('step',0,'total',3),
     'mesaj','Kısa pekiştirme turuyla bölümü bitir.');
 elsif score_eligible and tier>0 and coalesce((r->>'finished')::boolean,false)
   and left(owner_key,2)='s:' then
  new_award:=public.dm_thematic_discount_final(owner_key,chapter_no,r->'reward',tier);
  r:=jsonb_set(r,'{reward}',new_award);
  r:=jsonb_set(r,'{yo}',new_award->'yo');
  r:=jsonb_set(r,'{progress,last_reward}',new_award);
 end if;
 return r||jsonb_build_object('firstAttempt',
   jsonb_build_object('answered',n,'correct',correct_count,'total',question_count,
     'complete',n=question_count,'eligible',n=question_count and not p.replay,
     'percentage',case when n>0 then round(100.0*correct_count/n) else null end));
end $fair$;

-- Recovery answers are also server-graded by the Edge Function's shared curriculum.
-- SQL controls step order, state, locks, and completion/reward atomically.
create or replace function public.dm_thematic_recovery_answer(
 owner_key text, chapter_no integer, expected_version integer,
 expected_step integer, answer_correct boolean
) returns jsonb language plpgsql security invoker set search_path='' as $recover$
declare p public.papi_story_progress; rec public.dm_thematic_recovery; r jsonb; new_award jsonb;
 n integer; c integer;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$'
  or chapter_no not between 1000 and 1239 or expected_version<0
  or expected_step not between 0 and 2 or answer_correct is null then
  raise exception 'Geçersiz pekiştirme cevabı';end if;
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  perform 1 from public.students where id=substring(owner_key from 3)::uuid for update;
 end if;
 select * into p from public.papi_story_progress where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Bölüm bulunamadı';end if;
 select * into rec from public.dm_thematic_recovery
 where actor_key=owner_key and chapter=chapter_no for update;
 if not found or rec.completed or p.completed or p.replay or p.cursor<>11
 then raise exception 'Pekiştirme açık değil';end if;
 if rec.step<>expected_step or p.version<>expected_version then
  return jsonb_build_object('ok',true,'stale',true,'progress',to_jsonb(p),
   'needsRecovery',true,'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 if not answer_correct then
  update public.dm_thematic_recovery set errors=errors+1,updated_at=now()
   where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',false,'accepted',false,'needsRecovery',true,
   'progress',to_jsonb(p),'recovery',jsonb_build_object('step',rec.step,'total',3));
 end if;
 if rec.step<2 then
  update public.dm_thematic_recovery set step=step+1,updated_at=now()
  where actor_key=owner_key and chapter=chapter_no;
  return jsonb_build_object('ok',true,'correct',true,'accepted',true,'needsRecovery',true,
   'progress',to_jsonb(p),'recovery',jsonb_build_object('step',rec.step+1,'total',3));
 end if;
 select count(*),count(*) filter(where first_correct) into n,c
 from public.dm_thematic_first_answers where actor_key=owner_key and chapter=chapter_no;
 if n<>11 or c>=8 then raise exception 'İlk başarı kaydı tutarsız';end if;
 -- Final review was already answered (and charged), so this completion costs
 -- no additional energy and never adds a second five-answer combo.
 r:=public.dm_story_apply(owner_key,chapter_no,p.cursor,p.version,
   true,false,12,11,false);
 if not coalesce((r->>'ok')::boolean,false) or not coalesce((r->>'finished')::boolean,false)
 then raise exception 'Pekiştirme tamamlanamadı';end if;
 if left(owner_key,2)='s:' then
  new_award:=public.dm_thematic_discount_final(owner_key,chapter_no,r->'reward',30);
  r:=jsonb_set(r,'{reward}',new_award);
  r:=jsonb_set(r,'{yo}',new_award->'yo');
  r:=jsonb_set(r,'{progress,last_reward}',new_award);
 end if;
 update public.dm_thematic_recovery set step=3,completed=true,updated_at=now()
 where actor_key=owner_key and chapter=chapter_no;
 return r||jsonb_build_object('accepted',true,'recovered',true,'firstAttempt',
 jsonb_build_object('answered',n,'correct',c,'total',11,'percentage',round(100.0*c/11)));
end $recover$;
revoke all on function public.dm_thematic_discount_final(text,integer,jsonb,integer) from public,anon,authenticated;
revoke all on function public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) from public,anon,authenticated;
revoke all on function public.dm_thematic_recovery_answer(text,integer,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.dm_thematic_discount_final(text,integer,jsonb,integer) to service_role;
grant execute on function public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) to service_role;
grant execute on function public.dm_thematic_recovery_answer(text,integer,integer,integer,boolean) to service_role;
commit;
