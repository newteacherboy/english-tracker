-- Social controls are opt-out. No account is gated while waiting for a guardian.
create table public.dm_social_controls (
 student_id uuid primary key references public.students(id) on delete cascade,
 guardian_email text, pin_hash text, verified_at timestamptz,
 social_enabled boolean not null default true, profile_visible boolean not null default true,
 messages_enabled boolean not null default true, duels_enabled boolean not null default true, gifts_enabled boolean not null default true,
 suspended_until timestamptz, notice_seen_at timestamptz, updated_at timestamptz not null default now()
);
create table public.dm_guardian_challenges (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 token_hash text unique not null check(length(token_hash)=64), email text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour', used_at timestamptz
);
create index dm_guardian_challenges_student on public.dm_guardian_challenges(student_id,created_at desc);
create table public.dm_guardian_sessions (
 token_hash text primary key check(length(token_hash)=64), student_id uuid not null references public.students(id) on delete cascade,
 pin_snapshot text not null, expires_at timestamptz not null default now()+interval '10 minutes'
);
create index dm_guardian_sessions_student on public.dm_guardian_sessions(student_id);
create table public.dm_safety_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.students(id) on delete cascade,
 target_id uuid not null references public.students(id) on delete cascade, request_id uuid not null,
 kind text not null check(kind in ('user','feed','message')), item_id uuid,
 reason text not null check(reason in ('bullying','inappropriate','personal_info','spam','other')),
 note text not null default '' check(length(note)<=500), snapshot jsonb not null default '{}',
 status text not null default 'new' check(status in ('new','reviewing','resolved','dismissed')),
 reviewed_by uuid references public.teachers(id) on delete set null, review_note text not null default '' check(length(review_note)<=500),
 action text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(reporter_id,request_id), check(reporter_id<>target_id)
);
create index dm_safety_reports_queue on public.dm_safety_reports(status,created_at desc);
create index dm_safety_reports_target on public.dm_safety_reports(target_id,created_at desc);
create table public.dm_safety_review_log (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.dm_safety_reports(id) on delete cascade,
 admin_id uuid references public.teachers(id) on delete set null, action text not null, note text not null default '', created_at timestamptz not null default now()
);
alter table public.feed_events add column safety_hidden boolean not null default false;
-- All access goes through authenticated server handlers. Never expose PINs, links or reporter identities to clients.
do $$ declare t text; begin foreach t in array array['dm_social_controls','dm_guardian_challenges','dm_guardian_sessions','dm_safety_reports','dm_safety_review_log'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop; end $$;
create function public.dm_social_allowed(p_student uuid,p_feature text default 'social') returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select c.social_enabled and (c.suspended_until is null or c.suspended_until<=now()) and case p_feature
 when 'profile' then c.profile_visible when 'messages' then c.messages_enabled when 'duels' then c.duels_enabled when 'gifts' then c.gifts_enabled else true end
 from public.dm_social_controls c where c.student_id=p_student),true);
$$;
create function public.dm_guardian_claim(p_hash text,p_pin text,p_session text) returns uuid language plpgsql security invoker set search_path='' as $$
declare ch public.dm_guardian_challenges; c public.dm_social_controls; begin
 if length(p_hash)<>64 or length(p_session)<>64 or p_pin not like 'pbkdf2$%' then raise exception 'Geçersiz doğrulama.'; end if;
 select * into ch from public.dm_guardian_challenges where token_hash=p_hash for update;
 if ch.id is null or ch.used_at is not null or ch.expires_at<=now() then raise exception 'Bağlantı geçersiz veya süresi dolmuş.'; end if;
 -- Serialize competing initial claims without resetting any social preferences.
 perform 1 from public.students where id=ch.student_id and status='approved' for update;
 if not found then raise exception 'Hesap kullanılamıyor.'; end if;
 select * into c from public.dm_social_controls where student_id=ch.student_id for update;
 if c.verified_at is not null and c.guardian_email<>ch.email then raise exception 'Veli adresi değişmiş.'; end if;
 insert into public.dm_social_controls(student_id,guardian_email,pin_hash,verified_at) values(ch.student_id,ch.email,p_pin,now())
 on conflict(student_id) do update set guardian_email=excluded.guardian_email,pin_hash=excluded.pin_hash,verified_at=now(),updated_at=now();
 update public.dm_guardian_challenges set used_at=now() where student_id=ch.student_id and used_at is null;
 delete from public.dm_guardian_sessions where student_id=ch.student_id;
 insert into public.dm_guardian_sessions(token_hash,student_id,pin_snapshot) values(p_session,ch.student_id,p_pin);
 return ch.student_id;
