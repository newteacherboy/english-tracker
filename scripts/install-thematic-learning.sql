begin;
-- New curriculum lives in 1000..1239; original chapters and balances remain intact.
alter table public.papi_story_progress drop constraint if exists papi_story_progress_chapter_check;
alter table public.papi_story_progress add constraint papi_story_progress_chapter_check
 check (chapter between 0 and 79 or chapter between 1000 and 1239);
create table if not exists public.dm_thematic_enrollment (
 actor_key text primary key check(actor_key ~ '^[st]:[0-9a-f-]{36}$'),
 student_id uuid references public.students(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete cascade,
 inherited_count integer not null default 0 check(inherited_count between 0 and 80),
 created_at timestamptz not null default now(),
 check ((student_id is not null)::int+(teacher_id is not null)::int=1)
);
alter table public.dm_thematic_enrollment enable row level security;
revoke all on public.dm_thematic_enrollment from public,anon,authenticated;
grant select,insert on public.dm_thematic_enrollment to service_role;
create index if not exists dm_thematic_enrollment_student on public.dm_thematic_enrollment(student_id);
create index if not exists dm_thematic_enrollment_teacher on public.dm_thematic_enrollment(teacher_id);
-- Extend the live atomic engine without replacing its economy/combo implementation.
do $patch$
declare source text;
begin
 select pg_get_functiondef('public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer)'::regprocedure) into source;
 if position('chapter_no not between 0 and 79' in source)>0 then
  source:=replace(source,'chapter_no not between 0 and 79','(chapter_no not between 0 and 79 and chapter_no not between 1000 and 1239)');
  execute source;
 end if;
end $patch$;
-- This RPC is called only by authenticated portal endpoints, never directly by clients.
revoke all on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer) from public,anon,authenticated;
grant execute on function public.dm_story_apply(text,integer,integer,integer,boolean,boolean,integer,integer) to service_role;
-- Keep social feed labels human-readable for the namespaced curriculum.
do $feed$
declare source text;
begin
 select pg_get_functiondef('public.dm_feed_achievement()'::regprocedure) into source;
 if position('(new.chapter+1)' in source)>0 then
  source:=replace(source,'(new.chapter+1)','(case when new.chapter between 1000 and 1239 then new.chapter-999 else new.chapter+1 end)');
  source:=replace(source,'elsif tg_table_name=''papi_story_progress'' then','elsif tg_table_name=''papi_story_progress'' then' || chr(10) || '  if new.chapter>=1000 and new.replay then return new;end if;');
  execute source;
 end if;
end $feed$;
commit;
