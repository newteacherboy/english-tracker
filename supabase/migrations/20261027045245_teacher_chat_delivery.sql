-- Service-only routing and independent read cursors. Never change students.teacher_id.
create table if not exists public.teacher_chat_admin_copies (
 student_id uuid primary key references public.students(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.teacher_chat_receipts (
 student_id uuid not null references public.students(id) on delete cascade,
 teacher_id uuid not null references public.teachers(id) on delete cascade,
 read_through timestamptz not null,
 primary key(student_id,teacher_id)
);
alter table public.teacher_chat_admin_copies enable row level security;
alter table public.teacher_chat_receipts enable row level security;
revoke all on public.teacher_chat_admin_copies,public.teacher_chat_receipts from public,anon,authenticated;
grant all on public.teacher_chat_admin_copies,public.teacher_chat_receipts to service_role;
-- Snapshot all currently registered member accounts; future linked accounts use their own teacher.
insert into public.teacher_chat_admin_copies(student_id)
select id from public.students where id <> 'dcde2026-1015-4000-8000-000000000001'
 and coalesce(profile->>'teacher_portal_guest','false') <> 'true'
on conflict do nothing;
-- Preserve existing read history for both recipients during rollout.
insert into public.teacher_chat_receipts(student_id,teacher_id,read_through)
select m.student_id,t.id,max(m.created_at) from public.chat_messages m
join public.students s on s.id=m.student_id
join public.teachers t on t.id=s.teacher_id or (t.username='teacher' and t.is_admin)
where m.sender_role='student' and m.read_at is not null
group by m.student_id,t.id on conflict do nothing;
