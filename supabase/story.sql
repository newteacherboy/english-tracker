-- Learning route is independent from game stops, balances and XP.
create table if not exists public.papi_story_progress (
 actor_key text not null,
 student_id uuid references public.students(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete cascade,
 chapter integer not null check(chapter between 0 and 39),
 cursor integer not null default 0 check(cursor between 0 and 10),
 completed boolean not null default false,
 version integer not null default 0,
 mistakes integer not null default 0,
 writing text not null default '' check(length(writing)<=2000),
 updated_at timestamptz not null default now(),
 primary key(actor_key,chapter),
 check((student_id is not null)::integer+(teacher_id is not null)::integer=1)
);
alter table public.papi_story_progress enable row level security;
revoke all on public.papi_story_progress from public,anon,authenticated,service_role;
grant select,insert,update on public.papi_story_progress to service_role;
create index if not exists papi_story_student on public.papi_story_progress(student_id);
create index if not exists papi_story_teacher on public.papi_story_progress(teacher_id);
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='papi_story_progress' and policyname='papi_story_private') then
  create policy papi_story_private on public.papi_story_progress for all to anon,authenticated using(false) with check(false);
 end if;
end $$;
