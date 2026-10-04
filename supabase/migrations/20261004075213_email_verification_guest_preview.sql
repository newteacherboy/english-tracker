alter table public.mail_queue add column if not exists priority integer not null default 0;
alter table public.students add column if not exists email_verification_required boolean not null default false;
alter table public.students add column if not exists email_verified_at timestamptz;
create table public.dm_email_verifications(token_hash text primary key check(length(token_hash)=64),student_id uuid not null references public.students(id) on delete cascade,email text not null,created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '24 hours'),consumed_at timestamptz);
create index dm_email_student_time on public.dm_email_verifications(student_id,created_at);
alter table public.dm_email_verifications enable row level security;
revoke all on public.dm_email_verifications from public,anon,authenticated;
create table public.dm_guest_previews(device_hash text primary key check(length(device_hash)=64),started_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '10 minutes'));
alter table public.dm_guest_previews enable row level security;
revoke all on public.dm_guest_previews from public,anon,authenticated;
create or replace function public.dm_email_issue(actor uuid,digest text,mail text,title text,html_body text,plain_body text) returns bigint language plpgsql security invoker set search_path='' as $$
declare st public.students; last_at timestamptz; n int; mid bigint;
begin
 select * into st from public.students where id=actor for update;
 if st.id is null or st.status not in ('pending','approved') or lower(st.email)<>lower(mail) or length(digest)<>64 then raise exception 'Doğrulama oluşturulamadı.';end if;
 select max(created_at),count(*) filter(where created_at>now()-interval '24 hours') into last_at,n from public.dm_email_verifications where student_id=actor;
 if last_at>now()-interval '60 seconds' or n>=3 then raise exception 'Biraz bekle. Günde en fazla 3 doğrulama e-postası gönderebilirsin.';end if;
 update public.mail_queue set attempts=5,error='Yeni doğrulama bağlantısıyla değiştirildi.' where student_id=actor and kind='dogrulama' and sent_at is null;
 update public.dm_email_verifications set consumed_at=now() where student_id=actor and consumed_at is null;
 insert into public.dm_email_verifications(token_hash,student_id,email) values(digest,actor,mail);
 insert into public.mail_queue(student_id,to_email,subject,html,text_body,kind,priority) values(actor,mail,title,html_body,plain_body,'dogrulama',100) returning id into mid;
 return mid;
end $$;
create or replace function public.dm_email_verify(digest text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare ticket public.dm_email_verifications; st public.students;
begin
 -- Serialize issuance and consumption by student, avoiding inverse lock ordering.
 select * into ticket from public.dm_email_verifications where token_hash=digest;
 if not found then return jsonb_build_object('ok',false,'mesaj','Bağlantı geçersiz. Yeni doğrulama e-postası iste.');end if;
 select * into st from public.students where id=ticket.student_id for update;
 select * into ticket from public.dm_email_verifications where token_hash=digest for update;
 if ticket.consumed_at is not null or ticket.expires_at<=now() or lower(st.email)<>lower(ticket.email) or st.status not in ('pending','approved') then return jsonb_build_object('ok',false,'mesaj','Bağlantının süresi dolmuş veya daha önce kullanılmış. Giriş ekranından yeni bağlantı iste.');end if;
 if st.status='pending' and not st.email_verification_required then return jsonb_build_object('ok',false,'mesaj','Bu hesap öğretmen onayı bekliyor.');end if;
 update public.dm_email_verifications set consumed_at=now() where token_hash=digest;
 update public.students set email_verified_at=now(),status='approved',updated_at=now() where id=st.id;
 return jsonb_build_object('ok',true,'ogrenci',st.username,'mesaj','Hoş geldin! E-posta adresin doğrulandı, hesabın hazır.');
end $$;
create or replace function public.dm_guest_preview(digest text,begin_preview boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.dm_guest_previews;
begin
 if length(digest)<>64 then raise exception 'Geçersiz deneme.';end if;
 if begin_preview then insert into public.dm_guest_previews(device_hash) values(digest) on conflict do nothing;end if;
 select * into g from public.dm_guest_previews where device_hash=digest;
 return jsonb_build_object('ok',g.device_hash is not null and g.expires_at>now(),'expiresAt',g.expires_at,'serverNow',now());
end $$;
revoke all on function public.dm_email_issue(uuid,text,text,text,text,text),public.dm_email_verify(text),public.dm_guest_preview(text,boolean) from public,anon,authenticated;
grant execute on function public.dm_email_issue(uuid,text,text,text,text,text),public.dm_email_verify(text),public.dm_guest_preview(text,boolean) to service_role;

create table public.dm_mail_budget(day date primary key,attempts integer not null default 0 check(attempts between 0 and 300));
alter table public.dm_mail_budget enable row level security;
revoke all on public.dm_mail_budget from public,anon,authenticated;
create or replace function public.dm_mail_slot() returns boolean language plpgsql security invoker set search_path='' as $$
declare d date:=(now() at time zone 'UTC')::date; n int;
begin
 insert into public.dm_mail_budget(day) values(d) on conflict do nothing;
 update public.dm_mail_budget set attempts=attempts+1 where day=d and attempts<300 returning attempts into n;
 return n is not null;
end $$;
revoke all on function public.dm_mail_slot() from public,anon,authenticated;
grant execute on function public.dm_mail_slot() to service_role;
