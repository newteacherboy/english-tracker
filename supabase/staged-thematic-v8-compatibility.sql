-- Staged Diji-Medu v8 compatibility migration; apply only with coordinated server/client rollout.
-- All old first-answer rows and chapter records are retained.
begin;
alter table public.dm_thematic_first_answers drop constraint dm_thematic_first_answers_question_cursor_check;
alter table public.dm_thematic_first_answers add constraint dm_thematic_first_answers_question_cursor_check check (question_cursor between 1 and 13);
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
 or chapter_no not between 1000 and 1239 or expected_cursor not between 0 and 13
 or expected_version<0 or step_count not in (10,11,12,14)
 or (case when step_count=14 then question_count<>10 else question_count<>step_count-1 end) or answer_correct is null or is_question is null or combo_correct is null
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
 if step_count in (12,14) and p.cursor=step_count-1 and not p.replay and not p.reward_claimed then
  select count(*),count(*) filter(where first_correct) into n,correct_count
  from public.dm_thematic_first_answers where actor_key=owner_key and chapter=chapter_no;
  if not exists(select 1 from public.dm_thematic_first_answers where actor_key=owner_key
        and chapter=chapter_no and question_cursor=step_count-1) and p.charged_cursor<>p.cursor then
   n:=n+1;
   if combo_correct then correct_count:=correct_count+1;end if;
  end if;
  score_eligible:=n=question_count;
  if score_eligible then
   tier:=case when correct_count=question_count then 100
         when correct_count>=question_count-1 then 80
         when correct_count>=ceil(question_count*0.7) then 60 else 0 end;
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
 if is_question and p.cursor>(step_count-question_count-1) and p.cursor<step_count
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
create or replace function public.dm_thematic_recovery_answer(
 owner_key text, chapter_no integer, expected_version integer,
 expected_step integer, answer_correct boolean
) returns jsonb language plpgsql security invoker set search_path='' as $recover$
declare p public.papi_story_progress; rec public.dm_thematic_recovery; r jsonb; new_award jsonb;
 n integer; c integer; step_total integer; question_total integer; final_cursor integer;
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
 step_total:=case when p.deck_version=8 then 14 else 12 end;
 question_total:=case when p.deck_version=8 then 10 else 11 end;
 final_cursor:=step_total-1;
 if not found or rec.completed or p.completed or p.replay or p.cursor<>final_cursor
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
 if n<>question_total or c>=ceil(question_total*0.7) then raise exception 'İlk başarı kaydı tutarsız';end if;
 -- Final review was already answered (and charged), so this completion costs
 -- no additional energy and never adds a second five-answer combo.
 r:=public.dm_story_apply(owner_key,chapter_no,p.cursor,p.version,
   true,false,step_total,question_total,false);
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
 jsonb_build_object('answered',n,'correct',c,'total',question_total,'percentage',round(100.0*c/question_total)));
end $recover$;
commit;
