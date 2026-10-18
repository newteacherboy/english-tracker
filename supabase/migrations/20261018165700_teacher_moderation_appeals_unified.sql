-- Unified complaint moderation: private student notice, acknowledgment and appeal.
alter table public.dm_teacher_student_notices
  add column if not exists report_id uuid references public.dm_safety_reports(id) on delete set null,
  add column if not exists appeal_allowed boolean not null default true,
  add column if not exists appealed_at timestamptz,
  add column if not exists appeal_message text,
  add column if not exists appeal_reviewed_at timestamptz;
create index if not exists dm_notices_teacher_appeals_idx
  on public.dm_teacher_student_notices (teacher_id, appealed_at desc)
  where appealed_at is not null;
