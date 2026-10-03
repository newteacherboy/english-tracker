-- Additive installation. No account is deleted by installing this file.
begin;
create table public.diji_deletion_tickets (
  token_hash text primary key,
  account_id uuid not null,
  account_role text not null check (account_role in ('student','teacher')),
  password_hash_snapshot text not null,
  expires_at timestamptz not null default now() + interval '5 minutes'
);
create table public.diji_deletion_rate (
  target_hash text primary key,
  attempts integer not null,
  window_start timestamptz not null
);
create table public.diji_deletion_receipts (
  token_hash text primary key,
  result jsonb not null,
  expires_at timestamptz not null default now() + interval '1 day'
);
create table public.diji_deletion_auth_queue (
  auth_user_id uuid primary key,
  attempts integer not null default 0,
  retry_at timestamptz not null default now()
);
create table public.diji_deletion_worker_settings (
  id boolean primary key default true check (id),
  worker_key text not null
);
insert into public.diji_deletion_worker_settings(id,worker_key)
values (true,encode(extensions.gen_random_bytes(32),'hex'));
alter table public.diji_deletion_tickets enable row level security;
alter table public.diji_deletion_rate enable row level security;
alter table public.diji_deletion_receipts enable row level security;
alter table public.diji_deletion_auth_queue enable row level security;
alter table public.diji_deletion_worker_settings enable row level security;
revoke all on public.diji_deletion_tickets,public.diji_deletion_rate,
  public.diji_deletion_auth_queue,public.diji_deletion_worker_settings,public.diji_deletion_receipts from public,anon,authenticated;
grant select,insert,update,delete on public.diji_deletion_tickets,public.diji_deletion_rate,
  public.diji_deletion_auth_queue,public.diji_deletion_receipts to service_role;
grant select on public.diji_deletion_worker_settings to service_role;

