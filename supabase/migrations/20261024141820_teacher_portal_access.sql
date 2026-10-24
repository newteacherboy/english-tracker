begin;
-- Private code grants are independent of the public pupil invitation code.
create table public.teacher_portal_access (
 id uuid primary key default gen_random_uuid(),student_id uuid not null unique references public.students(id) on delete cascade,
 teacher_id uuid unique references public.teachers(id),state text not null default 'pending' check(state in ('pending','approved','rejected','revoked')),
 code_digest text unique,version integer not null default 1,requested_at timestamptz not null default now(),
 decided_at timestamptz,decided_by uuid references public.teachers(id),code_sent_at timestamptz
);
create table public.teacher_portal_resets (
 digest text primary key,access_id uuid not null references public.teacher_portal_access(id) on delete cascade,
 expires_at timestamptz not null,used_at timestamptz,version integer not null
);
create table public.teacher_portal_guests (
 access_id uuid not null references public.teacher_portal_access(id) on delete cascade,
 alias text not null,student_id uuid not null unique references public.students(id) on delete cascade,preview boolean not null default false,
 primary key(access_id,alias,preview)
);
alter table public.portal_sessions add column teacher_portal_access_id uuid references public.teacher_portal_access(id) on delete cascade;
alter table public.portal_sessions add column teacher_portal_version integer;
create index on public.portal_sessions(teacher_portal_access_id);
alter table public.teacher_portal_access enable row level security;
alter table public.teacher_portal_resets enable row level security;
alter table public.teacher_portal_guests enable row level security;
revoke all on public.teacher_portal_access,public.teacher_portal_resets,public.teacher_portal_guests from public,anon,authenticated;
grant all on public.teacher_portal_access,public.teacher_portal_resets,public.teacher_portal_guests to service_role;

create function public.dm_teacher_portal_decide(owner_id uuid,grant_id uuid,decision text) returns jsonb
language plpgsql set search_path='' as $$
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
  update public.teacher_portal_access set teacher_id=tid,state=decision,code_digest=null,code_sent_at=null,version=version+1,decided_by=owner_id,decided_at=now() where id=r.id;
  delete from public.portal_sessions where teacher_portal_access_id=r.id;
 end if;
 insert into public.audit_logs(actor_role,operation,target,payload) values('teacher','teacherPortalDecide',r.id::text,jsonb_build_object('decision',decision,'owner',owner_id));
 return jsonb_build_object('ok',true,'studentId',s.id);
end $$;

-- Code rotation and its mail are one transaction. Reset links cannot be replayed.
create function public.dm_teacher_portal_code(grant_id uuid,new_digest text,mail_title text,mail_html text,mail_text text,expected_version int,reset_digest text default null,initial_only boolean default false) returns boolean
language plpgsql set search_path='' as $$
declare r public.teacher_portal_access;s public.students;
begin
 select * into r from public.teacher_portal_access where id=grant_id for update;
 if not found or r.state<>'approved' or r.version<>expected_version then return false;end if;
 select * into s from public.students where id=r.student_id and status='approved' and email_verified_at is not null and frozen_at is null;
 if not found then return false;end if;
 if initial_only and r.code_digest is not null then return false;end if;
 if reset_digest is not null then
  update public.teacher_portal_resets set used_at=now() where digest=reset_digest and access_id=r.id and version=r.version and used_at is null and expires_at>now();
  if not found then return false;end if;
 end if;
 update public.teacher_portal_access set code_digest=new_digest,code_sent_at=now(),version=version+1 where id=r.id;
 delete from public.portal_sessions where teacher_portal_access_id=r.id;
 insert into public.mail_queue(student_id,to_email,kind,subject,html,text_body,priority) values(s.id,s.email,'kayit',mail_title,mail_html,mail_text,100);
 return true;
