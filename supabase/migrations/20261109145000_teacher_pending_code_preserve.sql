-- Preserve a pending teacher's one-time registration code when the owner approves.
-- Access remains blocked by teacher_portal_access.state and email_verified_at.
-- Rejections and revocations still invalidate code and all portal sessions.
CREATE OR REPLACE FUNCTION public.dm_teacher_portal_decide(owner_id uuid, grant_id uuid, decision text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO ''
AS $function$
declare r public.teacher_portal_access;s public.students;tid uuid;invite text;
begin
 perform 1 from public.teachers where id=owner_id and username='teacher' and is_admin and active and frozen_at is null;
 if not found then raise exception 'Yalnızca teacher hesabı onay verebilir';end if;
 if decision not in ('approved','rejected','revoked') then raise exception 'Geçersiz karar';end if;
 select * into r from public.teacher_portal_access where id=grant_id for update;
 if not found then raise exception 'Başvuru bulunamadı';end if;
 select * into s from public.students where id=r.student_id and status='approved' and frozen_at is null;
 if not found then raise exception 'Aktif kişisel hesap gerekli';end if;
 tid:=r.teacher_id;
 if decision='approved' and tid is null then
  invite:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.teachers(username,password_hash,full_name,email,phone,school,invite_code,active,is_admin)
  values(s.username,s.password_hash,s.full_name,s.email,s.phone,s.school,invite,true,false) returning id into tid;
 end if;
 if r.state<>decision then
  update public.teacher_portal_access set
    teacher_id=tid,
    state=decision,
    code_digest=case when decision='approved' then r.code_digest else null end,
    code_sent_at=case when decision='approved' then r.code_sent_at else null end,
    version=version+1,decided_by=owner_id,decided_at=now()
  where id=r.id;
  delete from public.portal_sessions where teacher_portal_access_id=r.id;
 end if;
 insert into public.audit_logs(actor_role,operation,target,payload)
 values('teacher','teacherPortalDecide',r.id::text,jsonb_build_object('decision',decision,'owner',owner_id));
 return jsonb_build_object('ok',true,'studentId',s.id);
end $function$;
