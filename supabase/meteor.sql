-- Private sessions and scores, isolated from XP, gold, energy and game reward tables.
create table if not exists public.papi_meteor_sessions (
 id uuid primary key default gen_random_uuid(),
 actor_key text not null,
 student_id uuid references public.students(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete cascade,
 class_no integer not null check(class_no between 1 and 12),
 unit_no integer not null check(unit_no between 1 and 100),
 mode integer not null check(mode in (1,2)),
 status text not null default 'playing' check(status in ('playing','finished')),
 deck jsonb not null,
 state jsonb not null,
 version integer not null default 0,
 best_score integer not null default 0,
 created_at timestamptz not null default now(),
 check ((student_id is not null)::integer+(teacher_id is not null)::integer=1)
);
alter table public.papi_meteor_sessions enable row level security;
revoke all on public.papi_meteor_sessions from public,anon,authenticated;
grant select,insert,update on public.papi_meteor_sessions to service_role;
create index if not exists papi_meteor_rank on public.papi_meteor_sessions(class_no,unit_no,mode,best_score desc) where status='finished';
create index if not exists papi_meteor_student on public.papi_meteor_sessions(student_id);
create index if not exists papi_meteor_teacher on public.papi_meteor_sessions(teacher_id);
