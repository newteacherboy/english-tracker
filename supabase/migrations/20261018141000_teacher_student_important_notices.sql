-- Teacher-issued important notices are private to the authenticated student.
create table public.dm_teacher_student_notices (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 teacher_id uuid references public.teachers(id) on delete set null,
 kind text not null check(kind in ('warning','discipline')),
 message text not null check(length(message) between 5 and 450),
 created_at timestamptz not null default now(),
 acknowledged_at timestamptz,
 constraint dm_notice_ack_after_create check(acknowledged_at is null or acknowledged_at>=created_at)
);
create index dm_teacher_student_notices_unread on public.dm_teacher_student_notices(student_id,created_at) where acknowledged_at is null;
alter table public.dm_teacher_student_notices enable row level security;
revoke all on public.dm_teacher_student_notices from public,anon,authenticated;
grant select,insert,update on public.dm_teacher_student_notices to service_role;
