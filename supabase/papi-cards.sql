-- Separate self-assessment records: excluded from all game, XP, gold and reward queries.
create table if not exists public.papi_card_results (
 id uuid primary key default gen_random_uuid(),
 student_id uuid references public.students(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete cascade,
 owner_key text not null,
 run_id uuid not null,
 display_name text not null check (char_length(display_name) between 1 and 40),
 class_no integer not null check (class_no between 1 and 12),
 unit_no integer not null check (unit_no between 1 and 100),
 total integer not null check (total between 1 and 2000),
 known_count integer not null check (known_count between 0 and total),
 review_count integer not null check (review_count = total-known_count),
 score integer not null check (score between 0 and 100),
 duration_seconds integer not null check (duration_seconds between 0 and 604800),
 created_at timestamptz not null default now(),
 check ((student_id is not null)::integer + (teacher_id is not null)::integer = 1),
 unique (owner_key,run_id)
);
alter table public.papi_card_results enable row level security;
revoke all on public.papi_card_results from public,anon,authenticated;
grant select,insert on public.papi_card_results to service_role;
create index if not exists papi_card_results_ranking on public.papi_card_results(class_no,unit_no,score desc,created_at asc);
create index if not exists papi_card_results_student on public.papi_card_results(student_id);
create index if not exists papi_card_results_teacher on public.papi_card_results(teacher_id);
