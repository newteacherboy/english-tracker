-- Apply once before deploying the Google login Edge Function.
-- Separate mapping: no existing student IDs, passwords or learning data change.
begin;
create table public.student_google_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  student_id uuid not null unique references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.student_google_accounts enable row level security;
revoke all on public.student_google_accounts from public, anon, authenticated;
grant select, insert on public.student_google_accounts to service_role;
commit;
