begin;
-- Freeze session insertion while old access tokens are recorded and restricted.
lock table public.portal_sessions in share row exclusive mode;
-- Account-level declaration; the administrator approval state and private code stay independent.
alter table public.teacher_portal_access
 add column branch_status text not null default 'pending' check (branch_status in ('pending','english','other')),
 add column branch_declared_at timestamptz,
 add column branch_review_required boolean not null default false;
-- The synthetic App Store review account is not a human teacher; leave the owner and demo operational.
update public.teacher_portal_access set branch_status='english'
 where student_id is null or (student_id='dcde2026-1015-4000-8000-000000000001' and teacher_id='dcde2026-1015-4000-8000-000000000002');

-- Preserve only the already authenticated teacher's limited path back to their own personal account.
-- Ordinary personal sessions are never modified. Classroom participant tokens cannot use this path.
create table public.teacher_branch_resume_sessions(
 token_hash text primary key, access_id uuid not null references public.teacher_portal_access(id) on delete cascade,
 version integer not null, expires_at timestamptz not null
);
alter table public.teacher_branch_resume_sessions enable row level security;
revoke all on public.teacher_branch_resume_sessions from public,anon,authenticated;
grant all on public.teacher_branch_resume_sessions to service_role;
create index on public.teacher_branch_resume_sessions(access_id);
insert into public.teacher_branch_resume_sessions(token_hash,access_id,version,expires_at)
 select s.token_hash,g.id,g.version,s.expires_at
 from public.portal_sessions s join public.teacher_portal_access g on g.id=s.teacher_portal_access_id
 where s.role='teacher' and s.teacher_id=g.teacher_id and s.teacher_portal_version=g.version
 and s.expires_at>now() and g.branch_status='pending' and g.state='approved';
-- All Edge Functions already require an unexpired portal session. Expire scoped tokens only.
update public.portal_sessions s set expires_at=least(s.expires_at,now())
 from public.teacher_portal_access g where g.branch_status<>'english' and
 (s.teacher_portal_access_id=g.id or (s.role='teacher' and s.teacher_id=g.teacher_id));

create function public.dm_teacher_branch_session_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.teacher_portal_access_id is not null then
  perform 1 from public.teacher_portal_access g where g.id=new.teacher_portal_access_id
    and g.state='approved' and g.branch_status='english' and g.version=new.teacher_portal_version for share;
  if not found then
   raise exception 'Teacher declaration and approval required';
  end if;
 elsif new.role='teacher' and not exists(select 1 from public.teachers t where t.id=new.teacher_id and t.username='teacher' and t.is_admin and t.active and t.frozen_at is null) then
  raise exception 'Scoped teacher session required';
 end if;
 return new;
end $$;
revoke all on function public.dm_teacher_branch_session_guard() from public,anon,authenticated;
grant execute on function public.dm_teacher_branch_session_guard() to service_role;
create trigger dm_teacher_branch_session_guard before insert on public.portal_sessions
 for each row execute function public.dm_teacher_branch_session_guard();

create function public.dm_teacher_branch_declare(p_student uuid,p_grant uuid,p_admin uuid,p_choice text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare g public.teacher_portal_access; review_needed boolean; declared_at timestamptz;
begin
 if p_admin is not null then
  if p_student is not null or p_grant is null or not exists(select 1 from public.teachers t where t.id=p_admin and t.username='teacher' and t.is_admin and t.active and t.frozen_at is null) then raise exception 'Administrator required'; end if;
  select * into g from public.teacher_portal_access where id=p_grant and student_id is not null for update;
 else
  if p_student is null or p_grant is not null or p_choice not in ('english','other') then raise exception 'Personal account required'; end if;
  select * into g from public.teacher_portal_access where student_id=p_student for update;
 end if;
 if not found or p_choice is null or p_choice not in ('pending','english','other') then raise exception 'Invalid declaration'; end if;
 if p_admin is null and g.branch_status<>'pending' then
  if g.branch_status<>p_choice then raise exception 'Administrator correction required'; end if;
  return jsonb_build_object('branchStatus',g.branch_status,'branchDeclaredAt',g.branch_declared_at,'branchReview',g.branch_review_required,'teacherAccount',g.branch_status<>'other','state',g.state);
 end if;
 review_needed:=p_choice='other' and g.teacher_id is not null and (
 exists(select 1 from public.dm_teacher_classes c where c.teacher_id=g.teacher_id and c.archived_at is null)
 or exists(select 1 from public.students s where s.teacher_id=g.teacher_id and s.status='approved')
 or exists(select 1 from public.assignments a where a.teacher_id=g.teacher_id and a.active));
 declared_at:=case when p_choice='pending' then null else now() end;
 update public.teacher_portal_access set branch_status=p_choice,branch_declared_at=declared_at,branch_review_required=review_needed,
 version=version+case when p_choice<>'english' then 1 else 0 end where id=g.id;
 if p_choice<>'english' then
  update public.portal_sessions s set expires_at=least(s.expires_at,now()) where
    s.teacher_portal_access_id=g.id or (s.role='teacher' and s.teacher_id=g.teacher_id);
  delete from public.teacher_branch_resume_sessions where access_id=g.id;
 end if;
 insert into public.audit_logs(actor_role,actor_id,operation,target,payload)
 values(case when p_admin is null then 'student' else 'teacher' end,coalesce(p_admin,p_student),'teacherBranchDeclaration',g.id::text,
 jsonb_build_object('before',g.branch_status,'after',p_choice,'review',review_needed));
 return jsonb_build_object('branchStatus',p_choice,'branchDeclaredAt',declared_at,'branchReview',review_needed,'teacherAccount',p_choice<>'other','state',g.state);
end $$;
revoke all on function public.dm_teacher_branch_declare(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.dm_teacher_branch_declare(uuid,uuid,uuid,text) to service_role;
commit;
