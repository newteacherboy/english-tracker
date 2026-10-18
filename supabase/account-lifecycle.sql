begin;
alter table public.students add column if not exists frozen_at timestamptz;
alter table public.teachers add column if not exists frozen_at timestamptz;
create table public.dm_account_action_tickets(
 token_hash text primary key, account_id uuid not null,
 account_role text not null check(account_role in ('student','teacher')),
 action text not null check(action in ('freeze','restore')),
 password_hash_snapshot text not null,
 expires_at timestamptz not null default now()+interval '5 minutes'
);
alter table public.dm_account_action_tickets enable row level security;
revoke all on public.dm_account_action_tickets from public,anon,authenticated;
grant select,insert,update,delete on public.dm_account_action_tickets to service_role;
create or replace function public.dm_account_action(p_ticket_hash text,p_action text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.dm_account_action_tickets; h text; e text; frozen timestamptz;
begin
 select * into t from public.dm_account_action_tickets where token_hash=p_ticket_hash for update;
 if not found or t.expires_at<now() or t.action<>p_action then raise exception 'ticket_expired'; end if;
 -- Serialize administrator lifecycle changes, including concurrent freeze attempts.
 perform pg_advisory_xact_lock(874205311);
 if t.account_role='student' then
  select password_hash,email,frozen_at into h,e,frozen from public.students where id=t.account_id for update;
 else
  select password_hash,email,frozen_at into h,e,frozen from public.teachers where id=t.account_id for update;
 end if;
 if not found or h is distinct from t.password_hash_snapshot then raise exception 'reauth_required'; end if;
 if t.account_role='teacher' and p_action='freeze' and exists(select 1 from public.teachers where id=t.account_id and is_admin and active) and not exists(select 1 from public.teachers where id<>t.account_id and is_admin and active and frozen_at is null) then raise exception 'last_admin'; end if;
 if t.account_role='student' then update public.students set frozen_at=case when p_action='freeze' then now() else null end where id=t.account_id;
 else update public.teachers set frozen_at=case when p_action='freeze' then now() else null end where id=t.account_id; end if;
 delete from public.portal_sessions where (t.account_role='student' and student_id=t.account_id) or (t.account_role='teacher' and teacher_id=t.account_id);
 if p_action='freeze' then
  update public.mail_queue set error='account_frozen',send_after='infinity'::timestamptz where sent_at is null and not (kind='kayit' and subject like 'Şifre yenileme%') and (student_id=t.account_id or (e is not null and lower(to_email)=lower(e)));
 end if;
 delete from public.dm_account_action_tickets where account_id=t.account_id and account_role=t.account_role;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.dm_account_action(text,text) from public,anon,authenticated;
grant execute on function public.dm_account_action(text,text) to service_role;
create or replace function public.dm_frozen_session_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.student_id is not null and exists(select 1 from public.students where id=new.student_id and frozen_at is not null)) or (new.teacher_id is not null and exists(select 1 from public.teachers where id=new.teacher_id and frozen_at is not null)) then raise exception 'account_frozen'; end if;
 return new;
end $$;
create trigger dm_frozen_session_guard before insert or update on public.portal_sessions for each row execute function public.dm_frozen_session_guard();
create or replace function public.dm_frozen_mail_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='kayit' and new.subject like 'Şifre yenileme%' then return new; end if;
 if exists(select 1 from public.students where frozen_at is not null and (id=new.student_id or lower(email)=lower(new.to_email))) or exists(select 1 from public.teachers where frozen_at is not null and lower(email)=lower(new.to_email)) then
  new.error='account_frozen';new.send_after='infinity'::timestamptz;
 end if;
 return new;
end $$;
create trigger dm_frozen_mail_guard before insert or update on public.mail_queue for each row execute function public.dm_frozen_mail_guard();
create function public.dm_frozen_last_admin_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(874205311);
 if old.active and old.is_admin and old.frozen_at is null and not exists(select 1 from public.teachers where id<>old.id and active and is_admin and frozen_at is null) then raise exception 'last_admin'; end if;
 return old;
end $$;
create trigger dm_frozen_last_admin_guard before delete on public.teachers for each row execute function public.dm_frozen_last_admin_guard();
revoke all on function public.dm_frozen_session_guard(),public.dm_frozen_mail_guard(),public.dm_frozen_last_admin_guard() from public,anon,authenticated;
commit;
