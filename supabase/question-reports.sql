create table if not exists public.dm_question_reports (
 id bigint generated always as identity primary key,
 student_id uuid not null references public.students(id) on delete cascade,
 fingerprint text not null, reasons text[] not null, note text not null default '',
 snapshot jsonb not null, status text not null default 'pending' check(status in ('pending','reviewing','resolved')),
 created_at timestamptz not null default now(), unique(student_id,fingerprint)
);
alter table public.dm_question_reports enable row level security;
revoke all on public.dm_question_reports from public,anon,authenticated;
grant select,insert,update on public.dm_question_reports to service_role;
grant usage,select on sequence public.dm_question_reports_id_seq to service_role;
create index if not exists dm_question_reports_fingerprint_idx on public.dm_question_reports(fingerprint);