end $$;
create function public.dm_guardian_save(p_session text,p_settings jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.dm_guardian_sessions; c public.dm_social_controls; k text; begin
 select * into s from public.dm_guardian_sessions where token_hash=p_session for update;
 if s.student_id is null or s.expires_at<=now() then raise exception 'Veli oturumu sona erdi. Yeniden doğrula.'; end if;
 select * into c from public.dm_social_controls where student_id=s.student_id for update;
 if c.verified_at is null or c.pin_hash<>s.pin_snapshot then raise exception 'Veli oturumu geçersiz.'; end if;
 if jsonb_typeof(p_settings)<>'object' or p_settings-'social_enabled'-'profile_visible'-'messages_enabled'-'duels_enabled'-'gifts_enabled'<>'{}'::jsonb then raise exception 'Geçersiz ayarlar.'; end if;
 foreach k in array array['social_enabled','profile_visible','messages_enabled','duels_enabled','gifts_enabled'] loop
 if jsonb_typeof(p_settings->k) is distinct from 'boolean' then raise exception 'Bütün ayarları seç.'; end if; end loop;
 update public.dm_social_controls set social_enabled=(p_settings->>'social_enabled')::boolean,profile_visible=(p_settings->>'profile_visible')::boolean,
 messages_enabled=(p_settings->>'messages_enabled')::boolean,duels_enabled=(p_settings->>'duels_enabled')::boolean,gifts_enabled=(p_settings->>'gifts_enabled')::boolean,updated_at=now() where student_id=s.student_id;
 return s.student_id;
end $$;
create function public.dm_safety_report_create(p_actor uuid,p_target text,p_kind text,p_item uuid,p_reason text,p_note text,p_request uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare target uuid; snap jsonb; rid uuid; begin
 if not exists(select 1 from public.students where id=p_actor and status='approved') then raise exception 'Öğrenci oturumu gerekli.'; end if;
 select id into rid from public.dm_safety_reports where reporter_id=p_actor and request_id=p_request;
 if rid is not null then return rid; end if;
 if p_kind='feed' then
 select student_id,jsonb_build_object('type',event_type,'payload',payload) into target,snap from public.feed_events where id=p_item;
 elsif p_kind='message' then
 select sender_student_id,jsonb_build_object('type',type,'message',message) into target,snap from public.notifications where id=p_item and recipient_student_id=p_actor;
 elsif p_kind='user' then
 select id,jsonb_build_object('username',username) into target,snap from public.students where lower(username)=lower(trim(p_target)) and status='approved';
 else raise exception 'Geçersiz bildirim türü.'; end if;
 if target is null or target=p_actor then raise exception 'Bildirilecek kullanıcı veya içerik bulunamadı.'; end if;
 if (select count(*) from public.dm_safety_reports where reporter_id=p_actor and created_at>now()-interval '1 day')>=20 then raise exception 'Günlük bildirim sınırına ulaştın.'; end if;
 insert into public.dm_safety_reports(reporter_id,target_id,request_id,kind,item_id,reason,note,snapshot) values(p_actor,target,p_request,p_kind,p_item,p_reason,left(coalesce(p_note,''),500),snap)
 on conflict(reporter_id,request_id) do update set request_id=excluded.request_id returning id into rid;
 return rid;
end $$;
create function public.dm_safety_review(p_admin uuid,p_report uuid,p_action text,p_note text default '',p_days integer default 1) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.dm_safety_reports; begin
 if not exists(select 1 from public.teachers where id=p_admin and active and is_admin) then raise exception 'Yönetici yetkisi gerekli.'; end if;
 select * into r from public.dm_safety_reports where id=p_report for update;
 if r.id is null then raise exception 'Bildirim bulunamadı.'; end if;
 if p_action not in ('review','dismiss','warn','hide','suspend','restore') or length(coalesce(p_note,''))>500 then raise exception 'Geçersiz işlem.'; end if;
 if p_action='hide' then
 if r.kind<>'feed' then raise exception 'Bu içerik akış paylaşımı değil.'; end if;
 update public.feed_events set safety_hidden=true where id=r.item_id;
 elsif p_action='suspend' then
 if p_days not in (1,7) then raise exception '1 veya 7 gün seç.'; end if;
 insert into public.dm_social_controls(student_id,suspended_until) values(r.target_id,now()+make_interval(days=>p_days))
 on conflict(student_id) do update set suspended_until=excluded.suspended_until,updated_at=now();
 elsif p_action='restore' then update public.dm_social_controls set suspended_until=null,updated_at=now() where student_id=r.target_id;
 end if;
 if p_action in ('warn','suspend') then insert into public.notifications(recipient_student_id,type,title,message) values(r.target_id,'guvenlik','Güvenlik bilgilendirmesi',case when p_action='suspend' then 'Sosyal özelliklerin yönetici incelemesi sonucunda süreli kapatıldı. Ders ve parkur özelliklerin açık.' else 'Lütfen topluluk kurallarına uy. Kırıcı davranıştan ve kişisel bilgi paylaşmaktan kaçın.' end); end if;
 update public.dm_safety_reports set status=case p_action when 'review' then 'reviewing' when 'dismiss' then 'dismissed' else 'resolved' end,action=p_action,reviewed_by=p_admin,review_note=coalesce(p_note,''),updated_at=now() where id=r.id;
 insert into public.dm_safety_review_log(report_id,admin_id,action,note) values(r.id,p_admin,p_action,coalesce(p_note,''));
 return true;
end $$;
-- Automatic achievements never fail a learning transaction when sharing is disabled.
create function public.dm_safety_feed_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare feature text; begin
 feature:=case when new.event_type='energy_send' then 'gifts' when new.event_type='duel_invite' then 'duels' else 'profile' end;
 if not public.dm_social_allowed(new.student_id,feature) or (new.target_student_id is not null and not public.dm_social_allowed(new.target_student_id,feature)) then return null; end if;
 return new;
end $$;
create trigger dm_safety_feed before insert on public.feed_events for each row execute function public.dm_safety_feed_guard();
create function public.dm_safety_peer_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare a uuid; b uuid; feature text; begin
 if tg_table_name='notifications' then
 a:=new.sender_student_id;b:=new.recipient_student_id;
 if a is null then return new; end if;
 feature:=case when new.type in ('hediye','enerji') then 'gifts' when new.type='mesaj' then 'messages' when new.type in ('oyunDavet','duello') then 'duels' else 'social' end;
 elsif tg_op='UPDATE' and (to_jsonb(new)->>'status')='cancelled' then return new;
 elsif tg_table_name='dm_accessory_gifts' then a:=new.sender_id;b:=new.recipient_id;feature:='gifts';
 elsif tg_table_name='duels' then a:=new.sender_student_id;b:=new.receiver_student_id;feature:='duels';
 else a:=new.player_a;b:=new.player_b;feature:='duels'; end if;
 if not public.dm_social_allowed(a,feature) or not public.dm_social_allowed(b,feature) then raise exception 'Bu sosyal etkileşim veli veya yönetici ayarlarıyla kapalı.'; end if;
 return new;
end $$;
create trigger dm_safety_notifications before insert on public.notifications for each row execute function public.dm_safety_peer_guard();
create trigger dm_safety_gifts before insert on public.dm_accessory_gifts for each row execute function public.dm_safety_peer_guard();
create trigger dm_safety_duels before insert or update on public.duels for each row execute function public.dm_safety_peer_guard();
create trigger dm_safety_matches before insert or update on public.dm_matches for each row execute function public.dm_safety_peer_guard();
-- Only service-side readers use these views; no extra public exposure.
create view public.dm_safe_feed_events with(security_invoker=true) as
 select f.* from public.feed_events f where not f.safety_hidden and public.dm_social_allowed(f.student_id,'profile') and (f.target_student_id is null or public.dm_social_allowed(f.target_student_id,'profile'));
revoke all on public.dm_safe_feed_events from public,anon,authenticated;
grant select on public.dm_safe_feed_events to service_role;
do $$ declare f record; begin for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('dm_social_allowed','dm_guardian_claim','dm_guardian_save','dm_safety_report_create','dm_safety_review','dm_safety_feed_guard','dm_safety_peer_guard') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);end loop;end $$;
select cron.schedule('dm-social-safety-retention','37 * * * *', $job$
 delete from public.dm_guardian_sessions where expires_at<now();
 delete from public.dm_guardian_challenges where expires_at<now()-interval '1 day';
 delete from public.dm_safety_reports where status in ('resolved','dismissed') and updated_at<now()-interval '90 days';
$job$);
