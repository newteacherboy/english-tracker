-- Capture the real FIRST graded attempt at each thematic question.
-- No existing rewards, completions or balances are altered by this migration.
begin;
create table if not exists public.dm_thematic_first_answers (
 actor_key text not null check (actor_key ~ '^[st]:[0-9a-f-]{36}$'),
 chapter integer not null check (chapter between 1000 and 1239),
 question_cursor integer not null check (question_cursor between 1 and 11),
 first_correct boolean not null,
 created_at timestamptz not null default now(),
 primary key (actor_key, chapter, question_cursor)
);
create index if not exists dm_thematic_first_answers_chapter on public.dm_thematic_first_answers(chapter);
alter table public.dm_thematic_first_answers enable row level security;
revoke all on public.dm_thematic_first_answers from public,anon,authenticated;
grant select,insert on public.dm_thematic_first_answers to service_role;

create or replace function public.dm_thematic_fair_step(
 owner_key text, chapter_no integer, expected_cursor integer, expected_version integer,
 answer_correct boolean, is_question boolean, step_count integer,
 question_count integer, combo_correct boolean
) returns jsonb language plpgsql security invoker set search_path='' as $fair$
declare p public.papi_story_progress; r jsonb; n integer; correct_count integer;
begin
 if owner_key is null or owner_key !~ '^[st]:[0-9a-f-]{36}$'
    or chapter_no not between 1000 and 1239
    or expected_cursor not between 0 and 11
    or expected_version < 0
    or step_count not in (10,11,12) or question_count <> step_count-1
    or answer_correct is null or is_question is null or combo_correct is null
 then raise exception 'Geçersiz ilk deneme kaydı';end if;
 -- Follow the existing economy lock order. Serialise concurrent requests first.
 if left(owner_key,2)='s:' then
  perform pg_advisory_xact_lock(hashtextextended(substring(owner_key from 3),17));
  perform 1 from public.students where id=substring(owner_key from 3)::uuid for update;
 end if;
 select * into p from public.papi_story_progress
 where actor_key=owner_key and chapter=chapter_no for update;
 if not found then raise exception 'Önce bölümü aç';end if;
 -- Existing transactionally applied rewards and energy logic remains authoritative.
 r:=public.dm_story_apply(owner_key,chapter_no,expected_cursor,expected_version,
   answer_correct,is_question,step_count,question_count,combo_correct);
 -- Only actual, paid/accepted first responses count. A retry, replay, stale
 -- version, unsuccessful energy charge or a teaching step never changes it.
 if coalesce((r->>'ok')::boolean,false)
    and not coalesce((r->>'stale')::boolean,false)
    and not coalesce((r->>'energyEmpty')::boolean,false)
    and is_question and p.cursor=expected_cursor and p.version=expected_version
    and p.cursor>0 and p.cursor<step_count and p.charged_cursor<>p.cursor
    and not p.replay and not p.completed then
  insert into public.dm_thematic_first_answers(actor_key,chapter,question_cursor,first_correct)
  values(owner_key,chapter_no,p.cursor,combo_correct) on conflict do nothing;
 end if;
 select count(*),count(*) filter(where first_correct)
 into n,correct_count from public.dm_thematic_first_answers
 where actor_key=owner_key and chapter=chapter_no;
 return r || jsonb_build_object('firstAttempt',
   jsonb_build_object('answered',n,'correct',correct_count,'total',question_count,
     'complete',n=question_count,'eligible',n=question_count and not p.replay,
     'percentage',case when n>0 then round(100.0*correct_count/n) else null end));
end $fair$;
revoke all on function public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.dm_thematic_fair_step(text,integer,integer,integer,boolean,boolean,integer,integer,boolean) to service_role;
commit;