end $$;
create function public.dm_teacher_portal_guest(grant_id uuid,guest_alias text,is_preview boolean,secret_hash text) returns uuid
language plpgsql set search_path='' as $$
declare r public.teacher_portal_access;sid uuid;user_name text;
begin
 select * into r from public.teacher_portal_access where id=grant_id and state='approved' for update;
 if not found then raise exception 'Öğretmen erişimi gerekli';end if;
 if length(guest_alias) not between 2 and 32 then raise exception 'İsim 2–32 karakter olmalı';end if;
 select student_id into sid from public.teacher_portal_guests where access_id=r.id and alias=guest_alias and preview=is_preview;
 if sid is not null then return sid;end if;
 user_name:=guest_alias||' · '||case when is_preview then 'Öğretmen Denemesi' else 'Misafir' end||' '||substr(replace(gen_random_uuid()::text,'-',''),1,8);
 insert into public.students(username,password_hash,full_name,status,role,teacher_id,email_verification_required,profile)
 values(user_name,secret_hash,guest_alias,'approved','student',r.teacher_id,false,jsonb_build_object('teacher_portal_guest',true,'teacher_preview',is_preview)) returning id into sid;
 insert into public.teacher_portal_guests values(r.id,guest_alias,sid,is_preview);
 insert into public.extra_data(student_id,key_name,value,updated_at) values(sid,'yo',jsonb_build_object('totalXp',0,'altin',0,'dmProgressProtocol',1,'dmLearningPurpose','independent'),now());
 return sid;
end $$;
revoke all on function public.dm_teacher_portal_decide(uuid,uuid,text),public.dm_teacher_portal_code(uuid,text,text,text,text,int,text,boolean),public.dm_teacher_portal_guest(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.dm_teacher_portal_decide(uuid,uuid,text),public.dm_teacher_portal_code(uuid,text,text,text,text,int,text,boolean),public.dm_teacher_portal_guest(uuid,text,boolean,text) to service_role;
create or replace function public.dm_teacher_rally_start(grant_id uuid,actor uuid,run_key uuid,class_id int,unit_ids int[],question_deck jsonb,pace text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare st public.students;r public.dm_rally_runs;available int;ticks int;v jsonb;
begin
 select * into st from public.students where id=actor and status='approved' and role='student' for update;
 if not found then raise exception 'Öğrenci hesabı gerekli.';end if;
 select value into v from public.extra_data where student_id=actor and key_name='yo';
 perform 1 from public.teacher_portal_access a join public.teachers t on t.id=a.teacher_id where a.id=grant_id and a.state='approved' and t.active and t.frozen_at is null and st.teacher_id=a.teacher_id;
 if not found then raise exception 'Öğretmen erişimi gerekli.';end if;
 select * into r from public.dm_rally_runs where id=run_key;
 if found then if r.student_id<>actor then raise exception 'Yarış bulunamadı.';end if;return public.dm_rally_view(r);end if;
 if class_id is null or class_id not between 1 and 8 or cardinality(unit_ids) not between 1 and 10 or exists(select 1 from unnest(unit_ids) u where u is null or u not between 1 and 100) or pace not in ('easy','normal','hard') or jsonb_typeof(question_deck) is distinct from 'array' or jsonb_array_length(question_deck)<>15 then raise exception 'Geçerli sınıf, ünite ve 15 kelime gerekli.';end if;
 if exists(select 1 from jsonb_array_elements(question_deck) q where jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3 or (q->>'answer')::int not between 0 and 2 or nullif(q->>'word','') is null) then raise exception 'Geçersiz yarış kelimeleri.';end if;
 if (select count(*) from public.dm_rally_runs where student_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Yeni yarış için kısa bir süre bekle.';end if;
 ticks:=greatest(0,floor(extract(epoch from now()-coalesce(st.energy_updated_at,now()))/900));
 available:=case when st.energy>=st.energy_max then st.energy else least(st.energy_max,st.energy+ticks) end;
 if available<3 then raise exception 'Yarışa başlamak için 3 enerji gerekli.';end if;
 insert into public.dm_rally_runs(id,student_id,class_no,units,difficulty,deck) values(run_key,actor,class_id,unit_ids,pace,question_deck) returning * into r;
 update public.students set energy=available-3,energy_updated_at=case when available>=st.energy_max then now() else coalesce(st.energy_updated_at,now())+ticks*interval '15 minutes' end where id=actor;
 insert into public.energy_transactions(student_id,change_amount,balance_after,reason) values(actor,-3,available-3,'ralli:'||run_key);
 return public.dm_rally_view(r)||jsonb_build_object('energy',available-3,'energyMax',st.energy_max);
end $$;
revoke all on function public.dm_teacher_rally_start(uuid,uuid,uuid,int,int[],jsonb,text) from public,anon,authenticated;
grant execute on function public.dm_teacher_rally_start(uuid,uuid,uuid,int,int[],jsonb,text) to service_role;
commit;