create function public.diji_deletion_rate_allow(p_target_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.diji_deletion_rate as r(target_hash,attempts,window_start)
  values (p_target_hash,1,now())
  on conflict (target_hash) do update set
    attempts = case when r.window_start < now()-interval '15 minutes' then 1 else r.attempts+1 end,
    window_start = case when r.window_start < now()-interval '15 minutes' then now() else r.window_start end
  returning attempts into n;
  return n <= 5;
end $$;

-- Redact exact identity values in structured references, retaining other users' records.
create function public.diji_deletion_redact(v jsonb, needles text[])
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare result jsonb; item record;
begin
  if v is null then return null; end if;
  case jsonb_typeof(v)
  when 'string' then
    if v #>> '{}' = any(needles) then return '"Silinen hesap"'::jsonb; end if;
    return v;
  when 'array' then
    select coalesce(jsonb_agg(public.diji_deletion_redact(value,needles) order by ord),'[]'::jsonb)
      into result from jsonb_array_elements(v) with ordinality as a(value,ord);
    return result;
  when 'object' then
    result := '{}'::jsonb;
    for item in select key,value from jsonb_each(v) loop
      if not (item.key = any(needles)) then
        result := result || jsonb_build_object(item.key,public.diji_deletion_redact(item.value,needles));
      end if;
    end loop;
    return result;
  else return v;
  end case;
end $$;

create function public.diji_delete_account(p_ticket_hash text,p_confirmation text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  ticket public.diji_deletion_tickets%rowtype;
  account_name text; stored_hash text; account_email text; admin_account boolean;
  google_id uuid; needles text[]; active_admins integer; result jsonb;
begin
  if p_confirmation is distinct from 'HESABIMI SİL' then raise exception 'confirmation_required'; end if;
  select * into ticket from public.diji_deletion_tickets
    where token_hash=p_ticket_hash for update;
  if not found then
    select r.result into result from public.diji_deletion_receipts r
      where token_hash=p_ticket_hash and expires_at>now();
    if result is not null then return result; end if;
    raise exception 'ticket_expired';
  end if;
  if ticket.expires_at <= now() then raise exception 'ticket_expired'; end if;
  -- Serialize last-admin checks, including simultaneous self-deletions.
  if ticket.account_role='teacher' then
    perform pg_advisory_xact_lock(874205311);
    perform 1 from public.teachers where is_admin and active order by id for update;
    select username,password_hash,email,is_admin into account_name,stored_hash,account_email,admin_account
      from public.teachers where id=ticket.account_id for update;
  else
    select username,password_hash,email into account_name,stored_hash,account_email
      from public.students where id=ticket.account_id for update;
  end if;
  if account_name is null then raise exception 'account_missing'; end if;
  if stored_hash is distinct from ticket.password_hash_snapshot then raise exception 'reauth_required'; end if;
  needles := array[account_name,ticket.account_id::text];
  if ticket.account_role='teacher' and admin_account then
    select count(*) into active_admins from public.teachers
      where is_admin and active and id<>ticket.account_id;
    if active_admins=0 then raise exception 'last_admin'; end if;
  end if;

  delete from public.audit_logs where actor_id=ticket.account_id
    or target in (ticket.account_id::text,account_name,lower(account_name),lower(translate(account_name,'İI','iı')));
  update public.audit_logs set payload=public.diji_deletion_redact(payload,needles)
    where public.diji_deletion_redact(payload,needles) is distinct from payload;
  if ticket.account_role='student' then
    -- CASCADE alone leaves old score names and SET NULL references behind.
    delete from public.game_scores where student_id=ticket.account_id
      or (student_id is null and lower(btrim(student_name))=lower(btrim(account_name)));
    delete from public.badges where lower(btrim(student_name))=lower(btrim(account_name));
    delete from public.notifications where sender_student_id=ticket.account_id or recipient_student_id=ticket.account_id;
    delete from public.feed_events where target_student_id=ticket.account_id;
    update public.feed_events set payload=public.diji_deletion_redact(payload,needles)
      where student_id<>ticket.account_id and public.diji_deletion_redact(payload,needles) is distinct from payload;
    update public.notifications set payload=public.diji_deletion_redact(payload,needles)
      where public.diji_deletion_redact(payload,needles) is distinct from payload;
    delete from public.assignment_status where student_id=ticket.account_id;
    delete from public.mail_queue where student_id=ticket.account_id;
    delete from public.feature_flags where target_type='ogrenci'
      and lower(btrim(target_value))=lower(btrim(account_name));
    delete from public.legacy_import_rows where exists (
      select 1 from jsonb_each_text(case when jsonb_typeof(source_row)='object' then source_row else '{}'::jsonb end) a
      where translate(lower(a.key),'öğüşıç','ogusic') in ('ogrenci','ogrenciadi','ogrenci adi','student_id')
        and (lower(btrim(a.value))=lower(btrim(account_name)) or a.value=ticket.account_id::text)
    );
    delete from public.legacy_unmapped_rows where exists (
      select 1 from jsonb_each_text(case when jsonb_typeof(source_row_data)='object' then source_row_data else '{}'::jsonb end) a
      where translate(lower(a.key),'öğüşıç','ogusic') in ('ogrenci','ogrenciadi','ogrenci adi','student_id')
        and (lower(btrim(a.value))=lower(btrim(account_name)) or a.value=ticket.account_id::text)
    );
    update public.class_point_actions set student_ids=student_ids-ticket.account_id::text-account_name
      where student_ids ? ticket.account_id::text or student_ids ? account_name;
    update public.announcements set target_list=target_list-account_name-ticket.account_id::text
      where jsonb_typeof(target_list)='array' and (target_list ? account_name or target_list ? ticket.account_id::text);
    update public.extra_data set value=public.diji_deletion_redact(value,needles)
      where student_id<>ticket.account_id
        and public.diji_deletion_redact(value,needles) is distinct from value;
    if to_regclass('public.student_google_accounts') is not null then
      execute 'select auth_user_id from public.student_google_accounts where student_id=$1'
        into google_id using ticket.account_id;
      if google_id is not null then
        insert into public.diji_deletion_auth_queue(auth_user_id) values(google_id) on conflict do nothing;
      end if;
    end if;
    -- All FK-linked progress, sessions, duels, follows, reports and own feed rows cascade.
    delete from public.students where id=ticket.account_id;
  else
    -- Shared learning content and students survive deletion of their teacher.
    if not exists(select 1 from public.students where lower(btrim(username))=lower(btrim(account_name))) then
      delete from public.game_scores where student_id is null and lower(btrim(student_name))=lower(btrim(account_name));
      delete from public.badges where lower(btrim(student_name))=lower(btrim(account_name));
    end if;
    update public.students set teacher_id=null where teacher_id=ticket.account_id;
    update public.assignments set teacher_id=null where teacher_id=ticket.account_id;
    update public.announcements set teacher_id=null where teacher_id=ticket.account_id;
    update public.teacher_reports set teacher_id=null where teacher_id=ticket.account_id;
    delete from public.mail_queue where account_email is not null and account_email<>'' and to_email=account_email;
    delete from public.teachers where id=ticket.account_id;
  end if;
  delete from public.diji_deletion_tickets where account_id=ticket.account_id and account_role=ticket.account_role;
  result:=jsonb_build_object('ok',true,'google_cleanup_pending',google_id is not null);
  insert into public.diji_deletion_receipts(token_hash,result) values(p_ticket_hash,result);
  return result;
end $$;

create function public.diji_deletion_claim_auth(p_limit integer default 10)
returns table(auth_user_id uuid) language sql security invoker set search_path = '' as $$
  update public.diji_deletion_auth_queue q set attempts=q.attempts+1,retry_at=now()+interval '10 minutes'
  where q.auth_user_id in (
    select a.auth_user_id from public.diji_deletion_auth_queue a where a.retry_at<=now()
    order by a.retry_at for update skip locked limit least(greatest(p_limit,1),20)
  ) returning q.auth_user_id;
$$;

create function public.diji_deletion_tick()
returns bigint language plpgsql security invoker set search_path = '' as $$
declare key_value text; request_id bigint;
begin
  delete from public.diji_deletion_tickets where expires_at<now();
  delete from public.diji_deletion_rate where window_start<now()-interval '30 minutes';
  delete from public.diji_deletion_receipts where expires_at<now();
  if not exists(select 1 from public.diji_deletion_auth_queue where retry_at<=now()) then return null; end if;
  select worker_key into key_value from public.diji_deletion_worker_settings where id;
  select net.http_post(
    url:='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/account-delete',
    headers:=jsonb_build_object('Content-Type','application/json','x-diji-delete-worker',key_value),
    body:='{"operation":"cleanup"}'::jsonb,timeout_milliseconds:=10000
  ) into request_id;
  return request_id;
end $$;

revoke all on function public.diji_deletion_rate_allow(text),public.diji_deletion_redact(jsonb,text[]),
  public.diji_delete_account(text,text),public.diji_deletion_claim_auth(integer),public.diji_deletion_tick()
  from public,anon,authenticated;
grant execute on function public.diji_deletion_rate_allow(text),public.diji_deletion_redact(jsonb,text[]),
  public.diji_delete_account(text,text),public.diji_deletion_claim_auth(integer) to service_role;
select cron.schedule('diji-account-deletion-cleanup','*/10 * * * *','select public.diji_deletion_tick()');
commit;
